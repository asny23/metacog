FROM bitnami/node:24.3.0 as builder

WORKDIR /app
COPY package*.json .
RUN npm ci


FROM gcr.io/distroless/nodejs24-debian12:latest

WORKDIR /app
EXPOSE 3000
COPY server.js .
COPY --from=builder /app /app

CMD ["server.js"]
