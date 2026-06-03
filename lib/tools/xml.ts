import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import { ok, err, type ToolResult } from './types'

const OPTS = { ignoreAttributes: false, attributeNamePrefix: '@_' }
const parser = new XMLParser(OPTS)
const builder = new XMLBuilder({ ...OPTS, format: true, indentBy: '  ' })

export function xmlToJson(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(JSON.stringify(parser.parse(input), null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 XML')
  }
}

export function jsonToXml(input: string): ToolResult {
  if (!input.trim()) return err('输入为空')
  try {
    return ok(builder.build(JSON.parse(input)))
  } catch (e) {
    return err(e instanceof Error ? e.message : '非法 JSON')
  }
}
