# metacog

a tiny metadata retriever with [metascraper](https://metascraper.js.org/)


## Usage

1. Launch server.
2. Request to server with site URL in `url` parameter.

## Behavior

`$ curl https://your-metacog-server/?url=https://github.com`

returns

```json
{
  "author": null,
  "date": null,
  "description": "GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and fea…",
  "feed": null,
  "image": "https://github.githubassets.com/images/modules/site/social-cards/campaign-social.png",
  "lang": "en",
  "logo": null,
  "publisher": "GitHub",
  "title": "GitHub: Let’s build from here",
  "video": null,
  "url": "https://github.com/"
}
```

## Run locally

- Requirements
  - Node.js 24.x
  - npm@11

```shell
$ npm i
$ npm run dev
```

## Run locally with compose

- Requirements
  - Docker Desktop or equivalent

```shell
$ docker compose up
```

## Use container image

See [Container registry](https://github.com/asny23/metacog/pkgs/container/metacog)

## Build Docker image

```shell
$ docker build .
```

## Configuration
environment variables:
- `PORT`
  - Port to expose app
  - if undefined, 3000
- `REDIS_URL`
  - Redis/Valkey host for caching
  - if undefined, memory cache is used
- `REDIS_TIMEOUT`
  - Redis command timeout
  - in millisecond
- `ALLOWED_ORIGIN`
  - Allowed origins for CORS
  - Write in space-delimited regular expressions
  - `Access-Control-Allow-Origin`
  - set blank for `Access-Control-Allow-Origin: *`
- `CACHE_TTL`
  - Cache retention period for fetched data
  - in seconds
  - if undefined, 24hour
- `CACHE_CHECK`
  - Effective only with memory cache
  - Cache expiration check interval
  - in seconds

## Deploy to [Render](https://render.com)

[Render Blueprints (IaC) – Render Docs](https://render.com/docs/infrastructure-as-code)

1. Set up your account
1. Edit render.yaml
1. Commit & push
1. Apply it in Render dashboard

## Deploy to [Fly.io](https://fly.io)

1. Set up your account & app & cli
1. `$ flyctl redis create` (if you use Redis)
1. `$ cp sample.fly.toml fly.toml`
1. Enter your app name in `fly.toml`
1. `$ npm run deploy`
