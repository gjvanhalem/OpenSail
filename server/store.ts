/**
 * Users and invites, kept in one JSON file in the data folder. OpenSail has a
 * handful of users (an owner and crew), so a file is enough; writes go
 * through one queue and replace the file atomically.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { hashToken, randomToken } from './crypto.ts'

export type Role = 'admin' | 'crew'

export interface User {
  id: string
  email: string
  name: string
  role: Role
  passwordHash: string
  /** Bumped to sign out every session of this user (password change, reset, removal) */
  sessionVersion: number
  createdAt: string
  lastLoginAt: string | null
}

export interface Invite {
  id: string
  /** sha256 of the token in the link; the token itself is never stored */
  tokenHash: string
  /** 'invite' creates an account, 'reset' sets a new password for userId */
  kind: 'invite' | 'reset'
  email: string
  role: Role
  userId: string | null
  createdBy: string
  createdAt: string
  expiresAt: string
}

interface Data {
  version: 1
  /** Signs session cookies. Changing it signs everybody out. */
  secret: string
  users: User[]
  invites: Invite[]
}

export const INVITE_DAYS = 7

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export class Store {
  private data: Data
  private readonly file: string
  private writing: Promise<void> = Promise.resolve()

  constructor(file: string) {
    this.file = file
    mkdirSync(dirname(file), { recursive: true })
    if (existsSync(file)) {
      this.data = JSON.parse(readFileSync(file, 'utf8')) as Data
    } else {
      this.data = { version: 1, secret: randomToken(48), users: [], invites: [] }
      this.flush()
    }
  }

  get secret(): string {
    return this.data.secret
  }

  users(): User[] {
    return this.data.users
  }

  hasUsers(): boolean {
    return this.data.users.length > 0
  }

  userById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id)
  }

  userByEmail(email: string): User | undefined {
    const wanted = normalizeEmail(email)
    return this.data.users.find((u) => u.email === wanted)
  }

  admins(): User[] {
    return this.data.users.filter((u) => u.role === 'admin')
  }

  async addUser(fields: { email: string; name: string; role: Role; passwordHash: string }): Promise<User> {
    const user: User = {
      id: `u_${randomToken(9)}`,
      email: normalizeEmail(fields.email),
      name: fields.name.trim(),
      role: fields.role,
      passwordHash: fields.passwordHash,
      sessionVersion: 1,
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    }
    this.data.users.push(user)
    await this.save()
    return user
  }

  async updateUser(id: string, changes: Partial<Omit<User, 'id'>>): Promise<User | undefined> {
    const user = this.userById(id)
    if (!user) return undefined
    Object.assign(user, changes)
    await this.save()
    return user
  }

  async removeUser(id: string): Promise<void> {
    this.data.users = this.data.users.filter((u) => u.id !== id)
    this.data.invites = this.data.invites.filter((i) => i.userId !== id)
    await this.save()
  }

  /** Pending (not expired) invites and reset links */
  invites(now = Date.now()): Invite[] {
    return this.data.invites.filter((i) => Date.parse(i.expiresAt) > now)
  }

  /** Create an invite or reset link. Returns the token for the link (only here, never stored). */
  async addInvite(fields: Omit<Invite, 'id' | 'tokenHash' | 'createdAt' | 'expiresAt'>): Promise<{ invite: Invite; token: string }> {
    const token = randomToken(24)
    const now = Date.now()
    // One open link per email and kind: a new one replaces the old
    this.data.invites = this.data.invites.filter(
      (i) => !(i.email === fields.email && i.kind === fields.kind) && Date.parse(i.expiresAt) > now,
    )
    const invite: Invite = {
      ...fields,
      id: `i_${randomToken(9)}`,
      tokenHash: hashToken(token),
      createdAt: new Date(now).toISOString(),
      expiresAt: new Date(now + INVITE_DAYS * 24 * 3600 * 1000).toISOString(),
    }
    this.data.invites.push(invite)
    await this.save()
    return { invite, token }
  }

  inviteByToken(token: string, now = Date.now()): Invite | undefined {
    const hash = hashToken(token)
    return this.invites(now).find((i) => i.tokenHash === hash)
  }

  async removeInvite(id: string): Promise<void> {
    this.data.invites = this.data.invites.filter((i) => i.id !== id)
    await this.save()
  }

  private save(): Promise<void> {
    this.writing = this.writing.then(() => this.flush())
    return this.writing
  }

  private flush(): void {
    const tmp = `${this.file}.tmp`
    writeFileSync(tmp, JSON.stringify(this.data, null, 2), { mode: 0o600 })
    renameSync(tmp, this.file)
  }
}
