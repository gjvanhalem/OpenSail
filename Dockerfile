# syntax=docker/dockerfile:1
# OpenSail: the PWA built with Vite, served by the OpenSail server (server/)
# with user accounts. Chart archives (PMTiles) are mounted at /charts, users
# and the session secret live in /data (see DEPLOY.md).

# ---- build the app
FROM node:24-alpine AS build
WORKDIR /app
COPY pwa/package.json pwa/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY pwa/ ./
RUN npm run build

# ---- runtime: Node 24 runs the server's TypeScript directly, no dependencies
FROM node:24-alpine
ENV NODE_ENV=production PORT=8080 DIST_DIR=/app/dist CHARTS_DIR=/charts DATA_DIR=/data
WORKDIR /app
COPY --from=build /app/dist ./dist
COPY server/package.json server/node.ts server/auth.ts server/crypto.ts server/pages.ts server/store.ts ./server/
RUN mkdir -p /data /charts && chown node:node /data
USER node
EXPOSE 8080
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
  CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/node.ts"]
