(function () {
  'use strict';
  var C = window.ResistorCore;
  var SVGNS = 'http://www.w3.org/2000/svg';
  var KEY = 'resistor-lab:state';

  var POS = {
    4: [234, 296, 352, 522],
    5: [222, 276, 330, 384, 526],
    6: [218, 268, 318, 368, 458, 532]
  };
  var BAND_W = 26;

  var DEFAULTS = {
    4: ['yellow', 'violet', 'red', 'gold'],
    5: ['brown', 'black', 'black', 'red', 'brown'],
    6: ['brown', 'black', 'black', 'red', 'brown', 'brown']
  };

  var state = {
    mode: 4,
    bands: { 4: DEFAULTS[4].slice(), 5: DEFAULTS[5].slice(), 6: DEFAULTS[6].slice() },
    selected: 0,
    enc: 4,
    rows: ['1k', '2k2', '4k7'],
    div: { vin: '12', r1: '10k', r2: '10k' }
  };

  function load() {
    try {
      var s = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!s) return;
      if ([4, 5, 6].indexOf(s.mode) >= 0) state.mode = s.mode;
      [4, 5, 6].forEach(function (m) {
        var b = s.bands && s.bands[m];
        if (Array.isArray(b) && b.length === m && C.decode(b).ok) state.bands[m] = b;
      });
      if (s.enc === 4 || s.enc === 5) state.enc = s.enc;
      if (Array.isArray(s.rows)) state.rows = s.rows.filter(function (r) { return typeof r === 'string'; }).slice(0, 30);
      if (s.div && typeof s.div === 'object') {
        ['vin', 'r1', 'r2'].forEach(function (k) { if (typeof s.div[k] === 'string') state.div[k] = s.div[k]; });
      }
    } catch (e) { /* storage unavailable or corrupt: keep defaults */ }
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ mode: state.mode, bands: state.bands, enc: state.enc, rows: state.rows, div: state.div }));
    } catch (e) { /* ignore */ }
  }

  var $ = function (id) { return document.getElementById(id); };
  var bandLayer = $('bandLayer'), ringLayer = $('ringLayer'), hitLayer = $('hitLayer');
  var tip = $('tip'), stage = $('stage');

  function el(tag, attrs, parent) {
    var n = document.createElementNS(SVGNS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }

  function bands() { return state.bands[state.mode]; }
  function layout() { return C.LAYOUT[state.mode]; }

  function bandDescription(i) {
    var role = layout()[i], c = bands()[i];
    var digitIndex = layout().slice(0, i).filter(function (r) { return r === 'digit'; }).length;
    return {
      role: C.roleLabel(role, digitIndex),
      name: C.INFO[c].name,
      value: C.bandValueText(c, role)
    };
  }

  /* ---------- resistor SVG ---------- */
  var bandRects = [], hitRects = [];

  function buildBands() {
    bandLayer.textContent = ''; ringLayer.textContent = ''; hitLayer.textContent = '';
    bandRects = []; hitRects = [];
    POS[state.mode].forEach(function (x, i) {
      var r = el('rect', { x: x - BAND_W / 2, y: 30, width: BAND_W, height: 140, class: 'band' }, bandLayer);
      bandRects.push(r);
      var hit = el('rect', {
        x: x - 24, y: 26, width: 48, height: 148, rx: 10, class: 'hit',
        tabindex: '0', role: 'button', 'data-index': i
      }, hitLayer);
      hitRects.push(hit);
    });
    var ring = el('rect', { id: 'ring', y: 32, width: BAND_W + 14, height: 136, rx: 9, class: 'ring' }, ringLayer);
    ring.setAttribute('x', POS[state.mode][state.selected] - (BAND_W + 14) / 2);
  }

  function paintBands() {
    var b = bands();
    bandRects.forEach(function (r, i) {
      r.setAttribute('fill', C.INFO[b[i]].hex);
      r.setAttribute('data-color', b[i]);
      var d = bandDescription(i);
      hitRects[i].setAttribute('aria-label', 'Band ' + (i + 1) + ', ' + d.role + ': ' + d.name + ', ' + d.value);
      hitRects[i].setAttribute('aria-pressed', i === state.selected ? 'true' : 'false');
    });
    var ring = $('ring');
    if (ring) ring.setAttribute('x', POS[state.mode][state.selected] - (BAND_W + 14) / 2);
  }

  function showTip(i) {
    var d = bandDescription(i);
    tip.textContent = d.role + ': ' + d.name + ', ' + d.value;
    tip.hidden = false;
    var svg = $('resistor');
    var box = svg.getBoundingClientRect(), sbox = stage.getBoundingClientRect();
    var vb = svg.viewBox.baseVal;
    var scale = box.width / vb.width;
    var x = box.left - sbox.left + (POS[state.mode][i] - vb.x) * scale;
    var y = box.top - sbox.top + (26 - vb.y) * scale;
    tip.style.left = x + 'px';
    tip.style.top = y + 'px';
  }
  function hideTip() { tip.hidden = true; }

  hitLayer.addEventListener('click', function (e) {
    var t = e.target.closest('.hit'); if (!t) return;
    select(Number(t.getAttribute('data-index')));
    showTip(state.selected);
  });
  hitLayer.addEventListener('pointerover', function (e) {
    var t = e.target.closest('.hit'); if (t) showTip(Number(t.getAttribute('data-index')));
  });
  hitLayer.addEventListener('pointerout', function (e) {
    var t = e.target.closest('.hit');
    if (t && document.activeElement !== t) hideTip();
  });
  hitLayer.addEventListener('focusin', function (e) {
    var t = e.target.closest('.hit'); if (t) showTip(Number(t.getAttribute('data-index')));
  });
  hitLayer.addEventListener('focusout', hideTip);
  hitLayer.addEventListener('keydown', function (e) {
    var t = e.target.closest('.hit'); if (!t) return;
    var i = Number(t.getAttribute('data-index'));
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); showTip(i); }
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      var n = Math.max(0, Math.min(bands().length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
      select(n); hitRects[n].focus();
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      e.preventDefault();
      select(i);
      var opts = C.optionsFor(layout()[i]);
      var k = opts.indexOf(bands()[i]);
      k = (k + (e.key === 'ArrowUp' ? 1 : -1) + opts.length) % opts.length;
      setBand(i, opts[k]);
      showTip(i);
    }
  });

  /* ---------- legend + palette ---------- */
  function renderLegend() {
    var ol = $('legend');
    ol.textContent = '';
    bands().forEach(function (c, i) {
      var d = bandDescription(i);
      var li = document.createElement('li');
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'legend-item' + (i === state.selected ? ' is-selected' : '');
      btn.setAttribute('aria-pressed', i === state.selected ? 'true' : 'false');
      btn.dataset.index = i;
      btn.innerHTML = '<span class="swatch" style="background:' + C.INFO[c].hex + '"></span>' +
        '<span class="legend-text"><span class="legend-role">' + d.role + '</span>' +
        '<span class="legend-val">' + d.name + ' <b>' + d.value + '</b></span></span>';
      btn.addEventListener('click', function () { select(i); });
      li.appendChild(btn);
      ol.appendChild(li);
    });
    ol.style.setProperty('--cols', state.mode);
    if (state.mode > 4) ol.classList.add('wide'); else ol.classList.remove('wide');
  }

  function renderPalette() {
    var role = layout()[state.selected];
    var d = bandDescription(state.selected);
    $('paletteLabel').textContent = 'Colour for the ' + d.role.toLowerCase() + ' band';
    var pal = $('palette');
    pal.textContent = '';
    C.COLORS.forEach(function (c) {
      var ok = C.validFor(c, role);
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.setAttribute('role', 'radio');
      b.dataset.color = c;
      var checked = bands()[state.selected] === c;
      b.setAttribute('aria-checked', checked ? 'true' : 'false');
      b.tabIndex = checked ? 0 : -1;
      if (!ok) { b.disabled = true; b.title = C.INFO[c].name + ' is not used for this band'; }
      b.innerHTML = '<span class="swatch" style="background:' + C.INFO[c].hex + '"></span>' +
        '<span class="chip-text"><span class="chip-name">' + C.INFO[c].name + '</span>' +
        '<span class="chip-val">' + (ok ? C.bandValueText(c, role) : 'Not used') + '</span></span>';
      b.addEventListener('click', function () { setBand(state.selected, c); });
      pal.appendChild(b);
    });
  }

  $('palette').addEventListener('keydown', function (e) {
    if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
    e.preventDefault();
    var items = Array.prototype.slice.call(this.querySelectorAll('.chip:not([disabled])'));
    var k = items.indexOf(document.activeElement);
    k = (k + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
    items[k].focus();
    items[k].click();
    items = this.querySelectorAll('.chip:not([disabled])');
    if (items[k]) items[k].focus();
  });

  function select(i) {
    state.selected = i;
    paintBands();
    renderLegend();
    renderPalette();
  }

  function setBand(i, color) {
    bands()[i] = color;
    var r = bandRects[i];
    if (r) { r.classList.remove('flash'); void r.getBBox(); r.classList.add('flash'); }
    update();
    save();
  }

  /* ---------- readout ---------- */
  function update() {
    paintBands();
    renderLegend();
    renderPalette();
    var res = C.decode(bands());
    var err = $('decodeError');
    if (!res.ok) {
      err.textContent = res.error; err.hidden = false;
      return;
    }
    err.hidden = true;
    $('valueOut').textContent = C.formatOhms(res.ohms);
    $('tolOut').textContent = C.formatPercent(res.tol);
    $('rangeOut').textContent = C.formatOhms(res.min) + ' to ' + C.formatOhms(res.max);
    $('tempcoRow').hidden = res.tempco == null;
    if (res.tempco != null) $('tempcoOut').textContent = res.tempco + ' ppm/K';
    var ul = $('eseries');
    ul.textContent = '';
    ['E12', 'E24', 'E96'].forEach(function (s) {
      var n = C.nearestE(res.ohms, s);
      var li = document.createElement('li');
      if (!n) { li.innerHTML = '<span class="es-name">' + s + '</span><span class="es-val">No standard value</span>'; ul.appendChild(li); return; }
      li.className = n.standard ? 'is-standard' : '';
      li.dataset.series = s;
      var note = n.standard ? 'Standard value' : 'Nearest ' + C.formatOhms(n.value) + ' (' + (n.offPercent >= 0 ? '+' : '') + n.offPercent.toFixed(1) + '% off)';
      li.innerHTML = '<span class="es-name">' + s + '</span>' +
        (n.standard ? '<svg viewBox="0 0 16 16" aria-hidden="true" class="es-tick"><path d="M3 8.5l3 3 7-7"/></svg>' : '') +
        '<span class="es-val">' + note + '</span>';
      ul.appendChild(li);
    });
  }

  /* ---------- mode switching ---------- */
  function convertBands(from, to) {
    var res = C.decode(state.bands[from]);
    if (!res.ok) return;
    var nd = to === 4 ? 2 : 3;
    var enc = C.encodeColors(res.ohms, nd);
    if (!enc.ok) return;
    var fromLayout = C.LAYOUT[from];
    var tol = state.bands[from][fromLayout.indexOf('tol')];
    var next = enc.colors.concat([tol]);
    if (to === 6) next.push(state.bands[6][5] || 'brown');
    state.bands[to] = next;
  }

  function setMode(m, opts) {
    if (m === state.mode && !(opts && opts.force)) return;
    if (!(opts && opts.noConvert)) convertBands(state.mode, m);
    state.mode = m;
    state.selected = Math.min(state.selected, m - 1);
    document.querySelectorAll('#modeGroup [role=radio]').forEach(function (b) {
      b.setAttribute('aria-checked', String(Number(b.dataset.mode) === m));
      b.tabIndex = Number(b.dataset.mode) === m ? 0 : -1;
    });
    buildBands();
    update();
    save();
  }

  function radioGroup(group, attr, onPick) {
    group.addEventListener('click', function (e) {
      var b = e.target.closest('[role=radio]'); if (b) onPick(Number(b.dataset[attr]));
    });
    group.addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var items = Array.prototype.slice.call(group.querySelectorAll('[role=radio]'));
      var k = items.indexOf(document.activeElement);
      k = (k + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      items[k].focus();
      onPick(Number(items[k].dataset[attr]));
    });
  }
  radioGroup($('modeGroup'), 'mode', function (m) { setMode(m); });

  function setEnc(n) {
    state.enc = n;
    document.querySelectorAll('#encGroup [role=radio]').forEach(function (b) {
      b.setAttribute('aria-checked', String(Number(b.dataset.enc) === n));
      b.tabIndex = Number(b.dataset.enc) === n ? 0 : -1;
    });
    save();
  }
  radioGroup($('encGroup'), 'enc', setEnc);

  /* ---------- reverse mode ---------- */
  $('reverseForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var input = $('valueIn'), err = $('valueError');
    var p = C.parseValue(input.value);
    var enc = p.ok ? C.encodeColors(p.value, state.enc === 4 ? 2 : 3) : p;
    if (!enc.ok) {
      err.textContent = enc.error; err.hidden = false;
      input.setAttribute('aria-invalid', 'true');
      return;
    }
    err.hidden = true;
    input.removeAttribute('aria-invalid');
    var target = state.enc;
    var cur = bands();
    var tol = cur[layout().indexOf('tol')];
    state.bands[target] = enc.colors.concat([tol]);
    state.selected = 0;
    setMode(target, { noConvert: true, force: true });
  });
  $('valueIn').addEventListener('input', function () {
    if (!$('valueError').hidden) { $('valueError').hidden = true; this.removeAttribute('aria-invalid'); }
  });

  /* ---------- series / parallel ---------- */
  var rowsEl = $('rows');
  function renderRows() {
    rowsEl.textContent = '';
    state.rows.forEach(function (v, i) {
      var li = document.createElement('li');
      li.className = 'row';
      var id = 'row' + i;
      li.innerHTML = '<label class="sr-only" for="' + id + '">Resistor ' + (i + 1) + '</label>' +
        '<span class="row-num" aria-hidden="true">R' + (i + 1) + '</span>' +
        '<input id="' + id + '" type="text" autocomplete="off" spellcheck="false" placeholder="e.g. 4k7">' +
        '<button type="button" class="icon-btn small" aria-label="Remove resistor ' + (i + 1) + '">' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';
      var input = li.querySelector('input');
      input.value = v;
      input.addEventListener('input', function () { state.rows[i] = input.value; computeComb(); save(); });
      li.querySelector('button').addEventListener('click', function () {
        state.rows.splice(i, 1); renderRows(); computeComb(); save();
        var inputs = rowsEl.querySelectorAll('input');
        if (inputs.length) inputs[Math.min(i, inputs.length - 1)].focus(); else $('addRow').focus();
      });
      rowsEl.appendChild(li);
    });
    if (!state.rows.length) {
      var li = document.createElement('li');
      li.className = 'empty';
      li.textContent = 'No resistors yet. Add one to start.';
      rowsEl.appendChild(li);
    }
  }
  function addRow(value) {
    state.rows.push(value || '');
    renderRows(); computeComb(); save();
    var inputs = rowsEl.querySelectorAll('input');
    inputs[inputs.length - 1].focus();
  }
  $('addRow').addEventListener('click', function () { addRow(''); });
  $('addCurrent').addEventListener('click', function () {
    var res = C.decode(bands());
    if (res.ok) addRow(C.formatOhms(res.ohms).replace(/ Ω$/, '').replace(/ ([kMG])Ω$/, '$1'));
  });

  function computeComb() {
    var vals = [], bad = [];
    state.rows.forEach(function (v, i) {
      if (!v.trim()) return;
      var p = C.parseValue(v);
      var input = rowsEl.querySelectorAll('input')[i];
      if (p.ok) { vals.push(p.value); if (input) input.removeAttribute('aria-invalid'); }
      else { bad.push(i + 1); if (input) input.setAttribute('aria-invalid', 'true'); }
    });
    var err = $('combError');
    if (bad.length) {
      err.textContent = 'Could not read R' + bad.join(', R') + '. Use values like 220, 4k7 or 1M.';
      err.hidden = false;
    } else err.hidden = true;
    $('seriesOut').textContent = vals.length ? C.formatOhms(C.seriesR(vals), 5) : '–';
    $('parallelOut').textContent = vals.length ? C.formatOhms(C.parallelR(vals), 5) : '–';
  }

  /* ---------- voltage divider ---------- */
  function computeDiv() {
    var vinS = $('vin').value.trim().replace(/v$/i, '');
    var vin = Number(vinS);
    var r1 = C.parseValue($('r1').value), r2 = C.parseValue($('r2').value);
    var err = $('divError'), msg = '';
    ['vin', 'r1', 'r2'].forEach(function (k) { $(k).removeAttribute('aria-invalid'); });
    if (!vinS || !isFinite(vin)) { msg = 'Vin must be a number of volts, like 12 or 3.3.'; $('vin').setAttribute('aria-invalid', 'true'); }
    else if (!r1.ok) { msg = 'R1: ' + r1.error; $('r1').setAttribute('aria-invalid', 'true'); }
    else if (!r2.ok) { msg = 'R2: ' + r2.error; $('r2').setAttribute('aria-invalid', 'true'); }
    var out = msg ? null : C.divider(vin, r1.value, r2.value);
    if (!msg && !out) msg = 'R1 and R2 cannot both be 0 Ω.';
    if (msg) {
      err.textContent = msg; err.hidden = false;
      $('voutOut').textContent = '–'; $('iOut').textContent = '–'; $('ratioOut').textContent = '–';
      return;
    }
    err.hidden = true;
    $('voutOut').textContent = C.formatSI(out.vout, 'V', 5);
    $('iOut').textContent = C.formatSI(out.current, 'A', 4);
    $('ratioOut').textContent = String(Number(out.ratio.toPrecision(4)));
  }
  ['vin', 'r1', 'r2'].forEach(function (k) {
    var input = $(k);
    input.value = state.div[k];
    input.addEventListener('input', function () { state.div[k] = input.value; computeDiv(); save(); });
  });

  /* ---------- theme ---------- */
  var themeBtn = $('themeToggle');
  function currentTheme() {
    var t = document.documentElement.getAttribute('data-theme');
    if (t) return t;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function syncThemeUI() {
    var t = currentTheme();
    themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    document.querySelectorAll('meta[name=theme-color]').forEach(function (m) {
      m.setAttribute('content', t === 'dark' ? '#0F161D' : '#F3F5F7');
    });
  }
  themeBtn.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    try { localStorage.setItem('resistor-lab:theme', next); } catch (e) { /* ignore */ }
    syncThemeUI();
  });
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', syncThemeUI);
  }

  /* On narrow screens crop most of the leads so the body and bands stay big enough to tap */
  var narrowMq = window.matchMedia ? window.matchMedia('(max-width: 640px)') : null;
  function fitResistor() {
    var narrow = narrowMq && narrowMq.matches;
    $('resistor').setAttribute('viewBox', narrow ? '140 22 480 156' : '0 0 760 200');
  }
  fitResistor();
  if (narrowMq && narrowMq.addEventListener) narrowMq.addEventListener('change', fitResistor);
  window.addEventListener('resize', hideTip);

  /* ---------- init ---------- */
  load();
  setEnc(state.enc);
  setMode(state.mode, { force: true, noConvert: true });
  renderRows();
  computeComb();
  computeDiv();
  syncThemeUI();
  document.body.classList.add('ready');
})();
