# Build frontend
FROM node:20-alpine AS frontend
WORKDIR /app
COPY package.json package-lock.json ./
COPY webpack.config.js tsconfig.json eslint.config.mjs ./
COPY client ./client
COPY html ./html
RUN npm ci && npx webpack --config webpack.config.js

# Build Go binary
FROM --platform=$BUILDPLATFORM golang:alpine AS build
ARG TARGETOS
ARG TARGETARCH
ARG VERSION=UNKNOWN
WORKDIR /app
COPY --from=frontend /app/dist/frontend /app/dist/frontend
COPY html/all-licenses.txt /app/html/
COPY go.mod go.sum ./
COPY main.go ./
COPY server ./server
RUN CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -ldflags="-s -w -X main.Version=${VERSION}" -o webtimer .

# Runtime
FROM scratch
COPY --from=build /app/webtimer /webtimer
EXPOSE 8000
ENTRYPOINT ["/webtimer"]
