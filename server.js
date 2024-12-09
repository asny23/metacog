import { App } from '@tinyhttp/app'
import got from 'got'
import metascraper from 'metascraper'
import metascraper_audio from 'metascraper-audio'
import metascraper_author from 'metascraper-author'
import metascraper_date from 'metascraper-date'
import metascraper_description from 'metascraper-description'
import metascraper_feed from 'metascraper-feed'
import metascraper_image from 'metascraper-image'
import metascraper_lang from 'metascraper-lang'
import metascraper_logo from 'metascraper-logo'
import metascraper_logo_favicon from 'metascraper-logo-favicon'
import metascraper_publisher from 'metascraper-publisher'
import metascraper_telegram from 'metascraper-telegram'
import metascraper_title from 'metascraper-title'
import metascraper_twitter from 'metascraper-twitter'
import metascraper_url from 'metascraper-url'
import metascraper_youtube from 'metascraper-youtube'
import metascraper_instagram from 'metascraper-instagram'
import metascraper_video from 'metascraper-video'
import Redis from 'ioredis'
import NodeCache from 'node-cache'


const VERSION='2.3.0'
const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 86400
const CACHE_CHECK = parseInt(process.env.CACHE_CHECK) || 3600
const port = process.env.PORT || 3000
const ALLOWED_ORIGIN = []
const USE_REDIS = process.env.REDIS_HOST !== undefined

if(process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN.split(' ').forEach(ao => ALLOWED_ORIGIN.push(new RegExp(ao)))
}

const scraper = metascraper([
  metascraper_audio(),
  metascraper_author(),
  metascraper_date(),
  metascraper_description(),
  metascraper_feed(),
  metascraper_image(),
  metascraper_instagram(),
  metascraper_lang(),
  metascraper_logo(),
  metascraper_logo_favicon(),
  metascraper_publisher(),
  metascraper_telegram(),
  metascraper_title(),
  metascraper_twitter(),
  metascraper_url(),
  metascraper_youtube(),
  metascraper_video(),
])

const redis = (
  USE_REDIS
  ? new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      family: parseInt(process.env.REDIS_FAMILY) || 4,
      username: process.env.REDIS_USER || 'default',
      password: process.env.REDIS_PASS || '',
      commandTimeout: parseInt(process.env.REDIS_TIMEOUT) || 1000,
    })
  : undefined
)
const memCache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_CHECK
})

const getCache = async (key) => {
  try {
    return (
      USE_REDIS
        ? JSON.parse(await redis.get(key))
        : memCache.get(key)
    )
  } catch(e) {
    console.log('Error occured on getCache', e)
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
  } catch(e) {
    console.log('Error occured on setCache', e)
  }
}

console.log(`metacog ${VERSION} start`)
console.log(`  USE_REDIS: ${USE_REDIS}`)

const app = new App({
  settings: { xPoweredBy: false }
})

app.get('/health', (_, res) => res.send('ok!'))

app.get('/version', (_, res) => res.send(VERSION))

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
    const cache = await getCache(target)
    if (cache) {
      res.json(cache)
    } else {
      const { body: html, url } = await got(target)
      const metadata = await scraper({ html, url })
      res.json(metadata)
      await setCache(target, metadata)
    }
  } catch (err) {
    console.log('Error occured during scraping:', err)
    res.status(400).json({ message: `Scraping the open graph data from "${target}" failed.` })
  }
})

app.get('/418', (_, res) => res.status(418).send("I'm a teapot"))

app.listen(port)
