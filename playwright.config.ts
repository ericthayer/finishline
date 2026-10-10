import { defineConfig, devices } from '@playwright/test';

// Accessibility and smoke checks against the Vite dev server.
export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  reporter: process.env['CI'] ? 'github' : 'list',
  use: { baseURL: 'http://localhost:5173' },
  projects: [
    { name: 'desktop-2k', use: { ...devices['Desktop Chrome'], viewport: { width: 2560, height: 1440 } } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 800 } } },
  ],
  webServer: {
    command: 'npx vite --port 5173 --strictPort',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env['CI'],
    // No Supabase values: the app must still render its sign-in screen.
    env: { VITE_SUPABASE_URL: '', VITE_SUPABASE_PUBLISHABLE_KEY: '' },
  },
});
