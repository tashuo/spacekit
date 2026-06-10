// 把 Tailwind 的内部 --tw-* 自定义属性整体改名为 --sk-tw-*。
//
// 扩展的 content script 把编译后的 Tailwind v4 CSS 注入每个页面。其中的
// `@property --tw-*` 声明是「文档全局」的，shadow DOM 也隔离不了：它们会把宿主
// 页面同名的自定义属性强制约束为某个 syntax（如 --tw-gradient-from 的 "<color>"），
// 导致 Tailwind v3 页面里 `--tw-gradient-from: #8b5cf6 0%` 这类「颜色+位置」合并值
// 被判非法、退回 initial-value（透明），渐变被破坏。
//
// 在构建期把 content script CSS 里的 --tw- 全部改名（@property 声明、赋值、var()
// 引用同文件内一并改），消除与宿主页面的命名冲突；浮层自身用 --sk-tw-*，样式不变。
export function namespaceTailwindVars(css: string): string {
  return css.replaceAll('--tw-', '--sk-tw-')
}
