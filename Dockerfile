FROM bitnami/node:16-prod as builder

WORKDIR /app
COPY package*.json .
RUN npm ci


FROM gcr.io/distroless/nodejs-debian11:16

WORKDIR /app
EXPOSE 3000
COPY server.js .
COPY --from=builder /app /app

CMD ["server.js"]
