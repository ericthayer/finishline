import type { Project } from '../domain/types.ts';
import type { ProjectsRepo } from '../data/projects.ts';
import type { CaptureDialog } from '../ui/components/capture-dialog.ts';
import type { CaptureDetail, CaptureForm } from '../ui/components/capture-form.ts';
import { saveError } from './errors.ts';

/** Saves whatever a capture form submits. */
export function wireCapture(form: CaptureForm, repo: ProjectsRepo, onCaptured: (project: Project) => void): void {
  form.addEventListener('fl-capture', (event) => {
    const { name, summary } = (event as CustomEvent<CaptureDetail>).detail;
    void repo.capture(summary ? { name, summary } : { name }).then(
      (project) => {
        form.captured(project.name);
        onCaptured(project);
      },
      (error: unknown) => form.fail(saveError(error)),
    );
  });
}

function typing(target: EventTarget | null): boolean {
  return target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select') !== null);
}

/** `/` opens quick capture from any screen (SPEC §5). Returns a function that unbinds it. */
export function bindCaptureShortcut(dialog: CaptureDialog): () => void {
  const onKey = (event: KeyboardEvent): void => {
    if (event.key !== '/' || event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return;
    if (typing(event.target) || document.querySelector('dialog[open]')) return;
    event.preventDefault();
    dialog.open();
  };
  document.addEventListener('keydown', onKey);
  return () => document.removeEventListener('keydown', onKey);
}
