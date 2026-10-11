import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

async function axe(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']).analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`)).toEqual([]);
}

async function open(page: Page, query = ''): Promise<void> {
  await page.goto(`/tests/e2e/fixtures/inbox.html${query}`);
  await expect(page.locator('body[data-ready]')).toBeAttached();
}

const panel = (page: Page) => page.getByRole('region', { name: 'Capture', exact: true });
const ideas = (page: Page) => page.getByRole('region', { name: 'Ideas to triage' }).getByRole('listitem');

for (const theme of ['dark', 'light'] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((t) => localStorage.setItem('fl-theme', t), theme);
    });

    test('Inbox with ideas', async ({ page }) => {
      await open(page);
      await expect(page.getByRole('heading', { name: 'Inbox', level: 1 })).toBeVisible();
      await expect(ideas(page)).toHaveCount(3);
      await expect(page.getByText('3 ideas · 1 past triage age')).toBeVisible();
      await axe(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    });

    test('empty Inbox', async ({ page }) => {
      await open(page, '?empty');
      await expect(page.getByRole('heading', { name: 'Inbox zero' })).toBeVisible();
      await axe(page);
    });

    test('dialogs', async ({ page }) => {
      await open(page);
      await page.keyboard.press('/');
      await expect(page.getByRole('dialog', { name: 'Capture an idea' })).toBeVisible();
      await axe(page);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: 'Promote DevLog to Ready' }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Promote' }).click();
      await expect(page.getByText('Add an outcome to move this to Ready.')).toBeVisible();
      await axe(page);
    });
  });
}

test('captures from the Inbox and lists the idea first', async ({ page }) => {
  await open(page);
  const capture = panel(page);
  await capture.getByRole('button', { name: 'Capture', exact: true }).click();
  await expect(capture.getByText('Give it a name.')).toBeVisible();
  await expect(capture.getByLabel('Idea name')).toBeFocused();

  await capture.getByLabel('Idea name').fill('Pocket CI');
  await capture.getByLabel('What is it? (optional)').fill('Run checks from my phone');
  await capture.getByLabel('Idea name').press('Enter');
  await expect(capture.getByRole('status').filter({ hasText: 'Captured “Pocket CI”' })).toBeVisible();
  await expect(capture.getByLabel('Idea name')).toHaveValue('');
  await expect(capture.getByLabel('Idea name')).toBeFocused();
  await expect(ideas(page).first()).toContainText('Pocket CI');
  await expect(ideas(page).first()).toContainText('Run checks from my phone');
});

test('/ opens quick capture anywhere but inside a text field, and stays open for the next idea', async ({ page }) => {
  await open(page);
  await page.getByRole('searchbox', { name: 'Search projects' }).press('/');
  await expect(page.getByRole('dialog')).toBeHidden();

  await page.locator('body').click({ position: { x: 5, y: 300 } });
  await page.keyboard.press('/');
  const dialog = page.getByRole('dialog', { name: 'Capture an idea' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel('Idea name')).toBeFocused();
  await dialog.getByLabel('Idea name').fill('Idea one');
  await dialog.getByLabel('Idea name').press('Enter');
  await expect(dialog.getByRole('status')).toContainText('Captured “Idea one”');
  await dialog.getByLabel('Idea name').fill('Idea two');
  await dialog.getByLabel('Idea name').press('Enter');
  await expect(dialog.getByRole('status')).toContainText('Captured “Idea two”');
  await dialog.getByRole('button', { name: 'Done' }).click();
  await expect(dialog).toBeHidden();
  await expect(ideas(page)).toHaveCount(5);
});

test('promote explains every missing gate, then moves the idea out of the Inbox', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Promote Univia to Ready' }).click();
  const dialog = page.getByRole('dialog', { name: 'Promote “Univia” to Ready' });
  await expect(dialog.getByLabel('Outcome')).toHaveValue('Course planner students actually use');
  await expect(dialog.getByLabel('Done when')).toHaveValue('Deployed to Netlify');
  await dialog.getByLabel('Outcome').fill('');
  await dialog.getByLabel('Done when').fill('');
  await dialog.getByRole('button', { name: 'Promote' }).click();
  await expect(dialog.getByText('Add an outcome to move this to Ready.')).toBeVisible();
  await expect(dialog.getByText('Add at least one “done when” item to move this to Ready.')).toBeVisible();
  await expect(dialog.getByText('Add a next action to move this to Ready.')).toBeVisible();
  await expect(dialog.getByLabel('Outcome')).toBeFocused();

  await dialog.getByLabel('Outcome').fill('Course planner students actually use');
  await dialog.getByLabel('Done when').fill('- Deployed\n- Ten real users');
  await dialog.getByLabel('Next action').fill('Write the first migration for courses');
  await dialog.getByRole('button', { name: 'Promote' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: '“Univia” moved to Ready.' })).toBeVisible();
  await expect(ideas(page)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Promote Stacker to Ready' })).toBeFocused();
});

test('archive needs a reason and shows server errors without losing the input', async ({ page }) => {
  await open(page, '?fail=archive');
  await page.getByRole('button', { name: 'Archive Stacker' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive “Stacker”' });
  await dialog.getByRole('button', { name: 'Archive' }).click();
  await expect(dialog.getByText('Say why you are archiving it.')).toBeVisible();
  await dialog.getByLabel('Why archive it?').fill('The Bolt prototype answered the question');
  await dialog.getByRole('button', { name: 'Archive' }).click();
  await expect(dialog.getByRole('alert')).toHaveText('This project no longer exists. Refresh to see the latest.');
  await expect(dialog.getByLabel('Why archive it?')).toHaveValue('The Bolt prototype answered the question');
  await expect(dialog.getByRole('button', { name: 'Archive' })).toBeEnabled();
});

test('archive removes the idea', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Archive Stacker' }).click();
  const dialog = page.getByRole('dialog', { name: 'Archive “Stacker”' });
  await dialog.getByLabel('Why archive it?').fill('Superseded');
  await dialog.getByRole('button', { name: 'Archive' }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('status').filter({ hasText: '“Stacker” archived.' })).toBeVisible();
  await expect(ideas(page)).toHaveCount(2);
});

test('a failed list load keeps capture working', async ({ page }) => {
  await page.goto('/tests/e2e/fixtures/inbox.html?fail=list');
  await expect(page.getByRole('heading', { name: 'Ideas did not load' })).toBeVisible();
  await panel(page).getByLabel('Idea name').fill('Still works');
  await panel(page).getByLabel('Idea name').press('Enter');
  await expect(panel(page).getByRole('status').filter({ hasText: 'Captured “Still works”' })).toBeVisible();
});
