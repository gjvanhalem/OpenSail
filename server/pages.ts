/**
 * The pages shown before you're signed in: sign-in, first-time setup and
 * invite / password reset. Plain HTML with a small inline script, so they work
 * without the app (which is only served to signed-in users).
 */

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)
}

/** A JSON string literal that can't end the surrounding <script> */
function scriptString(value: string): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

const STYLE = `
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 16px;
    font: 16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; background: #eff6ff; color: #111827; }
  main { width: 100%; max-width: 380px; background: #fff; border-radius: 12px; padding: 28px 24px;
    box-shadow: 0 10px 30px rgba(37, 99, 235, .12); }
  h1 { margin: 0 0 4px; font-size: 24px; color: #1d4ed8; }
  p.lead { margin: 0 0 20px; color: #4b5563; font-size: 15px; }
  label { display: block; font-size: 14px; font-weight: 600; margin: 14px 0 4px; color: #374151; }
  input { width: 100%; font: inherit; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; }
  input:focus { outline: 2px solid #3b82f6; outline-offset: 1px; border-color: #3b82f6; }
  input[readonly] { background: #f3f4f6; color: #4b5563; }
  button { width: 100%; margin-top: 20px; font: inherit; font-weight: 600; padding: 11px; border: 0;
    border-radius: 8px; background: #2563eb; color: #fff; cursor: pointer; }
  button:disabled { opacity: .6; cursor: default; }
  .error { display: none; margin-top: 14px; padding: 10px 12px; border-radius: 8px; background: #fef2f2;
    color: #991b1b; font-size: 14px; }
  .hint { font-size: 13px; color: #6b7280; margin-top: 4px; }
  .brand { font-size: 13px; color: #6b7280; margin-top: 18px; text-align: center; }
`

function page(title: string, content: string, script: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${escapeHtml(title)} · OpenSail</title>
<link rel="icon" href="/favicon.ico">
<style>${STYLE}</style>
</head>
<body>
<main>
${content}
<div class="error" id="error" role="alert"></div>
<div class="brand">⛵ OpenSail</div>
</main>
<script>
const form = document.querySelector('form');
const errorBox = document.getElementById('error');
async function send(url, payload) {
  const button = form.querySelector('button');
  button.disabled = true;
  errorBox.style.display = 'none';
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      credentials: 'same-origin',
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || 'Something went wrong (' + response.status + ').');
    return data;
  } catch (e) {
    errorBox.textContent = e.message === 'Failed to fetch' ? 'No connection to OpenSail.' : e.message;
    errorBox.style.display = 'block';
    button.disabled = false;
    throw e;
  }
}
const value = (name) => form.elements[name].value;
${script}
</script>
</body>
</html>`
}

export function loginPage(next: string): string {
  return page(
    'Sign in',
    `<h1>Sign in</h1>
<p class="lead">Sign in to use OpenSail.</p>
<form>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" autocomplete="username" required autofocus>
  <label for="password">Password</label>
  <input id="password" name="password" type="password" autocomplete="current-password" required>
  <button type="submit">Sign in</button>
</form>
<p class="hint">Forgot your password? Ask the skipper (an admin) for a reset link.</p>`,
    `const next = ${scriptString(next)};
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await send('/api/login', { email: value('email'), password: value('password') });
  location.replace(next);
});`,
  )
}

export function setupPage(): string {
  return page(
    'Set up OpenSail',
    `<h1>Set up OpenSail</h1>
<p class="lead">Create the first admin account. You need the setup code from the server log:
<code>docker compose logs opensail</code></p>
<form>
  <label for="code">Setup code</label>
  <input id="code" name="code" required autocomplete="off" spellcheck="false">
  <label for="name">Your name</label>
  <input id="name" name="name" required autocomplete="name">
  <label for="email">Email</label>
  <input id="email" name="email" type="email" required autocomplete="username">
  <label for="password">Password</label>
  <input id="password" name="password" type="password" required minlength="10" autocomplete="new-password">
  <div class="hint">At least 10 characters.</div>
  <button type="submit">Create admin account</button>
</form>`,
    `form.addEventListener('submit', async (event) => {
  event.preventDefault();
  await send('/api/setup', { code: value('code').trim(), name: value('name'), email: value('email'), password: value('password') });
  location.replace('/');
});`,
  )
}

export function invitePage(invite: { token: string; email: string; kind: 'invite' | 'reset' } | null): string {
  if (!invite) {
    return page(
      'Link expired',
      `<h1>Link expired</h1>
<p class="lead">This link has expired or was already used. Ask the skipper (an admin) for a new one.</p>
<form><button type="button" onclick="location.href='/login'">Go to sign in</button></form>`,
      '',
    )
  }
  const reset = invite.kind === 'reset'
  return page(
    reset ? 'New password' : 'Join OpenSail',
    `<h1>${reset ? 'Choose a new password' : 'Join OpenSail'}</h1>
<p class="lead">${reset ? 'Set a new password for your account.' : "You've been invited. Choose your name and a password."}</p>
<form>
  <label for="email">Email</label>
  <input id="email" name="email" type="email" value="${escapeHtml(invite.email)}" readonly autocomplete="username">
  ${reset ? '' : '<label for="name">Your name</label>\n  <input id="name" name="name" required autocomplete="name" autofocus>'}
  <label for="password">${reset ? 'New password' : 'Password'}</label>
  <input id="password" name="password" type="password" required minlength="10" autocomplete="new-password"${reset ? ' autofocus' : ''}>
  <div class="hint">At least 10 characters.</div>
  <button type="submit">${reset ? 'Save password' : 'Create account'}</button>
</form>`,
    `const token = ${scriptString(invite.token)};
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const payload = { token, password: value('password') };
  if (form.elements.name) payload.name = value('name');
  await send('/api/invite/accept', payload);
  location.replace('/');
});`,
  )
}
