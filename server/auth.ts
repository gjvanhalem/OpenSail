/**
 * Accounts for OpenSail: sign-in, the first admin (setup), invites, password
 * resets and user administration. A Request → Response handler, so it can be
 * tested without a server.
 *
 * Sessions are a signed cookie { uid, ver, iat }. A user's sessionVersion is
 * bumped to sign out all of their sessions; removing a user ends them too.
 */
import { hashPassword, sign, verify, verifyPassword } from './crypto.ts'
import { invitePage, loginPage, setupPage } from './pages.ts'
import { normalizeEmail, type Role, type Store, type User } from './store.ts'

export const SESSION_COOKIE = 'opensail_session'
const SESSION_DAYS = 30
/** Re-issue the cookie when it's older than this, so active users stay signed in */
const RENEW_AFTER_MS = 24 * 3600 * 1000
const MIN_PASSWORD = 10
const MAX_FAILURES = 10
const FAILURE_WINDOW_MS = 15 * 60 * 1000

export interface AuthContext {
  store: Store
  /** One-time code that allows creating the first admin; null once there are users */
  setupCode: string | null
  /** The https address people open, e.g. https://opensail.g-zeven.nl. Decides Secure cookies and the Origin check. */
  publicOrigin: string | null
  /** The client's address, for rate limiting (from CF-Connecting-IP or the socket) */
  clientIp: string
  now?: () => number
}

interface Session {
  uid: string
  ver: number
  iat: number
}

export interface SessionResult {
  user: User
  /** A renewed cookie to send along, when the session is getting old */
  renewCookie: string | null
}

// ---------- helpers ----------

function json(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', ...headers },
  })
}

function html(body: string, status = 200): Response {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
    },
  })
}

function redirect(location: string): Response {
  return new Response(null, { status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } })
}

function error(code: string, message: string, status: number): Response {
  return json({ error: code, message }, status)
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get('cookie') ?? ''
  for (const part of header.split(';')) {
    const [key, ...rest] = part.trim().split('=')
    if (key === name) return rest.join('=')
  }
  return null
}

function secure(ctx: AuthContext): boolean {
  return ctx.publicOrigin?.startsWith('https://') ?? false
}

function sessionCookie(user: User, ctx: AuthContext): string {
  const now = ctx.now?.() ?? Date.now()
  const token = sign({ uid: user.id, ver: user.sessionVersion, iat: now } satisfies Session, ctx.store.secret)
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    'HttpOnly',
    'SameSite=Lax',
    `Max-Age=${SESSION_DAYS * 24 * 3600}`,
    ...(secure(ctx) ? ['Secure'] : []),
  ].join('; ')
}

function clearCookie(ctx: AuthContext): string {
  return [`${SESSION_COOKIE}=`, 'Path=/', 'HttpOnly', 'SameSite=Lax', 'Max-Age=0', ...(secure(ctx) ? ['Secure'] : [])].join('; ')
}

/** The user a request's cookie belongs to, or null */
export function sessionFor(request: Request, ctx: AuthContext): SessionResult | null {
  const token = readCookie(request, SESSION_COOKIE)
  if (!token) return null
  const session = verify<Session>(token, ctx.store.secret)
  if (!session) return null
  const now = ctx.now?.() ?? Date.now()
  if (now - session.iat > SESSION_DAYS * 24 * 3600 * 1000) return null
  const user = ctx.store.userById(session.uid)
  if (!user || user.sessionVersion !== session.ver) return null
  return { user, renewCookie: now - session.iat > RENEW_AFTER_MS ? sessionCookie(user, ctx) : null }
}

function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, role: user.role, createdAt: user.createdAt, lastLoginAt: user.lastLoginAt }
}

/**
 * Changes must come from our own pages: JSON bodies (a cross-site form can't
 * send those without CORS) and, when the browser says, our own origin.
 */
function sameOriginJson(request: Request, ctx: AuthContext): boolean {
  if (!(request.headers.get('content-type') ?? '').includes('application/json')) return false
  const origin = request.headers.get('origin')
  if (!origin) return true
  const own = ctx.publicOrigin ?? new URL(request.url).origin
  return origin === own || origin === new URL(request.url).origin
}

async function body(request: Request): Promise<Record<string, unknown>> {
  try {
    const value = await request.json()
    return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function text(value: unknown, max = 200): string {
  return typeof value === 'string' ? value.slice(0, max) : ''
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function passwordProblem(password: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (password.length > 200) return 'That password is too long.'
  return null
}

function asRole(value: unknown): Role | null {
  return value === 'admin' || value === 'crew' ? value : null
}

/** Only relative paths in the app, never another site */
export function safeNext(next: string | null): string {
  if (!next || !next.startsWith('/') || next.startsWith('//') || next.startsWith('/\\')) return '/'
  return next
}

// ---------- rate limiting of failed sign-ins ----------

const failures = new Map<string, number[]>()

function tooManyFailures(keys: string[], now: number): boolean {
  return keys.some((key) => (failures.get(key) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS).length >= MAX_FAILURES)
}

function recordFailure(keys: string[], now: number): void {
  for (const key of keys) {
    const recent = (failures.get(key) ?? []).filter((t) => now - t < FAILURE_WINDOW_MS)
    recent.push(now)
    failures.set(key, recent)
  }
}

export function resetRateLimits(): void {
  failures.clear()
}

// ---------- the handler ----------

/**
 * Handle an account route. Returns null when the path isn't one of ours, so
 * the server can go on (check the session, serve the app).
 */
export async function handleAuth(request: Request, ctx: AuthContext): Promise<Response | null> {
  const url = new URL(request.url)
  const path = url.pathname
  const method = request.method
  const now = ctx.now?.() ?? Date.now()
  const store = ctx.store

  // --- pages anyone may open ---
  if (path === '/login' && method === 'GET') {
    if (!store.hasUsers()) return redirect('/setup')
    if (sessionFor(request, ctx)) return redirect(safeNext(url.searchParams.get('next')))
    return html(loginPage(safeNext(url.searchParams.get('next'))))
  }
  if (path === '/setup' && method === 'GET') {
    if (store.hasUsers()) return redirect('/login')
    return html(setupPage())
  }
  const inviteMatch = /^\/invite\/([A-Za-z0-9_-]{10,100})$/.exec(path)
  if (inviteMatch && method === 'GET') {
    const invite = store.inviteByToken(inviteMatch[1], now)
    return html(invitePage(invite ? { token: inviteMatch[1], email: invite.email, kind: invite.kind } : null), invite ? 200 : 410)
  }

  if (!path.startsWith('/api/')) return null

  // --- API: every change must be same-origin JSON ---
  if (method !== 'GET' && !sameOriginJson(request, ctx)) {
    return error('bad_request', 'Send JSON from OpenSail itself.', 400)
  }

  if (path === '/api/setup' && method === 'POST') {
    if (store.hasUsers() || !ctx.setupCode) return error('setup_done', 'OpenSail is already set up. Sign in instead.', 409)
    const data = await body(request)
    if (tooManyFailures([`setup:${ctx.clientIp}`], now)) return error('rate_limited', 'Too many attempts. Wait 15 minutes.', 429)
    if (text(data.code) !== ctx.setupCode) {
      recordFailure([`setup:${ctx.clientIp}`], now)
      return error('bad_code', 'That setup code is not right. Find it in the server log.', 403)
    }
    const email = normalizeEmail(text(data.email))
    const name = text(data.name, 80).trim()
    const password = text(data.password)
    if (!validEmail(email)) return error('bad_email', 'Enter a valid email address.', 400)
    if (!name) return error('bad_name', 'Enter your name.', 400)
    const problem = passwordProblem(password)
    if (problem) return error('weak_password', problem, 400)
    const user = await store.addUser({ email, name, role: 'admin', passwordHash: await hashPassword(password) })
    await store.updateUser(user.id, { lastLoginAt: new Date(now).toISOString() })
    ctx.setupCode = null
    return json({ user: publicUser(user) }, 201, { 'Set-Cookie': sessionCookie(user, ctx) })
  }

  if (path === '/api/login' && method === 'POST') {
    const data = await body(request)
    const email = normalizeEmail(text(data.email))
    const keys = [`ip:${ctx.clientIp}`, `email:${email}`]
    if (tooManyFailures(keys, now)) return error('rate_limited', 'Too many failed attempts. Wait 15 minutes.', 429)
    const user = store.userByEmail(email)
    // Hash even for an unknown email, so timing doesn't tell which emails exist
    const ok = user
      ? await verifyPassword(text(data.password), user.passwordHash)
      : (await hashPassword(text(data.password)), false)
    if (!user || !ok) {
      recordFailure(keys, now)
      return error('bad_login', 'Wrong email or password.', 401)
    }
    await store.updateUser(user.id, { lastLoginAt: new Date(now).toISOString() })
    return json({ user: publicUser(user) }, 200, { 'Set-Cookie': sessionCookie(user, ctx) })
  }

  if (path === '/api/logout' && method === 'POST') {
    return json({ ok: true }, 200, { 'Set-Cookie': clearCookie(ctx) })
  }

  if (path === '/api/invite/accept' && method === 'POST') {
    const data = await body(request)
    const invite = store.inviteByToken(text(data.token), now)
    if (!invite) return error('invite_gone', 'This link has expired or was already used. Ask for a new one.', 410)
    const password = text(data.password)
    const problem = passwordProblem(password)
    if (problem) return error('weak_password', problem, 400)
    let user: User | undefined
    if (invite.kind === 'reset') {
      const existing = invite.userId ? store.userById(invite.userId) : undefined
      if (!existing) return error('invite_gone', 'This account no longer exists.', 410)
      user = await store.updateUser(existing.id, {
        passwordHash: await hashPassword(password),
        sessionVersion: existing.sessionVersion + 1,
        lastLoginAt: new Date(now).toISOString(),
      })
    } else {
      if (store.userByEmail(invite.email)) return error('exists', 'There is already an account for this email. Sign in instead.', 409)
      const name = text(data.name, 80).trim()
      if (!name) return error('bad_name', 'Enter your name.', 400)
      user = await store.addUser({ email: invite.email, name, role: invite.role, passwordHash: await hashPassword(password) })
      await store.updateUser(user.id, { lastLoginAt: new Date(now).toISOString() })
    }
    await store.removeInvite(invite.id)
    return json({ user: publicUser(user!) }, 200, { 'Set-Cookie': sessionCookie(user!, ctx) })
  }

  // --- everything below needs a signed-in user ---
  const session = sessionFor(request, ctx)
  if (!session) return error('signed_out', 'Sign in first.', 401)
  const me = session.user
  const renew: Record<string, string> = session.renewCookie ? { 'Set-Cookie': session.renewCookie } : {}

  if (path === '/api/me' && method === 'GET') {
    return json({ user: publicUser(me) }, 200, renew)
  }

  if (path === '/api/me/password' && method === 'POST') {
    const data = await body(request)
    if (!(await verifyPassword(text(data.currentPassword), me.passwordHash))) {
      return error('bad_password', 'Your current password is not right.', 403)
    }
    const problem = passwordProblem(text(data.newPassword))
    if (problem) return error('weak_password', problem, 400)
    // Signs out your other devices; this one gets a fresh cookie
    const user = await store.updateUser(me.id, {
      passwordHash: await hashPassword(text(data.newPassword)),
      sessionVersion: me.sessionVersion + 1,
    })
    return json({ ok: true }, 200, { 'Set-Cookie': sessionCookie(user!, ctx) })
  }

  // --- admins only ---
  if (!path.startsWith('/api/users') && !path.startsWith('/api/invites')) {
    return error('not_found', 'Unknown API.', 404)
  }
  if (me.role !== 'admin') return error('forbidden', 'Only an admin can manage users.', 403)

  const linkFor = (token: string) => `${ctx.publicOrigin ?? url.origin}/invite/${token}`
  const publicInvite = (i: ReturnType<Store['invites']>[number]) => ({
    id: i.id, kind: i.kind, email: i.email, role: i.role, createdAt: i.createdAt, expiresAt: i.expiresAt,
  })

  if (path === '/api/users' && method === 'GET') {
    return json({ users: store.users().map(publicUser), invites: store.invites(now).map(publicInvite) }, 200, renew)
  }

  if (path === '/api/invites' && method === 'POST') {
    const data = await body(request)
    const email = normalizeEmail(text(data.email))
    const role = asRole(data.role) ?? 'crew'
    if (!validEmail(email)) return error('bad_email', 'Enter a valid email address.', 400)
    if (store.userByEmail(email)) return error('exists', 'This person already has an account.', 409)
    const { invite, token } = await store.addInvite({ kind: 'invite', email, role, userId: null, createdBy: me.id })
    return json({ invite: publicInvite(invite), link: linkFor(token) }, 201)
  }

  const inviteId = /^\/api\/invites\/([\w-]+)$/.exec(path)?.[1]
  if (inviteId && method === 'DELETE') {
    await store.removeInvite(inviteId)
    return json({ ok: true })
  }

  const userMatch = /^\/api\/users\/([\w-]+)(\/reset)?$/.exec(path)
  const target = userMatch ? store.userById(userMatch[1]) : undefined
  if (userMatch && !target) return error('not_found', 'No such user.', 404)

  if (target && userMatch?.[2] && method === 'POST') {
    const { invite, token } = await store.addInvite({ kind: 'reset', email: target.email, role: target.role, userId: target.id, createdBy: me.id })
    return json({ invite: publicInvite(invite), link: linkFor(token) }, 201)
  }

  const lastAdmin = (user: User) => user.role === 'admin' && store.admins().length === 1

  if (target && method === 'PATCH') {
    const data = await body(request)
    const role = asRole(data.role)
    if (!role) return error('bad_role', 'Role must be admin or crew.', 400)
    if (role === 'crew' && lastAdmin(target)) return error('last_admin', 'There must be at least one admin.', 409)
    const user = await store.updateUser(target.id, { role })
    return json({ user: publicUser(user!) })
  }

  if (target && method === 'DELETE') {
    if (target.id === me.id) return error('self', "You can't remove your own account.", 409)
    if (lastAdmin(target)) return error('last_admin', 'There must be at least one admin.', 409)
    await store.removeUser(target.id)
    return json({ ok: true })
  }

  return error('not_found', 'Unknown API.', 404)
}
