import type { Plugin } from 'vite'
import { MESSAGES } from '../lib/i18n/messages'
import { WEB_APP_URL, GOOGLE_SITE_VERIFICATION } from '../lib/config'

const TITLE = 'SpaceKit — Local-first developer toolbox (JSON, Base64, JWT, timestamp, hash)'
const DESCRIPTION =
  '57 developer utilities — JSON, Base64, URL, JWT, timestamps, hashing, QR, formatters and more — running entirely in your browser. Zero network requests, no tracking, no sign-up.'
const TAGLINE_ZH = '本地优先的开发者工具箱 · 零网络 · 不收集数据'

type Dict = Record<string, { en: string; [k: string]: string }>

// 取 tool.* 的英文名（注册表 = 单一来源，messages 与之一一对应，见测试防漂移）
export function extractToolNames(messages: Dict): string[] {
  return Object.keys(messages)
    .filter((k) => k.startsWith('tool.'))
    .map((k) => messages[k].en)
}

function jsonLd(url: string, toolNames: string[]): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'SpaceKit',
    url: `${url}/`,
    description: DESCRIPTION,
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any (web browser)',
    browserRequirements: 'Requires JavaScript',
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    featureList: toolNames,
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

export function buildHeadTags({
  url,
  toolNames,
  verification,
}: {
  url: string
  toolNames: string[]
  verification?: string
}): string {
  const img = `${url}/og.png`
  const tags = [
    `<title>${TITLE}</title>`,
    `<meta name="description" content="${DESCRIPTION}" />`,
    `<link rel="canonical" href="${url}/" />`,
    `<meta name="robots" content="index,follow" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:site_name" content="SpaceKit" />`,
    `<meta property="og:title" content="${TITLE}" />`,
    `<meta property="og:description" content="${DESCRIPTION}" />`,
    `<meta property="og:url" content="${url}/" />`,
    `<meta property="og:image" content="${img}" />`,
    `<meta property="og:locale" content="en_US" />`,
    `<meta property="og:locale:alternate" content="zh_CN" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${TITLE}" />`,
    `<meta name="twitter:description" content="${DESCRIPTION}" />`,
    `<meta name="twitter:image" content="${img}" />`,
    jsonLd(url, toolNames),
  ]
  if (verification) {
    tags.push(`<meta name="google-site-verification" content="${verification}" />`)
  }
  return tags.join('\n    ')
}

export function buildContentBlock(toolNames: string[]): string {
  const items = toolNames.map((n) => `<li>${n}</li>`).join('')
  return [
    `<main style="max-width:48rem;margin:0 auto;padding:2.5rem 1.5rem;color:#3f3f46;font-family:system-ui,-apple-system,sans-serif;line-height:1.6">`,
    `<h1 style="font-size:1.5rem;font-weight:600;color:#18181b">SpaceKit — Local-first developer toolbox</h1>`,
    `<p>${DESCRIPTION}</p>`,
    `<p>${TAGLINE_ZH}</p>`,
    `<p>Categories: JSON, Convert, Format, Codec, Timestamp, Crypto, Text.</p>`,
    `<ul>${items}</ul>`,
    `<noscript>JavaScript is required to use the interactive tools.</noscript>`,
    `</main>`,
  ].join('')
}

export function buildRobots(url: string): string {
  return [
    '# SpaceKit — a privacy-friendly developer toolbox. AI crawlers welcome.',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${url}/sitemap.xml`,
    '',
  ].join('\n')
}

export function buildSitemap(url: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `  <url><loc>${url}/</loc><changefreq>monthly</changefreq><priority>1.0</priority></url>`,
    '</urlset>',
    '',
  ].join('\n')
}

export function buildLlmsTxt({ url, toolNames }: { url: string; toolNames: string[] }): string {
  const tools = toolNames.map((n) => `- ${n}`).join('\n')
  return [
    '# SpaceKit',
    '',
    `> ${DESCRIPTION}`,
    '',
    '## App',
    `- [SpaceKit](${url}/): command palette + all 57 tools, runs entirely in the browser`,
    '',
    '## Tools',
    tools,
    '',
    '## Notes',
    '- Privacy: all processing happens locally in your browser; nothing is uploaded.',
    '- Also available as a Chrome extension.',
    '',
  ].join('\n')
}

// Vite 插件：注入 head 与 #root 内容块；产出 robots/sitemap/llms
export function seoPlugin(): Plugin {
  const toolNames = extractToolNames(MESSAGES as Dict)
  const url = WEB_APP_URL.replace(/\/$/, '')
  return {
    name: 'spacekit-seo',
    transformIndexHtml(html) {
      return html
        .replace(/<title>[\s\S]*?<\/title>\s*/, '')
        .replace(
          '</head>',
          `    ${buildHeadTags({ url, toolNames, verification: GOOGLE_SITE_VERIFICATION })}\n  </head>`,
        )
        .replace('<div id="root"></div>', `<div id="root">${buildContentBlock(toolNames)}</div>`)
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'robots.txt', source: buildRobots(url) })
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: buildSitemap(url) })
      this.emitFile({ type: 'asset', fileName: 'llms.txt', source: buildLlmsTxt({ url, toolNames }) })
    },
  }
}
