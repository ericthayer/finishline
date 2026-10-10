/* @ds-bundle: {"format":4,"namespace":"Finishline","components":[{"name":"Button"},{"name":"Field"},{"name":"StatusPill"},{"name":"StaleBadge"},{"name":"NextAction"},{"name":"HandoffBrief"},{"name":"WipLanes"},{"name":"ProjectCard"},{"name":"ShipChecklist"},{"name":"ParkDialog"}]} */
(function () {
  'use strict';
  var SVG = 'http://www.w3.org/2000/svg';
  var STATUS_LABEL = { idea: 'Idea', ready: 'Ready', active: 'Active', paused: 'Paused', shipped: 'Shipped', archived: 'Archived' };
  // Glyph paths on a 12×12 grid: shape carries status as well as colour.
  var STATUS_GLYPH = {
    idea: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
    ready: 'M6 1.5a4.5 4.5 0 0 1 0 9z M6 1.5a4.5 4.5 0 1 0 0 9',
    active: 'M6 1.5a4.5 4.5 0 1 1 0 9a4.5 4.5 0 1 1 0-9z',
    paused: 'M3.5 2v8 M8.5 2v8',
    shipped: 'M2 6.5l2.5 2.5L10 3',
    archived: 'M3 3l6 6 M9 3l-6 6'
  };
  var FILLED = { active: true };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function glyph(status) {
    var s = document.createElementNS(SVG, 'svg');
    s.setAttribute('viewBox', '0 0 12 12');
    s.setAttribute('aria-hidden', 'true');
    var p = document.createElementNS(SVG, 'path');
    p.setAttribute('d', STATUS_GLYPH[status] || STATUS_GLYPH.idea);
    p.setAttribute('fill', FILLED[status] ? 'currentColor' : 'none');
    p.setAttribute('stroke', 'currentColor');
    p.setAttribute('stroke-width', '1.5');
    p.setAttribute('stroke-linecap', 'round');
    s.appendChild(p);
    return s;
  }
  function splitTime(days) {
    var d = Number(days);
    if (!isFinite(d)) return '';
    return d < 0 ? 'in ' + -d + 'd' : '+' + d + 'd';
  }
  function emit(node, name, detail) {
    node.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail: detail }));
  }
  function define(name, cls) {
    if (!customElements.get(name)) customElements.define(name, cls);
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

  /* <fl-stale-badge level="stale" days="9" label="since progress"> */
  class StaleBadge extends HTMLElement {
    static get observedAttributes() { return ['level', 'days', 'label']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var level = this.getAttribute('level') || 'fresh';
      var wrap = el('span', 'fl-stale');
      wrap.dataset.level = level;
      var word = { fresh: 'Fresh', stale: 'Stale', cold: 'Cold', none: '' }[level] || '';
      wrap.append(el('b', null, splitTime(this.getAttribute('days'))), el('span', null, (word ? word + ' · ' : '') + (this.getAttribute('label') || 'since progress')));
      this.replaceChildren(wrap);
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

  /* <fl-wip-lanes cap="3"> · set .projects = ["Finishline", "DevLog"] */
  class WipLanes extends HTMLElement {
    constructor() { super(); this._projects = []; }
    set projects(v) { this._projects = Array.isArray(v) ? v.slice() : []; if (this.isConnected) this.render(); }
    static get observedAttributes() { return ['cap']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var cap = Math.max(1, Number(this.getAttribute('cap')) || 3);
      var used = Math.min(this._projects.length, cap);
      var wrap = el('div', 'fl-lanes');
      var head = el('div', 'fl-lanes__head');
      head.append(el('span', 'fl-eyebrow', 'Active lanes'), el('span', 'fl-lanes__count', used + '/' + cap));
      var track = el('ol', 'fl-lanes__track');
      track.style.setProperty('--lanes', String(cap));
      track.setAttribute('aria-label', used + ' of ' + cap + ' active lanes in use');
      for (var i = 0; i < cap; i++) {
        var lane = el('li', 'fl-lanes__lane');
        var name = this._projects[i];
        if (name) lane.setAttribute('data-filled', '');
        lane.append(el('span', null, 'L' + (i + 1)), el('span', null, name || 'Open'));
        track.append(lane);
      }
      wrap.append(head, track);
      this.replaceChildren(wrap);
    }
  }

  /* <fl-project-card name status next days level platform repo href> */
  class ProjectCard extends HTMLElement {
    static get observedAttributes() { return ['name', 'status', 'next', 'days', 'level', 'platform', 'repo', 'href']; }
    connectedCallback() { this.render(); }
    attributeChangedCallback() { if (this.isConnected) this.render(); }
    render() {
      var a = this.getAttribute.bind(this);
      var card = el('article', 'fl-card');
      var top = el('div', 'fl-card__top');
      var h = el('h3', 'fl-card__name');
      var link = el('a', null, a('name') || 'Untitled');
      link.href = a('href') || '#';
      h.append(link);
      var pill = document.createElement('fl-status-pill');
      pill.setAttribute('status', a('status') || 'active');
      top.append(h, pill);
      var next = a('next')
        ? el('p', 'fl-card__next', a('next'))
        : el('p', 'fl-card__next', 'Add a next action');
      var meta = el('div', 'fl-card__meta');
      var stale = document.createElement('fl-stale-badge');
      stale.setAttribute('level', a('level') || 'fresh');
      stale.setAttribute('days', a('days') || '0');
      var chips = el('span', 'fl-chip');
      chips.textContent = [a('platform'), a('repo')].filter(Boolean).join(' · ');
      meta.append(stale, chips);
      card.append(top, next, meta);
      this.replaceChildren(card);
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

  define('fl-status-pill', StatusPill);
  define('fl-stale-badge', StaleBadge);
  define('fl-next-action', NextAction);
  define('fl-handoff-brief', HandoffBrief);
  define('fl-wip-lanes', WipLanes);
  define('fl-project-card', ProjectCard);
  define('fl-ship-checklist', ShipChecklist);
  define('fl-park-dialog', ParkDialog);

  window.Finishline = {
    StatusPill: StatusPill, StaleBadge: StaleBadge, NextAction: NextAction, HandoffBrief: HandoffBrief,
    WipLanes: WipLanes, ProjectCard: ProjectCard, ShipChecklist: ShipChecklist, ParkDialog: ParkDialog,
    tags: ['fl-status-pill', 'fl-stale-badge', 'fl-next-action', 'fl-handoff-brief', 'fl-wip-lanes', 'fl-project-card', 'fl-ship-checklist', 'fl-park-dialog']
  };
})();
