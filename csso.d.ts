// csso 5.x 未自带类型声明，按用到的 API 补充最小声明。
declare module 'csso' {
  export function minify(
    source: string,
    options?: { restructure?: boolean; comments?: boolean | 'exclamation' | 'first-exclamation' | 'none' },
  ): { css: string }
}
