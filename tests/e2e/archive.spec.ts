import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/tests/e2e/fixtures/archive.html${query}`);
  await expect(page.locator('body[data-ready]')).toBeAttached();
}

const items = (page: Page) => page.locator('.fl-inbox__item');
const dialog = (page: Page) => page.getByRole('dialog');

for (const theme of ['dark', 'light'] as const) {
  test(`Archive lists closed projects, newest first (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('fl-theme', t), theme);
    await open(page);
    await expect(page.getByRole('heading', { name: 'Archive', level: 1 })).toBeVisible();
    await expect(page.getByText('2 shipped · 1 archived')).toBeVisible();
    await expect(items(page).locator('h3')).toHaveText(['Portfolio v3', 'Stacker', 'Univia']);
    await expect(items(page).nth(1)).toContainText('Superseded by Finishlyne lanes');
    await expect(page.getByRole('link', { name: /ericthayer\.design/ })).toHaveAttribute('href', 'https://ericthayer.design');
    await axe(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });

  test(`Reopen dialog passes axe (${theme})`, async ({ page }) => {
    await page.addInitScript((t) => localStorage.setItem('fl-theme', t), theme);
    await open(page);
    await page.getByRole('button', { name: 'Reopen Univia' }).click();
    await expect(dialog(page)).toBeVisible();
    await axe(page);
  });
}

test('an empty archive explains itself', async ({ page }) => {
  await open(page, '?empty');
  await expect(page.getByRole('heading', { name: 'Nothing closed yet' })).toBeVisible();
  await axe(page);
});

test('reopening keeps the last next action and moves the project to Ready', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Reopen Univia' }).click();
  await expect(page.getByLabel('Next action')).toHaveValue('Write release notes');
  await dialog(page).getByRole('button', { name: 'Reopen' }).click();
  await expect(dialog(page)).toBeHidden();
  await expect(page.locator('.fl-inbox__status')).toHaveText('“Univia” reopened and moved to Ready.');
  await expect(items(page).locator('h3')).toHaveText(['Portfolio v3', 'Stacker']);
  await expect(page.getByRole('button', { name: 'Reopen Stacker' })).toBeFocused();
});

test('reopening needs a next action, in the gate’s words', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Reopen Stacker' }).click();
  await dialog(page).getByRole('button', { name: 'Reopen' }).click();
  await expect(page.getByLabel('Next action')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Ready projects need a next action.')).toBeVisible();
  await expect(items(page)).toHaveCount(3);
});

test('a refused reopen keeps the dialog open with the reason', async ({ page }) => {
  await open(page, '?fail=reopen');
  await page.getByRole('button', { name: 'Reopen Univia' }).click();
  await dialog(page).getByRole('button', { name: 'Reopen' }).click();
  await expect(dialog(page).getByRole('alert')).toHaveText("This project can't move to Ready from where it is now.");
  await expect(dialog(page)).toBeVisible();
});
