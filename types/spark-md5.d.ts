// spark-md5 没有自带类型声明，也未在 deps 中加入 @types/spark-md5。
// 这里提供本批所需的最小环境声明（仅用到 SparkMD5.hash）。
declare module 'spark-md5' {
  const SparkMD5: {
    hash(str: string, raw?: boolean): string
    hashBinary(content: string, raw?: boolean): string
  }
  export default SparkMD5
}
