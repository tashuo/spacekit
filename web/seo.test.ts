import { describe, it, expect } from 'vitest'
import { MESSAGES } from '@/lib/i18n/messages'
import { TOOLS } from '@/lib/tools/registry'
import {
  extractToolNames,
  buildHeadTags,
  buildContentBlock,
  buildRobots,
  buildSitemap,
  buildLlmsTxt,
} from './seo'

const URL = 'https://example.test'
const NAMES = ['JSON Format', 'Base64 Decode']

describe('extractToolNames', () => {
  it('pulls English names from tool.* keys', () => {
    const names = extractToolNames({
      'tool.json-format': { en: 'JSON Format', zh: 'x' },
      'nav.tools': { en: 'Tools', zh: 'y' },
    })
    expect(names).toEqual(['JSON Format'])
  })

  it('covers every registry tool (anti-drift)', () => {
    for (const tool of TOOLS) {
      expect(MESSAGES[`tool.${tool.id}`]?.en, `missing en name for ${tool.id}`).toBeTruthy()
    }
    expect(extractToolNames(MESSAGES).length).toBe(TOOLS.length)
  })
})

describe('buildHeadTags', () => {
  const head = buildHeadTags({ url: URL, toolNames: NAMES })
  it('has description, canonical, og:image and JSON-LD with featureList', () => {
    expect(head).toContain('<meta name="description"')
    expect(head).toContain(`<link rel="canonical" href="${URL}/"`)
    expect(head).toContain(`${URL}/og.png`)
    expect(head).toContain('"@type":"WebApplication"')
    expect(head).toContain('JSON Format')
  })
  it('injects google-site-verification only when a token is given', () => {
    expect(buildHeadTags({ url: URL, toolNames: NAMES, verification: 'tok123' })).toContain(
      '<meta name="google-site-verification" content="tok123" />',
    )
    expect(buildHeadTags({ url: URL, toolNames: NAMES })).not.toContain('google-site-verification')
  })
})

describe('buildContentBlock', () => {
  const block = buildContentBlock(NAMES)
  it('has an h1, every tool name, and a noscript', () => {
    expect(block).toContain('<h1')
    expect(block).toContain('JSON Format')
    expect(block).toContain('Base64 Decode')
    expect(block).toContain('<noscript')
  })
})

describe('robots / sitemap / llms', () => {
  it('robots has Allow and a Sitemap line', () => {
    const r = buildRobots(URL)
    expect(r).toContain('Allow: /')
    expect(r).toContain(`Sitemap: ${URL}/sitemap.xml`)
  })
  it('sitemap is valid xml with the url', () => {
    const s = buildSitemap(URL)
    expect(s).toContain('<?xml')
    expect(s).toContain(`<loc>${URL}/</loc>`)
  })
  it('llms.txt has the url and tool names', () => {
    const l = buildLlmsTxt({ url: URL, toolNames: NAMES })
    expect(l).toContain(URL)
    expect(l).toContain('JSON Format')
  })
})
