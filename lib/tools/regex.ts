export interface RegexMatch {
  match: string
  index: number
  // 未命中的可选捕获组在运行时为 undefined，需如实表达
  groups: (string | undefined)[]
}

export interface RegexResult {
  ok: boolean
  matches: RegexMatch[]
  error?: string
}

export function testRegex(pattern: string, flags: string, text: string): RegexResult {
  if (!pattern) return { ok: true, matches: [] }
  const g = flags.includes('g') ? flags : flags + 'g'
  let re: RegExp
  try {
    re = new RegExp(pattern, g)
  } catch (e) {
    return { ok: false, matches: [], error: e instanceof Error ? e.message : '非法正则' }
  }
  const matches: RegexMatch[] = []
  for (const m of text.matchAll(re)) {
    matches.push({ match: m[0], index: m.index ?? 0, groups: m.slice(1) })
  }
  return { ok: true, matches }
}
