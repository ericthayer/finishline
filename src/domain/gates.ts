import { requiresNextAction, type GateCode, type GateFailure } from './lifecycle.ts';
import type { ProjectStatus } from './types.ts';

// Gates explain themselves (DESIGN principle 3): every failure says what to add or do.

const LABEL: Readonly<Record<ProjectStatus, string>> = {
  idea: 'Idea',
  ready: 'Ready',
  active: 'Active',
  paused: 'Paused',
  shipped: 'Shipped',
  archived: 'Archived',
};

export const SHIP_CRITERIA_LIMIT = 10;

const GATE_CODES: ReadonlySet<string> = new Set<GateCode>([
  'NOT_ALLOWED',
  'MISSING_OUTCOME',
  'MISSING_SHIP_CRITERIA',
  'MISSING_NEXT_ACTION',
  'WIP_CAP_REACHED',
  'MISSING_CHECKPOINT',
  'UNMET_SHIP_CRITERIA',
  'MISSING_ARCHIVE_REASON',
]);

/** A gate failure as the server reports it: the code, without the client-side detail. */
export type ServerGate = { code: GateCode } | { code: 'SHIP_CRITERIA_LIMIT' } | { code: 'NOT_FOUND' };

export function explainGate(failure: GateFailure | ServerGate, to: ProjectStatus): string {
  switch (failure.code) {
    case 'NOT_ALLOWED':
      return 'from' in failure
        ? `${LABEL[failure.from]} projects can't move to ${LABEL[failure.to]}.`
        : `This project can't move to ${LABEL[to]} from where it is now.`;
    case 'MISSING_OUTCOME':
      return `Add an outcome to move this to ${LABEL[to]}.`;
    case 'MISSING_SHIP_CRITERIA':
      return `Add at least one “done when” item to move this to ${LABEL[to]}.`;
    case 'MISSING_NEXT_ACTION':
      return `Add a next action to move this to ${LABEL[to]}.`;
    case 'WIP_CAP_REACHED':
      return 'cap' in failure
        ? `All ${failure.cap} lanes are full. Pause, ship or archive an Active project first.`
        : 'All lanes are full. Pause, ship or archive an Active project first.';
    case 'MISSING_CHECKPOINT':
      return 'Write what happened before pausing.';
    case 'UNMET_SHIP_CRITERIA':
      return 'remaining' in failure
        ? `${failure.remaining} ship ${failure.remaining === 1 ? 'criterion is' : 'criteria are'} still open. Check them off or ship anyway.`
        : 'Some ship criteria are still open. Check them off or ship anyway.';
    case 'MISSING_ARCHIVE_REASON':
      return 'Say why you are archiving it.';
    case 'SHIP_CRITERIA_LIMIT':
      return `Keep the checklist to ${SHIP_CRITERIA_LIMIT} items or fewer.`;
    case 'NOT_FOUND':
      return 'This project no longer exists. Refresh to see the latest.';
  }
}

/** Edit-form rule for the next action, in the same words as the gate. Null when it is fine. */
export function nextActionMissing(status: ProjectStatus, nextAction: string): string | null {
  if (!requiresNextAction(status) || nextAction.trim()) return null;
  return `${LABEL[status]} projects need a next action. Write the first concrete step.`;
}

/** Reads `GATE:A,B` from a database error message; null when it isn't a gate error. */
export function parseGateError(message: string): ServerGate[] | null {
  const match = /GATE:([A-Z_,]+)/.exec(message);
  if (!match?.[1]) return null;
  const gates: ServerGate[] = [];
  for (const code of match[1].split(',')) {
    if (GATE_CODES.has(code)) gates.push({ code: code as GateCode });
    else if (code === 'SHIP_CRITERIA_LIMIT' || code === 'NOT_FOUND') gates.push({ code });
  }
  return gates.length ? gates : null;
}

/** "Done when" textarea → criteria: one per line, bullets and blanks dropped, duplicates removed. */
export function parseCriteria(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/^\s*(?:[-*•]\s*)?(?:\[[ xX]?\]\s*)?/, '').trim();
    const key = line.toLowerCase();
    if (!line || seen.has(key)) continue;
    seen.add(key);
    out.push(line);
  }
  return out;
}

export interface CriteriaPlan {
  remove: string[];
  update: { id: string; position: number }[];
  insert: { text: string; position: number }[];
}

/**
 * Turns the existing checklist into `wanted` with the fewest writes. Rows whose text is kept
 * survive (so a checked item stays checked); removals come first so the 10-item cap holds.
 */
export function planCriteria(
  existing: readonly { id: string; text: string; position: number }[],
  wanted: readonly string[],
): CriteriaPlan {
  const byText = new Map<string, { id: string; position: number }>();
  for (const row of existing) if (!byText.has(row.text)) byText.set(row.text, row);
  const plan: CriteriaPlan = { remove: [], update: [], insert: [] };
  const kept = new Set<string>();
  wanted.forEach((text, position) => {
    const row = byText.get(text);
    if (row && !kept.has(row.id)) {
      kept.add(row.id);
      if (row.position !== position) plan.update.push({ id: row.id, position });
    } else {
      plan.insert.push({ text, position });
    }
  });
  plan.remove = existing.filter((row) => !kept.has(row.id)).map((row) => row.id);
  return plan;
}
