import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/tests/e2e/fixtures/projects.html${query}`);
  await expect(page.locator('body[data-ready]')).toBeAttached();
}

const rows = (page: Page) => page.getByRole('table', { name: /Projects, sorted by name/ }).getByRole('row').filter({ has: page.getByRole('cell') });
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('fl-theme', t), theme);
    });

    test('Projects list with the default filter', async ({ page }) => {
      await open(page);
      await expect(page.getByRole('heading', { name: 'Projects', level: 1 })).toBeVisible();
      await expect(rows(page)).toHaveCount(4);
      await expect(page.getByRole('status')).toHaveText('4 of 6 projects');
      await axe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('empty list', async ({ page }) => {
      await open(page, '?empty');
      await expect(page.getByRole('heading', { name: 'No projects yet' })).toBeVisible();
      await axe(page);
    });

    test('no matches', async ({ page }) => {
      await open(page);
      await page.getByRole('searchbox', { name: 'Search projects by name' }).fill('nothing like this');
      await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();
      await axe(page);
    });
  });
}

test('searching narrows the list and keeps focus in the field', async ({ page }) => {
  await open(page);
  const search = page.getByRole('searchbox', { name: 'Search projects by name' });
  await search.click();
  await search.pressSequentially('STACK');
  await expect(search).toBeFocused();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole('row', { name: /Stacker/ })).toBeVisible();
  await expect(page.getByRole('status')).toHaveText('1 of 6 projects');
});

test('status chips toggle closed projects in and out', async ({ page }) => {
  await open(page);
  await expect(chip(page, 'Shipped')).toHaveAttribute('aria-pressed', 'false');
  await chip(page, 'Shipped').click();
  await expect(chip(page, 'Shipped')).toHaveAttribute('aria-pressed', 'true');
  await expect(rows(page)).toHaveCount(5);
  await expect(page.getByRole('row', { name: /Portfolio v3/ })).toBeVisible();

  for (const open of ['Active', 'Idea', 'Ready', 'Paused']) await chip(page, open).click();
  await expect(rows(page)).toHaveCount(1);
  await expect(page.getByRole('status')).toHaveText('1 of 6 projects');

  await chip(page, 'Shipped').click();
  await expect(page.getByRole('heading', { name: 'Nothing matches' })).toBeVisible();

  await page.getByRole('button', { name: 'Clear search and filters' }).click();
  await expect(chip(page, 'Shipped')).toHaveAttribute('aria-pressed', 'false');
  await expect(rows(page)).toHaveCount(4);
});

test('the top-bar search arrives prefilled', async ({ page }) => {
  await open(page, '?q=dev');
  await expect(page.getByRole('searchbox', { name: 'Search projects by name' })).toHaveValue('dev');
  await expect(rows(page)).toHaveCount(1);
});

test('a failed load offers a retry', async ({ page }) => {
  await open(page, '?fail=1');
  await expect(page.getByRole('heading', { name: 'Projects did not load' })).toBeVisible();
  await axe(page);
});
