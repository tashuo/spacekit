// 网页 ↔ 扩展 存在性握手。扩展 content script（已在所有页面运行）应答，
// 网页据此判断扩展是否安装，未装时提示安装。
export const PING = { source: 'spacekit-web', type: 'ping' } as const
export const PRESENT = { source: 'spacekit-ext', type: 'present' } as const

export function isPing(data: unknown): boolean {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { source?: unknown }).source === 'spacekit-web' &&
    (data as { type?: unknown }).type === 'ping'
  )
}

export function isPresenceReply(data: unknown): boolean {
  return (
    !!data &&
    typeof data === 'object' &&
    (data as { source?: unknown }).source === 'spacekit-ext' &&
    (data as { type?: unknown }).type === 'present'
  )
}

export interface PromptInputs {
  inExtension: boolean
  isChromium: boolean
  hasStoreUrl: boolean
  detected: boolean
}

// 仅当 不在扩展内 + Chromium + 配了商店地址 + 未检测到扩展 时提示
export function shouldPromptInstall(i: PromptInputs): boolean {
  return !i.inExtension && i.isChromium && i.hasStoreUrl && !i.detected
}

// 扩展 content script 调用：回应握手 + 自身加载广播一次 present
export function respondToPresencePings(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return
    if (isPing(e.data)) window.postMessage(PRESENT, '*')
  })
  window.postMessage(PRESENT, '*')
}

// 网页调用：发 ping（间隔重试）+ 监听 present，超时判未装
export function detectExtension(timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false
    function onMsg(e: MessageEvent) {
      if (e.source === window && isPresenceReply(e.data)) finish(true)
    }
    function finish(v: boolean) {
      if (done) return
      done = true
      window.removeEventListener('message', onMsg)
      clearInterval(iv)
      clearTimeout(to)
      resolve(v)
    }
    window.addEventListener('message', onMsg)
    const ping = () => window.postMessage(PING, '*')
    ping()
    const iv = setInterval(ping, 300)
    const to = setTimeout(() => finish(false), timeoutMs)
  })
}
