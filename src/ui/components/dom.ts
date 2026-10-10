// Small DOM helpers shared by the components. Text always goes in through textContent.

const SVG_NS = 'http://www.w3.org/2000/svg';

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string | null,
  text?: string | null,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

export function svgEl<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Readonly<Record<string, string | number>>,
): SVGElementTagNameMap[K] {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

export function emit<T>(node: Element, name: string, detail: T): void {
  node.dispatchEvent(new CustomEvent<T>(name, { bubbles: true, composed: true, detail }));
}

export function define(name: string, ctor: CustomElementConstructor): void {
  if (!customElements.get(name)) customElements.define(name, ctor);
}

/** `+9d` for days in the past, `in 3d` for days ahead. */
export function splitTime(days: number): string {
  if (!Number.isFinite(days)) return '';
  return days < 0 ? `in ${-days}d` : `+${days}d`;
}

/** Percentage of `total`, one decimal place. */
export function pct(n: number, total: number): number {
  return total ? Math.round((n / total) * 1000) / 10 : 0;
}

/** Short random suffix for ids that must be unique on the page. */
export function uid(): string {
  return Math.random().toString(36).slice(2, 7);
}

/** Base for components fed through a single array property. */
export abstract class DataElement<T> extends HTMLElement {
  protected data: readonly T[] = [];

  connectedCallback(): void {
    this.render();
  }

  protected setData(value: readonly T[] | null | undefined): void {
    this.data = Array.isArray(value) ? [...value] : [];
    if (this.isConnected) this.render();
  }

  protected abstract render(): void;
}

/** Base for attribute-driven components that re-render on every observed change. */
export abstract class AttrElement extends HTMLElement {
  connectedCallback(): void {
    this.render();
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.render();
  }

  protected attr(name: string): string {
    return this.getAttribute(name) ?? '';
  }

  protected abstract render(): void;
}
