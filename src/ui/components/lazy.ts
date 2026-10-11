// Dialogs register their custom elements on first use, so each ships as its own chunk
// instead of weighing down the entry bundle. An unregistered tag is an inert element
// until its module loads, which upgrades it in place.
const LOADERS = {
  'fl-create-project-dialog': () => import('./create-project-dialog.ts'),
  'fl-edit-project-dialog': () => import('./edit-project-dialog.ts'),
  'fl-pause-project-dialog': () => import('./pause-project-dialog.ts'),
  'fl-ship-project-dialog': () => import('./ship-project-dialog.ts'),
  'fl-archive-dialog': () => import('./archive-dialog.ts'),
  'fl-promote-dialog': () => import('./promote-dialog.ts'),
} as const;

export type LazyDialogTag = keyof typeof LOADERS;

/** Resolves once the dialog's element is defined and the instance on the page has upgraded. */
export async function loadDialog(tag: LazyDialogTag): Promise<void> {
  await LOADERS[tag]();
  await customElements.whenDefined(tag);
}
