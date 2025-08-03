FROM bitnami/node:24.3.0 AS builder

WORKDIR /app
COPY package*.json .
RUN npm ci


FROM gcr.io/distroless/nodejs24-debian12:nonroot

WORKDIR /app
EXPOSE 3000
COPY --from=builder --chown=nonroot:nonroot /app /app
COPY --chown=nonroot:nonroot server.js .

CMD ["server.js"]
