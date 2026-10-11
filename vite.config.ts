import { readFileSync } from 'node:fs';
import { defineConfig } from 'vitest/config';

const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as { version: string };

// Netlify stores these without the VITE_ prefix. Map only these two public
// values; widening envPrefix would expose every SUPABASE_* var to the bundle.
for (const name of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] as const) {
  const value = process.env[name];
  if (process.env[`VITE_${name}`] === undefined && value) process.env[`VITE_${name}`] = value;
}

export default defineConfig({
  build: { target: 'es2023' },
  // Shown in the account menu; release-please bumps package.json.
  define: { __APP_VERSION__: JSON.stringify(version) },
  test: { include: ['tests/**/*.test.ts'] },
});
