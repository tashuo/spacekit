import CryptoJS from 'crypto-js'
import { sm4 } from 'sm-crypto'
import { ok, err, type ToolResult } from './types'

export type SymAlgo = 'AES' | 'DES' | 'TripleDES'
const CJS: Record<SymAlgo, typeof CryptoJS.AES> = {
  AES: CryptoJS.AES,
  DES: CryptoJS.DES,
  TripleDES: CryptoJS.TripleDES,
}

export function symEncrypt(algo: SymAlgo, text: string, key: string): ToolResult {
  if (!text.trim()) return err('输入为空')
  if (!key) return err('请输入密钥')
  try {
    return ok(CJS[algo].encrypt(text, key).toString())
  } catch (e) {
    return err(e instanceof Error ? e.message : '加密失败')
  }
}

export function symDecrypt(algo: SymAlgo, cipher: string, key: string): ToolResult {
  if (!cipher.trim()) return err('输入为空')
  if (!key) return err('请输入密钥')
  try {
    const s = CJS[algo].decrypt(cipher, key).toString(CryptoJS.enc.Utf8)
    return s ? ok(s) : err('解密失败（密钥错误或密文非法）')
  } catch (e) {
    return err(e instanceof Error ? e.message : '解密失败')
  }
}

// SM4：sm-crypto 要求 32 位十六进制密钥（16 字节）
const validSm4Key = (key: string) => /^[0-9a-fA-F]{32}$/.test(key)

export function sm4Encrypt(text: string, key: string): ToolResult {
  if (!text.trim()) return err('输入为空')
  if (!validSm4Key(key)) return err('SM4 密钥需为 32 位十六进制（16 字节）')
  try {
    return ok(sm4.encrypt(text, key))
  } catch (e) {
    return err(e instanceof Error ? e.message : '加密失败')
  }
}

export function sm4Decrypt(cipher: string, key: string): ToolResult {
  if (!cipher.trim()) return err('输入为空')
  if (!validSm4Key(key)) return err('SM4 密钥需为 32 位十六进制（16 字节）')
  try {
    const s = sm4.decrypt(cipher, key)
    return s ? ok(s) : err('解密失败')
  } catch (e) {
    return err(e instanceof Error ? e.message : '解密失败')
  }
}
