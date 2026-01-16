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
  "audio": null,
  "author": null,
  "date": "2025-01-01T00:00:00.000Z",
  "description": "Join the world’s most widely adopted, AI-powered developer platform where millions of developers, businesses, and the largest open source community build software that advances humanity.",
  "feed": null,
  "iframe": null,
  "image": "https://images.ctfassets.net/8aevphvgewt8/4UxhHBs2XnuyZ4lYQ83juV/b61529b087aeb4a318bda311edf4c345/home24.jpg",
  "lang": "en",
  "title": "GitHub · Build and ship software on a single, collaborative platform",
  "logo": "https://github.com/fluidicon.png",
  "publisher": "GitHub",
  "url": "https://github.com/",
  "video": null
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
- `EXPOSE_VERSION`
  - Whether to expose the `/version` endpoint
  - Set to any non-empty value to enable the endpoint
  - if undefined or empty, endpoint is disabled

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
