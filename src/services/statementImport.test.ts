import { describe, expect, it } from 'vitest'
import {
  EXPENSE_CATEGORIES,
  findDuplicate,
  parseAmount,
  parseCsv,
  parseDate,
  parseOfx,
  parseStatement,
  suggestCategory,
} from './statementImport'

describe('valores e datas', () => {
  it('entende os formatos de valor dos bancos', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56)
    expect(parseAmount('-45,90')).toBe(-45.9)
    expect(parseAmount('R$ 45,90')).toBe(45.9)
    expect(parseAmount('(45,90)')).toBe(-45.9)
    expect(parseAmount('-1234.56')).toBe(-1234.56)
    expect(parseAmount('1,234.56')).toBe(1234.56)
    expect(parseAmount('45,90-')).toBe(-45.9)
    expect(parseAmount('abc')).toBeNull()
  })

  it('entende os formatos de data', () => {
    expect(parseDate('18/11/2026')).toBe('2026-11-18')
    expect(parseDate('5/1/26')).toBe('2026-01-05')
    expect(parseDate('2026-11-18')).toBe('2026-11-18')
    expect(parseDate('20261118120000[-3:BRT]')).toBe('2026-11-18')
    expect(parseDate('31/02/2026')).toBeNull()
  })
})

describe('arquivo OFX', () => {
  const ofx = `OFXHEADER:100
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261105120000[-3:BRT]
<TRNAMT>-45.90
<FITID>abc1
<MEMO>DROGARIA SAO PAULO
</STMTTRN>
<STMTTRN>
<TRNTYPE>CREDIT
<DTPOSTED>20261101
<TRNAMT>3000,00
<FITID>abc2
<MEMO>PAGAMENTO DE SALARIO
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`

  it('lê os lançamentos com tipo, valor e data', () => {
    const entries = parseOfx(ofx)
    expect(entries.map(({ date, description, amount, type }) => ({ date, description, amount, type }))).toEqual([
      { date: '2026-11-05', description: 'DROGARIA SAO PAULO', amount: 45.9, type: 'expense' },
      { date: '2026-11-01', description: 'PAGAMENTO DE SALARIO', amount: 3000, type: 'income' },
    ])
  })

  it('o mesmo extrato gera os mesmos ids (não duplica ao importar de novo)', () => {
    expect(parseOfx(ofx).map(item => item.id)).toEqual(parseOfx(ofx).map(item => item.id))
    expect(parseStatement('extrato.ofx', ofx)).toHaveLength(2)
  })
})

describe('arquivo CSV', () => {
  it('extrato com ponto e vírgula e valores brasileiros (com linhas antes do título)', () => {
    const csv = `Extrato conta corrente
Agência 0001
Data Lançamento;Descrição;Valor;Saldo
05/11/2026;UBER *TRIP;-23,50;1.000,00
06/11/2026;"Pix recebido; Maria";150,00;1.150,00`
    expect(parseCsv(csv).map(({ date, description, amount, type }) => [date, description, amount, type])).toEqual([
      ['2026-11-05', 'UBER *TRIP', 23.5, 'expense'],
      ['2026-11-06', 'Pix recebido; Maria', 150, 'income'],
    ])
  })

  it('fatura do Nubank (date,title,amount): valor positivo é gasto', () => {
    const csv = `date,title,amount
2026-11-03,iFood *Restaurante,52.30
2026-11-04,Pagamento recebido,-500.00`
    expect(parseCsv(csv).map(item => [item.description, item.type])).toEqual([
      ['iFood *Restaurante', 'expense'],
      ['Pagamento recebido', 'income'],
    ])
  })

  it('colunas separadas de crédito e débito', () => {
    const csv = `Data,Histórico,Crédito,Débito
01/11/2026,Salário,3000,
02/11/2026,Aluguel,,1200`
    expect(parseCsv(csv).map(item => [item.description, item.amount, item.type])).toEqual([
      ['Salário', 3000, 'income'],
      ['Aluguel', 1200, 'expense'],
    ])
  })
})

describe('categorias e repetidas', () => {
  it('as sugestões usam categorias que existem no app', () => {
    expect(EXPENSE_CATEGORIES).toContain(suggestCategory({ description: 'UBER *TRIP', type: 'expense' }, []))
    expect(suggestCategory({ description: 'UBER *TRIP', type: 'expense' }, [])).toBe('Transporte / Aplicativos de transporte')
    expect(suggestCategory({ description: 'IFOOD *LANCHE', type: 'expense' }, [])).toBe('Alimentação / Delivery')
    expect(suggestCategory({ description: 'PAGAMENTO DE SALARIO', type: 'income' }, [])).toBe('Salário')
    expect(suggestCategory({ description: 'XPTO LTDA', type: 'expense' }, [])).toBe('Outros / Geral')
  })

  it('prefere a categoria que você já usou para o mesmo nome', () => {
    const history = [{ id: '1', date: '2026-10-01', description: 'Uber *Trip', amount: 10, type: 'expense' as const, category: 'Lazer / Passeios' }]
    expect(suggestCategory({ description: 'UBER *TRIP', type: 'expense' }, history)).toBe('Lazer / Passeios')
  })

  it('aponta lançamentos já importados e parecidos com os cadastrados', () => {
    const item = { id: 'imp-1', date: '2026-11-05', description: 'X', amount: 45.9, type: 'expense' as const }
    expect(findDuplicate(item, [{ ...item, category: 'a' }])).toBe('imported')
    expect(findDuplicate(item, [{ ...item, id: 'outro', description: 'Farmácia', category: 'a' }])).toBe('similar')
    expect(findDuplicate(item, [])).toBeNull()
  })
})
