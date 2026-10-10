import { defineConfig } from 'vitest/config';

// Netlify stores these without the VITE_ prefix. Map only these two public
// values; widening envPrefix would expose every SUPABASE_* var to the bundle.
for (const name of ['SUPABASE_URL', 'SUPABASE_PUBLISHABLE_KEY'] as const) {
  const value = process.env[name];
  if (process.env[`VITE_${name}`] === undefined && value) process.env[`VITE_${name}`] = value;
}

export default defineConfig({
  build: { target: 'es2023' },
  test: { include: ['tests/**/*.test.ts'] },
});
