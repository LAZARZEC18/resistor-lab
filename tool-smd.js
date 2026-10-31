/* SMD resistor codes: 3-digit, 4-digit, R notation and EIA-96, drawn on a chip. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s;
  var EXAMPLES = ['472', '4702', '4R7', 'R47', '01C', '68X'];
  function q(sel) { return el.querySelector(sel); }

  function chipSvg(code, ok) {
    var t = esc(String(code || '').toUpperCase().slice(0, 5)) || '–';
    var fs = t.length >= 5 ? 44 : t.length === 4 ? 52 : 60;
    return '<svg viewBox="0 0 420 210" class="rl-chip" role="img" aria-label="Chip resistor marked ' + t + '">' +
      '<defs>' +
        '<linearGradient id="chTerm" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8E979F"/><stop offset=".35" stop-color="#F1F3F5"/><stop offset=".7" stop-color="#C5CBD1"/><stop offset="1" stop-color="#7D868F"/></linearGradient>' +
        '<linearGradient id="chTop" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#34373B"/><stop offset="1" stop-color="#1A1C1F"/></linearGradient>' +
        '<linearGradient id="chPad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7C27A"/><stop offset="1" stop-color="#B8893A"/></linearGradient>' +
        '<filter id="chBlur" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="8"/></filter>' +
      '</defs>' +
      '<rect x="18" y="62" width="118" height="110" rx="10" fill="url(#chPad)" class="rl-pad"/>' +
      '<rect x="284" y="62" width="118" height="110" rx="10" fill="url(#chPad)" class="rl-pad"/>' +
      '<ellipse cx="210" cy="168" rx="170" ry="12" class="rl-res-shadow" filter="url(#chBlur)"/>' +
      '<rect x="56" y="58" width="308" height="106" rx="8" fill="#0E0F11"/>' +
      '<rect x="56" y="50" width="308" height="100" rx="8" fill="url(#chTop)"/>' +
      '<rect x="56" y="50" width="60" height="114" rx="7" fill="url(#chTerm)"/>' +
      '<rect x="304" y="50" width="60" height="114" rx="7" fill="url(#chTerm)"/>' +
      '<rect x="116" y="50" width="188" height="2" fill="#fff" opacity=".12"/>' +
      '<text x="210" y="' + (100 + fs * 0.36) + '" text-anchor="middle" font-size="' + fs + '" class="rl-chip-text' + (ok ? '' : ' is-bad') + '">' + t + '</text>' +
      '<path d="M56 190h308" class="rl-dim"/><path d="M56 184v12M364 184v12" class="rl-dim"/>' +
      '<text x="210" y="206" text-anchor="middle" class="rl-dim-label">0805 chip, 2.0 × 1.25 mm</text>' +
      '</svg>';
  }

  function html() {
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          '<div class="rl-figure-hero" id="smdChip"></div>' +
          '<div class="zl-field"><label class="zl-label" for="smdIn">Code on the part</label>' +
            '<input class="zl-input rl-mono" id="smdIn" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="8" placeholder="472" aria-describedby="smdHint">' +
            '<span class="zl-hint" id="smdHint">3 or 4 digits, R for the decimal point, or EIA-96 like 01C.</span></div>' +
          '<div class="rl-examples" role="group" aria-label="Examples">' + EXAMPLES.map(function (c) { return '<button type="button" class="zl-chip rl-mono" data-code="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div class="rl-result-head"><span class="rl-label">Resistance</span>' + RL.copyBtn('smd') + '</div>' +
          '<output class="rl-big num" id="smdOut">–</output>' +
          '<div class="rl-badges"><span class="zl-badge" id="smdFormat"></span><span class="zl-badge rl-badge-muted" id="smdTol"></span></div>' +
          '<dl class="rl-facts" id="smdFacts"></dl>' +
          '<p class="rl-alt" id="smdAlt" hidden></p>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<div class="rl-formula" id="smdFormula" aria-live="polite"></div>' +
        '<div class="rl-formats"><h3>The four formats</h3><ul>' +
          '<li><b class="rl-mono">472</b><span>Two digits, then the number of zeros. 47 and 2 zeros is 4.7 kΩ. Usually ±5%.</span></li>' +
          '<li><b class="rl-mono">4702</b><span>Three digits, then the zeros. 470 and 2 zeros is 47 kΩ. Usually ±1%.</span></li>' +
          '<li><b class="rl-mono">4R7</b><span>R is the decimal point, for values under 10 Ω (or 100 Ω with 4 characters).</span></li>' +
          '<li><b class="rl-mono">01C</b><span>EIA-96: the number picks one of the 96 E96 values, the letter is the multiplier. ±1%.</span></li>' +
        '</ul></div>' +
      '</div>';
  }

  function bind(root, state) {
    el = root; s = state;
    q('#smdIn').addEventListener('input', function () { s.code = this.value; RL.changed('smd'); });
    q('.rl-examples').addEventListener('click', function (e) {
      var b = e.target.closest('[data-code]'); if (!b) return;
      s.code = b.getAttribute('data-code'); q('#smdIn').value = s.code; RL.changed('smd', { now: true });
    });
  }
  function sync(root, state) { el = root; s = state; q('#smdIn').value = s.code || ''; }

  function render(root, state) {
    el = root; s = state;
    var r = C.decodeSMD(s.code);
    var input = q('#smdIn');
    RL.$$('.rl-examples [data-code]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-code') === String(s.code || '').toUpperCase().trim())); });
    q('#smdChip').innerHTML = chipSvg(s.code, r.ok);
    if (!r.ok) {
      RL.setError(input, (s.code || '').trim() ? r.error : '');
      RL.bump(q('#smdOut'), '–');
      q('#smdFormat').hidden = true; q('#smdTol').hidden = true; q('#smdAlt').hidden = true;
      q('#smdFacts').innerHTML = '';
      q('#smdFormula').innerHTML = '<h3>Working</h3>' + F.note((s.code || '').trim() ? 'Fix the code to see the working.' : 'Type a code, or tap one of the examples.');
      return { ok: false };
    }
    RL.setError(input, '');
    var value = C.formatOhms(r.ohms);
    RL.bump(q('#smdOut'), value);
    q('#smdFormat').hidden = false; q('#smdFormat').textContent = r.label;
    q('#smdTol').hidden = r.tol == null; q('#smdTol').textContent = r.tol != null ? 'Typically ±' + r.tol + '%' : '';
    var facts = '';
    if (r.ohms > 0) {
      var eq = C.encodeSMD(r.ohms);
      var e24 = C.nearestE(r.ohms, 'E24'), e96 = C.nearestE(r.ohms, 'E96');
      facts += '<div><dt>Also marked as</dt><dd class="rl-mono">' + [eq.three, eq.four, eq.eia].filter(Boolean).filter(function (c, i, a) { return a.indexOf(c) === i && c !== String(s.code).toUpperCase().trim(); }).join(', ') + '</dd></div>';
      facts += '<div><dt>In E24</dt><dd>' + (e24.standard ? 'Yes, standard value' : 'No, nearest ' + C.formatOhms(e24.value)) + '</dd></div>';
      facts += '<div><dt>In E96</dt><dd>' + (e96.standard ? 'Yes, standard value' : 'No, nearest ' + C.formatOhms(e96.value)) + '</dd></div>';
      facts = facts.replace('<dd class="rl-mono"></dd>', '<dd>No other marking</dd>');
    } else {
      facts = '<div><dt>Use</dt><dd>A link that bridges two pads, rated for a set current rather than a resistance.</dd></div>';
    }
    q('#smdFacts').innerHTML = facts;
    q('#smdAlt').hidden = !r.alt; q('#smdAlt').textContent = r.alt || '';

    var f = '<h3>Working</h3>';
    if (r.format === '3-digit' || r.format === '4-digit') {
      var n = r.format === '3-digit' ? 2 : 3;
      var sym = []; for (var i = 1; i <= n; i++) sym.push(F.v('d', i));
      f += F.row([F.v('R'), '(' + sym.join('') + ') × 10<sup>' + F.v('d', n + 1) + '</sup>', F.n(Number(r.sig)) + ' × 10<sup>' + r.exp + '</sup> Ω', F.n(value)], 'R = ' + Number(r.sig) + ' times 10 to the ' + r.exp + ' = ' + value);
      f += F.note('The last digit is how many zeros follow the first ' + n + '.');
    } else if (r.format === 'EIA-96') {
      f += F.row([F.v('R'), 'E96[' + F.v('n') + '] × ' + F.v('k'), F.n(r.sig) + ' × 10<sup>' + r.exp + '</sup> Ω', F.n(value)], 'R = ' + r.sig + ' times 10 to the ' + r.exp + ' = ' + value);
      f += F.note('Code ' + esc(String(s.code).toUpperCase().trim().slice(0, 2)) + ' points to value number ' + Number(String(s.code).trim().slice(0, 2)) + ' of the 96 in the E96 series, which is ' + r.sig + '. The letter sets the multiplier ' + F.v('k') + ' = 10<sup>' + r.exp + '</sup>.');
    } else if (r.format === 'R') {
      f += F.row([F.n(String(s.code).toUpperCase().trim()), F.n(String(r.ohms).replace(/^0\./, '0.')) + ' Ω', F.n(value)], esc(s.code) + ' = ' + value);
      f += F.note('R takes the place of the decimal point, so there is nothing to multiply.');
    } else {
      f += F.note(r.working);
    }
    q('#smdFormula').innerHTML = f;
    var code = String(s.code).toUpperCase().trim();
    return { ok: true, title: value, detail: 'marked ' + code, copy: code + ' = ' + value + (r.tol != null ? ' (typically ±' + r.tol + '%)' : '') };
  }

  RL.tool({
    id: 'smd', label: 'SMD code', title: 'SMD code',
    desc: 'Decode the marking on a chip resistor. All four common formats work.',
    defaults: { code: '472' }, html: html, bind: bind, sync: sync, render: render
  });
})();
