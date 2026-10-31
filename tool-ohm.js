/* Ohm's law and power: enter any two of V, I, R, P (with units) and get the other two. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s;
  var Q = ['V', 'I', 'R', 'P'];
  var META = {
    V: { name: 'Voltage', unit: 'V', hint: 'Across the resistor' },
    I: { name: 'Current', unit: 'A', hint: 'Through the resistor' },
    R: { name: 'Resistance', unit: 'Ω', hint: '4k7 works too' },
    P: { name: 'Power', unit: 'W', hint: 'Heat in the resistor' }
  };
  var last = null;
  function q(sel) { return el.querySelector(sel); }

  function html() {
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          '<div class="rl-quad" id="ohmFields">' + Q.map(function (k) {
            var m = META[k];
            return '<div class="zl-field rl-qty" data-q="' + k + '">' +
              '<div class="rl-qty-head"><label class="zl-label" for="ohm' + k + '">' + m.name + ' <i class="rl-sym">' + k + '</i></label><span class="rl-qty-tag" id="ohmTag' + k + '"></span></div>' +
              '<div class="rl-unit-input"><input class="zl-input num" id="ohm' + k + '" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" placeholder="–">' +
              '<select class="zl-select" id="ohmU' + k + '" aria-label="' + m.name + ' unit">' + RL.UNITS[k].map(function (u) { return '<option>' + u[0] + '</option>'; }).join('') + '</select></div>' +
              '<span class="zl-hint">' + m.hint + '</span></div>';
          }).join('') + '</div>' +
          '<p class="zl-hint rl-quad-hint" id="ohmHint">Fill in any two. The last two you typed are used, and the others are worked out.</p>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div class="rl-result-head"><span class="rl-label" id="ohmResLabel">Worked out</span>' + RL.copyBtn('ohm') + '</div>' +
          '<div class="rl-pair" id="ohmPair"></div>' +
          '<p class="rl-callout" id="ohmRating" hidden></p>' +
          '<button type="button" class="zl-btn zl-btn-secondary zl-btn-sm rl-clear" id="ohmClear">Clear all</button>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<figure class="rl-figure" id="ohmFig"></figure>' +
        '<div class="rl-formula" id="ohmFormula" aria-live="polite"></div>' +
      '</div>';
  }

  function given() { return (s.given || []).filter(function (k) { return Q.indexOf(k) >= 0 && String(s[k].t || '').trim(); }); }

  function parseQty(k) {
    var t = String(s[k].t || '').trim();
    if (!t) return { empty: true };
    if (k === 'R' && /[rkmg]/i.test(t)) {
      var p = C.parseValue(t);
      return p.ok ? { v: p.value } : { error: p.error };
    }
    var n = RL.num(t.replace(/\s*(m?v|[µu]?a|m?a|k?Ω|ohms?|m?w)$/i, ''));
    if (!isFinite(n)) return { error: 'Type a number, like ' + (k === 'V' ? '5 or 3.3' : k === 'I' ? '20' : k === 'R' ? '220 or 4k7' : '250') + '.' };
    if (n <= 0) return { error: META[k].name + ' must be more than zero.' };
    return { v: n * RL.unitFactor(k, s[k].u) };
  }

  function bind(root, state) {
    el = root; s = state;
    Q.forEach(function (k) {
      var input = q('#ohm' + k), sel = q('#ohmU' + k);
      input.addEventListener('input', function () {
        s[k].t = input.value;
        var g = (s.given || []).filter(function (x) { return x !== k; });
        if (input.value.trim()) { g.push(k); if (g.length > 2) g = g.slice(-2); }
        s.given = g;
        RL.changed('ohm');
      });
      sel.addEventListener('change', function () {
        s[k].u = sel.value;
        if (given().indexOf(k) < 0 && last && last.ok) {
          s[k].pinned = true;
        }
        RL.changed('ohm');
      });
    });
    q('#ohmClear').addEventListener('click', function () {
      var before = JSON.parse(JSON.stringify(s));
      Q.forEach(function (k) { s[k].t = ''; s[k].pinned = false; q('#ohm' + k).value = ''; });
      s.given = [];
      RL.changed('ohm', { noRecent: true });
      q('#ohmV').focus();
      ZL.toast('Cleared', { action: { label: 'Undo', fn: function () {
        Q.forEach(function (k) { s[k] = before[k]; }); s.given = before.given;
        sync(el, s); RL.changed('ohm', { noRecent: true });
      } } });
    });
  }

  function sync(root, state) {
    el = root; s = state;
    Q.forEach(function (k) {
      if (!s[k] || typeof s[k] !== 'object') s[k] = { t: '', u: META[k].unit };
      q('#ohm' + k).value = s[k].t || '';
      q('#ohmU' + k).value = s[k].u;
    });
  }

  function show(k, si) {
    var u = s[k].pinned ? [s[k].u, RL.unitFactor(k, s[k].u)] : RL.bestUnit(k, si);
    s[k].u = u[0];
    q('#ohmU' + k).value = u[0];
    return C.trimN(si / u[1], 4);
  }
  function txt(k, v) { return RL.fmt(v, META[k].unit); }

  function expr(k, pair, v) {
    var V = F.v('V'), I = F.v('I'), R = F.v('R'), P = F.v('P');
    var n = function (x) { return F.n(txt(x, v[x])); };
    var map = {
      'VI:R': [F.fr(V, I), F.fr(n('V'), n('I'))], 'VI:P': [V + I, n('V') + ' × ' + n('I')],
      'VR:I': [F.fr(V, R), F.fr(n('V'), n('R'))], 'VR:P': [F.fr(V + '<sup>2</sup>', R), F.fr('(' + n('V') + ')<sup>2</sup>', n('R'))],
      'VP:I': [F.fr(P, V), F.fr(n('P'), n('V'))], 'VP:R': [F.fr(V + '<sup>2</sup>', P), F.fr('(' + n('V') + ')<sup>2</sup>', n('P'))],
      'IR:V': [I + R, n('I') + ' × ' + n('R')], 'IR:P': [I + '<sup>2</sup>' + R, '(' + n('I') + ')<sup>2</sup> × ' + n('R')],
      'IP:V': [F.fr(P, I), F.fr(n('P'), n('I'))], 'IP:R': [F.fr(P, I + '<sup>2</sup>'), F.fr(n('P'), '(' + n('I') + ')<sup>2</sup>')],
      'RP:V': [F.sq(P + R), F.sq(n('P') + ' × ' + n('R'))], 'RP:I': [F.sq(F.fr(P, R)), F.sq(F.fr(n('P'), n('R')))]
    };
    return map[pair + ':' + k];
  }

  function figure(v, calc) {
    var lab = function (k) { return (calc.indexOf(k) >= 0 ? 'is-calc' : 'is-given'); };
    var t = function (k) { return v ? esc(k + ' = ' + txt(k, v[k])) : k; };
    return '<svg viewBox="0 0 380 210" class="rl-schem" role="img" aria-label="Circuit: a source across a resistor, with the current around the loop">' +
      '<path d="M60 94V40H150M230 40H320V170H60V124" class="w"/>' +
      '<path d="M40 94H80M50 102H70M40 116H80M50 124H70" class="w plate"/>' +
      '<text x="30" y="92" class="pm" text-anchor="middle">+</text>' +
      '<rect x="150" y="26" width="80" height="28" rx="3" class="comp"/>' +
      '<path d="M276 40l-14-6v12z" class="arrow"/>' +
      '<text x="190" y="18" text-anchor="middle" class="lbl ' + lab('R') + '">' + t('R') + '</text>' +
      '<text x="290" y="30" text-anchor="middle" class="lbl ' + lab('I') + '">' + t('I') + '</text>' +
      '<text x="92" y="156" class="lbl ' + lab('V') + '">' + t('V') + '</text>' +
      '<path d="M170 76c4-6 -4-10 0-16M190 76c4-6 -4-10 0-16M210 76c4-6 -4-10 0-16" class="heat" transform="translate(0 6)"/>' +
      '<text x="190" y="104" text-anchor="middle" class="lbl ' + lab('P') + '">' + t('P') + '</text>' +
      '</svg>';
  }

  function render(root, state) {
    el = root; s = state;
    var g = given(), vals = {}, bad = false;
    Q.forEach(function (k) {
      var field = q('#ohm' + k);
      var isGiven = g.indexOf(k) >= 0;
      field.closest('.rl-qty').classList.toggle('is-given', isGiven);
      var p = isGiven ? parseQty(k) : null;
      if (p && p.error) { RL.setError(field, p.error); bad = true; }
      else RL.setError(field, '');
      if (p && p.v != null) vals[k] = p.v;
    });
    var calc = Q.filter(function (k) { return g.indexOf(k) < 0; });
    var r = (!bad && g.length === 2) ? C.ohmsLaw(vals) : null;
    last = r;
    Q.forEach(function (k) {
      var isCalc = calc.indexOf(k) >= 0 && r && r.ok;
      var input = q('#ohm' + k);
      input.closest('.rl-qty').classList.toggle('is-calc', !!isCalc);
      q('#ohmTag' + k).textContent = g.indexOf(k) >= 0 ? 'Given' : isCalc ? 'Answer' : '';
      if (isCalc) input.value = show(k, r[k]);
      else if (g.indexOf(k) < 0 && document.activeElement !== input) { input.value = ''; s[k].pinned = false; }
    });
    var pair = q('#ohmPair');
    if (!r || !r.ok) {
      var need = 2 - g.length;
      pair.innerHTML = '<div class="rl-pair-empty">' + (bad ? 'Fix the highlighted field.' : need === 2 ? 'Enter two values to start.' : 'Enter one more value.') + '</div>';
      q('#ohmRating').hidden = true;
      q('#ohmFig').innerHTML = figure(null, []);
      q('#ohmFormula').innerHTML = '<h3>Working</h3>' + F.row([F.v('V'), F.v('I') + F.v('R')], 'V = I R', { answer: false }) + F.row([F.v('P'), F.v('V') + F.v('I')], 'P = V I', { answer: false }) +
        F.note('Ohm\'s law and the power law. Any two values pin down the other two.');
      return { ok: false };
    }
    pair.innerHTML = calc.map(function (k) {
      return '<div class="rl-pair-item"><span>' + META[k].name + '</span><output class="rl-big num" id="ohmOut' + k + '">' + esc(txt(k, r[k])) + '</output></div>';
    }).join('');
    var rate = C.ratingFor(r.P);
    var rt = q('#ohmRating');
    rt.hidden = false;
    rt.innerHTML = '<span>' + (rate.watts ? 'A resistor rated <b>' + rate.label + '</b> or more handles this with a 2× margin.' : 'That is more than 5 W of heat. Use a power resistor on a heatsink, or lower the current.') + '</span>';
    rt.classList.toggle('is-warn', !rate.watts || rate.watts >= 1);
    q('#ohmFig').innerHTML = figure(r, calc);
    q('#ohmFormula').innerHTML = '<h3>Working</h3>' + calc.map(function (k) {
      var e = expr(k, r.pair, r);
      return F.row([F.v(k), e[0], e[1], F.n(txt(k, r[k]))], k + ' = ' + txt(k, r[k]));
    }).join('') + F.note('From ' + g.map(function (k) { return META[k].name.toLowerCase(); }).join(' and ') + ', using ' + F.v('V') + ' = ' + F.v('I') + F.v('R') + ' and ' + F.v('P') + ' = ' + F.v('V') + F.v('I') + '.');
    var all = Q.map(function (k) { return k + ' = ' + txt(k, r[k]); });
    return { ok: true, title: calc.map(function (k) { return txt(k, r[k]); }).join(', '), detail: g.map(function (k) { return txt(k, r[k]); }).join(', '), copy: all.join(', ') };
  }

  RL.tool({
    id: 'ohm', label: "Ohm's law", title: "Ohm's law and power",
    desc: 'Enter any two of voltage, current, resistance and power.',
    defaults: { V: { t: '5', u: 'V' }, I: { t: '20', u: 'mA' }, R: { t: '', u: 'Ω' }, P: { t: '', u: 'mW' }, given: ['V', 'I'] },
    html: html, bind: bind, sync: sync, render: render
  });
})();
