// 环境无关的键值存储：扩展走 chrome.storage.local，Web 走 IndexedDB。
// 由运行时探测在模块加载时选定，上层 store 只依赖 Kv 接口。
export interface Kv {
  get<T>(key: string): Promise<T | undefined>
  set(key: string, value: unknown): Promise<void>
  remove(key: string): Promise<void>
}

// ---- 扩展实现：chrome.storage.local ----
export const chromeKv: Kv = {
  async get<T>(key: string) {
    const stored = await chrome.storage.local.get(key)
    return stored?.[key] as T | undefined
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value })
  },
  async remove(key) {
    await chrome.storage.local.remove(key)
  },
}

// ---- Web 实现：IndexedDB（单 store），失败时降级为内存态 ----
const DB_NAME = 'spacekit'
const STORE = 'kv'
const mem = new Map<string, unknown>()

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const req = run(db.transaction(STORE, mode).objectStore(STORE))
        req.onsuccess = () => resolve(req.result as T)
        req.onerror = () => reject(req.error)
      }),
  )
}

export const idbKv: Kv = {
  async get<T>(key: string) {
    try {
      return await tx<T | undefined>('readonly', (s) => s.get(key))
    } catch (e) {
      console.warn('[spacekit] idb get failed, using memory', e)
      return mem.get(key) as T | undefined
    }
  },
  async set(key, value) {
    mem.set(key, value)
    try {
      await tx('readwrite', (s) => s.put(value, key))
    } catch (e) {
      console.warn('[spacekit] idb set failed, memory only', e)
    }
  },
  async remove(key) {
    mem.delete(key)
    try {
      await tx('readwrite', (s) => s.delete(key))
    } catch (e) {
      console.warn('[spacekit] idb remove failed, memory only', e)
    }
  },
}

// ---- 运行时选择 ----
function hasChromeStorage(): boolean {
  return typeof chrome !== 'undefined' && !!chrome.storage?.local
}

export const kv: Kv = hasChromeStorage() ? chromeKv : idbKv
