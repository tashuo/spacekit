import { WORDS } from './wordlist'

const LOWER = 'abcdefghijklmnopqrstuvwxyz'
const UPPER = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const DIGITS = '0123456789'
const SYMBOLS = '!@#$%^&*()-_=+[]{};:,.<>?'
// 易混字符：0/O、1/l/I、竖线等
const AMBIGUOUS = /[0O1lI|`]/g

export interface RandomOptions {
  length: number
  lower: boolean
  upper: boolean
  digits: boolean
  symbols: boolean
  avoidAmbiguous: boolean
}

export interface MemorableOptions {
  words: number
  separator: string
  capitalize: boolean
  includeNumber: boolean
}

// 均匀随机整数 [0,max)，用 rejection sampling 避免取模偏置
function randInt(max: number): number {
  if (max <= 0) return 0
  const limit = Math.floor(0xffffffff / max) * max
  const buf = new Uint32Array(1)
  let x = 0
  do {
    crypto.getRandomValues(buf)
    x = buf[0]
  } while (x >= limit)
  return x % max
}

const pick = (chars: string): string => chars.charAt(randInt(chars.length))

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = randInt(i + 1)
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

export function generateRandom(opts: RandomOptions): string {
  const sets: string[] = []
  const clean = (s: string) => (opts.avoidAmbiguous ? s.replace(AMBIGUOUS, '') : s)
  if (opts.lower) sets.push(clean(LOWER))
  if (opts.upper) sets.push(clean(UPPER))
  if (opts.digits) sets.push(clean(DIGITS))
  if (opts.symbols) sets.push(clean(SYMBOLS))
  if (!sets.length) return ''
  const pool = sets.join('')
  const chars: string[] = []
  // 先确保每个选中类至少一个字符
  for (const s of sets) {
    if (chars.length < opts.length) chars.push(pick(s))
  }
  while (chars.length < opts.length) chars.push(pick(pool))
  return shuffle(chars).join('')
}

export function generatePin(length: number): string {
  let out = ''
  for (let i = 0; i < length; i++) out += pick(DIGITS)
  return out
}

export function generateMemorable(opts: MemorableOptions): string {
  const parts: string[] = []
  for (let i = 0; i < opts.words; i++) {
    let w = WORDS[randInt(WORDS.length)]
    if (opts.capitalize) w = w.charAt(0).toUpperCase() + w.slice(1)
    parts.push(w)
  }
  let out = parts.join(opts.separator)
  if (opts.includeNumber) out += opts.separator + randInt(100)
  return out
}

export type StrengthLabel = 'weak' | 'fair' | 'strong' | 'excellent'

// 基于字符集大小与长度估算熵（bits），映射到强度档位
export function estimateStrength(pw: string): { bits: number; label: StrengthLabel } {
  if (!pw) return { bits: 0, label: 'weak' }
  let pool = 0
  if (/[a-z]/.test(pw)) pool += 26
  if (/[A-Z]/.test(pw)) pool += 26
  if (/[0-9]/.test(pw)) pool += 10
  if (/[^a-zA-Z0-9]/.test(pw)) pool += 33
  const bits = Math.round(pw.length * Math.log2(pool || 1))
  const label: StrengthLabel = bits < 40 ? 'weak' : bits < 60 ? 'fair' : bits < 80 ? 'strong' : 'excellent'
  return { bits, label }
}
