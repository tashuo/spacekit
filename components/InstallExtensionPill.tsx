import { useEffect, useState } from 'react'
import { detectExtension, shouldPromptInstall } from '@/lib/ext-presence'
import { EXT_STORE_URL } from '@/lib/config'
import { useT } from '@/lib/i18n'

// 扩展内置页：chrome.runtime.id 存在 → 不显示胶囊
function inExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.runtime?.id
}
// 仅 Chromium 系（扩展是 Chrome MV3）才提示安装
function isChromium(): boolean {
  return typeof navigator !== 'undefined' && /Chrome\//.test(navigator.userAgent)
}

export function InstallExtensionPill() {
  const t = useT()
  const [detected, setDetected] = useState(false)
  const [done, setDone] = useState(false)
  const inExtension = inExtensionContext()
  const chromium = isChromium()
  const hasStoreUrl = !!EXT_STORE_URL

  useEffect(() => {
    if (inExtension || !chromium || !hasStoreUrl) {
      setDone(true)
      return
    }
    let alive = true
    void detectExtension().then((d) => {
      if (alive) {
        setDetected(d)
        setDone(true)
      }
    })
    return () => {
      alive = false
    }
  }, [inExtension, chromium, hasStoreUrl])

  if (!done) return null
  if (!shouldPromptInstall({ inExtension, isChromium: chromium, hasStoreUrl, detected })) return null

  return (
    <a
      href={EXT_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 transition-colors hover:bg-teal-100 dark:border-teal-400/20 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
    >
      {t('ext.install')}
    </a>
  )
}
