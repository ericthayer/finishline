import { AttrElement, define, el, emit, uid } from './dom.ts';

/** <fl-next-action text> · fires fl-next-done {text} or fl-next-add. */
export class NextAction extends AttrElement {
  static readonly observedAttributes = ['text'];

  protected render(): void {
    const text = this.attr('text').trim();
    const id = `fl-next-${uid()}`;
    const band = el('section', 'fl-next');
    band.setAttribute('aria-labelledby', id);
    const eyebrow = el('p', 'fl-eyebrow', 'Do this next');
    eyebrow.id = id;
    const body = el('div', 'fl-next__body');
    body.append(
      eyebrow,
      text
        ? el('p', 'fl-next__text', text)
        : el('p', 'fl-next__empty', 'No next action yet. Write the one step that gets this moving.'),
    );
    const button = el('button', 'fl-btn fl-btn--on-signal', text ? 'Done' : 'Add next action');
    button.type = 'button';
    button.addEventListener('click', () => emit(this, text ? 'fl-next-done' : 'fl-next-add', { text }));
    band.append(body, button);
    this.replaceChildren(band);
  }
}

define('fl-next-action', NextAction);
