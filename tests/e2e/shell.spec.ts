import { expect, test, type Page } from '@playwright/test';

// The shared shell: one page head on every screen, the side panel, and the account menu.

async function open(page: Page, fixture: string, query = ''): Promise<void> {
  await page.goto(`/tests/e2e/fixtures/${fixture}.html${query}`);
  await expect(page.locator('body[data-ready]')).toBeAttached();
}

for (const fixture of ['overview', 'projects', 'inbox', 'archive', 'settings', 'activity']) {
  test(`${fixture} uses the shared page head: title, search, then New project and the side panel`, async ({ page }) => {
    await open(page, fixture);
    await expect(page.locator('.fl-topbar')).toHaveCount(0);
    const head = page.locator('.fl-main > .fl-pagehead');
    await expect(head.locator(':scope > h1 + .fl-search')).toBeVisible();
    await expect(head.locator('.fl-pagehead__tools > .fl-pagebar__actions:last-child')).toBeVisible();
    await expect(head.getByRole('button', { name: 'New project' })).toBeVisible();
    await expect(head.getByRole('button', { name: 'Side panel' })).toBeVisible();
  });
}

test('the side panel toggle pushes main over and remembers its state', async ({ page }) => {
  await open(page, 'overview');
  const toggle = page.getByRole('button', { name: 'Side panel' });
  const panel = page.getByRole('complementary', { name: 'Side panel' });
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
  const closedWidth = await page.locator('.fl-main').evaluate((m) => m.getBoundingClientRect().width);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('tab', { name: 'Committed' })).toBeVisible();
  await expect.poll(() => page.locator('.fl-main').evaluate((m) => m.getBoundingClientRect().width)).toBeLessThan(closedWidth);
  expect(await page.evaluate(() => localStorage.getItem('fl-drawer'))).toBe('open');

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(panel).toBeHidden();
});

test('side panel tabs follow the keyboard and Committed nudges each lane', async ({ page }) => {
  await open(page, 'overview', '?drawer');
  const committed = page.getByRole('tab', { name: 'Committed' });
  await expect(committed).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByText('2 of 3 lanes committed. Finish these before adding more.')).toBeVisible();
  await expect(page.locator('.fl-commit__nudge')).toHaveCount(2);

  await committed.focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Projects' })).toBeFocused();
  await expect(page.getByRole('tab', { name: 'Projects' })).toHaveAttribute('aria-selected', 'true');
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Issues' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'No issues yet' })).toBeVisible();
  await page.keyboard.press('Home');
  await expect(committed).toHaveAttribute('aria-selected', 'true');
});

test('Projects tab quick actions: Start a Ready project, Edit opens the form', async ({ page }) => {
  await open(page, 'overview', '?drawer');
  await page.getByRole('tab', { name: 'Projects' }).click();
  await expect(page.getByRole('button', { name: 'Start Univia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Start Finishline' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Start Univia' }).click();
  await expect(page.locator('.fl-drawer__status')).toHaveText('“Univia” is Active.');
  await expect(page.getByRole('button', { name: 'Start Univia' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Edit DevLog' }).click();
  await expect(page.getByRole('dialog', { name: 'Edit “DevLog”' })).toBeVisible();
});

test('the avatar opens the account menu with activity, settings, sign out and the version', async ({ page }) => {
  await open(page, 'overview');
  const avatar = page.getByRole('button', { name: 'Account: Eric' });
  await expect(avatar).toHaveAttribute('aria-expanded', 'false');
  await avatar.click();
  await expect(avatar).toHaveAttribute('aria-expanded', 'true');
  const menu = page.locator('#fl-account');
  await expect(menu.getByText('Eric', { exact: true })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Recent activity' })).toHaveAttribute('href', '/activity');
  await expect(menu.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/settings');
  await expect(menu.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await expect(menu.getByText(/^Finishlyne v\d+\.\d+\.\d+/)).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(avatar).toHaveAttribute('aria-expanded', 'false');
});

test('Recent activity shows a timeline grouped by day', async ({ page }) => {
  await open(page, 'activity');
  await expect(page.getByRole('heading', { name: 'Recent activity', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Today', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Yesterday', level: 2 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Tue, Oct 6', level: 2 })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Finishlyne moved to Active' })).toHaveAttribute('href', '/p/finishlyne');
});

test('Recent activity explains a failed load and retries', async ({ page }) => {
  await open(page, 'activity', '?fail');
  await expect(page.getByRole('alert')).toContainText('Network down.');
});

test('New project works from any screen', async ({ page }) => {
  await open(page, 'overview');
  await page.getByRole('button', { name: 'New project' }).click();
  await expect(page.getByRole('dialog', { name: 'New project' })).toBeVisible();
});

test('Inbox puts the idea list first and Capture on the right', async ({ page }) => {
  await open(page, 'inbox');
  const order = await page.locator('.fl-main .fl-dash > section').evaluateAll((s) => s.map((n) => n.querySelector('h2')?.textContent ?? ''));
  expect(order.at(-1)).toMatch(/Capture/);
});
