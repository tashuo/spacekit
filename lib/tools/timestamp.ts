import { ok, err, type ToolResult } from './types'

type Unit = 'auto' | 's' | 'ms'

// 用 Intl 把 epoch 毫秒格式化为指定时区的 "YYYY-MM-DD HH:mm:ss"
function formatInTz(ms: number, tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(ms))
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const hour = get('hour') === '24' ? '00' : get('hour')
  return `${get('year')}-${get('month')}-${get('day')} ${hour}:${get('minute')}:${get('second')}`
}

export function tsToDate(input: string, opts: { unit: Unit; tz: string }): ToolResult {
  const raw = input.trim()
  if (!/^\d+$/.test(raw)) return err('时间戳必须是数字')
  let ms = Number(raw)
  const unit = opts.unit === 'auto' ? (raw.length <= 11 ? 's' : 'ms') : opts.unit
  if (unit === 's') ms *= 1000
  return ok(formatInTz(ms, opts.tz))
}

// 仅支持 UTC 反解（前端常用场景）；其他时区在 UI 选项里限制为 UTC/本地。
export function dateToTs(input: string, opts: { tz: string }): ToolResult {
  const m = input.trim().match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/)
  if (!m) return err('日期格式应为 YYYY-MM-DD HH:mm:ss')
  const [, y, mo, d, h, mi, s] = m.map(Number) as unknown as number[]
  const ms =
    opts.tz === 'UTC'
      ? Date.UTC(y, mo - 1, d, h, mi, s)
      : new Date(y, mo - 1, d, h, mi, s).getTime()
  return ok(String(Math.floor(ms / 1000)))
}
