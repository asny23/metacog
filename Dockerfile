FROM node:26.10.0-slim AS builder

WORKDIR /app
COPY package*.json .
RUN npm ci


FROM gcr.io/distroless/nodejs26-debian13:nonroot

WORKDIR /app
EXPOSE 3000
COPY --from=builder --chown=nonroot:nonroot /app /app
COPY --chown=nonroot:nonroot server.js .

CMD ["server.js"]
