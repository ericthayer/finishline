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

const dialog = (page: Page, name: string) => page.getByRole('dialog', { name, exact: true });

test('New project opens a form that asks for a name', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const form = dialog(page, 'New project');
  await expect(form).toBeVisible();
  await expect(form.getByRole('textbox', { name: 'Name' })).toBeFocused();
  await axe(page);
  await form.getByRole('button', { name: 'Create project' }).click();
  await expect(form.getByRole('textbox', { name: 'Name' })).toHaveAttribute('aria-invalid', 'true');
  await expect(form.getByText('Give it a name. Anything you will recognize later works.')).toBeVisible();
  await expect(form).toBeVisible();
});

test('a new project lands in the list as an idea', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const form = dialog(page, 'New project');
  await form.getByRole('textbox', { name: 'Name' }).fill('Field notes');
  await form.getByRole('textbox', { name: 'Outcome (optional)' }).fill('A notes app I actually use');
  await form.getByRole('button', { name: 'Create project' }).click();
  await expect(form).toBeHidden();
  await expect(page.getByRole('row', { name: /Field notes/ })).toBeVisible();
  await expect(page.locator('.fl-projects__status')).toHaveText('“Field notes” added as an idea.');
  await expect(page.getByRole('heading', { name: 'All projects' })).toBeFocused();
});

test('a failed create keeps the form open with the reason', async ({ page }) => {
  await open(page, '?save-fail');
  await page.getByRole('button', { name: 'New project', exact: true }).click();
  const form = dialog(page, 'New project');
  await form.getByRole('textbox', { name: 'Name' }).fill('Field notes');
  await form.getByRole('button', { name: 'Create project' }).click();
  await expect(form.getByRole('alert')).toHaveText("That didn't save. Network down");
  await expect(form.getByRole('button', { name: 'Create project' })).toBeEnabled();
});

test('Edit opens with the current words and saves them', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Edit DevLog' }).click();
  const form = dialog(page, 'Edit “DevLog”');
  await expect(form.getByRole('textbox', { name: 'Next action (optional for ideas)' })).toHaveValue('Fix the timezone bug in the weekly digest.');
  await axe(page);
  await form.getByRole('textbox', { name: 'Outcome (optional)' }).fill('The digest is right every Monday');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form).toBeHidden();
  await expect(page.locator('.fl-projects__status')).toHaveText('“DevLog” saved.');
  await expect(page.getByRole('row', { name: /DevLog/ })).toBeVisible();
});

test('an active project cannot lose its next action in the edit form', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Edit DevLog' }).click();
  const form = dialog(page, 'Edit “DevLog”');
  await form.getByRole('textbox', { name: 'Next action (optional for ideas)' }).fill('');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form.getByText('Active projects need a next action. Write the first concrete step.')).toBeVisible();
  await expect(form).toBeVisible();
});

test('a failed save in edit keeps the form open with the reason', async ({ page }) => {
  await open(page, '?save-fail');
  await page.getByRole('button', { name: 'Edit Univia' }).click();
  const form = dialog(page, 'Edit “Univia”');
  await form.getByRole('button', { name: 'Save changes' }).click();
  await expect(form.getByRole('alert')).toHaveText("That didn't save. Network down");
});

test('Start moves a ready project to Active', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Start Univia' }).click();
  await expect(page.locator('.fl-projects__status')).toHaveText('“Univia” is Active.');
  await expect(page.getByRole('row', { name: /Univia/ })).toContainText('Active');
});

test('a full lane explains itself and changes nothing', async ({ page }) => {
  await open(page, '?full');
  await page.getByRole('button', { name: 'Start Univia' }).click();
  await expect(page.locator('.fl-projects__status')).toHaveText('All 3 lanes are full. Pause, ship or archive an Active project first.');
  await expect(page.getByRole('row', { name: /Univia/ })).toContainText('Ready');
});

test('Resume moves a paused project back to Active', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Resume Stacker' }).click();
  await expect(page.locator('.fl-projects__status')).toHaveText('“Stacker” is Active.');
});

test('Pause asks for a checkpoint, then parks the project', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Pause DevLog' }).click();
  const form = dialog(page, 'Pause “DevLog”');
  await expect(form.getByRole('textbox', { name: 'Next action' })).toHaveValue('Fix the timezone bug in the weekly digest.');
  await axe(page);
  await form.getByRole('button', { name: 'Pause project' }).click();
  await expect(form.getByText('Write what happened before pausing.')).toBeVisible();
  await form.getByRole('textbox', { name: 'What happened' }).fill('Digest sends are fixed. The Monday run is next.');
  await form.getByRole('button', { name: 'Pause project' }).click();
  await expect(form).toBeHidden();
  await expect(page.locator('.fl-projects__status')).toHaveText('“DevLog” paused.');
  await expect(page.getByRole('row', { name: /DevLog/ })).toContainText('Paused');
});

test('Archive from the list asks why, then hides the project', async ({ page }) => {
  await open(page);
  await page.getByRole('button', { name: 'Archive Univia' }).click();
  const form = dialog(page, 'Archive “Univia”');
  await form.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(form.getByText('Say why you are archiving it.')).toBeVisible();
  await form.getByRole('textbox', { name: 'Why archive it?' }).fill('Superseded by DevLog');
  await form.getByRole('button', { name: 'Archive', exact: true }).click();
  await expect(form).toBeHidden();
  await expect(page.locator('.fl-projects__status')).toHaveText('“Univia” archived.');
  await expect(page.getByRole('row', { name: /Univia/ })).toHaveCount(0);
});
