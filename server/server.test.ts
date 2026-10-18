// node --test server/  (Node 24: runs TypeScript directly)
import { test, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { request as httpRequest } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resetRateLimits } from './auth.ts'
import { startServer } from './node.ts'

const SETUP_CODE = 'test-setup-code'
const ADMIN = { email: 'skipper@example.com', name: 'Skipper', password: 'correct horse battery' }

/** A fresh server with a tiny app and one chart archive */
async function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'opensail-server-'))
  const dist = join(root, 'dist')
  mkdirSync(join(dist, 'assets'), { recursive: true })
  writeFileSync(join(dist, 'index.html'), '<!doctype html><title>OpenSail app</title>')
  writeFileSync(join(dist, 'sw.js'), 'self.addEventListener("install", () => {})')
  writeFileSync(join(dist, 'favicon.ico'), 'icon')
  writeFileSync(join(dist, 'assets', 'index-abc123.js'), 'console.log(1)')
  const charts = join(root, 'charts')
  mkdirSync(charts)
  writeFileSync(join(charts, 'index.json'), '{"version":1,"regions":[]}')
  writeFileSync(join(charts, 'test.pmtiles'), Buffer.from('0123456789abcdef'))
  const data = join(root, 'data')
  const server = await startServer({
    port: 0, distDir: dist, chartsDir: charts, dataDir: data, publicOrigin: null, setupCode: SETUP_CODE, log: () => {},
  })
  const base = `http://localhost:${server.port}`
  return { server, base, data }
}

/** fetch with a cookie jar, like one browser */
function browser(base: string) {
  let cookie = ''
  return {
    get cookie() { return cookie },
    set cookie(value: string) { cookie = value },
    async fetch(path: string, init: RequestInit & { json?: unknown } = {}) {
      const headers = new Headers(init.headers)
      if (cookie) headers.set('cookie', cookie)
      if (init.json !== undefined) headers.set('content-type', 'application/json')
      const response = await fetch(base + path, {
        ...init,
        headers,
        body: init.json !== undefined ? JSON.stringify(init.json) : init.body,
        redirect: 'manual',
      })
      const set = response.headers.getSetCookie().find((c) => c.startsWith('opensail_session='))
      if (set) cookie = set.split(';')[0].endsWith('=') ? '' : set.split(';')[0]
      return response
    },
  }
}

async function withAdmin() {
  const f = await fixture()
  const admin = browser(f.base)
  const res = await admin.fetch('/api/setup', { method: 'POST', json: { code: SETUP_CODE, ...ADMIN } })
  assert.equal(res.status, 201)
  return { ...f, admin }
}

beforeEach(() => resetRateLimits())

test('before setup: everything sends you to setup, nothing is served', async () => {
  const { server, base } = await fixture()
  try {
    const visitor = browser(base)
    let res = await visitor.fetch('/chart', { headers: { accept: 'text/html' } })
    assert.equal(res.status, 302)
    assert.equal(res.headers.get('location'), '/login?next=%2Fchart')
    res = await visitor.fetch('/login')
    assert.equal(res.headers.get('location'), '/setup')
    res = await visitor.fetch('/setup')
    assert.equal(res.status, 200)
    assert.match(await res.text(), /Setup code/)
    for (const path of ['/charts/index.json', '/sw.js', '/assets/index-abc123.js', '/api/me']) {
      assert.equal((await visitor.fetch(path)).status, 401, path)
    }
    assert.equal((await visitor.fetch('/favicon.ico')).status, 200)
    assert.equal(await (await visitor.fetch('/healthz')).text(), 'ok')
  } finally {
    await server.close()
  }
})

test('setup: needs the code, creates the first admin once', async () => {
  const { server, base, data } = await fixture()
  try {
    const visitor = browser(base)
    let res = await visitor.fetch('/api/setup', { method: 'POST', json: { code: 'wrong', ...ADMIN } })
    assert.equal(res.status, 403)
    res = await visitor.fetch('/api/setup', { method: 'POST', json: { code: SETUP_CODE, ...ADMIN, password: 'short' } })
    assert.equal(res.status, 400)
    res = await visitor.fetch('/api/setup', { method: 'POST', json: { code: SETUP_CODE, ...ADMIN } })
    assert.equal(res.status, 201)
    assert.equal((await res.json()).user.role, 'admin')
    assert.ok(visitor.cookie)
    res = await browser(base).fetch('/api/setup', { method: 'POST', json: { code: SETUP_CODE, ...ADMIN, email: 'b@example.com' } })
    assert.equal(res.status, 409)
    // Passwords are stored hashed
    const stored = readFileSync(join(data, 'users.json'), 'utf8')
    assert.ok(!stored.includes(ADMIN.password))
    assert.match(stored, /scrypt\$/)
  } finally {
    await server.close()
  }
})

test('signed in: the app, client routes, assets and chart ranges are served', async () => {
  const { server, admin } = await withAdmin()
  try {
    let res = await admin.fetch('/chart', { headers: { accept: 'text/html' } })
    assert.equal(res.status, 200)
    assert.match(await res.text(), /OpenSail app/)
    assert.equal(res.headers.get('cache-control'), 'no-cache')
    res = await admin.fetch('/assets/index-abc123.js')
    assert.match(res.headers.get('cache-control') ?? '', /immutable/)
    res = await admin.fetch('/sw.js')
    assert.equal(res.status, 200)
    res = await admin.fetch('/charts/test.pmtiles', { headers: { range: 'bytes=4-7' } })
    assert.equal(res.status, 206)
    assert.equal(res.headers.get('content-range'), 'bytes 4-7/16')
    assert.equal(await res.text(), '4567')
    res = await admin.fetch('/charts/test.pmtiles', { headers: { range: 'bytes=-3' } })
    assert.equal(await res.text(), 'def')
    res = await admin.fetch('/charts/test.pmtiles', { headers: { range: 'bytes=99-' } })
    assert.equal(res.status, 416)
    assert.equal((await admin.fetch('/charts/missing.pmtiles')).status, 404)
    assert.equal((await admin.fetch('/assets/missing.js')).status, 404)
    const etag = (await admin.fetch('/charts/index.json')).headers.get('etag')!
    assert.equal((await admin.fetch('/charts/index.json', { headers: { 'if-none-match': etag } })).status, 304)
  } finally {
    await server.close()
  }
})

test('paths outside the app and chart folders are refused', async () => {
  const { server, base, admin } = await withAdmin()
  try {
    for (const path of ['/charts/..%2f..%2fdata%2fusers.json', '/..%2fdata%2fusers.json', '/charts/%2e%2e/data/users.json']) {
      const status = await new Promise<number>((resolve, reject) => {
        const url = new URL(base)
        const req = httpRequest({ host: url.hostname, port: url.port, path, headers: { cookie: admin.cookie } }, (res) => {
          res.resume()
          resolve(res.statusCode ?? 0)
        })
        req.on('error', reject)
        req.end()
      })
      assert.ok([400, 404].includes(status), `${path} gave ${status}`)
    }
  } finally {
    await server.close()
  }
})

test('sign in and out; wrong passwords are rate limited', async () => {
  const { server, base } = await withAdmin()
  try {
    const phone = browser(base)
    let res = await phone.fetch('/api/login', { method: 'POST', json: { email: 'SKIPPER@example.com', password: ADMIN.password } })
    assert.equal(res.status, 200)
    assert.equal((await (await phone.fetch('/api/me')).json()).user.email, ADMIN.email)
    res = await phone.fetch('/api/logout', { method: 'POST', json: {} })
    assert.equal(res.status, 200)
    assert.equal(phone.cookie, '')
    assert.equal((await phone.fetch('/api/me')).status, 401)

    const attacker = browser(base)
    for (let i = 0; i < 10; i++) {
      res = await attacker.fetch('/api/login', { method: 'POST', json: { email: ADMIN.email, password: `guess ${i}` } })
      assert.equal(res.status, 401)
    }
    res = await attacker.fetch('/api/login', { method: 'POST', json: { email: ADMIN.email, password: ADMIN.password } })
    assert.equal(res.status, 429)
  } finally {
    await server.close()
  }
})

test('invite crew; crew can use the app but not manage users; removing them signs them out', async () => {
  const { server, base, admin } = await withAdmin()
  try {
    let res = await admin.fetch('/api/invites', { method: 'POST', json: { email: 'Crew@Example.com', role: 'crew' } })
    assert.equal(res.status, 201)
    const { link } = await res.json()
    const token = new URL(link).pathname.split('/').pop()!

    const crew = browser(base)
    res = await crew.fetch(`/invite/${token}`)
    assert.equal(res.status, 200)
    assert.match(await res.text(), /crew@example\.com/)
    res = await crew.fetch('/api/invite/accept', { method: 'POST', json: { token, name: 'Crew', password: 'another long password' } })
    assert.equal(res.status, 200)
    assert.equal((await res.json()).user.role, 'crew')
    // The link works once
    assert.equal((await browser(base).fetch(`/invite/${token}`)).status, 410)

    assert.equal((await crew.fetch('/chart', { headers: { accept: 'text/html' } })).status, 200)
    assert.equal((await crew.fetch('/api/users')).status, 403)
    assert.equal((await crew.fetch('/api/invites', { method: 'POST', json: { email: 'x@example.com' } })).status, 403)

    const list = await (await admin.fetch('/api/users')).json()
    assert.equal(list.users.length, 2)
    const crewId = list.users.find((u: { role: string }) => u.role === 'crew').id
    assert.ok(!JSON.stringify(list).includes('passwordHash'))

    res = await admin.fetch(`/api/users/${crewId}`, { method: 'DELETE' , json: {} })
    assert.equal(res.status, 200)
    assert.equal((await crew.fetch('/api/me')).status, 401)
    assert.equal((await crew.fetch('/charts/index.json')).status, 401)
  } finally {
    await server.close()
  }
})

test('roles: an admin can promote crew; the last admin stays', async () => {
  const { server, base, admin } = await withAdmin()
  try {
    const me = (await (await admin.fetch('/api/me')).json()).user
    let res = await admin.fetch(`/api/users/${me.id}`, { method: 'PATCH', json: { role: 'crew' } })
    assert.equal(res.status, 409)
    res = await admin.fetch(`/api/users/${me.id}`, { method: 'DELETE', json: {} })
    assert.equal(res.status, 409)

    const { link } = await (await admin.fetch('/api/invites', { method: 'POST', json: { email: 'mate@example.com' } })).json()
    const mate = browser(base)
    await mate.fetch('/api/invite/accept', { method: 'POST', json: { token: link.split('/').pop(), name: 'Mate', password: 'a long enough password' } })
    const mateId = (await (await mate.fetch('/api/me')).json()).user.id
    res = await admin.fetch(`/api/users/${mateId}`, { method: 'PATCH', json: { role: 'admin' } })
    assert.equal((await res.json()).user.role, 'admin')
    assert.equal((await mate.fetch('/api/users')).status, 200)
  } finally {
    await server.close()
  }
})

test('password change signs out other devices; a reset link sets a new password', async () => {
  const { server, base, admin } = await withAdmin()
  try {
    const laptop = browser(base)
    await laptop.fetch('/api/login', { method: 'POST', json: { email: ADMIN.email, password: ADMIN.password } })
    let res = await admin.fetch('/api/me/password', { method: 'POST', json: { currentPassword: 'wrong', newPassword: 'a new long password' } })
    assert.equal(res.status, 403)
    res = await admin.fetch('/api/me/password', { method: 'POST', json: { currentPassword: ADMIN.password, newPassword: 'a new long password' } })
    assert.equal(res.status, 200)
    assert.equal((await admin.fetch('/api/me')).status, 200, 'this device stays signed in')
    assert.equal((await laptop.fetch('/api/me')).status, 401, 'other devices are signed out')

    const { link } = await (await admin.fetch('/api/invites', { method: 'POST', json: { email: 'crew@example.com' } })).json()
    const crew = browser(base)
    await crew.fetch('/api/invite/accept', { method: 'POST', json: { token: link.split('/').pop(), name: 'Crew', password: 'first long password' } })
    const crewId = (await (await crew.fetch('/api/me')).json()).user.id
    const reset = await (await admin.fetch(`/api/users/${crewId}/reset`, { method: 'POST', json: {} })).json()
    const fresh = browser(base)
    res = await fresh.fetch('/api/invite/accept', { method: 'POST', json: { token: reset.link.split('/').pop(), password: 'second long password' } })
    assert.equal(res.status, 200)
    assert.equal((await crew.fetch('/api/me')).status, 401, 'old sessions end with the reset')
    res = await browser(base).fetch('/api/login', { method: 'POST', json: { email: 'crew@example.com', password: 'second long password' } })
    assert.equal(res.status, 200)
  } finally {
    await server.close()
  }
})

test('changes need same-origin JSON; next can only point inside the app', async () => {
  const { server, base, admin } = await withAdmin()
  try {
    let res = await admin.fetch('/api/invites', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: 'email=evil@example.com',
    })
    assert.equal(res.status, 400)
    res = await admin.fetch('/api/invites', { method: 'POST', json: { email: 'evil@example.com' }, headers: { origin: 'https://evil.example' } })
    assert.equal(res.status, 400)

    const visitor = browser(base)
    const page = await (await visitor.fetch('/login?next=//evil.example/x')).text()
    assert.match(page, /const next = "\/";/)
    const tricky = await (await visitor.fetch('/login?next=/x%3C/script%3E')).text()
    assert.ok(!tricky.includes('/x</script>'))
  } finally {
    await server.close()
  }
})
