// Guards against hand-edits to the generated stylesheet: tokens.css must be
// exactly what design/build-tokens.mjs produces from design/tokens.json.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const root = fileURLToPath(new URL('..', import.meta.url));

describe('design tokens', () => {
  it('tokens.css is up to date with tokens.json (run npm run tokens)', () => {
    const out = join(mkdtempSync(join(tmpdir(), 'fl-tokens-')), 'tokens.css');
    execFileSync(process.execPath, [join(root, 'design/build-tokens.mjs'), out]);
    expect(readFileSync(out, 'utf8')).toBe(readFileSync(join(root, 'src/ui/tokens/tokens.css'), 'utf8'));
  });
});
