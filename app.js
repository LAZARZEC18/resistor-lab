/* Resistor Lab shell: tabs + hash deep links, saved state, Recent, copy,
   and the shared helpers each tool uses (units, fields, formulas, icons). */
(function () {
  'use strict';
  var C = window.ResistorCore;
  var tools = [], byId = {};
  var MAX_RECENT = 10;

  var S = ZL.store.get('state', null);
  if (!S || typeof S !== 'object') S = {};
  if (!S.tools || typeof S.tools !== 'object') S.tools = {};
  var recent = ZL.store.get('recent', []);
  if (!Array.isArray(recent)) recent = [];
  recent = recent.filter(function (r) { return r && typeof r.tool === 'string' && typeof r.title === 'string'; }).slice(0, MAX_RECENT);

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  var esc = ZL.esc;

  /* ---------- icons ---------- */
  function svg(p, sw) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + (sw || 1.8) + '" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>'; }
  var ICON = {
    colour: svg('<path d="M1.5 12h3.5M19 12h3.5"/><rect x="5" y="7.5" width="14" height="9" rx="3.5"/><path d="M9 7.5v9M12 7.5v9M16 7.5v9"/>'),
    smd: svg('<rect x="3.5" y="7" width="17" height="10" rx="1.5"/><path d="M7.5 7v10M16.5 7v10"/>'),
    ohm: svg('<path d="M5 19h4.2v-2.4a6.5 6.5 0 1 1 5.6 0V19H19"/>'),
    led: svg('<path d="M2 13h5M17 13h5M7 8l8 5-8 5zM15 8v10M14 5.5l2-2.2M17.5 7.5l2-2.2"/>'),
    divider: svg('<path d="M9 1.5v3.5M9 19v3.5M9 11v2M9 12h11"/><rect x="6.5" y="5" width="5" height="6" rx="1"/><rect x="6.5" y="13" width="5" height="6" rx="1"/>'),
    series: svg('<path d="M1.5 12h3M19.5 12h3M10 12h4"/><rect x="4.5" y="9" width="5.5" height="6" rx="1"/><rect x="14" y="9" width="5.5" height="6" rx="1"/>'),
    capacitor: svg('<path d="M2 12h8M14 12h8M10 5.5v13M14 5.5v13"/>'),
    copy: svg('<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>', 2),
    clock: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>', 1.6),
    plus: svg('<path d="M12 5v14M5 12h14"/>', 2.2),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>', 2),
    warn: svg('<path d="M12 3.5l9.5 16.5h-19z"/><path d="M12 10v4.5M12 17.5h.01"/>', 2),
    swap: svg('<path d="M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7"/>', 2)
  };

  /* ---------- units ---------- */
  var UNITS = {
    V: [['mV', 1e-3], ['V', 1], ['kV', 1e3]],
    I: [['µA', 1e-6], ['mA', 1e-3], ['A', 1]],
    R: [['Ω', 1], ['kΩ', 1e3], ['MΩ', 1e6]],
    P: [['mW', 1e-3], ['W', 1]]
  };
  function unitFactor(q, u) { var l = UNITS[q]; for (var i = 0; i < l.length; i++) if (l[i][0] === u) return l[i][1]; return 1; }
  function bestUnit(q, si) {
    var l = UNITS[q], pick = l[0];
    for (var i = 0; i < l.length; i++) if (Math.abs(si) >= l[i][1] * 0.9999999) pick = l[i];
    return pick;
  }
  function fmt(v, unit, sig) {
    if (v == null || !isFinite(v)) return '–';
    return C.formatSI(v, unit, sig || 4);
  }
  function ohms(v, sig) { return fmt(v, 'Ω', sig); }
  function sigText(x, sig) { return C.trimN(x, sig || 4); }

  /* strict number: "5", "3.3", ".5", "1e3"; returns NaN otherwise */
  function num(text) {
    var s = String(text == null ? '' : text).trim().replace(',', '.');
    if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return NaN;
    return Number(s);
  }

  /* ---------- field errors ---------- */
  function setError(input, msg) {
    if (!input) return;
    var field = input.closest('.zl-field') || input.parentNode;
    var err = field.querySelector('.zl-error');
    if (!err) {
      err = document.createElement('span');
      err.className = 'zl-error';
      err.id = (input.id || ('f' + Math.random().toString(36).slice(2))) + '-err';
      err.setAttribute('role', 'alert');
      field.appendChild(err);
    }
    if (msg) {
      err.textContent = msg; err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      var d = (input.getAttribute('aria-describedby') || '').split(' ').filter(Boolean);
      if (d.indexOf(err.id) < 0) { d.push(err.id); input.setAttribute('aria-describedby', d.join(' ')); }
    } else {
      err.hidden = true; err.textContent = '';
      input.removeAttribute('aria-invalid');
    }
  }

  /* ---------- formula helpers ---------- */
  var F = {
    v: function (n, sub) { return '<i>' + n + '</i>' + (sub != null ? '<sub>' + sub + '</sub>' : ''); },
    fr: function (n, d) { return '<span class="fr"><span>' + n + '</span><span>' + d + '</span></span>'; },
    sq: function (x) { return '<span class="sq"><span class="sq-r">√</span><span class="sq-x">' + x + '</span></span>'; },
    n: function (t) { return '<span class="f-n">' + esc(t) + '</span>'; },
    op: function (t) { return '<span class="f-op">' + t + '</span>'; },
    /* parts joined by "=", the last one highlighted as the answer */
    row: function (parts, label, opts) {
      opts = opts || {};
      var html = parts.map(function (p, i) {
        return (i ? '<span class="f-eq">=</span>' : '') + (i === parts.length - 1 && opts.answer !== false && parts.length > 1 ? '<span class="f-part f-ans">' + p + '</span>' : '<span class="f-part">' + p + '</span>');
      }).join('');
      return '<div class="f-row' + (opts.cls ? ' ' + opts.cls : '') + '"' + (label ? ' role="math" aria-label="' + esc(label) + '"' : '') + '>' + html + '</div>';
    },
    note: function (t) { return '<p class="f-note">' + t + '</p>'; }
  };

  /* ---------- tools ---------- */
  function tool(def) { tools.push(def); byId[def.id] = def; }
  function st(id) {
    var d = byId[id].defaults || {};
    var s = S.tools[id];
    if (!s || typeof s !== 'object') s = S.tools[id] = clone(d);
    for (var k in d) if (!(k in s)) s[k] = clone(d[k]);
    return s;
  }
  var summaries = {};

  function render(id) {
    var t = byId[id];
    var sum = null;
    try { sum = t.render(t.el, st(id)); } catch (e) { console.warn(e); }
    summaries[id] = sum;
    if (id === S.tab) syncCopyButton();
    return sum;
  }

  /* ---------- saving + status ---------- */
  var saveTimer, statusTimer, dirty = false;
  function save(quiet) {
    clearTimeout(saveTimer);
    dirty = true;
    saveTimer = setTimeout(function () {
      dirty = false;
      var ok = ZL.store.set('state', S);
      if (!quiet || !ok) flashStatus(ok ? 'Saved' : 'Not saved: storage is off');
    }, 250);
  }
  function statusIdle() {
    var n = recent.length;
    return n ? n + ' recent result' + (n === 1 ? '' : 's') + ' saved' : 'Saved on this device';
  }
  function flashStatus(text) {
    var el = $('#appStatus');
    el.textContent = text;
    el.classList.remove('is-flash'); void el.offsetWidth; el.classList.add('is-flash');
    clearTimeout(statusTimer);
    statusTimer = setTimeout(function () { el.textContent = statusIdle(); el.classList.remove('is-flash'); }, 1600);
  }

  /* ---------- Recent ---------- */
  var recentTimer = {};
  function changed(id, opts) {
    var sum = render(id);
    save();
    clearTimeout(recentTimer[id]);
    if (sum && sum.ok && !(opts && opts.noRecent)) {
      recentTimer[id] = setTimeout(function () { pushRecent(id); }, (opts && opts.now) ? 0 : 1100);
    }
  }
  function pushRecent(id, force) {
    var sum = summaries[id];
    if (!sum || !sum.ok) return;
    var entry = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), tool: id, title: sum.title, detail: sum.detail || '', copy: sum.copy || sum.title, state: clone(st(id)), t: Date.now() };
    var key = id + '|' + entry.title + '|' + entry.detail;
    recent = recent.filter(function (r) { return r.tool + '|' + r.title + '|' + r.detail !== key; });
    // still tweaking the same tool: replace the entry made a moment ago
    if (!force && recent[0] && recent[0].tool === id && Date.now() - recent[0].t < 5000) recent.shift();
    recent.unshift(entry);
    recent = recent.slice(0, MAX_RECENT);
    ZL.store.set('recent', recent);
    renderRecent(entry.id);
  }
  function ago(t) {
    var s = Math.round((Date.now() - t) / 1000);
    if (s < 45) return 'Just now';
    var m = Math.round(s / 60); if (m < 60) return m + ' min ago';
    var h = Math.round(m / 60); if (h < 24) return h + ' h ago';
    var d = Math.round(h / 24); if (d === 1) return 'Yesterday';
    if (d < 7) return d + ' days ago';
    return new Date(t).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
  }
  function renderRecent(freshId) {
    var list = $('#recentList');
    $('#recentCount').textContent = String(recent.length);
    $('#clearRecent').hidden = !recent.length;
    if (!recent.length) {
      list.innerHTML = '<li class="zl-empty rl-recent-empty">' + ICON.clock + '<h3>Nothing yet</h3><p>Results from any tool appear here a moment after you stop typing.</p></li>';
      return;
    }
    list.innerHTML = recent.map(function (r) {
      var t = byId[r.tool];
      if (!t) return '';
      return '<li' + (r.id === freshId ? ' class="is-new"' : '') + '><button type="button" class="rl-recent-item" data-rid="' + esc(r.id) + '" aria-label="Restore ' + esc(r.title) + ', ' + esc(t.label) + '">' +
        '<span class="rl-recent-ic">' + ICON[r.tool] + '</span>' +
        '<span class="rl-recent-txt"><b class="num">' + esc(r.title) + '</b><small>' + esc(t.label) + (r.detail ? ': ' + esc(r.detail) : '') + '</small></span>' +
        '<time datetime="' + new Date(r.t).toISOString() + '">' + ago(r.t) + '</time></button></li>';
    }).join('');
  }
  function restore(rid) {
    var r = recent.filter(function (x) { return x.id === rid; })[0];
    if (!r || !byId[r.tool]) return;
    S.tools[r.tool] = clone(r.state);
    var t = byId[r.tool];
    if (t.sync) t.sync(t.el, st(r.tool));
    activate(r.tool, { push: true });
    render(r.tool);
    save();
    ZL.toast('Restored ' + r.title);
    var p = t.el.querySelector('.rl-main');
    if (p && innerWidth < 1100) p.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  /* ---------- tabs + hash ---------- */
  function activate(id, opts) {
    if (!byId[id]) return;
    opts = opts || {};
    S.tab = id;
    tools.forEach(function (t) {
      var on = t.id === id;
      t.el.hidden = !on;
      var b = $('#tab-' + t.id);
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    var tb = $('#tab-' + id);
    var strip = $('#tabs');
    if (strip.scrollWidth > strip.clientWidth) {
      var l = tb.offsetLeft - (strip.clientWidth - tb.offsetWidth) / 2;
      strip.scrollTo({ left: l, behavior: 'auto' });
    }
    if (opts.push !== false && location.hash !== '#' + id) {
      try { history.replaceState(null, '', '#' + id); } catch (e) {}
    }
    if (byId[id].onShow) byId[id].onShow(byId[id].el, st(id));
    syncCopyButton();
    save(true);
  }
  function fromHash(scroll) {
    var h = decodeURIComponent(location.hash.slice(1));
    if (byId[h]) {
      activate(h, { push: false });
      if (scroll) {
        var app = $('#app');
        requestAnimationFrame(function () { app.scrollIntoView({ block: 'start' }); });
      }
      return true;
    }
    return false;
  }

  function syncCopyButton() {
    var s = summaries[S.tab];
    var b = $('#copyResult');
    if (b) b.disabled = !(s && s.ok);
  }
  function copyFor(id) {
    var s = summaries[id];
    if (!s || !s.ok) { ZL.toast('Nothing to copy yet. Fix the highlighted field first.', { type: 'bad' }); return; }
    ZL.copy(s.copy || s.title).then(function (ok) {
      if (ok === false) ZL.toast('Copy failed. Select the result and copy it by hand.', { type: 'bad' });
      else ZL.toast('Copied ' + s.title);
    });
    clearTimeout(recentTimer[id]);
    pushRecent(id, true);
  }

  /* little bump when a big number changes */
  function bump(el, text) {
    if (!el) return;
    if (el.textContent === text) return;
    el.textContent = text;
    el.classList.remove('rl-bump'); void el.offsetWidth; el.classList.add('rl-bump');
  }

  /* shared segmented control behaviour */
  function seg(root, onPick) {
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-v]'); if (!b || !root.contains(b)) return;
      onPick(b.getAttribute('data-v'));
    });
  }
  function setSeg(root, v) {
    $$('button[data-v]', root).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-v') === String(v))); });
  }
  function copyBtn(id) {
    return '<button type="button" class="zl-btn zl-btn-ghost zl-btn-sm rl-copy" data-copy="' + id + '" aria-label="Copy result">' + ICON.copy + 'Copy</button>';
  }

  /* ---------- hero + bento visuals ---------- */
  var miniN = 0;
  function resistorMini(colors, w) {
    var hex = colors.map(function (c) { return C.INFO[c].hex; });
    var k = 'm' + (++miniN);
    var xs = [64, 84, 102, 150];
    return '<svg viewBox="0 0 220 64" width="' + (w || 220) + '" aria-hidden="true" class="rl-mini-res">' +
      '<defs><linearGradient id="' + k + 'mrl" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F2F4F6"/><stop offset=".5" stop-color="#B9C0C8"/><stop offset="1" stop-color="#7F8893"/></linearGradient>' +
      '<linearGradient id="' + k + 'mrs" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".35" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#000" stop-opacity=".12"/><stop offset="1" stop-color="#000" stop-opacity=".3"/></linearGradient>' +
      '<clipPath id="' + k + 'mrc"><path id="' + k + 'mrb" d="M58 14h16c5 0 6 5 12 5h48c6 0 7-5 12-5h16c10 0 16 8 16 18s-6 18-16 18h-16c-5 0-6-5-12-5H86c-6 0-7 5-12 5H58c-10 0-16-8-16-18s6-18 16-18z"/></clipPath></defs>' +
      '<rect x="2" y="29.5" width="216" height="5" rx="2.5" fill="url(#' + k + 'mrl)"/>' +
      '<use href="#' + k + 'mrb" fill="#E7D1A2"/><g clip-path="url(#' + k + 'mrc)">' + hex.map(function (h, i) { return '<rect x="' + (xs[i] - 5) + '" y="10" width="10" height="44" fill="' + h + '"/>'; }).join('') + '</g>' +
      '<use href="#' + k + 'mrb" fill="url(#' + k + 'mrs)"/></svg>';
  }

  function heroParts() {
    var host = $('#heroParts'); if (!host) return;
    host.innerHTML =
      '<div class="rl-part p1">' + resistorMini(['yellow', 'violet', 'red', 'gold'], 220) + '<span>4.7 kΩ ±5%</span></div>' +
      '<div class="rl-part p2"><svg viewBox="0 0 120 64" width="120"><defs><linearGradient id="hcap" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9AA3AD"/><stop offset=".5" stop-color="#EEF1F4"/><stop offset="1" stop-color="#8A939D"/></linearGradient></defs>' +
        '<rect x="14" y="16" width="92" height="34" rx="3" fill="#1E2023"/><rect x="14" y="16" width="16" height="34" rx="2" fill="url(#hcap)"/><rect x="90" y="16" width="16" height="34" rx="2" fill="url(#hcap)"/>' +
        '<text x="60" y="39.5" text-anchor="middle" class="rl-chip-text" font-size="15">472</text></svg><span>SMD 472</span></div>' +
      '<div class="rl-part p3"><svg viewBox="0 0 64 96" width="48"><defs><radialGradient id="hled" cx=".4" cy=".35" r=".7"><stop offset="0" stop-color="#FF8A80"/><stop offset=".6" stop-color="#E53935"/><stop offset="1" stop-color="#9F1D1D"/></radialGradient></defs>' +
        '<circle cx="32" cy="26" r="26" fill="#FF3B30" opacity=".22" class="rl-led-glow"/><path d="M16 42V24a16 16 0 0 1 32 0v18z" fill="url(#hled)"/><rect x="13" y="40" width="38" height="6" rx="2" fill="#B71C1C"/>' +
        '<path d="M24 46v46M40 46v40" stroke="#A3ABB4" stroke-width="3" stroke-linecap="round"/><ellipse cx="26" cy="20" rx="4" ry="7" fill="#fff" opacity=".45"/></svg><span>LED, red</span></div>' +
      '<div class="rl-part p4"><svg viewBox="0 0 72 96" width="54"><defs><radialGradient id="hdisc" cx=".4" cy=".35" r=".75"><stop offset="0" stop-color="#F0A35E"/><stop offset="1" stop-color="#B85C1E"/></radialGradient></defs>' +
        '<path d="M28 58v36M44 58v36" stroke="#A3ABB4" stroke-width="3" stroke-linecap="round"/><ellipse cx="36" cy="32" rx="30" ry="28" fill="url(#hdisc)"/>' +
        '<text x="36" y="38" text-anchor="middle" font-size="16" class="rl-cap-text">104</text></svg><span>Ceramic 104</span></div>';
    var tr = $('#tileRes'); if (tr) tr.innerHTML = resistorMini(['brown', 'black', 'orange', 'gold'], 260) + '<b class="num">10 kΩ</b>';
    var te = $('#tileE');
    if (te) {
      var e12 = C.SERIES.E12, html = '<svg viewBox="0 0 240 56" aria-hidden="true"><path d="M8 40H232" class="rl-axis"/>';
      e12.forEach(function (v) { var x = 8 + Math.log10(v / 10) * 224; html += '<path d="M' + x.toFixed(1) + ' 40V18" class="rl-tick"/>'; });
      C.SERIES.E24.forEach(function (v) { if (e12.indexOf(v) < 0) { var x = 8 + Math.log10(v / 10) * 224; html += '<path d="M' + x.toFixed(1) + ' 40V28" class="rl-tick2"/>'; } });
      html += '<text x="8" y="54" class="rl-ticklabel">10</text><text x="232" y="54" text-anchor="end" class="rl-ticklabel">100</text></svg>';
      te.innerHTML = html;
    }
  }

  /* ---------- start ---------- */
  function start() {
    var tabs = $('#tabs'), panels = $('#panels');
    tools.forEach(function (t) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rl-tab'; b.id = 'tab-' + t.id;
      b.setAttribute('role', 'tab'); b.setAttribute('aria-controls', 'panel-' + t.id);
      b.innerHTML = ICON[t.id] + '<span>' + esc(t.label) + '</span>';
      b.addEventListener('click', function () { activate(t.id); });
      tabs.appendChild(b);
      var p = document.createElement('section');
      p.className = 'rl-panel'; p.id = 'panel-' + t.id;
      p.setAttribute('role', 'tabpanel'); p.setAttribute('aria-labelledby', 'tab-' + t.id); p.tabIndex = -1;
      p.innerHTML = '<header class="rl-head"><div class="rl-head-txt"><h2>' + esc(t.title || t.label) + '</h2><p>' + t.desc + '</p></div>' + (t.headExtra ? t.headExtra() : '') + '</header>' + t.html();
      panels.appendChild(p);
      t.el = p;
    });
    tabs.addEventListener('keydown', function (e) {
      var i = tools.map(function (t) { return t.id; }).indexOf(S.tab), n = i;
      if (e.key === 'ArrowRight') n = (i + 1) % tools.length;
      else if (e.key === 'ArrowLeft') n = (i - 1 + tools.length) % tools.length;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = tools.length - 1;
      else return;
      e.preventDefault();
      activate(tools[n].id);
      $('#tab-' + tools[n].id).focus();
    });
    tools.forEach(function (t) {
      var s = st(t.id);
      t.bind(t.el, s);
      if (t.sync) t.sync(t.el, s);
      render(t.id);
    });
    document.addEventListener('click', function (e) {
      var c = e.target.closest('.rl-copy'); if (c) { copyFor(c.getAttribute('data-copy')); return; }
      var r = e.target.closest('.rl-recent-item'); if (r) restore(r.getAttribute('data-rid'));
    });
    $('#copyResult').addEventListener('click', function () { copyFor(S.tab); });
    $('#copyLink').addEventListener('click', function () {
      var url = location.href.split('#')[0] + '#' + S.tab;
      ZL.copy(url).then(function (ok) { ZL.toast(ok === false ? 'Copy failed' : 'Link to ' + byId[S.tab].label + ' copied', { type: ok === false ? 'bad' : 'good' }); });
    });
    $('#clearRecent').addEventListener('click', function () {
      if (!recent.length) return;
      var before = recent.slice();
      recent = []; ZL.store.set('recent', recent); renderRecent();
      flashStatus('Recent cleared');
      ZL.toast('Recent cleared', { action: { label: 'Undo', fn: function () { recent = before; ZL.store.set('recent', recent); renderRecent(); ZL.toast('Recent restored'); } } });
    });
    if (!fromHash(true)) activate(byId[S.tab] ? S.tab : tools[0].id, { push: false });
    addEventListener('hashchange', function () { fromHash(true); });
    var flush = function () { if (!dirty) return; clearTimeout(saveTimer); dirty = false; ZL.store.set('state', S); };
    addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flush(); });
    renderRecent();
    $('#appStatus').textContent = statusIdle();
    setInterval(function () { $$('#recentList time').forEach(function (t, i) { if (recent[i]) t.textContent = ago(recent[i].t); }); }, 30000);
    heroParts();
    document.documentElement.classList.add('rl-ready');
  }

  window.RL = {
    tool: tool, start: start, activate: activate, changed: changed, render: render, st: st, state: function () { return S; },
    recent: function () { return recent; }, summary: function (id) { return summaries[id]; },
    $: $, $$: $$, esc: esc, num: num, fmt: fmt, ohms: ohms, sigText: sigText, setError: setError, F: F, ICON: ICON,
    UNITS: UNITS, unitFactor: unitFactor, bestUnit: bestUnit, bump: bump, seg: seg, setSeg: setSeg, copyBtn: copyBtn, resistorMini: resistorMini
  };
})();
