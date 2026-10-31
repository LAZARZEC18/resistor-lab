/* Series / parallel: a list of resistors with units, the equivalent, and a schematic that draws them. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s, MAX = 12;
  function q(sel) { return el.querySelector(sel); }

  function headExtra() {
    return '<div class="zl-seg" id="spMode" role="group" aria-label="How they are connected"><button type="button" data-v="series">Series</button><button type="button" data-v="parallel">Parallel</button></div>';
  }
  function html() {
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          '<div class="zl-field"><span class="zl-label" id="rowsLabel">Resistors</span>' +
          '<ol class="rl-rows" id="rows" aria-labelledby="rowsLabel"></ol>' +
          '<span class="zl-hint">Type a number and pick a unit, or write it like 4k7. Empty rows are skipped.</span>' +
          '<p class="zl-error" id="combError" role="alert" hidden></p></div>' +
          '<div class="rl-btnrow"><button type="button" class="zl-btn zl-btn-secondary" id="addRow">' + RL.ICON.plus + 'Add resistor</button>' +
          '<button type="button" class="zl-btn zl-btn-ghost" id="addCurrent" data-tip="Adds the value from the Colour code tab">Add colour code value</button></div>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div class="rl-result-head"><span class="rl-label" id="eqLabel">Equivalent in series</span>' + RL.copyBtn('series') + '</div>' +
          '<output class="rl-big num" id="eqOut">–</output>' +
          '<p class="rl-sub" id="eqSub"></p>' +
          '<dl class="rl-facts"><div><dt>Series</dt><dd class="num" id="seriesOut">–</dd></div><div><dt>Parallel</dt><dd class="num" id="parallelOut">–</dd></div></dl>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<figure class="rl-figure" id="spFig"></figure>' +
        '<div class="rl-formula" id="spFormula" aria-live="polite"></div>' +
      '</div>';
  }

  function value(row) {
    var t = String(row.t || '').trim();
    if (!t) return { empty: true };
    if (/[rkmg]/i.test(t.replace(/\s*(ohms?|Ω)$/i, ''))) return C.parseValue(t);
    var n = RL.num(t.replace(/\s*(ohms?|Ω)$/i, ''));
    if (!isFinite(n)) return { ok: false, error: 'Use a number like 220 or 4.7' };
    if (n < 0) return { ok: false, error: 'Resistance cannot be negative.' };
    return { ok: true, value: Number((n * RL.unitFactor('R', row.u)).toPrecision(12)) };
  }

  function renderRows(focusIndex) {
    var ol = q('#rows');
    if (!s.rows.length) {
      ol.innerHTML = '<li class="empty zl-empty rl-rows-empty"><h3>No resistors yet</h3><p>Add the first one to see the equivalent and the schematic.</p></li>';
      return;
    }
    ol.innerHTML = s.rows.map(function (r, i) {
      return '<li class="row"><span class="rl-row-tag" aria-hidden="true">R' + (i + 1) + '</span>' +
        '<label class="sr-only" for="spR' + i + '">Resistor ' + (i + 1) + '</label>' +
        '<div class="rl-unit-input"><input class="zl-input num" id="spR' + i + '" data-i="' + i + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="e.g. 4.7">' +
        '<select class="zl-select" data-u="' + i + '" aria-label="Unit for resistor ' + (i + 1) + '">' + RL.UNITS.R.map(function (u) { return '<option' + (u[0] === r.u ? ' selected' : '') + '>' + u[0] + '</option>'; }).join('') + '</select></div>' +
        '<button type="button" class="zl-iconbtn rl-remove" data-rm="' + i + '" aria-label="Remove R' + (i + 1) + '">' + RL.ICON.x + '</button></li>';
    }).join('');
    s.rows.forEach(function (r, i) { q('#spR' + i).value = r.t; });
    if (focusIndex != null) { var f = q('#spR' + focusIndex); if (f) f.focus(); }
  }

  function add(row) {
    if (s.rows.length >= MAX) { ZL.toast('Up to ' + MAX + ' resistors', { type: 'info' }); return; }
    s.rows.push(row);
    renderRows(s.rows.length - 1);
    RL.changed('series');
  }

  function bind(root, state) {
    el = root; s = state;
    RL.seg(q('#spMode'), function (v) { s.mode = v; RL.changed('series'); });
    var ol = q('#rows');
    ol.addEventListener('input', function (e) {
      var i = e.target.getAttribute('data-i'); if (i == null) return;
      s.rows[+i].t = e.target.value; RL.changed('series');
    });
    ol.addEventListener('change', function (e) {
      var i = e.target.getAttribute('data-u'); if (i == null) return;
      s.rows[+i].u = e.target.value; RL.changed('series');
    });
    ol.addEventListener('click', function (e) {
      var b = e.target.closest('[data-rm]'); if (!b) return;
      var i = +b.getAttribute('data-rm'), removed = s.rows.splice(i, 1)[0];
      renderRows();
      var ins = el.querySelectorAll('#rows input');
      if (ins.length) ins[Math.min(i, ins.length - 1)].focus(); else q('#addRow').focus();
      RL.changed('series');
      ZL.toast('Removed R' + (i + 1), { action: { label: 'Undo', fn: function () { s.rows.splice(i, 0, removed); renderRows(); RL.changed('series'); } } });
    });
    q('#addRow').addEventListener('click', function () { add({ t: '', u: 'kΩ' }); });
    q('#addCurrent').addEventListener('click', function () {
      var sum = RL.summary('colour');
      if (!sum || !sum.ok) { ZL.toast('The colour code tab has no valid value yet', { type: 'bad' }); return; }
      var v = sum.ohms, u = RL.bestUnit('R', v);
      add({ t: C.trimN(v / u[1], 6), u: u[0] });
      ZL.toast('Added ' + C.formatOhms(v));
    });
  }

  function sync(root, state) {
    el = root; s = state;
    if (!Array.isArray(s.rows)) s.rows = [];
    s.rows = s.rows.filter(function (r) { return r && typeof r === 'object'; }).slice(0, MAX);
    renderRows();
  }

  function figure(vals, mode) {
    var n = vals.length;
    if (!n) return '<svg viewBox="0 0 360 120" class="rl-schem" role="img" aria-label="Empty schematic"><path d="M20 60H340" class="w dash"/><circle cx="20" cy="60" r="5" class="node"/><circle cx="340" cy="60" r="5" class="node"/></svg>';
    var lbl = function (v) { return esc(C.formatOhms(v, 3)); };
    var out;
    if (mode === 'series') {
      var perRow = Math.min(n, 4), rows = Math.ceil(n / perRow), w = 40 + perRow * 100, h = rows * 90 + 10;
      out = '<svg viewBox="0 0 ' + w + ' ' + h + '" class="rl-schem" role="img" aria-label="' + n + ' resistors in series">';
      var path = '';
      vals.forEach(function (v, i) {
        var r = Math.floor(i / perRow), c = i % perRow;
        var dir = r % 2 === 0 ? 1 : -1;
        var x = dir === 1 ? 20 + c * 100 : w - 20 - (c + 1) * 100;
        var y = 50 + r * 90;
        out += '<rect x="' + (x + 20) + '" y="' + (y - 13) + '" width="60" height="26" rx="3" class="comp"/>' +
          '<text x="' + (x + 50) + '" y="' + (y - 22) + '" text-anchor="middle" class="lbl is-given">R' + (i + 1) + ' ' + lbl(v) + '</text>';
        path += 'M' + x + ' ' + y + 'H' + (x + 20) + 'M' + (x + 80) + ' ' + y + 'H' + (x + 100);
        if (c === perRow - 1 && i < n - 1) {
          var ex = dir === 1 ? x + 100 : x;
          path += 'M' + ex + ' ' + y + 'V' + (y + 90);
        }
      });
      var lastR = Math.floor((n - 1) / perRow), lastC = (n - 1) % perRow, ldir = lastR % 2 === 0 ? 1 : -1;
      var endX = ldir === 1 ? 20 + (lastC + 1) * 100 : w - 20 - (lastC + 1) * 100;
      out += '<path d="' + path + '" class="w"/><circle cx="20" cy="50" r="5" class="node"/><circle cx="' + endX + '" cy="' + (50 + lastR * 90) + '" r="5" class="node"/>';
    } else {
      var gap = 84, W = 80 + n * gap, H = 200;
      out = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="rl-schem" role="img" aria-label="' + n + ' resistors in parallel">';
      var x0 = 40 + gap / 2, x1 = 40 + gap / 2 + (n - 1) * gap;
      out += '<path d="M10 40H' + x1 + 'M10 160H' + x1 + '" class="w"/><circle cx="10" cy="40" r="5" class="node"/><circle cx="10" cy="160" r="5" class="node"/>';
      vals.forEach(function (v, i) {
        var x = x0 + i * gap;
        out += '<path d="M' + x + ' 40V70M' + x + ' 130V160" class="w"/><circle cx="' + x + '" cy="40" r="3.5" class="dot"/><circle cx="' + x + '" cy="160" r="3.5" class="dot"/>' +
          '<rect x="' + (x - 13) + '" y="70" width="26" height="60" rx="3" class="comp"/>' +
          '<text x="' + x + '" y="186" text-anchor="middle" class="lbl is-given">R' + (i + 1) + '</text>' +
          '<text x="' + x + '" y="28" text-anchor="middle" class="lbl small">' + lbl(v) + '</text>';
      });
    }
    return out + '</svg>';
  }

  function render(root, state) {
    el = root; s = state;
    RL.setSeg(q('#spMode'), s.mode);
    var vals = [], bad = [];
    s.rows.forEach(function (r, i) {
      var v = value(r), input = q('#spR' + i);
      if (v.empty) { if (input) input.removeAttribute('aria-invalid'); return; }
      if (v.ok) { vals.push(v.value); if (input) input.removeAttribute('aria-invalid'); }
      else { bad.push(i + 1); if (input) input.setAttribute('aria-invalid', 'true'); }
    });
    var err = q('#combError');
    if (bad.length) { err.textContent = 'Could not read R' + bad.join(', R') + '. Use a number like 220 or 4.7 with a unit, or write it like 4k7.'; err.hidden = false; }
    else err.hidden = true;
    var ser = vals.length ? C.seriesR(vals) : NaN, par = vals.length ? C.parallelR(vals) : NaN;
    q('#seriesOut').textContent = vals.length ? C.formatOhms(ser, 4) : '–';
    q('#parallelOut').textContent = vals.length ? C.formatOhms(par, 4) : '–';
    var eq = s.mode === 'series' ? ser : par;
    q('#eqLabel').textContent = 'Equivalent in ' + s.mode;
    RL.bump(q('#eqOut'), vals.length ? C.formatOhms(eq, 4) : '–');
    q('#eqSub').textContent = vals.length ? vals.length + ' resistor' + (vals.length > 1 ? 's' : '') + (s.mode === 'parallel' && vals.length > 1 ? '. Always less than the smallest one.' : s.mode === 'series' && vals.length > 1 ? '. Always more than the largest one.' : '') : '';
    q('#spFig').innerHTML = figure(vals, s.mode);
    var Req = F.v('R', 'eq');
    var syms = vals.slice(0, 4).map(function (_, i) { return F.v('R', i + 1); });
    if (vals.length > 4) syms.push('…');
    var nums = vals.slice(0, 4).map(function (v) { return F.n(C.formatOhms(v, 4)); });
    if (vals.length > 4) nums.push('…');
    var f = '<h3>Working</h3>';
    if (!vals.length) f += F.row([Req, F.v('R', 1) + ' + ' + F.v('R', 2) + ' + …'], '', { answer: false }) + F.note('Add resistors to see the sum.');
    else if (s.mode === 'series') {
      f += F.row([Req, syms.join(' + '), nums.join(' + '), F.n(C.formatOhms(ser, 4))], 'R eq = ' + C.formatOhms(ser, 4));
      f += F.note('In series the same current flows through every resistor, so the resistances add.');
    } else {
      f += F.row([F.fr('1', Req), syms.map(function (x) { return F.fr('1', x); }).join(' + ')], '1 over R eq equals the sum of 1 over each R', { answer: false });
      if (vals.length === 2) f += F.row([Req, F.fr(F.v('R', 1) + F.v('R', 2), F.v('R', 1) + ' + ' + F.v('R', 2)), F.fr(nums[0] + ' × ' + nums[1], nums[0] + ' + ' + nums[1]), F.n(C.formatOhms(par, 4))], 'R eq = ' + C.formatOhms(par, 4));
      else if (par > 0) {
        var g = vals.slice(0, 4).map(function (v) { return v > 0 ? F.n(RL.fmt(1 / v, 'S', 4)) : '∞'; });
        if (vals.length > 4) g.push('…');
        f += F.row([F.fr('1', Req), g.join(' + '), F.n(RL.fmt(1 / par, 'S', 4))], '1 over R eq = ' + RL.fmt(1 / par, 'S', 4), { answer: false });
        f += F.row([Req, F.fr('1', F.n(RL.fmt(1 / par, 'S', 4))), F.n(C.formatOhms(par, 4))], 'R eq = ' + C.formatOhms(par, 4));
      } else f += F.row([Req, F.n('0 Ω')], 'R eq = 0 ohms');
      f += F.note('In parallel each resistor sees the same voltage, so the conductances add. Conductance is 1/' + F.v('R') + ', measured in siemens (S).');
    }
    q('#spFormula').innerHTML = f;
    if (!vals.length) return { ok: false };
    var list = vals.map(function (v) { return C.formatOhms(v, 4); });
    return { ok: true, title: C.formatOhms(eq, 4), detail: list.join(s.mode === 'series' ? ' + ' : ' ∥ '), copy: list.join(s.mode === 'series' ? ' + ' : ' ∥ ') + ' = ' + C.formatOhms(eq, 4) + ' (' + s.mode + ')' };
  }

  RL.tool({
    id: 'series', label: 'Series/parallel', title: 'Series and parallel',
    desc: 'List resistors and get their combined resistance.',
    defaults: { mode: 'parallel', rows: [{ t: '1', u: 'kΩ' }, { t: '2.2', u: 'kΩ' }, { t: '4.7', u: 'kΩ' }] },
    headExtra: headExtra, html: html, bind: bind, sync: sync, render: render
  });
})();
