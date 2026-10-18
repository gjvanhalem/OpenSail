# syntax=docker/dockerfile:1
# OpenSail web app: the PWA built with Vite, served by nginx.
# Chart archives (PMTiles) are not in the image: mount them at /charts (see DEPLOY.md).

# ---- build
FROM node:22-alpine AS build
WORKDIR /app
COPY pwa/package.json pwa/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY pwa/ ./
RUN npm run build

# ---- runtime: unprivileged nginx listens on 8080
FROM nginxinc/nginx-unprivileged:1.27-alpine
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1
