/* LED series resistor: exact value, standard values above it, real current, power and a safe rating. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s;
  var PRESETS = [
    { id: 'red', name: 'Red', vf: 2.0, hex: '#FF3B30' },
    { id: 'yellow', name: 'Yellow', vf: 2.1, hex: '#FFC400' },
    { id: 'green', name: 'Green', vf: 2.2, hex: '#7BC043', note: 'classic' },
    { id: 'green3', name: 'Green', vf: 3.0, hex: '#00C46A', note: 'bright' },
    { id: 'blue', name: 'Blue', vf: 3.1, hex: '#2F7BFF' },
    { id: 'white', name: 'White', vf: 3.1, hex: '#E8EEF5' }
  ];
  function preset(id) { return PRESETS.filter(function (p) { return p.id === id; })[0]; }
  function q(sel) { return el.querySelector(sel); }

  function html() {
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          '<div class="rl-row2">' +
            '<div class="zl-field"><label class="zl-label" for="ledVs">Supply voltage</label><div class="rl-suffix"><input class="zl-input num" id="ledVs" type="text" inputmode="decimal" autocomplete="off"><span>V</span></div></div>' +
            '<div class="zl-field"><label class="zl-label" for="ledMa">LED current</label><div class="rl-suffix"><input class="zl-input num" id="ledMa" type="text" inputmode="decimal" autocomplete="off" aria-describedby="ledMaHint"><span>mA</span></div><span class="zl-hint" id="ledMaHint">20 mA for most 5 mm LEDs.</span></div>' +
          '</div>' +
          '<div class="zl-field"><span class="zl-label" id="ledColLabel">LED colour</span>' +
            '<div class="rl-led-chips" role="group" aria-labelledby="ledColLabel" id="ledPresets">' +
              PRESETS.map(function (p) { return '<button type="button" class="zl-chip" data-p="' + p.id + '"><span class="rl-led-dot" style="--led:' + p.hex + '"></span>' + p.name + (p.note ? ' <small>' + p.note + '</small>' : '') + ' <small class="num">' + p.vf.toFixed(1) + ' V</small></button>'; }).join('') +
              '<button type="button" class="zl-chip" data-p="custom">Custom</button>' +
            '</div></div>' +
          '<div class="rl-row2">' +
            '<div class="zl-field"><label class="zl-label" for="ledVf">Forward voltage, each</label><div class="rl-suffix"><input class="zl-input num" id="ledVf" type="text" inputmode="decimal" autocomplete="off" aria-describedby="ledVfHint"><span>V</span></div><span class="zl-hint" id="ledVfHint">From the colour, or the datasheet.</span></div>' +
            '<div class="zl-field"><span class="zl-label" id="ledNLabel">LEDs in series</span>' +
              '<div class="rl-stepper" role="group" aria-labelledby="ledNLabel"><button type="button" class="zl-btn zl-btn-secondary" id="ledMinus" aria-label="One fewer LED">−</button><output class="num" id="ledN" aria-live="polite">1</output><button type="button" class="zl-btn zl-btn-secondary" id="ledPlus" aria-label="One more LED">+</button></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div class="rl-result-head"><span class="rl-label">Exact resistance</span>' + RL.copyBtn('led') + '</div>' +
          '<output class="rl-big num" id="ledOut">–</output>' +
          '<p class="rl-sub" id="ledSub"></p>' +
          '<div class="rl-pick" id="ledPick"></div>' +
          '<table class="rl-table" id="ledTable"><caption class="sr-only">Standard values at or above the exact resistance</caption>' +
            '<thead><tr><th scope="col">Series</th><th scope="col">Value</th><th scope="col">Current</th><th scope="col">Power</th><th scope="col">Rating</th></tr></thead><tbody></tbody></table>' +
          '<p class="rl-callout is-bad" id="ledWarn" role="alert" hidden></p>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<figure class="rl-figure" id="ledFig"></figure>' +
        '<div class="rl-formula" id="ledFormula" aria-live="polite"></div>' +
      '</div>';
  }

  function inputs() {
    return { vs: RL.num(s.vs), vf: RL.num(s.vf), ma: RL.num(s.ma), n: s.n };
  }

  function bind(root, state) {
    el = root; s = state;
    q('#ledVs').addEventListener('input', function () { s.vs = this.value; RL.changed('led'); });
    q('#ledMa').addEventListener('input', function () { s.ma = this.value; RL.changed('led'); });
    q('#ledVf').addEventListener('input', function () {
      s.vf = this.value;
      var p = preset(s.preset);
      if (!p || RL.num(s.vf) !== p.vf) s.preset = 'custom';
      RL.changed('led');
    });
    q('#ledPresets').addEventListener('click', function (e) {
      var b = e.target.closest('[data-p]'); if (!b) return;
      s.preset = b.getAttribute('data-p');
      var p = preset(s.preset);
      if (p) { s.vf = p.vf.toFixed(1); q('#ledVf').value = s.vf; }
      else q('#ledVf').focus();
      RL.changed('led');
    });
    q('#ledMinus').addEventListener('click', function () { if (s.n > 1) { s.n--; RL.changed('led'); } });
    q('#ledPlus').addEventListener('click', function () { if (s.n < 12) { s.n++; RL.changed('led'); } });
  }

  function sync(root, state) {
    el = root; s = state;
    q('#ledVs').value = s.vs; q('#ledMa').value = s.ma; q('#ledVf').value = s.vf;
    if (!(s.n >= 1 && s.n <= 12)) s.n = 1;
  }

  function ledSym(cx, cy, hex, on) {
    return '<g class="rl-led-sym' + (on ? ' on' : '') + '" style="--led:' + hex + '">' +
      '<circle cx="' + cx + '" cy="' + cy + '" r="22" class="glow"/>' +
      '<path d="M' + (cx + 12) + ' ' + (cy - 12) + 'V' + (cy + 12) + 'L' + (cx - 12) + ' ' + cy + 'z" class="tri"/>' +
      '<path d="M' + (cx - 12) + ' ' + (cy - 12) + 'V' + (cy + 12) + '" class="w"/>' +
      '<path d="M' + (cx - 2) + ' ' + (cy - 16) + 'l8-10M' + (cx + 6) + ' ' + (cy - 14) + 'l8-10" class="ray"/>' +
      '<path d="M' + (cx + 6) + ' ' + (cy - 26) + 'h-5l5-5zM' + (cx + 14) + ' ' + (cy - 24) + 'h-5l5-5z" class="ray-head"/>' +
      '</g>';
  }

  function figure(r, hex) {
    var n = s.n, xs = [];
    if (n <= 4) for (var i = 0; i < n; i++) xs.push(300 - i * (n === 1 ? 0 : 180 / (n - 1)));
    else xs = [300, 240, 180, 110];
    var on = r && r.ok;
    var fmtV = function (v) { return C.trimN(v, 4) + ' V'; };
    var out = '<svg viewBox="0 0 400 230" class="rl-schem" role="img" aria-label="Circuit: supply, resistor and ' + n + ' LED' + (n > 1 ? 's' : '') + ' in series">' +
      '<path d="M60 94V40H150M230 40H350V180H60V124" class="w"/>' +
      '<path d="M40 94H80M50 102H70M40 116H80M50 124H70" class="w plate"/>' +
      '<text x="30" y="92" class="pm" text-anchor="middle">+</text>' +
      '<rect x="150" y="26" width="80" height="28" rx="3" class="comp"/>' +
      '<text x="190" y="18" text-anchor="middle" class="lbl is-calc">' + (on ? 'R = ' + esc(C.formatOhms(r.e12.ohms)) : 'R') + '</text>' +
      '<text x="96" y="114" class="lbl is-given">' + (isFinite(RL.num(s.vs)) ? 'Vs = ' + esc(fmtV(RL.num(s.vs))) : 'Vs') + '</text>' +
      '<path d="M350 100l-6-14h12z" class="arrow"/>' +
      '<text x="340" y="118" text-anchor="end" class="lbl is-given">' + (on ? 'I = ' + esc(RL.fmt(r.e12.current, 'A', 3)) : 'I') + '</text>';
    xs.forEach(function (x, i) {
      if (n > 4 && i === 3) out += '<text x="145" y="186" text-anchor="middle" class="lbl">…</text>';
      out += ledSym(x, 180, hex, on);
    });
    out += '<text x="205" y="222" text-anchor="middle" class="lbl">' + (n > 1 ? n + ' LEDs, ' : '') + 'Vf = ' + (isFinite(RL.num(s.vf)) ? esc(fmtV(RL.num(s.vf))) : '?') + (n > 1 ? ' each' : '') + '</text>';
    return out + '</svg>';
  }

  function render(root, state) {
    el = root; s = state;
    var p = preset(s.preset);
    var hex = p ? p.hex : 'var(--accent)';
    RL.$$('#ledPresets [data-p]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-p') === s.preset)); });
    q('#ledN').textContent = String(s.n);
    q('#ledMinus').disabled = s.n <= 1; q('#ledPlus').disabled = s.n >= 12;
    var i = inputs();
    var r = C.ledResistor(i);
    ['vs', 'vf', 'ma'].forEach(function (k) { RL.setError(q('#led' + k.charAt(0).toUpperCase() + k.slice(1)), ''); });
    var warn = q('#ledWarn');
    warn.hidden = true;
    q('#ledFig').innerHTML = figure(r, hex);
    var tbody = q('#ledTable tbody');
    if (!r.ok) {
      var fieldId = { vs: '#ledVs', vf: '#ledVf', ma: '#ledMa' }[r.field];
      if (r.tooLow) { warn.hidden = false; warn.innerHTML = RL.ICON.warn + '<span>' + esc(r.error) + ' Use fewer LEDs in series, or a supply above ' + r.need + ' V.</span>'; RL.setError(q('#ledVs'), 'Needs to be above ' + r.need + ' V.'); }
      else if (fieldId) RL.setError(q(fieldId), r.error);
      RL.bump(q('#ledOut'), '–');
      q('#ledSub').textContent = '';
      q('#ledPick').innerHTML = '';
      tbody.innerHTML = '';
      q('#ledTable').hidden = true;
      q('#ledFormula').innerHTML = '<h3>Working</h3>' + formulaRows(null) + F.note('The resistor drops whatever voltage the LEDs don\'t use.');
      return { ok: false };
    }
    q('#ledTable').hidden = false;
    RL.bump(q('#ledOut'), C.formatOhms(r.exact, 4));
    q('#ledSub').textContent = 'Drops ' + C.trimN(r.drop, 4) + ' V at ' + C.trimN(i.ma, 4) + ' mA' + (r.lowHeadroom ? '. Small headroom: the current will swing a lot if the supply varies.' : '.');
    var best = r.e12;
    q('#ledPick').innerHTML = '<span class="rl-pick-ic">' + RL.ICON.colour + '</span><div><b class="num" id="ledRec">' + esc(C.formatOhms(best.ohms)) + ', ' + best.rating.label + '</b><small>Nearest E12 value at or above, so the LED gets ' + esc(RL.fmt(best.current, 'A', 3)) + ' and the resistor makes ' + esc(RL.fmt(best.power, 'W', 3)) + ' of heat.</small></div>';
    tbody.innerHTML = [r.e12, r.e24].map(function (o) {
      return '<tr data-series="' + o.series + '"><th scope="row">' + o.series + '</th><td class="num">' + esc(C.formatOhms(o.ohms)) + '</td><td class="num">' + esc(RL.fmt(o.current, 'A', 3)) + '</td><td class="num">' + esc(RL.fmt(o.power, 'W', 3)) + '</td><td>' + o.rating.label + '</td></tr>';
    }).join('');
    if (r.lowHeadroom) { warn.hidden = false; warn.classList.remove('is-bad'); warn.classList.add('is-warn'); warn.innerHTML = RL.ICON.warn + '<span>Less than 0.5 V is left for the resistor. A slightly higher supply makes the current far steadier.</span>'; }
    else { warn.classList.add('is-bad'); warn.classList.remove('is-warn'); }
    q('#ledFormula').innerHTML = '<h3>Working</h3>' + formulaRows(r, i) +
      F.note('Power ratings include a 2× margin: ' + esc(RL.fmt(best.power, 'W', 3)) + ' × 2 = ' + esc(RL.fmt(best.rating.need, 'W', 3)) + ', so ' + best.rating.label + ' is the smallest common size that covers it.');
    var colour = p ? p.name.toLowerCase() + (p.note ? ' (' + p.note + ')' : '') : 'custom';
    return {
      ok: true, title: C.formatOhms(best.ohms) + ', ' + best.rating.label,
      detail: C.trimN(i.vs, 4) + ' V, ' + (s.n > 1 ? s.n + ' × ' : '') + colour + ' LED, ' + C.trimN(i.ma, 4) + ' mA',
      copy: 'LED resistor: ' + C.formatOhms(best.ohms) + ' (E12), ' + best.rating.label + '. Exact ' + C.formatOhms(r.exact, 4) + ' for ' + C.trimN(i.vs, 4) + ' V supply, ' + s.n + ' × ' + colour + ' LED at ' + C.trimN(i.vf, 3) + ' V, ' + C.trimN(i.ma, 4) + ' mA. Actual current ' + RL.fmt(best.current, 'A', 3) + ', power ' + RL.fmt(best.power, 'W', 3) + '.'
    };
  }

  function formulaRows(r, i) {
    var Vs = F.v('V', 's'), Vf = F.v('V', 'f'), I = F.v('I', 'F'), n = F.v('n');
    var sym = F.fr(Vs + ' − ' + n + Vf, I);
    if (!r) return F.row([F.v('R'), sym], 'R = (Vs minus n Vf) over I', { answer: false }) + F.row([F.v('P'), '(' + Vs + ' − ' + n + Vf + ') ' + I], '', { answer: false });
    var sub = F.fr(F.n(C.trimN(i.vs, 4) + ' V') + ' − ' + (s.n > 1 ? F.n(String(s.n)) + ' × ' : '') + F.n(C.trimN(i.vf, 3) + ' V'), F.n(C.trimN(i.ma, 4) + ' mA'));
    return F.row([F.v('R'), sym, sub, F.n(C.formatOhms(r.exact, 4))], 'R = ' + C.formatOhms(r.exact, 4)) +
      F.row([F.v('P'), F.v('V', 'R') + F.v('I'), F.n(C.trimN(r.drop, 4) + ' V') + ' × ' + F.n(RL.fmt(r.e12.current, 'A', 3)), F.n(RL.fmt(r.e12.power, 'W', 3))], 'P = ' + RL.fmt(r.e12.power, 'W', 3)) +
      F.note(F.v('V', 'R') + ' is the ' + C.trimN(r.drop, 4) + ' V left for the resistor, using the current with the ' + C.formatOhms(r.e12.ohms) + ' part.');
  }

  RL.tool({
    id: 'led', label: 'LED resistor', title: 'LED resistor',
    desc: 'Size the series resistor for one LED or a string, with a safe power rating.',
    defaults: { vs: '5', preset: 'red', vf: '2.0', ma: '20', n: 1 }, html: html, bind: bind, sync: sync, render: render
  });
})();
