import { DataElement, define, el } from './dom.ts';
import { icon, type IconName } from './icons.ts';

export type FeedKind = 'checkpoint' | 'push' | 'status' | 'paused' | 'shipped' | 'stale' | 'cold';

export interface FeedItem {
  kind: FeedKind;
  title: string;
  meta?: string;
  key?: string;
}

const KIND: Readonly<Record<FeedKind, { icon: IconName; tone?: 'signal' | 'positive' | 'warning' | 'danger' }>> = {
  checkpoint: { icon: 'bookmark' },
  push: { icon: 'commit' },
  status: { icon: 'arrow', tone: 'signal' },
  paused: { icon: 'pauseCircle' },
  shipped: { icon: 'checkCircle', tone: 'positive' },
  stale: { icon: 'alert', tone: 'warning' },
  cold: { icon: 'alert', tone: 'danger' },
};

/** <fl-activity-feed> · `.items` = [{kind, title, meta, key}], newest first. */
export class ActivityFeed extends DataElement<FeedItem> {
  set items(value: readonly FeedItem[]) {
    this.setData(value);
  }
  get items(): readonly FeedItem[] {
    return this.data;
  }

  protected render(): void {
    const list = el('ol', 'fl-feed');
    for (const item of this.data) {
      const kind = KIND[item.kind];
      const li = el('li');
      if (kind.tone) li.dataset['tone'] = kind.tone;
      const body = el('div');
      body.append(el('p', 'fl-feed__title', item.title), el('p', 'fl-feed__meta', item.meta ?? ''));
      li.append(icon(kind.icon), body, el('span', 'fl-feed__key', item.key ?? ''));
      list.append(li);
    }
    this.replaceChildren(list);
  }
}

define('fl-activity-feed', ActivityFeed);
