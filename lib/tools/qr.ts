import QRCode from 'qrcode'
import { ok, err, type ToolResult } from './types'

export async function generateQrSvg(text: string): Promise<ToolResult> {
  if (!text.trim()) return err('输入为空')
  try {
    const svg = await QRCode.toString(text, { type: 'svg', margin: 1, width: 240 })
    return ok(svg)
  } catch (e) {
    return err(e instanceof Error ? e.message : '生成失败')
  }
}
