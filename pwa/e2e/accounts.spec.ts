import { test, expect } from './fixtures/test';

/**
 * User accounts, against the real OpenSail server (server/node.ts, the
 * `accounts` project in playwright.config.ts) with a fresh data folder:
 * first admin, invites, crew, removal, sign out. The steps build on each
 * other, so they run in order.
 */

const SETUP_CODE = 'e2e-setup-code';
const SKIPPER = { name: 'Skipper', email: 'skipper@example.com', password: 'a long skipper password' };
const CREW = { name: 'Deckhand', email: 'crew@example.com', password: 'a long crew password' };

test.describe.configure({ mode: 'serial' });

let inviteLink = '';

test('nothing is served before signing in; the first visit sets up the admin', async ({ page }) => {
  expect((await page.request.get('/charts/index.json')).status()).toBe(401);
  expect((await page.request.get('/sw.js')).status()).toBe(401);

  await page.goto('/chart');
  await expect(page).toHaveURL(/\/setup$/);
  await page.getByLabel('Setup code').fill('wrong code');
  await page.getByLabel('Your name').fill(SKIPPER.name);
  await page.getByLabel('Email').fill(SKIPPER.email);
  await page.getByLabel('Password').fill(SKIPPER.password);
  await page.getByRole('button', { name: 'Create admin account' }).click();
  await expect(page.getByRole('alert')).toContainText('setup code is not right');

  await page.getByLabel('Setup code').fill(SETUP_CODE);
  await page.getByRole('button', { name: 'Create admin account' }).click();
  await expect(page).toHaveURL(/\/chart$/);
  await expect(page.getByRole('link', { name: /Settings/ })).toBeVisible();
});

test('the admin invites crew from Settings', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(SKIPPER.email);
  await page.getByLabel('Password').fill(SKIPPER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/chart$/);

  await page.click('a[href="/settings"]');
  await expect(page.getByTestId('signed-in-as')).toContainText('Skipper (skipper@example.com) · Admin');
  await page.getByLabel('Invite by email').fill(CREW.email);
  await page.getByRole('button', { name: 'Create invite link' }).click();
  inviteLink = await page.getByLabel('Link to send').inputValue();
  expect(inviteLink).toMatch(/\/invite\/[\w-]+$/);
  await expect(page.getByRole('list', { name: 'Open links' })).toContainText('crew@example.com');
});

test('crew joins with the link and can use the app, but not manage users', async ({ page }) => {
  await page.goto(inviteLink);
  await expect(page.getByLabel('Email')).toHaveValue(CREW.email);
  await page.getByLabel('Your name').fill(CREW.name);
  await page.getByLabel('Password').fill(CREW.password);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/chart$/);

  await page.click('a[href="/settings"]');
  await expect(page.getByTestId('signed-in-as')).toContainText('Deckhand (crew@example.com) · Crew');
  await expect(page.getByRole('heading', { name: 'Users' })).toHaveCount(0);
  expect((await page.request.get('/api/users')).status()).toBe(403);
  // The invite link worked once
  await page.goto(inviteLink);
  await expect(page.getByRole('heading', { name: 'Link expired' })).toBeVisible();
});

test('removing crew signs them out; sign out and back in returns to the page you wanted', async ({ page, browser }) => {
  // The crew member, signed in on their own phone
  const crewContext = await browser.newContext({ storageState: 'e2e/fixtures/storage-state.json' });
  const crew = await crewContext.newPage();
  await crew.goto('/login');
  await crew.getByLabel('Email').fill(CREW.email);
  await crew.getByLabel('Password').fill(CREW.password);
  await crew.getByRole('button', { name: 'Sign in' }).click();
  await expect(crew).toHaveURL(/\/chart$/);
  // The app is installed on their device (service worker active)
  await expect.poll(() => crew.evaluate(async () => !!(await navigator.serviceWorker.ready).active)).toBe(true);

  // The skipper removes them
  await page.goto('/login?next=/settings');
  await page.getByLabel('Email').fill(SKIPPER.email);
  await page.getByLabel('Password').fill(SKIPPER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/settings$/);
  const crewRow = page.getByTestId('user-row').filter({ hasText: CREW.email });
  page.once('dialog', (dialog) => void dialog.accept());
  await crewRow.getByRole('button', { name: 'Remove' }).click();
  await expect(crewRow).toHaveCount(0);

  // Their next visit ends at the server's sign-in page, not the cached app
  await crew.reload();
  await expect(crew).toHaveURL(/\/login\?next=%2Fchart$/);
  await expect(crew.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  expect((await crew.request.get('/charts/index.json')).status()).toBe(401);
  await crewContext.close();

  // Sign out, then back in, to the page asked for
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.goto('/routes');
  await expect(page).toHaveURL(/\/login\?next=%2Froutes$/);
  await page.getByLabel('Email').fill(SKIPPER.email);
  await page.getByLabel('Password').fill(SKIPPER.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/routes$/);
});
