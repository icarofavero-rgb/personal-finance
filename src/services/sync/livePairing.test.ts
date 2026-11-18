import { describe, expect, it } from 'vitest'
import { createInvite, decryptText, encryptText, importKey, parseInvite } from './livePairing'

describe('pareamento da conexão contínua', () => {
  it('o convite do QR é curto e traz o canal, a chave e o nome do aparelho', () => {
    const invite = createInvite('Computador')
    const parsed = parseInvite(invite.code)

    expect(invite.code.startsWith('PF2:')).toBe(true)
    expect(invite.code.length).toBeLessThan(200)
    expect(parsed).toEqual({ topic: invite.topic, key: invite.key, name: 'Computador' })
  })

  it('recusa códigos que não são do app', () => {
    expect(() => parseInvite('PF1:abc')).toThrow(/não é um código/)
    expect(() => parseInvite('PF2:@@@')).toThrow(/não é um código/)
  })

  it('só quem tem a chave do QR consegue ler as mensagens', async () => {
    const mine = await importKey(createInvite('A').key)
    const other = await importKey(createInvite('B').key)
    const secret = await encryptText(mine, '{"type":"offer","sdp":"..."}')

    expect(secret).not.toContain('offer')
    expect(await decryptText(mine, secret)).toBe('{"type":"offer","sdp":"..."}')
    expect(await decryptText(other, secret)).toBeNull()
  })
})
