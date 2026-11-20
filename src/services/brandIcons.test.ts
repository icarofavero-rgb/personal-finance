import { describe, expect, it } from 'vitest'

import { findBrand } from './brandIcons'

describe('ícones de serviços pela descrição', () => {
  it('reconhece os serviços mais comuns, sem ligar para maiúsculas e acentos', () => {
    expect(findBrand('Uber para o trabalho')?.name).toBe('Uber')
    expect(findBrand('UBER EATS jantar')?.name).toBe('Uber Eats')
    expect(findBrand('Assinatura Spotify')?.name).toBe('Spotify')
    expect(findBrand('YouTube Premium')?.name).toBe('YouTube')
    expect(findBrand('Netflix')?.name).toBe('Netflix')
    expect(findBrand('Disney+ anual')?.name).toBe('Disney+')
    expect(findBrand('Itaú tarifa')?.name).toBe('Itaú')
    expect(findBrand('Corrida 99')?.name).toBe('99')
  })

  it('não confunde pedaços de outras palavras', () => {
    expect(findBrand('Estimativa de gastos')).toBeNull() // "tim"
    expect(findBrand('Interfone do prédio')).toBeNull() // "inter"
    expect(findBrand('Mercado do bairro')).toBeNull()
    expect(findBrand('Compra de 990 reais')).toBeNull() // "99"
  })

  it('entende erros de digitação, com maiúsculas ou minúsculas', () => {
    for (const text of ['Spotfy', 'spotfy', 'SPOTFY', 'Spotifi']) expect(findBrand(text)?.name).toBe('Spotify')
    expect(findBrand('Netflx')?.name).toBe('Netflix')
    expect(findBrand('Ifod')?.name).toBe('iFood')
    expect(findBrand('Disnei+')?.name).toBe('Disney+')
    expect(findBrand('Uebr')?.name).toBe('Uber')
    // palavras comuns não viram serviço
    expect(findBrand('Stream de jogos')).toBeNull()
    expect(findBrand('Ubr')).toBeNull()
  })

  it('sugere a categoria do serviço', () => {
    expect(findBrand('spotfy')?.category).toBe('Lazer / Assinaturas')
    expect(findBrand('UBER')?.category).toBe('Transporte / Aplicativos de transporte')
    expect(findBrand('iFood almoço')?.category).toBe('Alimentação / Delivery')
    expect(findBrand('Steam jogo')?.category).toBe('Lazer / Jogos')
    expect(findBrand('Nubank')?.category).toBeUndefined() // banco: não muda a categoria
  })
})
