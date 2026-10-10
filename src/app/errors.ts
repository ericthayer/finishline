import { explainGate, parseGateError } from '../domain/gates.ts';
import type { ProjectStatus } from '../domain/types.ts';

/** What to tell the user when a save fails: the gate in plain words, or the raw reason. */
export function saveError(error: unknown, to: ProjectStatus = 'idea'): string {
  const message = error instanceof Error ? error.message : String(error);
  const gates = parseGateError(message);
  if (gates) return gates.map((g) => explainGate(g, to)).join(' ');
  return `That didn't save. ${message}`;
}
