import { overlayTools } from '@/lib/tools/registry'
import { t, resolveLang } from '@/lib/i18n'
import type { LangPref } from '@/lib/i18n'
import type { BgMessage } from '@/lib/messaging'

const PARENT_ID = 'spacekit'
const PREFS_KEY = 'spacekit:prefs'

async function getLang() {
  const stored = await chrome.storage.local.get(PREFS_KEY)
  const prefs = stored?.[PREFS_KEY] as { lang?: LangPref } | undefined
  const pref: LangPref = prefs?.lang ?? 'system'
  return resolveLang(pref)
}

async function buildMenus() {
  const lang = await getLang()
  await new Promise<void>((resolve) => chrome.contextMenus.removeAll(resolve))
  chrome.contextMenus.create({ id: PARENT_ID, title: t('ctx.parent', lang), contexts: ['selection'] })
  for (const tool of overlayTools()) {
    chrome.contextMenus.create({
      id: `${PARENT_ID}:${tool.id}`,
      parentId: PARENT_ID,
      title: t(`tool.${tool.id}`, lang),
      contexts: ['selection'],
    })
  }
}

export default defineBackground(() => {
  const appUrl = () => chrome.runtime.getURL('/app.html')

  // 点击图标打开标签页
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: appUrl() })
  })

  // 右键菜单：父项 + 每个浮层工具子项（由注册表自动生成）
  chrome.runtime.onInstalled.addListener(() => {
    void buildMenus()
  })

  // 监听语言偏好变化，重建菜单
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[PREFS_KEY]) {
      void buildMenus()
    }
  })

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (!tab?.id || typeof info.menuItemId !== 'string') return
    const prefix = `${PARENT_ID}:`
    if (!info.menuItemId.startsWith(prefix)) return
    const toolId = info.menuItemId.slice(prefix.length)
    chrome.tabs.sendMessage(tab.id, { type: 'run-tool', toolId, text: info.selectionText ?? '' })
  })

  // 快捷键
  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'open-app') {
      chrome.tabs.create({ url: appUrl() })
    } else if (command === 'toggle-overlay' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'toggle-overlay' })
    }
  })

  // 浮层请求打开标签页。onMessage 是全局的，会收到任意来源的消息，
  // 故入参按 unknown 处理，再真实收窄到 BgMessage。
  chrome.runtime.onMessage.addListener((msg: unknown) => {
    if ((msg as BgMessage | undefined)?.type === 'open-app') chrome.tabs.create({ url: appUrl() })
  })
})
