/**
 * Gera uma planilha do Excel (.xlsx) sem biblioteca externa.
 * Um .xlsx é um arquivo ZIP com alguns XMLs dentro; cada tabela vira
 * uma aba, com a primeira linha (títulos) em negrito e fixa no topo.
 * Abre no Excel, Google Planilhas, LibreOffice e no celular.
 */

import type { CellValue, ExportTable } from './sqliteWriter'

const encoder = new TextEncoder()

// ---------- ZIP (sem compressão) ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (const byte of data) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

export function buildZip(files: { name: string; data: Uint8Array }[]): Uint8Array {
  const chunks: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0

  // Data fixa (1/1/2026 00:00) no formato do DOS
  const dosTime = 0
  const dosDate = ((2026 - 1980) << 9) | (1 << 5) | 1

  for (const file of files) {
    const name = encoder.encode(file.name)
    const crc = crc32(file.data)
    const size = file.data.length

    const local = new DataView(new ArrayBuffer(30))
    local.setUint32(0, 0x04034b50, true)
    local.setUint16(4, 20, true)
    local.setUint16(6, 0x0800, true) // nomes em UTF-8
    local.setUint16(8, 0, true) // sem compressão
    local.setUint16(10, dosTime, true)
    local.setUint16(12, dosDate, true)
    local.setUint32(14, crc, true)
    local.setUint32(18, size, true)
    local.setUint32(22, size, true)
    local.setUint16(26, name.length, true)
    local.setUint16(28, 0, true)

    const entry = new DataView(new ArrayBuffer(46))
    entry.setUint32(0, 0x02014b50, true)
    entry.setUint16(4, 20, true)
    entry.setUint16(6, 20, true)
    entry.setUint16(8, 0x0800, true)
    entry.setUint16(10, 0, true)
    entry.setUint16(12, dosTime, true)
    entry.setUint16(14, dosDate, true)
    entry.setUint32(16, crc, true)
    entry.setUint32(20, size, true)
    entry.setUint32(24, size, true)
    entry.setUint16(28, name.length, true)
    entry.setUint32(42, offset, true)

    chunks.push(new Uint8Array(local.buffer), name, file.data)
    central.push(new Uint8Array(entry.buffer), name)
    offset += 30 + name.length + size
  }

  const centralSize = central.reduce((sum, part) => sum + part.length, 0)
  const end = new DataView(new ArrayBuffer(22))
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(8, files.length, true)
  end.setUint16(10, files.length, true)
  end.setUint32(12, centralSize, true)
  end.setUint32(16, offset, true)

  const parts = [...chunks, ...central, new Uint8Array(end.buffer)]
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0))
  let position = 0
  for (const part of parts) {
    out.set(part, position)
    position += part.length
  }
  return out
}

// ---------- Planilha ----------

/** Remove caracteres que o XML não aceita e escapa os especiais. */
function xml(text: string): string {
  return text
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function columnLetter(index: number): string {
  let name = ''
  let n = index + 1
  while (n > 0) {
    const rest = (n - 1) % 26
    name = String.fromCharCode(65 + rest) + name
    n = Math.floor((n - 1) / 26)
  }
  return name
}

function cell(ref: string, value: CellValue, style = 0): string {
  const s = style ? ` s="${style}"` : ''

  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return `<c r="${ref}" t="b"${s}><v>${value ? 1 : 0}</v></c>`
  if (typeof value === 'number' && Number.isFinite(value)) return `<c r="${ref}"${s}><v>${value}</v></c>`

  // Texto (limite do Excel: 32.767 caracteres por célula)
  const text = xml(String(value).slice(0, 32000))
  return `<c r="${ref}" t="inlineStr"${s}><is><t xml:space="preserve">${text}</t></is></c>`
}

function sheetXml(table: ExportTable): string {
  const widths = table.columns.map((column, index) => {
    const longest = table.rows.reduce((max, row) => Math.max(max, String(row[index] ?? '').length), column.length)
    return Math.min(60, Math.max(10, longest + 2))
  })

  const header = `<row r="1">${table.columns.map((column, index) => cell(`${columnLetter(index)}1`, column, 1)).join('')}</row>`
  const body = table.rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 2}">${table.columns
          .map((_, index) => cell(`${columnLetter(index)}${rowIndex + 2}`, row[index] ?? null))
          .join('')}</row>`
    )
    .join('')

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
    '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>' +
    `<cols>${widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join('')}</cols>` +
    `<sheetData>${header}${body}</sheetData>` +
    '</worksheet>'
  )
}

/** Nome de aba válido no Excel: até 31 letras, sem []:*?/\ e sem repetir. */
function sheetNames(tables: ExportTable[]): string[] {
  const used = new Set<string>()

  return tables.map(table => {
    const base = table.name.replace(/[[\]:*?/\\]/g, ' ').trim().slice(0, 31) || 'Planilha'
    let name = base
    let counter = 2
    while (used.has(name.toLowerCase())) name = `${base.slice(0, 28)} ${counter++}`
    used.add(name.toLowerCase())
    return name
  })
}

export function buildXlsxWorkbook(tables: ExportTable[]): Uint8Array {
  const names = sheetNames(tables)
  const text = (value: string) => encoder.encode(value)

  const files = [
    {
      name: '[Content_Types].xml',
      data: text(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
          '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
          '<Default Extension="xml" ContentType="application/xml"/>' +
          '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
          '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
          tables
            .map(
              (_, index) =>
                `<Override PartName="/xl/worksheets/sheet${index + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`
            )
            .join('') +
          '</Types>'
      ),
    },
    {
      name: '_rels/.rels',
      data: text(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
          '</Relationships>'
      ),
    },
    {
      name: 'xl/workbook.xml',
      data: text(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
          `<sheets>${names.map((name, index) => `<sheet name="${xml(name)}" sheetId="${index + 1}" r:id="rId${index + 1}"/>`).join('')}</sheets>` +
          '</workbook>'
      ),
    },
    {
      name: 'xl/_rels/workbook.xml.rels',
      data: text(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
          tables
            .map(
              (_, index) =>
                `<Relationship Id="rId${index + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${index + 1}.xml"/>`
            )
            .join('') +
          `<Relationship Id="rId${tables.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
          '</Relationships>'
      ),
    },
    {
      name: 'xl/styles.xml',
      data: text(
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
          '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
          '<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>' +
          '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
          '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
          '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
          '<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>' +
          '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
          '</styleSheet>'
      ),
    },
    ...tables.map((table, index) => ({ name: `xl/worksheets/sheet${index + 1}.xml`, data: text(sheetXml(table)) })),
  ]

  return buildZip(files)
}
