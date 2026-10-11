// Fails when a PR title is not a Conventional Commit. Squash merges use the PR title as the
// commit subject on main, and release-please reads those subjects to pick the next version.
// Zero dependencies on purpose: this runs in CI on every PR.

const TYPES = ['feat', 'fix', 'perf', 'refactor', 'docs', 'test', 'build', 'ci', 'chore', 'style', 'revert'];
const PATTERN = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9][a-z0-9/-]*\\))?!?: \\S.*$`);

const title = process.argv[2] ?? '';

if (PATTERN.test(title)) {
  console.log(`PR title is a Conventional Commit: ${title}`);
} else {
  console.error(`PR title is not a Conventional Commit: "${title}"`);
  console.error('Use "<type>(optional scope): <summary>", for example "feat: capture and the project Inbox".');
  console.error(`Types: ${TYPES.join(', ')}. Add "!" after the type for a breaking change.`);
  process.exit(1);
}
