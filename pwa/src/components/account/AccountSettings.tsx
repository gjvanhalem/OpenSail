import React, { useState } from 'react';
import { accountApi, signOut, useAccount, AccountError } from '@/services/account';
import { UserAdmin } from './UserAdmin';

/**
 * Settings > Account: who is signed in, change password, sign out, and for
 * admins the user list. Hidden when the app runs without the OpenSail server.
 */
export const AccountSettings: React.FC = () => {
  const account = useAccount();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (account.status === 'offline') {
    return (
      <section className="bg-surface rounded-lg shadow-sm p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Account</h2>
        <p className="text-sm text-gray-600">Offline: account details come back when there's a connection.</p>
      </section>
    );
  }
  if (account.status !== 'signed-in') return null;
  const { user } = account;

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      await accountApi('/api/me/password', 'POST', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setMessage({ ok: true, text: 'Password changed. Your other devices are signed out.' });
    } catch (error) {
      setMessage({ ok: false, text: error instanceof AccountError ? error.message : 'Could not change the password.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <section className="bg-surface rounded-lg shadow-sm p-6 mb-6" aria-labelledby="account-heading">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 id="account-heading" className="text-xl font-semibold text-gray-900">Account</h2>
            <p className="text-sm text-gray-600 mt-1" data-testid="signed-in-as">
              Signed in as <strong>{user.name}</strong> ({user.email}) · {user.role === 'admin' ? 'Admin' : 'Crew'}
            </p>
          </div>
          <button
            onClick={() => void signOut()}
            className="shrink-0 px-4 py-2 rounded-md border border-gray-300 text-gray-700 hover:bg-gray-50"
          >
            Sign out
          </button>
        </div>

        <form onSubmit={changePassword} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-gray-700 mb-1">
              Current password
            </label>
            <input
              id="current-password"
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-gray-700 mb-1">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              minLength={10}
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <button
            type="submit"
            disabled={busy}
            className="px-4 py-2 rounded-md bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Change password
          </button>
        </form>
        {message && (
          <p role="status" className={`text-sm mt-3 ${message.ok ? 'text-green-700' : 'text-red-700'}`}>
            {message.text}
          </p>
        )}
        <p className="text-xs text-gray-500 mt-3">
          Signing out removes the app from this device's cache. Routes, tracks and settings stay in this browser.
        </p>
      </section>

      {user.role === 'admin' && <UserAdmin currentUserId={user.id} />}
    </>
  );
};
