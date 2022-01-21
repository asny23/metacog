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
  "description": "GitHub is where over 73 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories, review code like a pro, track bugs and feat...",
  "image": "https://github.githubassets.com/images/modules/site/social-cards/github-social.png",
  "lang": "en",
  "logo": null,
  "publisher": "GitHub",
  "title": "GitHub: Where the world builds software",
  "url": "https://github.com"
}
```

## Run locally

- Requirements
  - Node.js 16
  - npm@8

```shell
$ npm i
$ npm run start
```

## Use container image

See [Container registry](https://github.com/asny23/metacog/pkgs/container/metacog)

## Build Docker image

```shell
$ docker build .
```

## Configuration
environment variables:
- `CACHE_TTL` : Memory cache retention period for fetched data. in seconds. set `0` for infinity.
- `CACHE_CHECK` : Cache expiration check interval. in seconds.

## Deploy to [Fly.io](https://fly.io)

1. Set up your account & app
1. `$ cp sample.fly.toml fly.toml`
1. Enter your app name in `fly.toml`
1. `$ flyctl deploy`
