/** Password hashing, signed session tokens and random tokens. Node built-ins only. */
import { createHash, createHmac, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

// scrypt cost: about 100 ms per hash on a small server, which slows down guessing
const SCRYPT = { N: 1 << 15, r: 8, p: 1, keylen: 64 }
const MAXMEM = 64 * 1024 * 1024

function scryptAsync(password: string, salt: Buffer, N: number, r: number, p: number, keylen: number) {
  return new Promise<Buffer>((resolve, reject) =>
    scrypt(password, salt, keylen, { N, r, p, maxmem: MAXMEM }, (error, key) =>
      error ? reject(error) : resolve(key),
    ),
  )
}

/** "scrypt$N$r$p$salt$hash", salt and hash in base64url */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16)
  const { N, r, p, keylen } = SCRYPT
  const key = await scryptAsync(password, salt, N, r, p, keylen)
  return ['scrypt', N, r, p, salt.toString('base64url'), key.toString('base64url')].join('$')
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [kind, N, r, p, salt, hash] = stored.split('$')
  if (kind !== 'scrypt' || !salt || !hash) return false
  const expected = Buffer.from(hash, 'base64url')
  const key = await scryptAsync(password, Buffer.from(salt, 'base64url'), +N, +r, +p, expected.length)
  return timingSafeEqual(key, expected)
}

/** A random token for invite links and setup codes */
export function randomToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url')
}

/** Store tokens only as a hash, so the data file alone can't be used to sign in */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}

/** `payload.signature`, both base64url; the payload is JSON */
export function sign(payload: object, secret: string): string {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const signature = createHmac('sha256', secret).update(body).digest('base64url')
  return `${body}.${signature}`
}

export function verify<T>(token: string, secret: string): T | null {
  const [body, signature] = token.split('.')
  if (!body || !signature) return null
  const expected = createHmac('sha256', secret).update(body).digest()
  const given = Buffer.from(signature, 'base64url')
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null
  try {
    return JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as T
  } catch {
    return null
  }
}
