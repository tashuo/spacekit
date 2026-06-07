// background → content：让浮层就地处理选中文本
export type OverlayMessage =
  | { type: 'run-tool'; toolId: string; text: string } // 右键菜单某工具被点击
  | { type: 'toggle-overlay' } // 快捷键唤出：对当前选区显示浮层

// content → background：浮层请求打开标签页应用（content script 无 tabs 权限）。
// 可选携带 toolId/text：在 app 中预选该工具并填入文本（经 chrome.storage 交接，避免 URL 长度限制）。
export type BgMessage =
  | { type: 'open-app'; toolId?: string; text?: string } // 内置页（现状）
  | { type: 'open-web'; toolId: string; text: string }   // 网页版深链

// app 启动时读取的「交接」数据：来自浮层「在应用中打开」
export const HANDOFF_KEY = 'spacekit:handoff'
export interface Handoff {
  toolId: string
  text: string
}
