/* Voltage divider: Vout from R1/R2 (with optional load), or the best E12/E24 pair for a target. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s, lastPair = null;
  function q(sel) { return el.querySelector(sel); }
  function rField(id, label, hint) {
    return '<div class="zl-field"><label class="zl-label" for="' + id + '">' + label + '</label><div class="rl-suffix"><input class="zl-input num" id="' + id + '" type="text" autocomplete="off" spellcheck="false" autocapitalize="off"><span>Ω</span></div>' + (hint ? '<span class="zl-hint">' + hint + '</span>' : '') + '</div>';
  }
  function vField(id, label, hint) {
    return '<div class="zl-field"><label class="zl-label" for="' + id + '">' + label + '</label><div class="rl-suffix"><input class="zl-input num" id="' + id + '" type="text" inputmode="decimal" autocomplete="off"><span>V</span></div>' + (hint ? '<span class="zl-hint">' + hint + '</span>' : '') + '</div>';
  }

  function headExtra() {
    return '<div class="zl-seg" id="divMode" role="group" aria-label="What to work out"><button type="button" data-v="vout">Find Vout</button><button type="button" data-v="pair">Find resistors</button></div>';
  }

  function html() {
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          vField('divVin', 'Input voltage, V<sub>in</sub>') +
          '<div data-mode="vout" class="rl-stack">' +
            '<div class="rl-row2">' + rField('divR1', 'Top resistor, R1', 'Between Vin and Vout.') + rField('divR2', 'Bottom resistor, R2', 'Between Vout and ground.') + '</div>' +
            '<label class="zl-switch"><input type="checkbox" id="divLoad"> Connect a load to Vout</label>' +
            '<div id="divLoadRow" hidden>' + rField('divRL', 'Load resistance, R<sub>L</sub>', 'What you connect, like an ADC input or a module.') + '</div>' +
          '</div>' +
          '<div data-mode="pair" class="rl-stack">' +
            vField('divTarget', 'Target output, V<sub>out</sub>') +
            '<div class="zl-field"><span class="zl-label" id="divSerLabel">Use values from</span><div class="zl-seg" id="divSeries" role="group" aria-labelledby="divSerLabel"><button type="button" data-v="E12">E12</button><button type="button" data-v="E24">E24</button></div><span class="zl-hint">E12 is what most kits hold. E24 gets closer.</span></div>' +
            rField('divFix', 'If R2 has to be', 'Gives the exact R1 for a bottom resistor you already have.') +
          '</div>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div data-mode="vout">' +
            '<div class="rl-result-head"><span class="rl-label">Output voltage</span>' + RL.copyBtn('divider') + '</div>' +
            '<output class="rl-big num" id="voutOut">–</output>' +
            '<p class="rl-sub" id="divSub"></p>' +
            '<div class="rl-loaded" id="divLoaded" hidden></div>' +
            '<dl class="rl-facts" id="divFacts"></dl>' +
          '</div>' +
          '<div data-mode="pair">' +
            '<div class="rl-result-head"><span class="rl-label">Best standard pair</span>' + RL.copyBtn('divider') + '</div>' +
            '<output class="rl-big num rl-big-pair" id="divPairOut">–</output>' +
            '<p class="rl-sub" id="divPairSub"></p>' +
            '<ol class="rl-options" id="divOptions"></ol>' +
            '<p class="rl-sub" id="divExact"></p>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<figure class="rl-figure" id="divFig"></figure>' +
        '<div class="rl-formula" id="divFormula" aria-live="polite"></div>' +
      '</div>';
  }

  function res(text) { var p = C.parseValue(text); return p.ok ? p : p; }

  function bind(root, state) {
    el = root; s = state;
    var map = { divVin: 'vin', divR1: 'r1', divR2: 'r2', divRL: 'rl', divTarget: 'target', divFix: 'fix' };
    Object.keys(map).forEach(function (id) {
      q('#' + id).addEventListener('input', function () { s[map[id]] = this.value; RL.changed('divider'); });
    });
    q('#divLoad').addEventListener('change', function () { s.load = this.checked; RL.changed('divider'); if (s.load) q('#divRL').focus(); });
    RL.seg(q('#divMode'), function (v) { s.mode = v; RL.changed('divider'); });
    RL.seg(q('#divSeries'), function (v) { s.series = v; RL.changed('divider'); });
    q('#divOptions').addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]'); if (!b || !lastPair) return;
      var o = lastPair.options[+b.getAttribute('data-i')];
      s.r1 = short(o.r1); s.r2 = short(o.r2); s.mode = 'vout';
      q('#divR1').value = s.r1; q('#divR2').value = s.r2;
      RL.changed('divider');
      ZL.toast('Using R1 = ' + C.formatOhms(o.r1) + ', R2 = ' + C.formatOhms(o.r2));
    });
  }
  function short(v) { return C.formatOhms(v).replace(/ Ω$/, '').replace(/ ([kMG])Ω$/, '$1'); }

  function sync(root, state) {
    el = root; s = state;
    q('#divVin').value = s.vin; q('#divR1').value = s.r1; q('#divR2').value = s.r2; q('#divRL').value = s.rl;
    q('#divTarget').value = s.target; q('#divFix').value = s.fix; q('#divLoad').checked = !!s.load;
  }

  function resistor(x, y, h, label, cls) {
    return '<rect x="' + (x - 13) + '" y="' + y + '" width="26" height="' + h + '" rx="3" class="comp' + (cls ? ' ' + cls : '') + '"/>' +
      '<text x="' + (x - 24) + '" y="' + (y + h / 2 + 5) + '" text-anchor="end" class="lbl ' + (cls === 'dash' ? '' : 'is-given') + '">' + esc(label) + '</text>';
  }
  function figure(d) {
    var l = !!s.load && s.mode === 'vout';
    var out = '<svg viewBox="0 0 380 260" class="rl-schem" role="img" aria-label="Voltage divider: R1 on top, R2 below, Vout taken between them' + (l ? ', with a load from Vout to ground' : '') + '">' +
      '<circle cx="150" cy="20" r="5" class="node"/>' +
      '<text x="166" y="25" class="lbl is-given">' + esc(d.vinT) + '</text>' +
      '<path d="M150 25V44M150 106V154M150 216V232" class="w"/>' +
      resistor(150, 44, 62, d.r1T) + resistor(150, 154, 62, d.r2T) +
      '<circle cx="150" cy="130" r="4.5" class="dot"/>' +
      '<path d="M150 130H' + (l ? 330 : 250) + '" class="w"/>' +
      '<circle cx="250" cy="130" r="5" class="node"/>' +
      '<text x="250" y="116" text-anchor="middle" class="lbl is-calc">' + esc(d.voutT) + '</text>' +
      '<path d="M132 232H168M138 240H162M144 248H156" class="w"/>';
    if (l) {
      out += '<path d="M330 130V154M330 216V232H150" class="w dash"/>' +
        '<rect x="317" y="154" width="26" height="62" rx="3" class="comp dash"/>' +
        '<text x="306" y="190" text-anchor="end" class="lbl">' + esc(d.rlT) + '</text>';
    }
    return out + '</svg>';
  }

  function render(root, state) {
    el = root; s = state;
    RL.setSeg(q('#divMode'), s.mode);
    RL.setSeg(q('#divSeries'), s.series);
    RL.$$('[data-mode]', el).forEach(function (n) { n.hidden = n.getAttribute('data-mode') !== s.mode; });
    q('#divLoadRow').hidden = !s.load;
    ['#divVin', '#divR1', '#divR2', '#divRL', '#divTarget', '#divFix'].forEach(function (id) { RL.setError(q(id), ''); });
    var vin = RL.num(String(s.vin).replace(/v$/i, ''));
    var vinOk = isFinite(vin) && vin > 0;
    if (!vinOk) RL.setError(q('#divVin'), String(s.vin).trim() ? 'Type the input voltage as a number above 0, like 12 or 3.3.' : 'Enter the input voltage.');
    return s.mode === 'pair' ? renderPair(vin, vinOk) : renderVout(vin, vinOk);
  }

  function renderVout(vin, vinOk) {
    var r1 = res(s.r1), r2 = res(s.r2), rl = s.load ? res(s.rl) : { ok: true, value: 0 };
    if (!r1.ok) RL.setError(q('#divR1'), r1.error);
    if (!r2.ok) RL.setError(q('#divR2'), r2.error);
    if (s.load && !rl.ok) RL.setError(q('#divRL'), rl.error);
    var d = (vinOk && r1.ok && r2.ok && rl.ok) ? C.loadedDivider(vin, r1.value, r2.value, s.load ? rl.value : 0) : null;
    if (vinOk && r1.ok && r2.ok && !d) RL.setError(q('#divR2'), 'R1 and R2 cannot both be 0 Ω.');
    if (s.load && rl.ok && rl.value === 0 && d) RL.setError(q('#divRL'), 'A 0 Ω load shorts the output. Use a value above 0.');
    var labels = {
      vinT: vinOk ? 'Vin = ' + C.trimN(vin, 4) + ' V' : 'Vin',
      r1T: r1.ok ? 'R1 = ' + C.formatOhms(r1.value, 4) : 'R1', r2T: r2.ok ? 'R2 = ' + C.formatOhms(r2.value, 4) : 'R2',
      rlT: rl.ok && s.load ? 'RL = ' + C.formatOhms(rl.value, 4) : 'RL',
      voutT: d ? 'Vout = ' + RL.fmt(d.loaded ? d.loaded.vout : d.vout, 'V', 4) : 'Vout'
    };
    q('#divFig').innerHTML = figure(labels);
    if (!d) {
      RL.bump(q('#voutOut'), '–');
      q('#divSub').textContent = ''; q('#divFacts').innerHTML = ''; q('#divLoaded').hidden = true;
      q('#divFormula').innerHTML = '<h3>Working</h3>' + F.row([F.v('V', 'out'), F.v('V', 'in') + ' · ' + F.fr(F.v('R', 2), F.v('R', 1) + ' + ' + F.v('R', 2))], '', { answer: false });
      return { ok: false };
    }
    var vt = RL.fmt(d.vout, 'V', 4);
    RL.bump(q('#voutOut'), vt);
    q('#divSub').textContent = 'With nothing connected. Ratio ' + C.trimN(d.ratio, 4) + '.';
    var ld = q('#divLoaded');
    if (d.loaded) {
      ld.hidden = false;
      ld.className = 'rl-loaded' + (d.loaded.drop > 5 ? ' is-warn' : '');
      ld.innerHTML = '<span>With the load</span><b class="num" id="voutLoaded">' + esc(RL.fmt(d.loaded.vout, 'V', 4)) + '</b><small>' + C.trimN(d.loaded.drop, 3) + '% lower. ' + (d.loaded.drop > 5 ? 'Use smaller resistors, or buffer Vout with an op-amp.' : 'Close enough for most uses.') + '</small>';
    } else ld.hidden = true;
    q('#divFacts').innerHTML =
      '<div><dt>Current</dt><dd class="num">' + esc(RL.fmt(d.loaded ? d.loaded.current : d.current, 'A', 4)) + '</dd></div>' +
      '<div><dt>Power in R1</dt><dd class="num">' + esc(RL.fmt(d.p1, 'W', 3)) + '</dd></div>' +
      '<div><dt>Power in R2</dt><dd class="num">' + esc(RL.fmt(d.p2, 'W', 3)) + '</dd></div>';
    var Vo = F.v('V', 'out'), Vi = F.v('V', 'in'), R1 = F.v('R', 1), R2 = F.v('R', 2);
    var f = '<h3>Working</h3>' + F.row([Vo, Vi + ' · ' + F.fr(R2, R1 + ' + ' + R2), F.n(C.trimN(vin, 4) + ' V') + ' · ' + F.fr(F.n(C.formatOhms(r2.value, 4)), F.n(C.formatOhms(r1.value, 4)) + ' + ' + F.n(C.formatOhms(r2.value, 4))), F.n(vt)], 'Vout = ' + vt);
    if (d.loaded) {
      f += F.row([R2 + ' ∥ ' + F.v('R', 'L'), F.fr(R2 + F.v('R', 'L'), R2 + ' + ' + F.v('R', 'L')), F.n(C.formatOhms(d.loaded.r2eff, 4))], 'R2 parallel RL = ' + C.formatOhms(d.loaded.r2eff, 4));
      f += F.note('The load sits in parallel with R2, so use ' + C.formatOhms(d.loaded.r2eff, 4) + ' in place of R2. That gives ' + RL.fmt(d.loaded.vout, 'V', 4) + '.');
    } else f += F.note('No current is drawn from Vout. Turn on the load option to see what connecting something does.');
    q('#divFormula').innerHTML = f;
    var shown = d.loaded ? d.loaded.vout : d.vout;
    return { ok: true, title: RL.fmt(shown, 'V', 4) + ' out', detail: C.trimN(vin, 4) + ' V, ' + C.formatOhms(r1.value, 4) + ' / ' + C.formatOhms(r2.value, 4) + (d.loaded ? ', ' + C.formatOhms(rl.value, 4) + ' load' : ''),
      copy: 'Divider: Vin ' + C.trimN(vin, 4) + ' V, R1 ' + C.formatOhms(r1.value, 4) + ', R2 ' + C.formatOhms(r2.value, 4) + ' gives Vout ' + vt + (d.loaded ? ' (' + RL.fmt(d.loaded.vout, 'V', 4) + ' with a ' + C.formatOhms(rl.value, 4) + ' load)' : '') };
  }

  function renderPair(vin, vinOk) {
    var t = RL.num(String(s.target).replace(/v$/i, ''));
    var fix = res(s.fix);
    var r = vinOk ? C.bestDividerPair(vin, t, s.series, 3) : null;
    if (vinOk && !r.ok) RL.setError(q('#divTarget'), r.error);
    if (String(s.fix).trim() && !fix.ok) RL.setError(q('#divFix'), fix.error);
    lastPair = r && r.ok ? r : null;
    var bestT = lastPair ? 'R1 = ' + C.formatOhms(r.best.r1) : 'R1';
    q('#divFig').innerHTML = figure({ vinT: vinOk ? 'Vin = ' + C.trimN(vin, 4) + ' V' : 'Vin', r1T: bestT, r2T: lastPair ? 'R2 = ' + C.formatOhms(r.best.r2) : 'R2', voutT: isFinite(t) ? 'Vout ≈ ' + C.trimN(t, 4) + ' V' : 'Vout' });
    if (!lastPair) {
      RL.bump(q('#divPairOut'), '–');
      q('#divPairSub').textContent = ''; q('#divOptions').innerHTML = ''; q('#divExact').textContent = '';
      q('#divFormula').innerHTML = '<h3>Working</h3>' + F.row([F.fr(F.v('R', 1), F.v('R', 2)), F.fr(F.v('V', 'in'), F.v('V', 'out')) + ' − 1'], '', { answer: false });
      return { ok: false };
    }
    var b = r.best;
    var sign = function (e) { return (e > 0 ? '+' : e < 0 ? '−' : '±') + Math.abs(e).toFixed(2) + '%'; };
    RL.bump(q('#divPairOut'), C.formatOhms(b.r1) + ' / ' + C.formatOhms(b.r2));
    q('#divPairSub').innerHTML = 'R1 / R2 from ' + s.series + ', giving <b class="num">' + esc(RL.fmt(b.vout, 'V', 4)) + '</b> (' + sign(b.error) + ')';
    q('#divOptions').innerHTML = r.options.map(function (o, i) {
      return '<li><span class="num"><b>' + esc(C.formatOhms(o.r1)) + '</b> and <b>' + esc(C.formatOhms(o.r2)) + '</b></span><span class="num rl-err' + (Math.abs(o.error) < 0.5 ? ' good' : '') + '">' + esc(RL.fmt(o.vout, 'V', 4)) + ', ' + sign(o.error) + '</span>' +
        '<button type="button" class="zl-btn zl-btn-secondary zl-btn-sm" data-i="' + i + '" aria-label="Use ' + esc(C.formatOhms(o.r1)) + ' and ' + esc(C.formatOhms(o.r2)) + '">Use</button></li>';
    }).join('');
    var exact = fix.ok && fix.value > 0 ? fix.value * r.idealRatio : null;
    q('#divExact').innerHTML = exact ? 'With R2 = ' + esc(C.formatOhms(fix.value, 4)) + ', R1 needs to be exactly <b class="num">' + esc(C.formatOhms(exact, 4)) + '</b>. Nearest ' + s.series + ': ' + esc(C.formatOhms(C.nearestE(exact, s.series).value)) + '.' : '';
    var R1 = F.v('R', 1), R2 = F.v('R', 2);
    q('#divFormula').innerHTML = '<h3>Working</h3>' +
      F.row([F.fr(R1, R2), F.fr(F.v('V', 'in'), F.v('V', 'out')) + ' − 1', F.fr(F.n(C.trimN(vin, 4)), F.n(C.trimN(t, 4))) + ' − 1', F.n(C.trimN(r.idealRatio, 4))], 'R1 over R2 = ' + C.trimN(r.idealRatio, 4)) +
      F.row([F.v('V', 'out'), F.n(C.trimN(vin, 4) + ' V') + ' · ' + F.fr(F.n(C.formatOhms(b.r2)), F.n(C.formatOhms(b.r1)) + ' + ' + F.n(C.formatOhms(b.r2))), F.n(RL.fmt(b.vout, 'V', 4))], 'Vout = ' + RL.fmt(b.vout, 'V', 4)) +
      F.note('Every ' + s.series + ' value from 1 kΩ to 100 kΩ is tried as R2, with the closest standard R1 for each. The pair with the smallest error wins.');
    return { ok: true, title: C.formatOhms(b.r1) + ' / ' + C.formatOhms(b.r2), detail: C.trimN(vin, 4) + ' V to ' + C.trimN(t, 4) + ' V, ' + s.series + ', ' + sign(b.error),
      copy: 'Divider for ' + C.trimN(vin, 4) + ' V to ' + C.trimN(t, 4) + ' V: R1 = ' + C.formatOhms(b.r1) + ', R2 = ' + C.formatOhms(b.r2) + ' (' + s.series + '), Vout = ' + RL.fmt(b.vout, 'V', 4) + ' (' + sign(b.error) + ')' };
  }

  RL.tool({
    id: 'divider', label: 'Divider', title: 'Voltage divider',
    desc: 'Work out Vout from two resistors, or find the best standard pair for a target.',
    defaults: { mode: 'vout', vin: '12', r1: '10k', r2: '4k7', load: false, rl: '100k', target: '3.3', series: 'E24', fix: '10k' },
    headExtra: headExtra, html: html, bind: bind, sync: sync, render: render
  });
})();
