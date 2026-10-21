import React, { useEffect, useState } from 'react';
import {
  accountApi,
  AccountError,
  type AccountUser,
  type PendingInvite,
  type Role,
} from '@/services/account';

function shortDate(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : 'never';
}

/** A link to send to someone, with a copy button */
const LinkBox: React.FC<{ label: string; link: string; onClose: () => void }> = ({ label, link, onClose }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };
  return (
    <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200" role="status">
      <p className="text-sm text-blue-900 mb-2">{label} It works once and expires in 7 days.</p>
      <div className="flex gap-2">
        <input
          readOnly
          value={link}
          aria-label="Link to send"
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 px-2 py-1 font-mono text-xs border border-blue-200 rounded bg-surface"
        />
        <button onClick={copy} className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button onClick={onClose} className="px-3 py-1 text-sm rounded border border-blue-200 text-blue-900">
          Done
        </button>
      </div>
    </div>
  );
};

/** Settings > Users (admins): who has access, invites, roles, reset links */
export const UserAdmin: React.FC<{ currentUserId: string }> = ({ currentUserId }) => {
  const [users, setUsers] = useState<AccountUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('crew');
  const [link, setLink] = useState<{ label: string; link: string } | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  // Bumped after every change, to load the list again
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    accountApi<{ users: AccountUser[]; invites: PendingInvite[] }>('/api/users')
      .then((data) => {
        if (cancelled) return;
        setUsers(data.users);
        setInvites(data.invites);
      })
      .catch((error: unknown) => {
        if (!cancelled) setProblem(error instanceof Error ? error.message : String(error));
      });
    return () => {
      cancelled = true;
    };
  }, [version]);

  /** Run an admin action, show its error, and refresh the list */
  const act = async (action: () => Promise<void>) => {
    setProblem(null);
    try {
      await action();
    } catch (error) {
      setProblem(error instanceof AccountError ? error.message : 'Something went wrong.');
    }
    setVersion((v) => v + 1);
  };

  const invite = (event: React.FormEvent) => {
    event.preventDefault();
    void act(async () => {
      const result = await accountApi<{ link: string }>('/api/invites', 'POST', { email, role });
      setLink({ label: `Send this invite link to ${email.trim()}.`, link: result.link });
      setEmail('');
    });
  };

  return (
    <section className="bg-surface rounded-lg shadow-sm p-6 mb-6" aria-labelledby="users-heading">
      <h2 id="users-heading" className="text-xl font-semibold text-gray-900 mb-1">Users</h2>
      <p className="text-sm text-gray-500 mb-4">
        Only people with an account can open OpenSail. Admins manage users; crew can use everything else.
      </p>

      <ul className="divide-y divide-gray-100 mb-4" aria-label="Users">
        {users.map((user) => (
          <li key={user.id} className="py-3 flex flex-wrap items-center gap-3" data-testid="user-row">
            <div className="flex-1 min-w-[12rem]">
              <div className="font-medium text-gray-900">
                {user.name} {user.id === currentUserId && <span className="text-xs text-gray-500">(you)</span>}
              </div>
              <div className="text-sm text-gray-600">{user.email}</div>
              <div className="text-xs text-gray-500">Last signed in: {shortDate(user.lastLoginAt)}</div>
            </div>
            <select
              aria-label={`Role of ${user.name}`}
              value={user.role}
              onChange={(e) =>
                void act(() => accountApi(`/api/users/${user.id}`, 'PATCH', { role: e.target.value }).then(() => {}))
              }
              className="px-2 py-1 border border-gray-300 rounded-md text-sm"
            >
              <option value="crew">Crew</option>
              <option value="admin">Admin</option>
            </select>
            <button
              onClick={() =>
                void act(async () => {
                  const result = await accountApi<{ link: string }>(`/api/users/${user.id}/reset`, 'POST', {});
                  setLink({ label: `Send this password reset link to ${user.name}.`, link: result.link });
                })
              }
              className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
            >
              Reset password
            </button>
            {user.id !== currentUserId && (
              <button
                onClick={() => {
                  if (window.confirm(`Remove ${user.name}? They are signed out everywhere and can't open OpenSail any more.`)) {
                    void act(() => accountApi(`/api/users/${user.id}`, 'DELETE', {}).then(() => {}));
                  }
                }}
                className="px-3 py-1 text-sm rounded-md text-red-700 hover:bg-red-50"
              >
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      {invites.length > 0 && (
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Open links</h3>
          <ul className="space-y-1" aria-label="Open links">
            {invites.map((invite) => (
              <li key={invite.id} className="flex items-center gap-3 text-sm">
                <span className="flex-1 text-gray-700">
                  {invite.kind === 'reset' ? 'Password reset' : `Invite (${invite.role})`} · {invite.email} · expires{' '}
                  {shortDate(invite.expiresAt)}
                </span>
                <button
                  onClick={() => void act(() => accountApi(`/api/invites/${invite.id}`, 'DELETE', {}).then(() => {}))}
                  className="px-2 py-0.5 text-red-700 hover:bg-red-50 rounded"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={invite} className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
        <div>
          <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
            Invite by email
          </label>
          <input
            id="invite-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="crew@example.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
          />
        </div>
        <div>
          <label htmlFor="invite-role" className="block text-sm font-medium text-gray-700 mb-1">
            Role
          </label>
          <select
            id="invite-role"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="px-3 py-2 border border-gray-300 rounded-md"
          >
            <option value="crew">Crew</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        <button type="submit" className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700">
          Create invite link
        </button>
      </form>

      {link && <LinkBox label={link.label} link={link.link} onClose={() => setLink(null)} />}
      {problem && (
        <p role="alert" className="text-sm text-red-700 mt-3">
          {problem}
        </p>
      )}
    </section>
  );
};
