import { describe, expect, it } from 'vitest'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { inflateRawSync } from 'node:zlib'

import { buildSqliteDatabase, varint, type ExportTable } from './sqliteWriter'
import { buildXlsxWorkbook, crc32 } from './xlsxWriter'

const tables: ExportTable[] = [
  {
    name: 'transacoes',
    columns: ['perfil', 'id', 'description', 'amount', 'type', 'paid'],
    rows: [
      ['Principal', 't1', 'Mercado', 100.5, 'expense', false],
      ['Trabalho', 't2', 'Salário 💰 "bônus" & <extra>', 5000, 'income', true],
      ['Principal', 't3', null, -42, 'expense', null],
    ],
  },
  { name: 'vazia', columns: ['a', 'b'], rows: [] },
]

function openDatabase(bytes: Uint8Array) {
  const dir = mkdtempSync(join(tmpdir(), 'pf-sqlite-'))
  const path = join(dir, 'teste.db')
  writeFileSync(path, bytes)
  return new DatabaseSync(path, { readOnly: true })
}

describe('exportação em SQLite', () => {
  it('varint segue o formato do SQLite', () => {
    expect(varint(0)).toEqual([0])
    expect(varint(127)).toEqual([0x7f])
    expect(varint(128)).toEqual([0x81, 0x00])
    expect(varint(300)).toEqual([0x82, 0x2c])
  })

  it('o arquivo abre no SQLite de verdade, íntegro e com os dados certos', () => {
    const db = openDatabase(buildSqliteDatabase(tables))

    expect(db.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' })

    const rows = db.prepare('SELECT * FROM transacoes ORDER BY rowid').all()
    expect(rows).toEqual([
      { perfil: 'Principal', id: 't1', description: 'Mercado', amount: 100.5, type: 'expense', paid: 0 },
      { perfil: 'Trabalho', id: 't2', description: 'Salário 💰 "bônus" & <extra>', amount: 5000, type: 'income', paid: 1 },
      { perfil: 'Principal', id: 't3', description: null, amount: -42, type: 'expense', paid: null },
    ])
    expect(db.prepare('SELECT COUNT(*) AS n FROM vazia').get()).toEqual({ n: 0 })
    db.close()
  })

  it('aguenta muitas linhas e textos enormes (várias páginas e transbordo)', () => {
    const big: ExportTable = {
      name: 'grande',
      columns: ['n', 'texto'],
      rows: Array.from({ length: 6000 }, (_, index) => [index, `linha ${index} `.repeat(index % 50 === 0 ? 900 : 3)]),
    }

    const many: ExportTable[] = Array.from({ length: 40 }, (_, index) => ({
      name: `tabela_${index}`,
      columns: Array.from({ length: 12 }, (_, column) => `coluna_numero_${column}`),
      rows: [[index]],
    }))

    const db = openDatabase(buildSqliteDatabase([big, ...many]))
    expect(db.prepare('PRAGMA integrity_check').get()).toEqual({ integrity_check: 'ok' })
    expect(db.prepare('SELECT COUNT(*) AS n, SUM(n) AS s FROM grande').get()).toEqual({ n: 6000, s: (5999 * 6000) / 2 })
    expect((db.prepare('SELECT texto FROM grande WHERE n = 4000').get() as { texto: string }).texto.length).toBe(
      'linha 4000 '.length * 900
    )
    expect(db.prepare('SELECT coluna_numero_0 AS v FROM tabela_39').get()).toEqual({ v: 39 })
    db.close()
  })
})

/** Lê um ZIP sem compressão (como o gerado) e devolve os arquivos. */
function readZip(bytes: Uint8Array): Map<string, string> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const files = new Map<string, string>()
  let offset = 0

  while (view.getUint32(offset, true) === 0x04034b50) {
    const method = view.getUint16(offset + 8, true)
    const crc = view.getUint32(offset + 14, true)
    const size = view.getUint32(offset + 18, true)
    const nameLength = view.getUint16(offset + 26, true)
    const extra = view.getUint16(offset + 28, true)
    const name = new TextDecoder().decode(bytes.subarray(offset + 30, offset + 30 + nameLength))
    const start = offset + 30 + nameLength + extra
    const raw = bytes.subarray(start, start + size)
    const data = method === 8 ? new Uint8Array(inflateRawSync(raw)) : raw

    expect(crc32(data)).toBe(crc)
    files.set(name, new TextDecoder().decode(data))
    offset = start + size
  }

  return files
}

describe('exportação em planilha', () => {
  it('gera um .xlsx com uma aba por tabela, títulos e valores', () => {
    const files = readZip(buildXlsxWorkbook([{ ...tables[0], name: 'Transações' }, { ...tables[1], name: 'Vazia' }]))

    expect([...files.keys()]).toEqual(
      expect.arrayContaining(['[Content_Types].xml', '_rels/.rels', 'xl/workbook.xml', 'xl/styles.xml', 'xl/worksheets/sheet1.xml', 'xl/worksheets/sheet2.xml'])
    )
    expect(files.get('xl/workbook.xml')).toContain('name="Transações"')

    const sheet = files.get('xl/worksheets/sheet1.xml')!
    expect(sheet).toContain('<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">perfil</t></is></c>')
    expect(sheet).toContain('<c r="D2"><v>100.5</v></c>')
    expect(sheet).toContain('Salário 💰 &quot;bônus&quot; &amp; &lt;extra&gt;')
    expect(sheet).toContain('<c r="F3" t="b"><v>1</v></c>')
  })

  it('o .xlsx gerado é um ZIP válido para o Windows', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pf-xlsx-'))
    const path = join(dir, 'teste.xlsx')
    writeFileSync(path, buildXlsxWorkbook(tables))
    expect(readFileSync(path).subarray(0, 2).toString()).toBe('PK')
  })
})
