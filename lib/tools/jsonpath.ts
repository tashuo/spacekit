import { JSONPath } from 'jsonpath-plus'
import { ok, err, type ToolResult } from './types'

export function queryJsonPath(json: string, path: string): ToolResult {
  if (!json.trim()) return err('输入为空')
  if (!path.trim()) return err('请输入 JSONPath 表达式')
  let data: unknown
  try {
    data = JSON.parse(json)
  } catch {
    return err('非法 JSON')
  }
  try {
    const result = JSONPath({ path, json: data as object })
    return ok(JSON.stringify(result, null, 2))
  } catch (e) {
    return err(e instanceof Error ? e.message : 'JSONPath 查询失败')
  }
}
