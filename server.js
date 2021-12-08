import { App } from '@tinyhttp/app'

const port = process.env.PORT || 3000

const app = new App()

app.get('/', (_, res) => res.send('<h1>Hello World</h1>'))
app.get('/health', (_, res) => res.send('ok!'))

app.listen(port)
