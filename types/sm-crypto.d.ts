declare module 'sm-crypto' {
  export const sm3: (msg: string) => string
  export const sm4: {
    encrypt: (msg: string, key: string) => string
    decrypt: (cipher: string, key: string) => string
  }
}
