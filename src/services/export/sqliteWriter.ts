/**
 * Gera um arquivo de banco de dados SQLite (.db) direto no aparelho,
 * sem biblioteca externa. Segue o formato oficial do SQLite 3:
 * https://www.sqlite.org/fileformat.html
 *
 * Cada tabela vira uma árvore de páginas (B-tree) com as linhas; o
 * catálogo "sqlite_master" fica na página 1. O arquivo abre em qualquer
 * programa de SQLite (DB Browser, DBeaver, Python, Android...).
 */

export type CellValue = string | number | boolean | null
export type ExportTable = { name: string; columns: string[]; rows: CellValue[][] }

const PAGE_SIZE = 4096
const USABLE = PAGE_SIZE
const MAX_LOCAL = USABLE - 35
const MIN_LOCAL = Math.floor(((USABLE - 12) * 32) / 255) - 23

const encoder = new TextEncoder()

/** Inteiro de tamanho variável do SQLite (1 a 9 bytes, big-endian). */
export function varint(value: number | bigint): number[] {
  let v = BigInt(value)
  if (v < 0n) v &= 0xffffffffffffffffn

  if (v > 0x00ffffffffffffffn) {
    const bytes = new Array<number>(9)
    bytes[8] = Number(v & 0xffn)
    v >>= 8n
    for (let i = 7; i >= 0; i--) {
      bytes[i] = Number((v & 0x7fn) | 0x80n)
      v >>= 7n
    }
    return bytes
  }

  const out: number[] = []
  do {
    out.unshift(Number(v & 0x7fn))
    v >>= 7n
  } while (v > 0n)

  for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80
  return out
}

/** Monta um registro (linha) no formato do SQLite. */
function encodeRecord(values: CellValue[]): Uint8Array {
  const types: number[] = []
  const body: number[] = []

  for (const raw of values) {
    const value = typeof raw === 'boolean' ? (raw ? 1 : 0) : raw

    if (value === null || value === undefined || (typeof value === 'number' && !Number.isFinite(value))) {
      types.push(0)
    } else if (typeof value === 'number' && Number.isSafeInteger(value)) {
      const n = value
      let type: number
      let size: number
      if (n >= -128 && n <= 127) [type, size] = [1, 1]
      else if (n >= -32768 && n <= 32767) [type, size] = [2, 2]
      else if (n >= -2147483648 && n <= 2147483647) [type, size] = [4, 4]
      else [type, size] = [6, 8]
      types.push(type)
      let big = BigInt(n)
      const bytes: number[] = []
      for (let i = 0; i < size; i++) {
        bytes.unshift(Number(big & 0xffn))
        big >>= 8n
      }
      body.push(...bytes)
    } else if (typeof value === 'number') {
      types.push(7)
      const view = new DataView(new ArrayBuffer(8))
      view.setFloat64(0, value)
      body.push(...new Uint8Array(view.buffer))
    } else {
      const text = encoder.encode(String(value))
      types.push(text.length * 2 + 13)
      for (const byte of text) body.push(byte)
    }
  }

  const typeBytes = types.flatMap(type => varint(type))
  // O tamanho do cabeçalho inclui o próprio varint do tamanho.
  let headerSize = typeBytes.length + 1
  if (varint(headerSize).length > 1) headerSize = typeBytes.length + varint(typeBytes.length + 2).length

  return Uint8Array.from([...varint(headerSize), ...typeBytes, ...body])
}

class PageFile {
  pages: Uint8Array[] = []

  allocate(): number {
    this.pages.push(new Uint8Array(PAGE_SIZE))
    return this.pages.length
  }

  get(page: number): Uint8Array {
    return this.pages[page - 1]
  }
}

/** Célula de folha: tamanho, rowid, parte local e (se precisar) as páginas de sobra. */
function leafCell(file: PageFile, rowid: number, payload: Uint8Array): Uint8Array {
  const total = payload.length
  let local = total

  if (total > MAX_LOCAL) {
    const k = MIN_LOCAL + ((total - MIN_LOCAL) % (USABLE - 4))
    local = k <= MAX_LOCAL ? k : MIN_LOCAL
  }

  const head = [...varint(total), ...varint(rowid)]
  const cell: number[] = [...head, ...payload.subarray(0, local)]

  if (local < total) {
    // Páginas de transbordo: 4 bytes com a próxima página + conteúdo.
    let rest = payload.subarray(local)
    const first = file.allocate()
    let page = first

    while (rest.length > 0) {
      const chunk = rest.subarray(0, USABLE - 4)
      rest = rest.subarray(chunk.length)
      const next = rest.length > 0 ? file.allocate() : 0
      const data = file.get(page)
      new DataView(data.buffer).setUint32(0, next)
      data.set(chunk, 4)
      page = next
    }

    cell.push((first >>> 24) & 0xff, (first >>> 16) & 0xff, (first >>> 8) & 0xff, first & 0xff)
  }

  return Uint8Array.from(cell)
}

/** Escreve uma página de árvore (folha 0x0D ou interna 0x05). */
function writeTreePage(
  data: Uint8Array,
  offset: number,
  type: 0x0d | 0x05,
  cells: Uint8Array[],
  rightChild = 0
) {
  const view = new DataView(data.buffer)
  const headerSize = type === 0x05 ? 12 : 8
  let contentStart = PAGE_SIZE

  cells.forEach((cell, index) => {
    contentStart -= cell.length
    data.set(cell, contentStart)
    view.setUint16(offset + headerSize + index * 2, contentStart)
  })

  data[offset] = type
  view.setUint16(offset + 1, 0)
  view.setUint16(offset + 3, cells.length)
  view.setUint16(offset + 5, contentStart === 65536 ? 0 : contentStart)
  data[offset + 7] = 0
  if (type === 0x05) view.setUint32(offset + 8, rightChild)
}

/** Divide as células em páginas que cabem no espaço disponível. */
function pack(cells: Uint8Array[], capacity: number, headerSize: number): Uint8Array[][] {
  const groups: Uint8Array[][] = []
  let current: Uint8Array[] = []
  let used = headerSize

  for (const cell of cells) {
    const size = cell.length + 2
    if (current.length > 0 && used + size > capacity) {
      groups.push(current)
      current = []
      used = headerSize
    }
    current.push(cell)
    used += size
  }

  groups.push(current)
  return groups
}

/**
 * Grava uma tabela inteira e devolve o número da página raiz.
 * `rootPage`/`rootOffset` permitem colocar a raiz na página 1 (catálogo).
 */
function writeTable(
  file: PageFile,
  rows: CellValue[][],
  rootPage = file.allocate(),
  rootOffset = 0
): number {
  const cells = rows.map((row, index) => leafCell(file, index + 1, encodeRecord(row)))
  const capacity = PAGE_SIZE - rootOffset

  // Tudo cabe numa folha só: ela é a raiz.
  const leafGroups = pack(cells, capacity, 8)
  if (leafGroups.length === 1) {
    writeTreePage(file.get(rootPage), rootOffset, 0x0d, leafGroups[0])
    return rootPage
  }

  // Folhas → níveis internos, até sobrar uma única raiz.
  let level = leafGroups.map((group, index) => {
    const page = file.allocate()
    writeTreePage(file.get(page), 0, 0x0d, group)
    const lastRowid = leafGroups.slice(0, index + 1).reduce((sum, item) => sum + item.length, 0)
    return { page, maxRowid: lastRowid }
  })

  for (;;) {
    const entries = level.map(item => ({
      ...item,
      cell: Uint8Array.from([
        (item.page >>> 24) & 0xff,
        (item.page >>> 16) & 0xff,
        (item.page >>> 8) & 0xff,
        item.page & 0xff,
        ...varint(item.maxRowid),
      ]),
    }))

    // Cada página interna: N células + o último filho no ponteiro da direita.
    const groups: (typeof entries)[] = []
    let current: typeof entries = []
    let used = 12

    for (const entry of entries) {
      const size = entry.cell.length + 2
      if (current.length > 0 && used + size > capacity) {
        groups.push(current)
        current = []
        used = 12
      }
      current.push(entry)
      used += size
    }
    groups.push(current)

    if (groups.length === 1) {
      const group = groups[0]
      const right = group[group.length - 1]
      writeTreePage(file.get(rootPage), rootOffset, 0x05, group.slice(0, -1).map(item => item.cell), right.page)
      return rootPage
    }

    level = groups.map(group => {
      const page = file.allocate()
      const right = group[group.length - 1]
      writeTreePage(file.get(page), 0, 0x05, group.slice(0, -1).map(item => item.cell), right.page)
      return { page, maxRowid: right.maxRowid }
    })
  }
}

const quote = (name: string) => `"${name.replace(/"/g, '""')}"`

/** Gera o arquivo .db completo com as tabelas informadas. */
export function buildSqliteDatabase(tables: ExportTable[]): Uint8Array {
  const file = new PageFile()
  const masterPage = file.allocate() // página 1: catálogo

  const master: CellValue[][] = []

  for (const table of tables) {
    const width = table.columns.length
    const rows = table.rows.map(row => Array.from({ length: width }, (_, index) => row[index] ?? null))
    const root = writeTable(file, rows)
    const sql = `CREATE TABLE ${quote(table.name)} (${table.columns.map(column => `${quote(column)}`).join(', ')})`
    master.push(['table', table.name, table.name, root, sql])
  }

  writeTable(file, master, masterPage, 100)

  // Cabeçalho de 100 bytes do arquivo
  const header = file.get(1)
  const view = new DataView(header.buffer)
  header.set(encoder.encode('SQLite format 3\0'), 0)
  view.setUint16(16, PAGE_SIZE)
  header[18] = 1
  header[19] = 1
  header[20] = 0
  header[21] = 64
  header[22] = 32
  header[23] = 32
  view.setUint32(24, 1) // contador de alterações
  view.setUint32(28, file.pages.length) // tamanho em páginas
  view.setUint32(40, 1) // versão do esquema
  view.setUint32(44, 4) // formato do esquema
  view.setUint32(56, 1) // UTF-8
  view.setUint32(92, 1)
  view.setUint32(96, 3045000)

  const out = new Uint8Array(file.pages.length * PAGE_SIZE)
  file.pages.forEach((page, index) => out.set(page, index * PAGE_SIZE))
  return out
}
