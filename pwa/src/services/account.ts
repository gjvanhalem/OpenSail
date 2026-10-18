/**
 * The signed-in account, from the OpenSail server (server/). Without that
 * server (vite dev, e2e preview, static hosting) there are no accounts and
 * the app works as before. The server enforces sign-in on every request; this
 * module is only for showing the account and managing users.
 */
import { useSyncExternalStore } from 'react';
import { NATIVE_BUILD } from '@/platform/platform';

export type Role = 'admin' | 'crew';

export interface AccountUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface PendingInvite {
  id: string;
  kind: 'invite' | 'reset';
  email: string;
  role: Role;
  createdAt: string;
  expiresAt: string;
}

export type AccountState =
  | { status: 'loading' }
  | { status: 'signed-in'; user: AccountUser }
  /** Served without the OpenSail server: no accounts */
  | { status: 'no-accounts' }
  /** The server can't be reached (offline on board): keep using the app */
  | { status: 'offline' };

let state: AccountState = { status: 'loading' };
const listeners = new Set<() => void>();

function setState(next: AccountState): void {
  state = next;
  listeners.forEach((listener) => listener());
}

export function useAccount(): AccountState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state
  );
}

export class AccountError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function isJson(response: Response): boolean {
  return (response.headers.get('content-type') ?? '').includes('application/json');
}

/** Call the account API. Throws AccountError with the server's message. */
export async function accountApi<T>(path: string, method = 'GET', body?: unknown): Promise<T> {
  const response = await fetch(path, {
    method,
    credentials: 'same-origin',
    headers: body !== undefined || method !== 'GET' ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : method !== 'GET' ? '{}' : undefined,
  });
  const data = isJson(response) ? await response.json() : null;
  if (!response.ok) {
    if (response.status === 401) goToSignIn();
    throw new AccountError(data?.message ?? `Request failed (${response.status})`, response.status);
  }
  return data as T;
}

function goToSignIn(): void {
  const next = window.location.pathname + window.location.search;
  window.location.replace(`/login?next=${encodeURIComponent(next)}`);
}

/**
 * Find out who is signed in. A signed-out browser goes to the sign-in page;
 * offline it keeps the app it already has.
 */
export async function loadAccount(): Promise<AccountState> {
  if (NATIVE_BUILD) {
    // The native apps have no accounts
    setState({ status: 'no-accounts' });
    return state;
  }
  let response: Response;
  try {
    response = await fetch('/api/me', { credentials: 'same-origin', cache: 'no-store' });
  } catch {
    setState({ status: 'offline' });
    return state;
  }
  if (response.status === 401 && isJson(response)) {
    goToSignIn();
    return state;
  }
  if (!response.ok || !isJson(response)) {
    // No OpenSail server behind this app (dev server, static hosting)
    setState({ status: 'no-accounts' });
    return state;
  }
  const data = (await response.json()) as { user: AccountUser };
  setState({ status: 'signed-in', user: data.user });
  return state;
}

/**
 * Sign out, and remove the app's cached files from this device, so it can't
 * be opened again without signing in. Routes, tracks and settings stay in this
 * browser.
 */
export async function signOut(): Promise<void> {
  try {
    await accountApi('/api/logout', 'POST', {});
  } finally {
    try {
      const registrations = (await navigator.serviceWorker?.getRegistrations()) ?? [];
      await Promise.all(registrations.map((registration) => registration.unregister()));
      const keys = (await window.caches?.keys()) ?? [];
      await Promise.all(keys.map((key) => window.caches.delete(key)));
    } catch {
      // Best effort: the server refuses the files without a session anyway
    }
    window.location.replace('/login');
  }
}
