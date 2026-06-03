import { overlayTools } from '@/lib/tools/registry'
import type { BgMessage } from '@/lib/messaging'

const PARENT_ID = 'spacekit'

export default defineBackground(() => {
  const appUrl = () => chrome.runtime.getURL('/app.html')

  // 点击图标打开标签页
  chrome.action.onClicked.addListener(() => {
    chrome.tabs.create({ url: appUrl() })
  })

  // 右键菜单：父项 + 每个浮层工具子项（由注册表自动生成）
  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({ id: PARENT_ID, title: '用 SpaceKit 处理', contexts: ['selection'] })
      for (const t of overlayTools()) {
        chrome.contextMenus.create({
          id: `${PARENT_ID}:${t.id}`,
          parentId: PARENT_ID,
          title: t.name,
          contexts: ['selection'],
        })
      }
    })
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

  // 浮层请求打开标签页
  chrome.runtime.onMessage.addListener((msg: BgMessage) => {
    if (msg?.type === 'open-app') chrome.tabs.create({ url: appUrl() })
  })
})
