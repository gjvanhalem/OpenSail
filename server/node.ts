/**
 * OpenSail server: serves the built app and the chart archives, only to
 * signed-in users, plus the account pages and API (auth.ts).
 * Runs on Node 24 (built-in TypeScript type stripping), no dependencies.
 *
 * Env:
 *   PORT           8080
 *   DIST_DIR       the built app (dist)
 *   CHARTS_DIR     chart archives and index.json (/charts)
 *   DATA_DIR       users and the session secret (/data)
 *   PUBLIC_ORIGIN  the https address people open, e.g. https://opensail.g-zeven.nl
 *   OPENSAIL_SETUP_CODE  fixed setup code (tests); otherwise a random one is logged
 */
import { createReadStream, existsSync, statSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { handleAuth, sessionFor, type AuthContext } from './auth.ts'
import { randomToken } from './crypto.ts'
import { Store } from './store.ts'

const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.map': 'application/json',
  '.pmtiles': 'application/octet-stream',
  '.pbf': 'application/x-protobuf',
}

/** Shown on the sign-in pages, so they look right before signing in */
const PUBLIC_FILES = new Set(['/favicon.ico', '/icon.svg', '/apple-touch-icon.png', '/robots.txt'])

export interface ServerOptions {
  port: number
  distDir: string
  chartsDir: string
  dataDir: string
  publicOrigin: string | null
  setupCode?: string | null
  log?: (message: string) => void
}

/** A file inside root, or null for anything that tries to leave it */
function fileIn(root: string, pathname: string): string | null {
  let decoded: string
  try {
    decoded = decodeURIComponent(pathname)
  } catch {
    return null
  }
  const file = normalize(join(root, decoded))
  return file === root || file.startsWith(root + sep) ? file : null
}

function isFile(file: string): boolean {
  return existsSync(file) && statSync(file).isFile()
}

/** Serve a file, with byte ranges (PMTiles reads archives in pieces) and ETag revalidation */
function sendFile(req: IncomingMessage, res: ServerResponse, file: string, cacheControl: string): void {
  const stat = statSync(file)
  const etag = `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`
  res.setHeader('Content-Type', TYPES[extname(file)] ?? 'application/octet-stream')
  res.setHeader('Cache-Control', cacheControl)
  res.setHeader('ETag', etag)
  res.setHeader('Accept-Ranges', 'bytes')

  const range = req.headers.range
  if (!range && req.headers['if-none-match'] === etag) {
    res.statusCode = 304
    return void res.end()
  }

  let start = 0
  let end = stat.size - 1
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range)
    if (!match || (!match[1] && !match[2])) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${stat.size}`)
      return void res.end()
    }
    if (match[1]) {
      start = Number(match[1])
      if (match[2]) end = Math.min(Number(match[2]), stat.size - 1)
    } else {
      start = Math.max(0, stat.size - Number(match[2])) // suffix: the last n bytes
    }
    if (start > end || start >= stat.size) {
      res.statusCode = 416
      res.setHeader('Content-Range', `bytes */${stat.size}`)
      return void res.end()
    }
    res.statusCode = 206
    res.setHeader('Content-Range', `bytes ${start}-${end}/${stat.size}`)
  }
  res.setHeader('Content-Length', end - start + 1)
  if (req.method === 'HEAD') return void res.end()
  createReadStream(file, { start, end }).pipe(res)
}

function cacheFor(name: string): string {
  // Hashed build assets never change; everything else must revalidate (index.html, sw.js, manifest)
  return name.startsWith('/assets/') ? 'private, max-age=31536000, immutable' : 'no-cache'
}

/** Copy a fetch Response onto the Node response */
async function sendResponse(res: ServerResponse, response: Response): Promise<void> {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.end(Buffer.from(await response.arrayBuffer()))
}

async function toRequest(req: IncomingMessage, origin: string): Promise<Request> {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += (chunk as Buffer).length
    if (size > 64 * 1024) throw new Error('body too large')
    chunks.push(chunk as Buffer)
  }
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    if (typeof value === 'string') headers.set(name, value)
    else if (Array.isArray(value)) headers.set(name, value.join(', '))
  }
  return new Request(origin + (req.url ?? '/'), {
    method: req.method,
    headers,
    body: chunks.length && req.method !== 'GET' && req.method !== 'HEAD' ? Buffer.concat(chunks) : undefined,
  })
}

export function startServer(options: ServerOptions) {
  const log = options.log ?? ((message: string) => console.log(`[opensail] ${message}`))
  const dist = resolve(options.distDir)
  const charts = resolve(options.chartsDir)
  let store: Store
  try {
    store = new Store(join(resolve(options.dataDir), 'users.json'))
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code
    if (code === 'EACCES' || code === 'EPERM') {
      throw new Error(
        `Can't write the data folder ${options.dataDir} (users are stored there). ` +
          `On the host, make it writable for uid 1000, e.g.: chown 1000:1000 ./data`,
      )
    }
    throw error
  }

  let setupCode: string | null = null
  if (!store.hasUsers()) {
    setupCode = options.setupCode ?? randomToken(9)
    log(`No users yet. Open the app and create the first admin with setup code: ${setupCode}`)
  }

  const server = createServer(async (req, res) => {
    try {
      res.setHeader('X-Content-Type-Options', 'nosniff')
      res.setHeader('Referrer-Policy', 'same-origin')
      const pathname = new URL(req.url ?? '/', 'http://x').pathname
      if (pathname === '/healthz') return void res.end('ok')

      const origin = options.publicOrigin ?? `http://${req.headers.host ?? `localhost:${options.port}`}`
      const forwarded = req.headers['cf-connecting-ip']
      const ctx: AuthContext = {
        store,
        get setupCode() {
          return setupCode
        },
        set setupCode(value) {
          setupCode = value
        },
        publicOrigin: options.publicOrigin,
        clientIp: (typeof forwarded === 'string' ? forwarded : req.socket.remoteAddress) ?? 'unknown',
      }
      const request = await toRequest(req, origin)

      const authResponse = await handleAuth(request, ctx)
      if (authResponse) return void (await sendResponse(res, authResponse))

      if (PUBLIC_FILES.has(pathname)) {
        const file = fileIn(dist, pathname)
        if (file && isFile(file)) return sendFile(req, res, file, 'public, max-age=86400')
      }

      if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.statusCode = 405
        return void res.end()
      }

      // Everything else needs a signed-in user
      const session = sessionFor(request, ctx)
      if (!session) {
        const wantsPage = (req.headers.accept ?? '').includes('text/html') && !pathname.startsWith('/charts/')
        if (wantsPage) {
          res.statusCode = 302
          res.setHeader('Location', `/login?next=${encodeURIComponent(pathname)}`)
          res.setHeader('Cache-Control', 'no-store')
          return void res.end()
        }
        res.statusCode = 401
        res.setHeader('Content-Type', 'application/json')
        res.setHeader('Cache-Control', 'no-store')
        return void res.end('{"error":"signed_out","message":"Sign in first."}')
      }
      if (session.renewCookie) res.setHeader('Set-Cookie', session.renewCookie)

      if (pathname.startsWith('/charts/')) {
        const file = fileIn(charts, pathname.slice('/charts'.length))
        if (!file || !isFile(file)) {
          res.statusCode = 404
          return void res.end('Not found')
        }
        return sendFile(req, res, file, 'private, no-cache')
      }

      let file = fileIn(dist, pathname)
      if (!file) {
        res.statusCode = 400
        return void res.end()
      }
      if (!isFile(file)) {
        // Single-page app: client routes (/chart, /routes, ...) get index.html
        if (extname(pathname) && extname(pathname) !== '.html') {
          res.statusCode = 404
          return void res.end('Not found')
        }
        file = join(dist, 'index.html')
      }
      sendFile(req, res, file, cacheFor(file.slice(dist.length).replace(/\\/g, '/')))
    } catch (error) {
      log(`error: ${error instanceof Error ? error.stack : String(error)}`)
      if (!res.headersSent) res.statusCode = 500
      res.end()
    }
  })

  return new Promise<{ port: number; close: () => Promise<void> }>((resolvePromise) => {
    server.listen(options.port, () => {
      const address = server.address()
      const port = typeof address === 'object' && address ? address.port : options.port
      log(`listening on :${port}, public address ${options.publicOrigin ?? '(from the Host header)'}`)
      resolvePromise({ port, close: () => new Promise((done) => server.close(() => done())) })
    })
  })
}

// Started directly: node server/node.ts
if (import.meta.main) {
  const env = process.env
  const options: ServerOptions = {
    port: Number(env.PORT ?? 8080),
    distDir: env.DIST_DIR ?? 'dist',
    chartsDir: env.CHARTS_DIR ?? '/charts',
    dataDir: env.DATA_DIR ?? '/data',
    publicOrigin: env.PUBLIC_ORIGIN?.replace(/\/$/, '') ?? null,
    setupCode: env.OPENSAIL_SETUP_CODE ?? null,
  }
  if (!options.publicOrigin) {
    console.warn('[opensail] PUBLIC_ORIGIN is not set: cookies are not marked Secure. Fine for local tests only.')
  }
  const server = await startServer(options)
  for (const signal of ['SIGTERM', 'SIGINT'] as const) {
    process.on(signal, () => void server.close().then(() => process.exit(0)))
  }
}
