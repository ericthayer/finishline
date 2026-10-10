/* @ds-bundle: {"format":4,"namespace":"Finishline","components":[{"name":"Icon"},{"name":"Button"},{"name":"Field"},{"name":"StatusPill"},{"name":"StaleBadge"},{"name":"Kpi"},{"name":"WipLanes"},{"name":"ProjectCard"},{"name":"StageBars"},{"name":"FinishRate"},{"name":"ActivityFeed"},{"name":"ProjectTable"},{"name":"ThemeToggle"},{"name":"NextAction"},{"name":"HandoffBrief"},{"name":"ShipChecklist"},{"name":"ParkDialog"}]} */
(function () {
  'use strict';
  var SVG = 'http://www.w3.org/2000/svg';
  var STATUS_LABEL = { idea: 'Idea', ready: 'Ready', active: 'Active', paused: 'Paused', shipped: 'Shipped', archived: 'Archived' };
  var STATUS_COLOR = { idea: '--status-idea', ready: '--status-ready', active: '--status-active', paused: '--status-paused', shipped: '--positive', archived: '--ink-muted' };
  // Glyph paths on a 12×12 grid: shape carries status as well as colour.
  var STATUS_GLYPH = {
    idea: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
    ready: 'M6 1.5a4.5 4.5 0 0 1 0 9z M6 1.5a4.5 4.5 0 1 0 0 9',
    active: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
    paused: 'M3.5 2v8 M8.5 2v8',
    shipped: 'M2 6.5l2.5 2.5L10 3',
    archived: 'M3 3l6 6 M9 3l-6 6'
  };
  var FILLED = { active: true, ready: true };
  // 24×24 stroke icons, 1.5px, round caps. Drawn for Finishline; no icon font.
  var CIRCLE = 'M12 3a9 9 0 1 1 0 18a9 9 0 1 1 0-18z';
  var ICONS = {
    overview: 'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',
    projects: 'M3 7.5l9-4.5 9 4.5-9 4.5z M3 12l9 4.5 9-4.5 M3 16.5l9 4.5 9-4.5',
    inbox: 'M3 13h5l1.5 3h5l1.5-3h5 M5.5 5h13L21 13v6H3v-6z',
    resume: CIRCLE + ' M10 8.5v7l5.5-3.5z',
    shipped: 'M5 21V4 M5 4h12l-2.5 4L17 12H5',
    activity: 'M3 12h4l3-8 4 16 3-8h4',
    settings: 'M4 7h9 M17 7h3 M15 5v4 M4 17h3 M11 17h9 M9 15v4',
    sun: 'M12 8a4 4 0 1 1 0 8a4 4 0 1 1 0-8z M12 2.5v2 M12 19.5v2 M2.5 12h2 M19.5 12h2 M5.3 5.3l1.4 1.4 M17.3 17.3l1.4 1.4 M5.3 18.7l1.4-1.4 M17.3 6.7l1.4-1.4',
    moon: 'M20 14.5A8.5 8.5 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    search: 'M11 4a7 7 0 1 1 0 14a7 7 0 1 1 0-14z M20 20l-4-4',
    bell: 'M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15z M10 20.5a2 2 0 0 0 4 0',
    help: CIRCLE + ' M9.6 9.5a2.5 2.5 0 1 1 3.6 2.2c-.8.4-1.2.9-1.2 1.8 M12 17h.01',
    plus: 'M12 5v14 M5 12h14',
    export: 'M12 15V4 M8 8l4-4 4 4 M5 14v6h14v-6',
    share: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1 M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
    more: 'M5 12h.01 M12 12h.01 M19 12h.01',
    filter: 'M4 6h16 M7 12h10 M10 18h4',
    lanes: 'M4 5v14 M9.3 5v14 M14.7 5v14 M20 5v14',
    alert: 'M12 4l9 16H3z M12 10v4 M12 17h.01',
    calendar: 'M4 6h16v14H4z M4 10h16 M8 3v4 M16 3v4',
    bookmark: 'M6.5 3.5h11v17l-5.5-4-5.5 4z',
    commit: 'M12 9a3 3 0 1 1 0 6a3 3 0 1 1 0-6z M3 12h6 M15 12h6',
    checkCircle: CIRCLE + ' M8 12.5l2.8 2.8L16 9.5',
    pauseCircle: CIRCLE + ' M10 9v6 M14 9v6',
    arrow: 'M5 12h14 M13 6l6 6-6 6',
    mark: 'M5 3v18 M12 3v18 M19 3v18 M3 8h18'
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function svgEl(tag, attrs) {
    var n = document.createElementNS(SVG, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }
  function glyph(status) {
    var s = svgEl('svg', { viewBox: '0 0 12 12', 'aria-hidden': 'true' });
    s.appendChild(svgEl('path', {
      d: STATUS_GLYPH[status] || STATUS_GLYPH.idea, fill: FILLED[status] ? 'currentColor' : 'none',
      stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round'
    }));
    return s;
  }
  function icon(name) {
    var i = document.createElement('fl-icon');
    i.setAttribute('name', name);
    return i;
  }
  function splitTime(days) {
    var d = Number(days);
    if (!isFinite(d)) return '';
    return d < 0 ? 'in ' + -d + 'd' : '+' + d + 'd';
  }
  function pct(n, total) { return total ? Math.round((n / total) * 1000) / 10 : 0; }
  function emit(node, name, detail) {
    node.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: detail }));
  }
  function define(name, cls) {
    if (!customElements.get(name)) customElements.define(name, cls);
  }
  function statusPill(status) {
    var p = document.createElement('fl-status-pill');
    p.setAttribute('status', status);
    return p;
  }
  function staleBadge(level, days, label) {
    var b = document.createElement('fl-stale-badge');
    b.setAttribute('level', level || 'fresh');
    b.setAttribute('days', String(days == null ? 0 : days));
    if (label) b.setAttribute('label', label);
    return b;
  }
  /** Base for list components fed through a property. */
  class DataElement extends HTMLElement {
    constructor() { super(); this._data = []; }
    connectedCallback() { this.render(); }
    setData(v) { this._data = Array.isArray(v) ? v.slice() : []; if (this.isConnected) this.render(); }
  }

  /* <fl-icon name="search"> · decorative; name the control that holds it */
  class Icon extends HTMLElement {
    static get observedAttributes() { return ['name']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var s = svgEl('svg', { viewBox: '0 0 24 24', 'aria-hidden': 'true', fill: 'none', stroke: 'currentColor', 'stroke-width': this.getAttribute('name') === 'more' ? '2.5' : '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
      s.appendChild(svgEl('path', { d: ICONS[this.getAttribute('name')] || '' }));
      this.replaceChildren(s);
    }
  }

  /* <fl-status-pill status="active"> */
  class StatusPill extends HTMLElement {
    static get observedAttributes() { return ['status']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var status = STATUS_LABEL[this.getAttribute('status')] ? this.getAttribute('status') : 'idea';
      var pill = el('span', 'fl-status');
      pill.dataset.status = status;
      pill.append(glyph(status), el('span', null, STATUS_LABEL[status]));
      this.replaceChildren(pill);
    }
  }

  /* <fl-stale-badge level="stale" days="9" label="since progress"> · split time + word; label is read, not shown */
  class StaleBadge extends HTMLElement {
    static get observedAttributes() { return ['level', 'days', 'label']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var level = this.getAttribute('level') || 'fresh';
      var wrap = el('span', 'fl-stale');
      wrap.dataset.level = level;
      var word = { fresh: 'Fresh', stale: 'Stale', cold: 'Cold' }[level] || '';
      wrap.append(el('b', null, splitTime(this.getAttribute('days'))));
      if (word) wrap.append(el('span', null, word));
      wrap.append(el('span', 'fl-sr', ' ' + (this.getAttribute('label') || 'since progress')));
      this.replaceChildren(wrap);
    }
  }

  /* <fl-kpi label icon value unit delta tone meta> · one cell of the KPI strip */
  class Kpi extends HTMLElement {
    static get observedAttributes() { return ['label', 'icon', 'value', 'unit', 'delta', 'tone', 'meta']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var a = this.getAttribute.bind(this);
      var cell = el('div', 'fl-kpi');
      var label = el('div', 'fl-kpi__label');
      if (a('icon')) label.append(icon(a('icon')));
      label.append(el('span', null, a('label') || ''));
      var row = el('div', 'fl-kpi__row');
      var value = el('span', 'fl-kpi__value', a('value') || '0');
      if (a('unit')) value.append(el('small', null, a('unit')));
      row.append(value);
      if (a('delta')) {
        var tag = el('span', 'fl-tag', a('delta'));
        if (a('tone')) tag.dataset.tone = a('tone');
        row.append(tag);
      } else if (a('meta')) row.append(el('span', 'fl-kpi__meta', a('meta')));
      cell.append(label, row);
      this.replaceChildren(cell);
    }
  }

  /* <fl-wip-lanes cap="3"> · set .projects = ["Finishline", "DevLog"] · compact meter for panel headers */
  class WipLanes extends DataElement {
    set projects(v) { this.setData(v); }
    get projects() { return this._data.slice(); }
    static get observedAttributes() { return ['cap']; }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var cap = Math.max(1, Number(this.getAttribute('cap')) || 3);
      var used = Math.min(this._data.length, cap);
      var wrap = el('div', 'fl-lanes');
      var track = el('ol', 'fl-lanes__track');
      track.style.setProperty('--lanes', String(cap));
      track.setAttribute('aria-label', used + ' of ' + cap + ' active lanes in use');
      for (var i = 0; i < cap; i++) {
        var lane = el('li', 'fl-lanes__lane');
        if (this._data[i]) lane.setAttribute('data-filled', '');
        lane.append(el('span', 'fl-sr', 'Lane ' + (i + 1) + ': ' + (this._data[i] || 'open')));
        track.append(lane);
      }
      var count = el('span', 'fl-lanes__count', used + '/' + cap);
      count.setAttribute('aria-hidden', 'true');
      wrap.append(track, count);
      this.replaceChildren(wrap);
    }
  }

  /* <fl-project-card lane name status next days level platform repo href> · omit name for an open lane */
  class ProjectCard extends HTMLElement {
    static get observedAttributes() { return ['lane', 'name', 'status', 'next', 'days', 'level', 'platform', 'repo', 'href']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var a = this.getAttribute.bind(this);
      var lane = a('lane') ? 'L' + a('lane') : '';
      if (!a('name')) {
        var empty = el('article', 'fl-card fl-card--empty');
        empty.append(el('span', 'fl-card__lane', lane), el('p', null, 'Open lane. Start a Ready project to fill it.'));
        this.replaceChildren(empty);
        return;
      }
      var card = el('article', 'fl-card');
      var top = el('div', 'fl-card__top');
      top.append(el('span', 'fl-card__lane', lane), statusPill(a('status') || 'active'));
      var h = el('h3', 'fl-card__name');
      var link = el('a', null, a('name'));
      link.href = a('href') || '#';
      h.append(link);
      var next = el('p', 'fl-card__next');
      next.append(el('span', null, 'Next'), document.createTextNode(a('next') || 'Add a next action'));
      var meta = el('div', 'fl-card__meta');
      meta.append(staleBadge(a('level'), a('days')), el('span', 'fl-meta', [a('platform'), a('repo')].filter(Boolean).join(' · ')));
      card.append(top, h, next, meta);
      this.replaceChildren(card);
    }
  }

  /* <fl-stage-bars> · set .stages = [{status, count}] · column width follows share */
  class StageBars extends DataElement {
    set stages(v) { this.setData(v); }
    get stages() { return this._data.slice(); }
    render() {
      var total = this._data.reduce(function (s, x) { return s + (Number(x.count) || 0); }, 0);
      var list = el('ol', 'fl-stages');
      list.setAttribute('aria-label', 'Projects by status, ' + total + ' total');
      this._data.forEach(function (x) {
        var n = Number(x.count) || 0;
        var li = el('li', 'fl-stage');
        li.style.setProperty('--c', 'var(' + (STATUS_COLOR[x.status] || '--ink-muted') + ')');
        li.style.setProperty('--share', String(Math.max(n / (total || 1), 0.04) * 10));
        li.append(
          el('span', 'fl-stage__label', STATUS_LABEL[x.status] || x.status),
          el('span', 'fl-stage__count', String(n)),
          el('span', 'fl-stage__pct', pct(n, total) + '%'),
          el('i', 'fl-stage__bar')
        );
        li.lastChild.setAttribute('aria-hidden', 'true');
        list.append(li);
      });
      this.replaceChildren(list);
    }
  }

  /* <fl-finish-rate shipped archived delta tone> · shipped ÷ (shipped + archived) */
  class FinishRate extends HTMLElement {
    static get observedAttributes() { return ['shipped', 'archived', 'delta', 'tone']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var shipped = Number(this.getAttribute('shipped')) || 0;
      var archived = Number(this.getAttribute('archived')) || 0;
      var total = shipped + archived;
      var rate = pct(shipped, total);
      var wrap = el('div', 'fl-donut');
      var ring = el('div', 'fl-donut__ring');
      var s = svgEl('svg', { viewBox: '0 0 100 100', 'aria-hidden': 'true' });
      s.appendChild(svgEl('circle', { class: 'fl-donut__track', cx: 50, cy: 50, r: 44, pathLength: 100 }));
      var gap = total && shipped && archived ? 1.5 : 0;
      var at = 0;
      [['--positive', shipped], ['--status-idea', archived]].forEach(function (seg) {
        var len = total ? (seg[1] / total) * 100 : 0;
        if (!len) return;
        s.appendChild(svgEl('circle', {
          cx: 50, cy: 50, r: 44, pathLength: 100, stroke: 'var(' + seg[0] + ')',
          'stroke-dasharray': Math.max(len - gap, 0) + ' ' + (100 - len + gap), 'stroke-dashoffset': String(-at)
        }));
        at += len;
      });
      var center = el('div', 'fl-donut__center');
      center.append(el('span', 'fl-donut__value', rate + '%'));
      if (this.getAttribute('delta')) {
        var d = el('span', 'fl-tag', this.getAttribute('delta'));
        d.dataset.tone = this.getAttribute('tone') || 'positive';
        center.append(d);
      }
      ring.append(s, center);
      ring.setAttribute('role', 'img');
      ring.setAttribute('aria-label', 'Finish rate ' + rate + '%: ' + shipped + ' shipped, ' + archived + ' archived');
      var legend = el('ul', 'fl-legend');
      [['Shipped', '--positive', shipped], ['Archived', '--status-idea', archived]].forEach(function (r) {
        var li = el('li'); var dot = el('i'); dot.style.setProperty('--c', 'var(' + r[1] + ')');
        li.append(dot, el('span', null, r[0]), el('b', null, String(r[2])));
        legend.append(li);
      });
      wrap.append(ring, legend);
      this.replaceChildren(wrap);
    }
  }

  var FEED_KIND = {
    checkpoint: ['bookmark'], push: ['commit'], status: ['arrow', 'signal'], paused: ['pauseCircle'],
    shipped: ['checkCircle', 'positive'], stale: ['alert', 'warning'], cold: ['alert', 'danger']
  };
  /* <fl-activity-feed> · set .items = [{kind, title, meta, key}] */
  class ActivityFeed extends DataElement {
    set items(v) { this.setData(v); }
    get items() { return this._data.slice(); }
    render() {
      var list = el('ol', 'fl-feed');
      this._data.forEach(function (x) {
        var k = FEED_KIND[x.kind] || FEED_KIND.checkpoint;
        var li = el('li');
        if (k[1]) li.dataset.tone = k[1];
        var body = el('div');
        body.append(el('p', 'fl-feed__title', x.title), el('p', 'fl-feed__meta', x.meta || ''));
        li.append(icon(k[0]), body, el('span', 'fl-feed__key', x.key || ''));
        list.append(li);
      });
      this.replaceChildren(list);
    }
  }

  /* <fl-project-table caption="…"> · set .rows = [{name, key, href, status, next, platform, days, level, updated}] */
  class ProjectTable extends DataElement {
    set rows(v) { this.setData(v); }
    get rows() { return this._data.slice(); }
    render() {
      var wrap = el('div', 'fl-tablewrap');
      var table = el('table', 'fl-table');
      table.append(el('caption', 'fl-sr', this.getAttribute('caption') || 'Projects'));
      var head = el('tr');
      [['Project'], ['Status'], ['Next action', 'next'], ['Agent', 'agent'], ['Last progress'], ['Updated']].forEach(function (c) {
        var th = el('th', null, c[0]); th.scope = 'col'; if (c[1]) th.dataset.col = c[1]; head.append(th);
      });
      var thead = el('thead'); thead.append(head);
      var tbody = el('tbody');
      this._data.forEach(function (r) {
        var tr = el('tr');
        var name = el('td'); var nm = el('div', 'fl-table__name'); var a = el('a', null, r.name); a.href = r.href || '#';
        nm.append(a, el('span', null, r.key || '')); name.append(nm);
        var st = el('td'); st.append(statusPill(r.status));
        var next = el('td', 'fl-table__next', r.next || '—'); next.dataset.col = 'next'; if (r.next) next.title = r.next;
        var agent = el('td', 'fl-muted', r.platform || '—'); agent.dataset.col = 'agent';
        var prog = el('td'); prog.append(staleBadge(r.level, r.days));
        tr.append(name, st, next, agent, prog, el('td', 'fl-muted', r.updated || ''));
        tbody.append(tr);
      });
      table.append(thead, tbody);
      wrap.append(table);
      wrap.tabIndex = 0;
      wrap.setAttribute('aria-label', (this.getAttribute('caption') || 'Projects') + ', scrollable');
      this.replaceChildren(wrap);
    }
  }

  /* <fl-theme-toggle> · flips data-theme on <html>; dark is the default · fires fl-theme-change */
  class ThemeToggle extends HTMLElement {
    connectedCallback() {
      var self = this;
      var root = document.documentElement;
      try { var saved = localStorage.getItem('fl-theme'); if (saved) root.dataset.theme = saved; } catch (e) { /* storage blocked */ }
      var btn = el('button', 'fl-iconbtn');
      btn.type = 'button';
      var paint = function () {
        var light = root.dataset.theme === 'light';
        btn.setAttribute('aria-label', light ? 'Switch to dark theme' : 'Switch to light theme');
        btn.replaceChildren(icon(light ? 'moon' : 'sun'));
      };
      btn.addEventListener('click', function () {
        var next = root.dataset.theme === 'light' ? 'dark' : 'light';
        root.dataset.theme = next;
        try { localStorage.setItem('fl-theme', next); } catch (e) { /* storage blocked */ }
        paint();
        emit(self, 'fl-theme-change', { theme: next });
      });
      paint();
      this.replaceChildren(btn);
    }
  }

  /* <fl-next-action text="…"> · fires fl-next-done */
  class NextAction extends HTMLElement {
    static get observedAttributes() { return ['text']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var text = (this.getAttribute('text') || '').trim();
      var band = el('section', 'fl-next');
      band.setAttribute('aria-labelledby', 'fl-next-eyebrow');
      var body = el('div', 'fl-next__body');
      var eyebrow = el('p', 'fl-eyebrow', 'Do this next');
      eyebrow.id = 'fl-next-eyebrow';
      body.append(eyebrow, text ? el('p', 'fl-next__text', text) : el('p', 'fl-next__empty', 'No next action yet. Write the one step that gets this moving.'));
      var btn = el('button', 'fl-btn fl-btn--on-signal', text ? 'Done' : 'Add next action');
      btn.type = 'button';
      var self = this;
      btn.addEventListener('click', function () { emit(self, text ? 'fl-next-done' : 'fl-next-add', { text: text }); });
      band.append(body, btn);
      this.replaceChildren(band);
    }
  }

  /* <fl-handoff-brief> · set .brief = "markdown"; optional .briefWithCommits */
  class HandoffBrief extends HTMLElement {
    constructor() { super(); this._brief = ''; this._withCommits = ''; }
    set brief(v) { this._brief = String(v || ''); if (this.isConnected) this.render(); }
    get brief() { return this._brief; }
    set briefWithCommits(v) { this._withCommits = String(v || ''); if (this.isConnected) this.render(); }
    connectedCallback() { this.render(); }
    render() {
      var self = this;
      var box = el('section', 'fl-brief');
      box.setAttribute('aria-label', 'Agent handoff brief');
      var bar = el('div', 'fl-brief__bar');
      var left = el('div', 'fl-brief__group');
      left.append(el('span', 'fl-eyebrow', 'Agent handoff'));
      var pre = el('pre', null, this._brief);
      pre.tabIndex = 0;
      if (this._withCommits) {
        var lab = el('label');
        var cb = el('input'); cb.type = 'checkbox'; cb.id = 'fl-brief-commits';
        cb.addEventListener('change', function () { pre.textContent = cb.checked ? self._withCommits : self._brief; });
        lab.append(cb, document.createTextNode('Include recent commits'));
        left.append(lab);
      }
      var right = el('div', 'fl-brief__group');
      var status = el('span', 'fl-brief__status');
      status.setAttribute('aria-live', 'polite');
      var copy = el('button', 'fl-btn fl-btn--primary');
      copy.type = 'button';
      copy.append(document.createTextNode('Copy brief'), el('kbd', null, 'C'));
      copy.addEventListener('click', function () {
        var text = pre.textContent;
        var done = function () { status.textContent = 'Copied'; emit(self, 'fl-brief-copied', { text: text }); };
        var fallback = function () {
          var range = document.createRange(); range.selectNodeContents(pre);
          var sel = window.getSelection(); sel.removeAllRanges(); sel.addRange(range);
          status.textContent = 'Selected · press Ctrl+C';
        };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fallback);
        else fallback();
      });
      right.append(status, copy);
      bar.append(left, right);
      box.append(bar, pre);
      this.replaceChildren(box);
    }
  }

  /* <fl-ship-checklist> · set .items = [{text, done}] · fires fl-criterion-toggle */
  class ShipChecklist extends HTMLElement {
    constructor() { super(); this._items = []; }
    set items(v) { this._items = Array.isArray(v) ? v.map(function (x) { return { text: String(x.text), done: !!x.done }; }) : []; if (this.isConnected) this.render(); }
    connectedCallback() { this.render(); }
    render() {
      var self = this;
      var done = this._items.filter(function (x) { return x.done; }).length;
      var total = this._items.length;
      var wrap = el('section', 'fl-check');
      wrap.setAttribute('aria-label', 'What remains');
      var head = el('div', 'fl-check__head');
      head.append(el('span', 'fl-eyebrow', 'Done when'), el('span', 'fl-lanes__count', done + '/' + total));
      var meter = el('div', 'fl-check__meter');
      meter.setAttribute('role', 'progressbar');
      meter.setAttribute('aria-valuemin', '0'); meter.setAttribute('aria-valuemax', String(total)); meter.setAttribute('aria-valuenow', String(done));
      meter.setAttribute('aria-label', done + ' of ' + total + ' ship criteria done');
      var fill = el('i'); fill.style.width = total ? (done / total) * 100 + '%' : '0';
      meter.append(fill);
      var list = el('ul');
      this._items.forEach(function (item, i) {
        var li = el('li');
        var id = 'fl-crit-' + i + '-' + Math.random().toString(36).slice(2, 7);
        var cb = el('input'); cb.type = 'checkbox'; cb.id = id; cb.checked = item.done;
        cb.addEventListener('change', function () { item.done = cb.checked; emit(self, 'fl-criterion-toggle', { index: i, done: cb.checked }); self.render(); });
        var lab = el('label', null, item.text); lab.htmlFor = id;
        li.append(cb, lab); list.append(li);
      });
      wrap.append(head, meter, list);
      this.replaceChildren(wrap);
    }
  }

  /* <fl-park-dialog next="…"> · .open() / [open] · fires fl-park {summary, next, blocker} */
  class ParkDialog extends HTMLElement {
    static get observedAttributes() { return ['next', 'open']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback(name) { if (this.isConnected && name === 'next') this.render(); if (name === 'open' && this._dlg) this.sync(); }
    open() { this.setAttribute('open', ''); }
    close() { this.removeAttribute('open'); }
    sync() {
      var want = this.hasAttribute('open');
      if (want && !this._dlg.open) { this.hasAttribute('inline') ? this._dlg.show() : this._dlg.showModal(); this._dlg.querySelector('textarea').focus(); }
      if (!want && this._dlg.open) this._dlg.close();
    }
    render() {
      var self = this;
      var uid = Math.random().toString(36).slice(2, 7);
      var dlg = el('dialog', 'fl-dialog');
      dlg.setAttribute('aria-labelledby', 'fl-park-title-' + uid);
      var form = el('form');
      form.method = 'dialog';
      var h = el('h2', null, 'Park this session'); h.id = 'fl-park-title-' + uid;
      function field(id, label, tag, value, help, required) {
        var f = el('div', 'fl-field');
        var l = el('label', null, label); l.htmlFor = id + uid;
        var input = el(tag); input.id = id + uid; input.name = id; if (value) input.value = value; if (required) input.required = true;
        f.append(l, input);
        if (help) { var s = el('small', null, help); s.id = id + uid + '-help'; input.setAttribute('aria-describedby', s.id); f.append(s); }
        return f;
      }
      var actions = el('div', 'fl-dialog__actions');
      var cancel = el('button', 'fl-btn fl-btn--secondary', 'Cancel'); cancel.type = 'button';
      cancel.addEventListener('click', function () { self.close(); });
      var save = el('button', 'fl-btn fl-btn--primary', 'Park'); save.type = 'submit';
      actions.append(cancel, save);
      form.append(
        h,
        field('summary', 'What happened', 'textarea', '', 'One or two lines. This becomes “Last session” in the brief.', true),
        field('next', 'Next action', 'input', this.getAttribute('next') || '', 'The exact step to start with next time.', true),
        field('blocker', 'New blocker', 'input', '', 'Optional.', false),
        actions
      );
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var data = new FormData(form);
        emit(self, 'fl-park', { summary: String(data.get('summary')), next: String(data.get('next')), blocker: String(data.get('blocker') || '') });
        self.close();
      });
      dlg.addEventListener('close', function () { self.removeAttribute('open'); });
      dlg.append(form);
      this._dlg = dlg;
      this.replaceChildren(dlg);
      if (this.hasAttribute('open')) queueMicrotask(function () { self.sync(); });
    }
  }

  var C = {
    'fl-icon': Icon, 'fl-status-pill': StatusPill, 'fl-stale-badge': StaleBadge, 'fl-kpi': Kpi,
    'fl-wip-lanes': WipLanes, 'fl-project-card': ProjectCard, 'fl-stage-bars': StageBars, 'fl-finish-rate': FinishRate,
    'fl-activity-feed': ActivityFeed, 'fl-project-table': ProjectTable, 'fl-theme-toggle': ThemeToggle,
    'fl-next-action': NextAction, 'fl-handoff-brief': HandoffBrief, 'fl-ship-checklist': ShipChecklist, 'fl-park-dialog': ParkDialog
  };
  Object.keys(C).forEach(function (tag) { define(tag, C[tag]); });

  window.Finishline = {
    Icon: Icon, StatusPill: StatusPill, StaleBadge: StaleBadge, Kpi: Kpi, WipLanes: WipLanes, ProjectCard: ProjectCard,
    StageBars: StageBars, FinishRate: FinishRate, ActivityFeed: ActivityFeed, ProjectTable: ProjectTable, ThemeToggle: ThemeToggle,
    NextAction: NextAction, HandoffBrief: HandoffBrief, ShipChecklist: ShipChecklist, ParkDialog: ParkDialog,
    tags: Object.keys(C)
  };
})();
