FROM bitnami/node:18.13.0 as builder

WORKDIR /app
COPY package*.json .
RUN npm ci


FROM gcr.io/distroless/nodejs-debian11:18

WORKDIR /app
EXPOSE 3000
COPY server.js .
COPY --from=builder /app /app

CMD ["server.js"]
