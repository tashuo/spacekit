// background → content：让浮层就地处理选中文本
export type OverlayMessage =
  | { type: 'run-tool'; toolId: string; text: string } // 右键菜单某工具被点击
  | { type: 'toggle-overlay' } // 快捷键唤出：对当前选区显示浮层

// content → background：浮层请求打开标签页应用（content script 无 tabs 权限）
export type BgMessage = { type: 'open-app' }
