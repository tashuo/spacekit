import { usePrefs } from '@/lib/store/prefs'
import { MESSAGES, type Lang, type LangPref } from './messages'

export type { Lang, LangPref }
export { MESSAGES }

// 把语言偏好解析为具体语言：'system' 跟随浏览器语言（zh* → 中文，否则英文）
export function resolveLang(pref: LangPref): Lang {
  if (pref === 'zh' || pref === 'en') return pref
  const nav = typeof navigator !== 'undefined' ? navigator.language.toLowerCase() : 'en'
  return nav.startsWith('zh') ? 'zh' : 'en'
}

// 翻译 + 简单 {name} 插值
export function t(key: string, lang: Lang, params?: Record<string, string | number>): string {
  let s = MESSAGES[key]?.[lang] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v))
  }
  return s
}

// React hook：返回随当前语言变化的翻译函数（组件订阅 prefs.lang 自动重渲染）
export function useT(): (key: string, params?: Record<string, string | number>) => string {
  const pref = usePrefs((s) => s.lang)
  const lang = resolveLang(pref)
  return (key, params) => t(key, lang, params)
}
