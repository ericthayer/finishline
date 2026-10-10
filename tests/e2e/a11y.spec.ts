import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function noHorizontalScroll(page: Page): Promise<void> {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('fl-theme', t), theme);
    });

    test('sign-in screen', async ({ page }) => {
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'Continue with GitHub' })).toBeVisible();
      await axe(page);
      await noHorizontalScroll(page);
    });

    test('Overview with projects', async ({ page }) => {
      await page.goto('/tests/e2e/fixtures/overview.html');
      await expect(page.locator('body[data-ready]')).toBeAttached();
      await expect(page.getByRole('heading', { name: 'Overview', level: 1 })).toBeVisible();
      await expect(page.getByRole('table', { name: /Open projects/ })).toBeVisible();
      await axe(page);
      await noHorizontalScroll(page);
    });

    test('Overview with no projects', async ({ page }) => {
      await page.goto('/tests/e2e/fixtures/overview.html?empty');
      await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
      await axe(page);
    });
  });
}

test('explains missing configuration instead of failing silently', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue with GitHub' }).click();
  await expect(page.getByRole('alert')).toContainText('Supabase is not configured');
});
