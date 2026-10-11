import { el } from '../components/dom.ts';
import { FEED_KIND } from '../components/feed.ts';
import { icon } from '../components/icons.ts';
import type { TimelineDay } from '../../state/activity-model.ts';

// Recent activity as a timeline, one section per day.

export interface ActivityScreen {
  setLoading(): void;
  setError(message: string, retry: () => void): void;
  show(days: readonly TimelineDay[]): void;
}

export function mountActivity(main: HTMLElement): ActivityScreen {
  const head = el('div', 'fl-pagehead');
  const h1 = el('h1', null, 'Recent activity');
  h1.id = 'page-title';
  head.append(h1);
  const panel = el('section', 'fl-panel fl-timeline');
  panel.setAttribute('aria-label', 'Timeline');
  main.setAttribute('aria-labelledby', 'page-title');
  main.replaceChildren(head, panel);
  document.title = 'Recent activity · Finishlyne';

  const box = (role: 'alert' | null, ...children: (HTMLElement | string)[]): HTMLElement => {
    const node = el('div', 'fl-empty');
    if (role) node.setAttribute('role', role);
    node.append(...children);
    return node;
  };

  return {
    setLoading() {
      const node = box(null, el('p', null, 'Loading your activity…'));
      node.setAttribute('aria-busy', 'true');
      panel.replaceChildren(node);
    },
    setError(message, retry) {
      const again = el('button', 'fl-btn fl-btn--secondary', 'Try again');
      again.type = 'button';
      again.addEventListener('click', retry);
      panel.replaceChildren(box('alert', el('h2', null, 'Activity did not load'), el('p', null, message), again));
    },
    show(days) {
      if (!days.length) {
        panel.replaceChildren(box(null, el('h2', null, 'No activity yet'), el('p', null, 'Moves, checkpoints and pushes show up here as you work.')));
        return;
      }
      const sections = days.map((day, i) => {
        const section = el('section', 'fl-timeline__day');
        const heading = el('h2', 'fl-timeline__date', day.label);
        heading.id = `day-${i}`;
        section.setAttribute('aria-labelledby', heading.id);
        const list = el('ol', 'fl-timeline__list');
        for (const item of day.items) {
          const kind = FEED_KIND[item.kind];
          const li = el('li', 'fl-timeline__item');
          if (kind.tone) li.dataset['tone'] = kind.tone;
          const mark = el('span', 'fl-timeline__mark');
          mark.append(icon(kind.icon));
          const title = el('p', 'fl-timeline__title');
          if (item.href) {
            const link = el('a', null, item.title);
            link.href = item.href;
            title.append(link);
          } else title.textContent = item.title;
          const time = el('time', null, item.time);
          time.dateTime = item.iso;
          const meta = el('p', 'fl-timeline__meta');
          meta.append(time, document.createTextNode(` · ${item.by}`));
          const text = el('div');
          text.append(title, meta);
          li.append(mark, text, el('span', 'fl-timeline__key', item.key));
          list.append(li);
        }
        section.append(heading, list);
        return section;
      });
      panel.replaceChildren(...sections);
    },
  };
}
