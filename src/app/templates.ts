/** Clones a <template> from index.html. Static markup only; data goes in through textContent. */
export function cloneTemplate(id: string): DocumentFragment {
  const tpl = document.getElementById(id);
  if (!(tpl instanceof HTMLTemplateElement)) throw new Error(`Missing template #${id}`);
  return tpl.content.cloneNode(true) as DocumentFragment;
}

export function slot<T extends Element = HTMLElement>(root: ParentNode, name: string): T {
  const node = root.querySelector<T>(`[data-slot="${name}"]`);
  if (!node) throw new Error(`Missing slot ${name}`);
  return node;
}
