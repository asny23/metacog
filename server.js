import { App } from '@tinyhttp/app'
import got from 'got'
import metascraper from 'metascraper'
import metascraper_author from 'metascraper-author'
import metascraper_date from 'metascraper-date'
import metascraper_description from 'metascraper-description'
import metascraper_image from 'metascraper-image'
import metascraper_lang from 'metascraper-lang'
import metascraper_logo from 'metascraper-logo'
import metascraper_publisher from 'metascraper-publisher'
import metascraper_title from 'metascraper-title'
import metascraper_url from 'metascraper-url'
import metascraper_youtube from 'metascraper-youtube'
import metascraper_instagram from 'metascraper-instagram'
import NodeCache from 'node-cache'

const CACHE_TTL = parseInt(process.env.CACHE_TTL) || 86400
const CACHE_CHECK = parseInt(process.env.CACHE_CHECK) || 3600
const port = process.env.PORT || 3000
const ALLOWED_ORIGIN = []

if(process.env.ALLOWED_ORIGIN) {
  process.env.ALLOWED_ORIGIN.split(' ').forEach(ao => ALLOWED_ORIGIN.push(new RegExp(ao)))
}

const scraper = metascraper([
  metascraper_author(),
  metascraper_date(),
  metascraper_description(),
  metascraper_image(),
  metascraper_lang(),
  metascraper_logo(),
  metascraper_publisher(),
  metascraper_title(),
  metascraper_url(),
  metascraper_youtube(),
  metascraper_instagram()
])

const myCache = new NodeCache({
  stdTTL: CACHE_TTL,
  checkperiod: CACHE_CHECK
})

const app = new App({
  settings: { xPoweredBy: false }
})

app.get('/health', (_, res) => res.send('ok!'))

app.get('/', async (req, res) => {
  if (ALLOWED_ORIGIN.length) {
    const reducer = (accumulator, currentValue) => accumulator || currentValue.test(req.headers.origin)
    if (ALLOWED_ORIGIN.reduce(reducer, false)) {
      res.setHeader('Access-Control-Allow-Origin', req.headers.origin)
    } else {
      res.status(400).json({ message: 'Origin not allowed.' })
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  const target = req.query.url?.toString()
  if (!target) {
    res.status(400).json({ message: 'Please supply an URL to be scraped in the url query parameter.' })
  }
  try {
    const cache = myCache.get(target)
    if (cache) {
      res.json(cache)
    } else {
      const { body: html, url } = await got(target)
      const metadata = await scraper({ html, url })
      myCache.set(target, metadata)
      res.json(metadata)
    }
  } catch (err) {
    console.log('Error occured during scraping:', err)
    res.status(400).json({ message: `Scraping the open graph data from "${target}" failed.` })
  }
})

app.listen(port)
