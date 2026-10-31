/* Colour code: 4/5/6 band decoder with a realistic SVG resistor, plus reverse mode. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var NS = 'http://www.w3.org/2000/svg';
  var POS = { 4: [234, 296, 352, 522], 5: [222, 276, 330, 384, 526], 6: [218, 268, 318, 368, 458, 532] };
  var BAND_W = 26;
  var DEFAULTS = { 4: ['yellow', 'violet', 'red', 'gold'], 5: ['brown', 'black', 'black', 'red', 'brown'], 6: ['brown', 'black', 'black', 'red', 'brown', 'red'] };
  var BODY = 'M210,66 L250,66 C264,66 268,78 284,78 L476,78 C492,78 496,66 510,66 L550,66 C576,66 590,90 590,120 C590,150 576,174 550,174 L510,174 C496,174 492,162 476,162 L284,162 C268,162 264,174 250,174 L210,174 C184,174 170,150 170,120 C170,90 184,66 210,66 Z';
  var narrowMq = matchMedia('(max-width: 640px)');
  var el, s;

  function svgEl(tag, attrs, parent) {
    var n = document.createElementNS(NS, tag);
    for (var k in attrs) n.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(n);
    return n;
  }
  function q(sel) { return el.querySelector(sel); }
  function bands() { return s.bands[s.mode]; }
  function layout() { return C.LAYOUT[s.mode]; }
  function desc(i) {
    var role = layout()[i], c = bands()[i];
    var di = layout().slice(0, i).filter(function (r) { return r === 'digit'; }).length;
    return { role: C.roleLabel(role, di), name: C.INFO[c].name, value: C.bandValueText(c, role), short: role === 'tempco' ? C.INFO[c].tempco + ' ppm' : C.bandValueText(c, role) };
  }
  function fill(c) { return c === 'gold' ? 'url(#rlGold)' : c === 'silver' ? 'url(#rlSilver)' : C.INFO[c].hex; }

  var html = function () {
    return '' +
      '<div class="rl-main rl-colour">' +
        '<div class="rl-colour-top">' +
          '<div class="rl-readout" aria-live="polite">' +
            '<span class="rl-label">Resistance</span>' +
            '<div class="rl-big-row"><output class="rl-big num" id="valueOut">4.7 kΩ</output><span class="zl-badge rl-tol" id="tolOut">±5%</span></div>' +
            '<p class="rl-sub num"><span id="rangeOut"></span><span id="tempcoRow" hidden>, tempco <b id="tempcoOut"></b></span></p>' +
            '<p class="zl-error" id="decodeError" role="alert" hidden></p>' +
          '</div>' +
          '<div class="rl-colour-ctl">' + RL.copyBtn('colour') + '</div>' +
        '</div>' +
        '<div class="rl-res-stage" id="stage">' +
          '<svg id="resistor" class="rl-res" viewBox="0 0 760 240" role="group" aria-label="Resistor. Choose a band to change its colour.">' +
            '<defs>' +
              '<linearGradient id="rlLead" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F4F6F8"/><stop offset=".4" stop-color="#C3C9D0"/><stop offset="1" stop-color="#7C8590"/></linearGradient>' +
              '<linearGradient id="rlShade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".18"/><stop offset=".14" stop-color="#fff" stop-opacity=".62"/><stop offset=".3" stop-color="#fff" stop-opacity=".12"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset=".82" stop-color="#000" stop-opacity=".14"/><stop offset="1" stop-color="#000" stop-opacity=".38"/></linearGradient>' +
              '<linearGradient id="rlEnds" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".22"/><stop offset=".07" stop-color="#000" stop-opacity="0"/><stop offset=".93" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".22"/></linearGradient>' +
              '<linearGradient id="rlGold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8E6B1F"/><stop offset=".45" stop-color="#E9C866"/><stop offset=".6" stop-color="#F7E3A0"/><stop offset="1" stop-color="#9C7623"/></linearGradient>' +
              '<linearGradient id="rlSilver" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#8D949B"/><stop offset=".45" stop-color="#E4E8EC"/><stop offset=".6" stop-color="#FFFFFF"/><stop offset="1" stop-color="#959CA4"/></linearGradient>' +
              '<filter id="rlBlur" x="-20%" y="-200%" width="140%" height="500%"><feGaussianBlur stdDeviation="7"/></filter>' +
              '<clipPath id="bodyClip"><path id="bodyShape" d="' + BODY + '"/></clipPath>' +
            '</defs>' +
            '<g class="rl-brackets" id="brackets"></g>' +
            '<ellipse cx="380" cy="194" rx="215" ry="9" class="rl-res-shadow" filter="url(#rlBlur)"/>' +
            '<rect x="6" y="114" width="748" height="12" rx="6" fill="url(#rlLead)"/>' +
            '<rect x="6" y="116" width="748" height="2" rx="1" fill="#fff" opacity=".6"/>' +
            '<use href="#bodyShape" class="rl-body-fill" id="bodyFill"/>' +
            '<g clip-path="url(#bodyClip)" id="bandLayer"></g>' +
            '<use href="#bodyShape" fill="url(#rlShade)" pointer-events="none"/>' +
            '<use href="#bodyShape" fill="url(#rlEnds)" pointer-events="none"/>' +
            '<use href="#bodyShape" class="rl-body-edge" pointer-events="none"/>' +
            '<g id="ringLayer" pointer-events="none"></g>' +
            '<g class="rl-band-labels" id="bandLabels" aria-hidden="true"></g>' +
            '<g id="hitLayer"></g>' +
          '</svg>' +
          '<div class="rl-tip" id="tip" role="status" aria-live="polite" hidden></div>' +
        '</div>' +
        '<ol class="rl-legend" id="legend" aria-label="Bands, left to right"></ol>' +
        '<div class="rl-palette-wrap">' +
          '<p class="zl-label" id="paletteLabel">Colour for the 1st digit band</p>' +
          '<div class="rl-palette" id="palette" role="radiogroup" aria-labelledby="paletteLabel"></div>' +
        '</div>' +
      '</div>' +
      '<div class="rl-split">' +
        '<div class="rl-card"><h3>Standard values</h3><p class="zl-hint">Whether this value is in each series, and the nearest one if not.</p><ul class="rl-eseries" id="eseries" aria-label="Standard value series"></ul></div>' +
        '<form class="rl-card" id="reverseForm" novalidate>' +
          '<h3>Find the bands for a value</h3>' +
          '<div class="rl-reverse-row">' +
            '<div class="zl-field rl-grow"><label class="zl-label" for="valueIn">Resistance</label><input class="zl-input" id="valueIn" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="4k7, 220, 1M, 0R47" aria-describedby="valueHelp"></div>' +
            '<div class="zl-field"><span class="zl-label" id="encLabel">Bands</span><div class="zl-seg" id="encGroup" role="group" aria-labelledby="encLabel"><button type="button" data-v="4">4</button><button type="button" data-v="5">5</button></div></div>' +
          '</div>' +
          '<p class="zl-error" id="valueError" role="alert" hidden></p>' +
          '<p class="zl-hint" id="valueHelp">R, k and M can stand in for the decimal point: 4k7 is 4.7 kΩ and 0R47 is 0.47 Ω.</p>' +
          '<button type="submit" class="zl-btn zl-btn-primary rl-submit">Show bands</button>' +
        '</form>' +
      '</div>' +
      '<div class="rl-working"><div class="rl-formula" id="colourFormula" aria-live="polite"></div></div>';
  };

  var bandRects = [], hitRects = [];
  function build() {
    var bl = q('#bandLayer'), rl = q('#ringLayer'), hl = q('#hitLayer'), lab = q('#bandLabels');
    bl.textContent = ''; rl.textContent = ''; hl.textContent = ''; lab.textContent = '';
    bandRects = []; hitRects = [];
    var xs = POS[s.mode];
    xs.forEach(function (x, i) {
      bandRects.push(svgEl('rect', { x: x - BAND_W / 2, y: 50, width: BAND_W, height: 140, class: 'band' }, bl));
      var left = i ? (xs[i - 1] + x) / 2 : x - 30, right = i < xs.length - 1 ? (x + xs[i + 1]) / 2 : x + 30;
      left = Math.max(left, x - 34); right = Math.min(right, x + 34);
      hitRects.push(svgEl('rect', { x: left, y: 46, width: right - left, height: 180, rx: 10, class: 'hit', tabindex: '0', role: 'button', 'data-index': i }, hl));
      svgEl('text', { x: x, y: 216, 'text-anchor': 'middle', class: 'rl-band-label', 'data-index': i }, lab);
    });
    svgEl('rect', { id: 'ring', y: 58, width: BAND_W + 16, height: 124, rx: 10, class: 'ring' }, rl);
    // role brackets
    var br = q('#brackets'); br.textContent = '';
    var groups = [], lay = layout();
    lay.forEach(function (role, i) {
      var g = groups[groups.length - 1];
      if (g && g.role === role) g.to = i; else groups.push({ role: role, from: i, to: i });
    });
    var names = { digit: 'Digits', mult: 'Multiplier', tol: 'Tolerance', tempco: 'Tempco' };
    groups.forEach(function (g) {
      var x0 = xs[g.from] - 14, x1 = xs[g.to] + 14, cx = (x0 + x1) / 2;
      svgEl('path', { d: 'M' + x0 + ' 50 V44 H' + x1 + ' V50', class: 'rl-bracket' }, br);
      var t = svgEl('text', { x: cx, y: 32, 'text-anchor': 'middle', class: 'rl-bracket-label' }, br);
      t.textContent = names[g.role];
    });
    q('#bodyFill').setAttribute('class', 'rl-body-fill ' + (s.mode === 4 ? 'carbon' : 'metal'));
  }

  function paint() {
    var b = bands();
    bandRects.forEach(function (r, i) {
      r.setAttribute('fill', fill(b[i]));
      r.setAttribute('data-color', b[i]);
      var d = desc(i);
      hitRects[i].setAttribute('aria-label', 'Band ' + (i + 1) + ', ' + d.role + ': ' + d.name + ', ' + d.value);
      hitRects[i].setAttribute('aria-pressed', String(i === s.sel));
    });
    var labels = el.querySelectorAll('.rl-band-label');
    Array.prototype.forEach.call(labels, function (t, i) { t.textContent = desc(i).short; t.classList.toggle('is-sel', i === s.sel); });
    var ring = q('#ring');
    ring.setAttribute('x', POS[s.mode][s.sel] - (BAND_W + 16) / 2);
  }

  function legend() {
    var ol = q('#legend');
    ol.innerHTML = bands().map(function (c, i) {
      var d = desc(i);
      return '<li><button type="button" class="rl-legend-item" data-index="' + i + '" aria-pressed="' + (i === s.sel) + '">' +
        '<span class="rl-swatch" style="background:' + C.INFO[c].hex + '"></span><span><small>' + d.role + '</small><b>' + d.name + '</b> ' + esc(d.value) + '</span></button></li>';
    }).join('');
    ol.style.setProperty('--n', s.mode);
  }

  function palette() {
    var role = layout()[s.sel], d = desc(s.sel);
    q('#paletteLabel').textContent = 'Colour for band ' + (s.sel + 1) + ', the ' + d.role.toLowerCase();
    var pal = q('#palette');
    pal.innerHTML = C.COLORS.map(function (c) {
      var ok = C.validFor(c, role), on = bands()[s.sel] === c;
      return '<button type="button" class="chip" role="radio" data-color="' + c + '" aria-checked="' + on + '" tabindex="' + (on ? 0 : -1) + '"' + (ok ? '' : ' disabled title="' + C.INFO[c].name + ' is not used for this band"') + '>' +
        '<span class="rl-swatch ' + c + '" style="background:' + C.INFO[c].hex + '"></span><span class="chip-txt"><b>' + C.INFO[c].name + '</b><small>' + (ok ? esc(C.bandValueText(c, role)) : 'Not used') + '</small></span></button>';
    }).join('');
  }

  function showTip(i) {
    var tip = q('#tip'), d = desc(i);
    tip.textContent = d.role + ': ' + d.name + ', ' + d.value;
    tip.hidden = false;
    var svg = q('#resistor'), box = svg.getBoundingClientRect(), sb = q('#stage').getBoundingClientRect(), vb = svg.viewBox.baseVal;
    var sc = box.width / vb.width;
    tip.style.left = (box.left - sb.left + (POS[s.mode][i] - vb.x) * sc) + 'px';
    tip.style.top = (box.top - sb.top + (56 - vb.y) * sc) + 'px';
  }
  function hideTip() { q('#tip').hidden = true; }

  function select(i) { s.sel = i; paint(); legend(); palette(); RL.changed('colour', { noRecent: true }); }
  function setBand(i, c) {
    bands()[i] = c;
    var r = bandRects[i];
    if (r) { r.classList.remove('flash'); void r.getBBox(); r.classList.add('flash'); }
    RL.changed('colour');
  }

  function convert(from, to) {
    var res = C.decode(s.bands[from]);
    if (!res.ok) return;
    var enc = C.encodeColors(res.ohms, to === 4 ? 2 : 3);
    if (!enc.ok) return;
    var tol = s.bands[from][C.LAYOUT[from].indexOf('tol')];
    var next = enc.colors.concat([tol]);
    if (to === 6) next.push(s.bands[6][5] || 'brown');
    s.bands[to] = next;
  }
  function setMode(m, noConvert) {
    if (!noConvert && m !== s.mode) convert(s.mode, m);
    s.mode = m;
    s.sel = Math.min(s.sel, m - 1);
    RL.setSeg(q('#modeGroup'), m);
    build();
    RL.changed('colour');
  }

  function fit() {
    q('#resistor').setAttribute('viewBox', narrowMq.matches ? '150 52 460 136' : '0 0 760 240');
  }

  function bind(root, state) {
    el = root; s = state;
    var hl = q('#hitLayer');
    hl.addEventListener('click', function (e) { var t = e.target.closest('.hit'); if (!t) return; select(+t.getAttribute('data-index')); hideTip(); });
    hl.addEventListener('pointerover', function (e) { var t = e.target.closest('.hit'); if (t) showTip(+t.getAttribute('data-index')); });
    hl.addEventListener('pointerout', function (e) { var t = e.target.closest('.hit'); if (t && !t.matches(':focus-visible')) hideTip(); });
    hl.addEventListener('focusin', function (e) { var t = e.target.closest('.hit'); if (t && t.matches(':focus-visible')) showTip(+t.getAttribute('data-index')); });
    hl.addEventListener('focusout', hideTip);
    hl.addEventListener('keydown', function (e) {
      var t = e.target.closest('.hit'); if (!t) return;
      var i = +t.getAttribute('data-index');
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(i); showTip(i); }
      else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        var n = Math.max(0, Math.min(bands().length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
        select(n); hitRects[n].focus();
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
        e.preventDefault(); select(i);
        var opts = C.optionsFor(layout()[i]), k = opts.indexOf(bands()[i]);
        setBand(i, opts[(k + (e.key === 'ArrowUp' ? 1 : -1) + opts.length) % opts.length]); showTip(i);
      }
    });
    q('#legend').addEventListener('click', function (e) { var b = e.target.closest('.rl-legend-item'); if (b) select(+b.getAttribute('data-index')); });
    q('#palette').addEventListener('click', function (e) { var b = e.target.closest('.chip'); if (b && !b.disabled) setBand(s.sel, b.getAttribute('data-color')); });
    q('#palette').addEventListener('keydown', function (e) {
      if (['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp'].indexOf(e.key) < 0) return;
      e.preventDefault();
      var items = Array.prototype.slice.call(this.querySelectorAll('.chip:not([disabled])'));
      var k = items.indexOf(document.activeElement);
      k = (k + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
      var c = items[k].getAttribute('data-color');
      setBand(s.sel, c);
      var nb = this.querySelector('.chip[data-color="' + c + '"]'); if (nb) nb.focus();
    });
    RL.seg(q('#modeGroup'), function (v) { setMode(+v); });
    RL.seg(q('#encGroup'), function (v) { s.enc = +v; RL.setSeg(q('#encGroup'), s.enc); RL.changed('colour', { noRecent: true }); });
    q('#reverseForm').addEventListener('submit', function (e) {
      e.preventDefault();
      var input = q('#valueIn'), err = q('#valueError');
      var p = C.parseValue(input.value);
      var enc = p.ok ? C.encodeColors(p.value, s.enc === 4 ? 2 : 3) : p;
      if (!enc.ok) { err.textContent = enc.error; err.hidden = false; input.setAttribute('aria-invalid', 'true'); return; }
      err.hidden = true; input.removeAttribute('aria-invalid');
      var tol = bands()[layout().indexOf('tol')];
      s.bands[s.enc] = enc.colors.concat([tol]);
      if (s.enc === 6) s.bands[6].push('brown');
      s.query = input.value;
      s.sel = 0;
      setMode(s.enc, true);
      ZL.toast('Bands set for ' + C.formatOhms(p.value));
    });
    q('#valueIn').addEventListener('input', function () {
      s.query = this.value;
      if (!q('#valueError').hidden) { q('#valueError').hidden = true; this.removeAttribute('aria-invalid'); }
    });
    if (narrowMq.addEventListener) narrowMq.addEventListener('change', fit);
    addEventListener('resize', hideTip);
    fit();
  }

  function sync(root, state) {
    el = root; s = state;
    [4, 5, 6].forEach(function (m) { var b = s.bands[m]; if (!Array.isArray(b) || b.length !== m) s.bands[m] = DEFAULTS[m].slice(); });
    if ([4, 5, 6].indexOf(s.mode) < 0) s.mode = 4;
    if (!(s.sel >= 0 && s.sel < s.mode)) s.sel = 0;
    RL.setSeg(q('#modeGroup'), s.mode);
    RL.setSeg(q('#encGroup'), s.enc);
    q('#valueIn').value = s.query || '';
    build();
  }

  function render(root, state) {
    el = root; s = state;
    paint(); legend(); palette();
    var res = C.decode(bands()), err = q('#decodeError');
    if (!res.ok) {
      err.textContent = res.error + ' Pick another colour for it.'; err.hidden = false;
      RL.bump(q('#valueOut'), '–');
      return { ok: false };
    }
    err.hidden = true;
    var value = C.formatOhms(res.ohms);
    RL.bump(q('#valueOut'), value);
    q('#tolOut').textContent = C.formatPercent(res.tol);
    q('#rangeOut').textContent = C.formatOhms(res.min) + ' to ' + C.formatOhms(res.max);
    q('#tempcoRow').hidden = res.tempco == null;
    if (res.tempco != null) q('#tempcoOut').textContent = res.tempco + ' ppm/K';

    q('#eseries').innerHTML = ['E12', 'E24', 'E96'].map(function (name) {
      var n = C.nearestE(res.ohms, name);
      if (!n) return '<li data-series="' + name + '"><b>' + name + '</b><span>No standard value</span></li>';
      var off = (n.value - res.ohms) / res.ohms * 100;
      var note = n.standard ? 'Standard value' : 'Nearest ' + C.formatOhms(n.value) + ', ' + Math.abs(off).toFixed(1) + '% ' + (off > 0 ? 'higher' : 'lower');
      return '<li data-series="' + name + '" class="' + (n.standard ? 'is-standard' : '') + '"><b>' + name + '</b>' +
        (n.standard ? '<svg viewBox="0 0 16 16" aria-hidden="true" class="rl-tick-ic"><path d="M3 8.5l3 3 7-7"/></svg>' : '') + '<span>' + note + '</span></li>';
    }).join('');

    var digits = res.digits, names = bands().map(function (c) { return C.INFO[c].name.toLowerCase(); });
    var dSym = digits.split('').map(function (_, i) { return F.v('d', i + 1); }).join('');
    q('#colourFormula').innerHTML =
      '<h3>Working</h3>' +
      F.row([F.v('R'), '(' + dSym + ') × 10' + '<sup>' + F.v('m') + '</sup>', F.n(String(parseInt(digits, 10))) + ' × 10<sup>' + res.mult + '</sup> Ω', F.n(value)], 'R = ' + parseInt(digits, 10) + ' times 10 to the ' + res.mult + ' ohms = ' + value) +
      F.row([F.v('R') + '<sub>min</sub> … ' + F.v('R') + '<sub>max</sub>', F.v('R') + ' (1 ± ' + res.tol + '%)', F.n(C.formatOhms(res.min) + ' … ' + C.formatOhms(res.max))], 'Range ' + C.formatOhms(res.min) + ' to ' + C.formatOhms(res.max)) +
      F.note('Digits come from the first ' + digits.length + ' bands, ' + F.v('m') + ' from the multiplier band. ' +
        (res.tempco != null ? 'The sixth band is the temperature coefficient: ' + res.tempco + ' ppm/K means a ' + C.formatOhms(res.ohms) + ' part drifts about ' + C.formatOhms(res.ohms * res.tempco * 1e-6, 3) + ' per °C.' : 'Read from the end where the bands are bunched together.'));

    var bandText = names.join(', ');
    return { ok: true, title: value + ' ' + C.formatPercent(res.tol), detail: bandText.charAt(0).toUpperCase() + bandText.slice(1), copy: value + ' ' + C.formatPercent(res.tol) + (res.tempco != null ? ' ' + res.tempco + ' ppm/K' : '') + ' (' + bandText + ')', ohms: res.ohms };
  }

  RL.tool({
    id: 'colour', label: 'Colour code', title: 'Colour code',
    desc: 'Tap a band, then pick its colour. Works for 4, 5 and 6 band resistors.',
    defaults: { mode: 4, bands: { 4: DEFAULTS[4].slice(), 5: DEFAULTS[5].slice(), 6: DEFAULTS[6].slice() }, sel: 2, enc: 4, query: '' },
    headExtra: function () { return '<div class="zl-seg" id="modeGroup" role="group" aria-label="Number of bands"><button type="button" data-v="4">4 bands</button><button type="button" data-v="5">5 bands</button><button type="button" data-v="6">6 bands</button></div>'; },
    html: html, bind: bind, sync: sync, render: render
  });
})();
