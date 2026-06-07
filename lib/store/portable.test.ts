import 'fake-indexeddb/auto'
import { describe, it, expect, beforeEach } from 'vitest'
import { usePrefs } from './prefs'
import { useHistory, type HistoryEntry } from './history'
import { buildExport, applyImport } from './portable'

const entry = (id: string, ts: number): HistoryEntry => ({ id, kind: 'tool', toolId: 'json-format', value: id, ts })

beforeEach(() => {
  usePrefs.setState({ theme: 'dark', lang: 'system', tz: 'UTC', favoriteToolIds: [], recentToolIds: [] })
  useHistory.setState({ enabled: true, entries: [] })
})

describe('buildExport', () => {
  it('captures version 1 and current state', () => {
    usePrefs.setState({ favoriteToolIds: ['json-format'] })
    useHistory.setState({ entries: [entry('1', 100)] })
    const out = buildExport()
    expect(out.version).toBe(1)
    expect(out.prefs.favoriteToolIds).toEqual(['json-format'])
    expect(out.history.entries).toHaveLength(1)
  })
})

describe('applyImport', () => {
  it('unions favorites and overrides theme', () => {
    usePrefs.setState({ favoriteToolIds: ['a'], theme: 'dark' })
    applyImport({
      version: 1, exportedAt: 0,
      prefs: { theme: 'light', lang: 'en', tz: 'UTC', favoriteToolIds: ['b'], recentToolIds: [] },
      history: { enabled: true, entries: [] },
    })
    expect(usePrefs.getState().favoriteToolIds.sort()).toEqual(['a', 'b'])
    expect(usePrefs.getState().theme).toBe('light')
  })

  it('dedupes history by id', () => {
    useHistory.setState({ entries: [entry('1', 100)] })
    applyImport({
      version: 1, exportedAt: 0,
      prefs: { theme: 'dark', lang: 'system', tz: 'UTC', favoriteToolIds: [], recentToolIds: [] },
      history: { enabled: true, entries: [entry('1', 100), entry('2', 200)] },
    })
    const ids = useHistory.getState().entries.map((e) => e.id).sort()
    expect(ids).toEqual(['1', '2'])
  })

  it('throws on invalid input and leaves stores unchanged', () => {
    usePrefs.setState({ theme: 'dark' })
    expect(() => applyImport({ nope: true })).toThrow()
    expect(usePrefs.getState().theme).toBe('dark')
  })
})
