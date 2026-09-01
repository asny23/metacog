import { App } from '@tinyhttp/app'
import got from 'got'
import metascraper from 'metascraper'
import metascraper_audio from 'metascraper-audio'
import metascraper_author from 'metascraper-author'
import metascraper_date from 'metascraper-date'
import metascraper_description from 'metascraper-description'
import metascraper_feed from 'metascraper-feed'
import metascraper_iframe from 'metascraper-iframe'
import metascraper_image from 'metascraper-image'
import metascraper_lang from 'metascraper-lang'
import metascraper_logo from 'metascraper-logo'
import metascraper_logo_favicon from 'metascraper-logo-favicon'
import metascraper_publisher from 'metascraper-publisher'
import metascraper_readability from 'metascraper-readability'
import metascraper_title from 'metascraper-title'
import metascraper_url from 'metascraper-url'
import metascraper_video from 'metascraper-video'
import metascraper_x from 'metascraper-x'
import metascraper_youtube from 'metascraper-youtube'
import Redis from 'ioredis'
import NodeCache from 'node-cache'
import net from 'node:net'


const VERSION='3.1.0'
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 86400
const CACHE_CHECK = parseInt(process.env.CACHE_CHECK) || 3600
const port = process.env.PORT || 3000
const ALLOWED_ORIGIN = []
const USE_REDIS = process.env.REDIS_URL !== undefined
const EXPOSE_VERSION = process.env.EXPOSE_VERSION || ''

if (process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN.split(' ').forEach(ao => ALLOWED_ORIGIN.push(new RegExp(ao)))
}

const ssrfError = (message) => Object.assign(new Error(message), { code: 'SSRF_BLOCKED' })

const ipv4ToInt = (ip) =>
  ip.split('.').reduce((acc, octet) => ((acc << 8) >>> 0) + Number(octet), 0) >>> 0

const inV4Range = (ip, base, prefix) => {
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
  return (ipv4ToInt(ip) & mask) === (ipv4ToInt(base) & mask)
}

const BLOCKED_V4_RANGES = [
  ['0.0.0.0', 8], ['10.0.0.0', 8], ['100.64.0.0', 10], ['127.0.0.0', 8],
  ['169.254.0.0', 16], ['172.16.0.0', 12], ['192.0.0.0', 24], ['192.0.2.0', 24],
  ['192.88.99.0', 24], ['192.168.0.0', 16], ['198.18.0.0', 15], ['198.51.100.0', 24],
  ['203.0.113.0', 24], ['224.0.0.0', 4], ['240.0.0.0', 4], ['255.255.255.255', 32],
]

const isBlockedV4 = (ip) => BLOCKED_V4_RANGES.some(([base, prefix]) => inV4Range(ip, base, prefix))

const ipv6ToBytes = (ip) => {
  let text = ip
  const zone = text.indexOf('%')
  if (zone !== -1) text = text.slice(0, zone)
  let embeddedV4 = null
  if (text.includes('.')) {
    const splitAt = text.lastIndexOf(':')
    const v4 = text.slice(splitAt + 1)
    if (!net.isIPv4(v4)) return null
    embeddedV4 = v4.split('.').map(Number)
    text = text.slice(0, splitAt + 1) + '0:0'
  }
  const parts = text.split('::')
  if (parts.length > 2) return null
  const head = parts[0] ? parts[0].split(':') : []
  const tail = parts.length === 2 ? (parts[1] ? parts[1].split(':') : []) : null
  let groups
  if (tail === null) {
    groups = head
  } else {
    const missing = 8 - (head.length + tail.length)
    if (missing < 0) return null
    groups = [...head, ...Array(missing).fill('0'), ...tail]
  }
  if (groups.length !== 8) return null
  const bytes = new Uint8Array(16)
  for (let i = 0; i < 8; i++) {
    const value = parseInt(groups[i] || '0', 16)
    if (Number.isNaN(value) || value < 0 || value > 0xffff) return null
    bytes[i * 2] = value >> 8
    bytes[i * 2 + 1] = value & 0xff
  }
  if (embeddedV4) {
    bytes[12] = embeddedV4[0]
    bytes[13] = embeddedV4[1]
    bytes[14] = embeddedV4[2]
    bytes[15] = embeddedV4[3]
  }
  return bytes
}

const isBlockedV6 = (ip) => {
  const bytes = ipv6ToBytes(ip)
  if (!bytes) return true
  const bytesToV4 = (b) => b[12] + '.' + b[13] + '.' + b[14] + '.' + b[15]
  if (bytes.every((b) => b === 0)) return true
  if (bytes.slice(0, 15).every((b) => b === 0) && bytes[15] === 1) return true
  if (bytes.slice(0, 10).every((b) => b === 0) && bytes[10] === 0xff && bytes[11] === 0xff) {
    return isBlockedV4(bytesToV4(bytes))
  }
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b) {
    return isBlockedV4(bytesToV4(bytes))
  }
  if ((bytes[0] & 0xfe) === 0xfc) return true
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return true
  if (bytes[0] === 0xff) return true
  return false
}

const isBlockedAddress = (ip) => {
  if (net.isIPv4(ip)) return isBlockedV4(ip)
  if (net.isIPv6(ip)) return isBlockedV6(ip)
  return true
}

const assertPublicHttpUrl = (raw) => {
  let url
  try {
    url = new URL(raw)
  } catch {
    throw ssrfError('Invalid URL.')
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw ssrfError('Protocol "' + url.protocol + '" is not allowed.')
  }
  const host = url.hostname.replace(/^\[/, '').replace(/\]$/, '')
  if (net.isIP(host) && isBlockedAddress(host)) {
    throw ssrfError('Requests to this address are not allowed.')
  }
  return url
}

const scraper = metascraper([
  metascraper_audio(),
  metascraper_author(),
  metascraper_date(),
  metascraper_description(),
  metascraper_feed(),
  metascraper_iframe(),
  metascraper_image(),
  metascraper_lang(),
  metascraper_logo(),
  metascraper_logo_favicon(),
  metascraper_publisher(),
  metascraper_readability(),
  metascraper_title(),
  metascraper_url(),
  metascraper_video(),
  metascraper_x(),
  metascraper_youtube(),
])

const redis = (
  USE_REDIS
  ? new Redis(
      (process.env.REDIS_URL || ''),
      {
        commandTimeout: parseInt(process.env.REDIS_TIMEOUT) || 1000,
      }
    )
  : undefined
)
const memCache = (
  USE_REDIS
  ? undefined
  : new NodeCache({
    stdTTL: CACHE_TTL,
    checkperiod: CACHE_CHECK
  })
)

const getCache = async (key) => {
  try {
    return (
      USE_REDIS
        ? JSON.parse(await redis.get(key))
        : memCache.get(key)
    )
  } catch (e) {
    console.error('Error occured on getCache', e)
    return undefined
  }
}

const setCache = async (key, value) => {
  try {
    return (
      USE_REDIS
        ? await redis.set(key, JSON.stringify(value), "EX", CACHE_TTL)
        : memCache.set(key, value)
    )
  } catch (e) {
    console.error('Error occured on setCache', e)
  }
}

console.log(`metacog ${VERSION} start`)
console.log(`  USE_REDIS: ${USE_REDIS}`)
if (redis) {
  redis.on('ready', () => {
    console.log('ioredis client is connected and ready.');
  })
  redis.on('error', (e) => {
    console.error('ioredis connection error:', e);
  })
}

const app = new App({
  settings: { xPoweredBy: false }
})

app.get('/health', (_, res) => res.send('ok!'))

if (EXPOSE_VERSION) {
  app.get('/version', (_, res) => res.send(VERSION))
}

app.get('/', async (req, res) => {
  if (ALLOWED_ORIGIN.length) {
    const reducer = (accumulator, currentValue) => accumulator || currentValue.test(req.headers.origin)
    if (ALLOWED_ORIGIN.reduce(reducer, false)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    } else {
      res.status(400).json({ message: 'Origin not allowed.' })
      return
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  const target = req.query.url?.toString()
  if (!target) {
    res.status(400).json({ message: 'Please supply an URL to be scraped in the url query parameter.' })
    return
  }

  try {
    assertPublicHttpUrl(target)
  } catch (e) {
    res.status(400).json({ message: 'The supplied URL is not allowed.' })
    return
  }

  try {
    const cache = await getCache(target)
    if (cache) {
      res.json(cache)
    } else {
      const { body: html, url } = await got(target)
      const metadata = await scraper({ html, url })
      res.json(metadata)
      await setCache(target, metadata)
    }
  } catch (e) {
    console.error('Error occured during scraping:', err)
    res.status(400).json({ message: `Scraping the open graph data from "${target}" failed.` })
  }
})

app.get('/418', (_, res) => res.status(418).send("I'm a teapot"))

app.listen(port)
