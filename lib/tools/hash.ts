import SparkMD5 from 'spark-md5'
import { sm3 as sm3hash } from 'sm-crypto'
import { ok, type ToolResult } from './types'

export function md5(input: string): ToolResult {
  return ok(SparkMD5.hash(input))
}

export type ShaAlgo = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512'

export async function sha(input: string, algo: ShaAlgo): Promise<ToolResult> {
  const data = new TextEncoder().encode(input)
  const buf = await crypto.subtle.digest(algo, data)
  const hex = [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
  return ok(hex)
}

export function sm3(input: string): ToolResult {
  return ok(sm3hash(input))
}
