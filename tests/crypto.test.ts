import { describe, it, expect } from 'vitest'
import { symEncrypt, symDecrypt, sm4Encrypt, sm4Decrypt } from '@/lib/tools/crypto'

const ALGOS = ['AES', 'DES', 'TripleDES'] as const

describe('symmetric round-trip', () => {
  for (const algo of ALGOS) {
    it(`${algo} encrypts then decrypts back`, () => {
      const c = symEncrypt(algo, '你好 hello', 'pass-phrase')
      expect(c.ok).toBe(true)
      expect(symDecrypt(algo, c.output, 'pass-phrase').output).toBe('你好 hello')
    })
    it(`${algo} does not recover plaintext with wrong key`, () => {
      const c = symEncrypt(algo, 'secret', 'k1')
      expect(c.ok).toBe(true)
      // CBC 无完整性校验：错误密钥要么解密报错(output 为空)，要么得到乱码，
      // 但绝不会还原出原文。断言「不等于原文」才是确定性的安全不变量。
      expect(symDecrypt(algo, c.output, 'k2').output).not.toBe('secret')
    })
  }
  it('errors on empty text / key', () => {
    expect(symEncrypt('AES', '  ', 'k').ok).toBe(false)
    expect(symEncrypt('AES', 'x', '').ok).toBe(false)
  })
})

describe('SM4 (hex key)', () => {
  const KEY = '0123456789abcdeffedcba9876543210'
  it('round-trips with a valid 32-hex key', () => {
    const c = sm4Encrypt('你好 hello', KEY)
    expect(c.ok).toBe(true)
    expect(sm4Decrypt(c.output, KEY).output).toBe('你好 hello')
  })
  it('rejects an invalid key', () => {
    expect(sm4Encrypt('x', 'short').ok).toBe(false)
  })
})
