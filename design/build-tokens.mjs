// Compiles design/tokens.json (the design system's single source) to tokens.css,
// in the layout the Finishline Design System artifact generates.
// Usage: node design/build-tokens.mjs [out=src/ui/tokens/tokens.css]
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const src = new URL('./tokens.json', import.meta.url);
const out = process.argv[2] ?? 'src/ui/tokens/tokens.css';
const t = JSON.parse(readFileSync(src, 'utf8'));

const themes = t.color.themes.map((x) => x.id);
const first = themes[0];
const ref = (v) => (/^\{(.+)\}$/.test(v) ? `var(--${v.slice(1, -1)})` : v);
const valueFor = (tok, theme) =>
  typeof tok.value === 'string' ? (theme === first ? tok.value : undefined) : tok.value[theme];
const themed = [...t.color.tokens, ...(t.shadow?.tokens ?? [])];

const isAlias = (v) => typeof v === 'string' && /^\{.+\}$/.test(v);
const block = (selector, theme) => {
  const lines = themed.flatMap((tok) => {
    const v = valueFor(tok, theme);
    if (v === undefined) return [];
    // Later themes re-declare overrides and aliases (an alias must re-resolve per theme).
    if (theme !== first && v === valueFor(tok, first) && !isAlias(v)) return [];
    return [`  --${tok.name}: ${ref(v)};`];
  });
  return `${selector} {\n${lines.join('\n')}\n}`;
};

const plain = Object.entries(t)
  .filter(([k, v]) => !['name', 'version', 'color', 'type', 'shadow'].includes(k) && v && Array.isArray(v.tokens))
  .flatMap(([, v]) => v.tokens.map((tok) => `  --${tok.name}: ${tok.value};`));
const families = Object.entries(t.type.families).map(([k, v]) => `  --font-${k}: ${v};`);

const kebab = (s) => s.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
// Per-style custom properties so component CSS can use the fluid scale in `font:` shorthands.
const textVars = t.type.groups.flatMap((g) =>
  g.styles.flatMap((s) => [
    `  --text-${s.name}-size: ${s.fontSize};`,
    `  --text-${s.name}-leading: ${s.lineHeight};`,
    `  --text-${s.name}-weight: ${s.fontWeight};`,
  ]),
);
const styles = t.type.groups.flatMap((g) =>
  g.styles.map((s) => {
    const props = [`  font-family: var(--font-${s.family ?? g.family});`];
    for (const k of ['fontSize', 'lineHeight', 'fontWeight', 'letterSpacing', 'fontStyle']) {
      if (s[k] !== undefined) props.push(`  ${kebab(k)}: ${s[k]};`);
    }
    return `.${s.name} {\n${props.join('\n')}\n}`;
  }),
);

const css = [
  `/* ${t.name} — generated from tokens.json */`,
  block(`:root, [data-theme="${first}"]`, first),
  ...themes.slice(1).map((id) => block(`[data-theme="${id}"]`, id)),
  `:root {\n${[...plain, ...families, ...textVars].join('\n')}\n}`,
  ...styles,
  '',
].join('\n\n');

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, css);
console.log(`wrote ${out}`);
