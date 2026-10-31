/* Capacitor codes: 104 -> 100 nF with pF/nF/µF and tolerance letters, and back again. */
(function () {
  'use strict';
  var C = window.ResistorCore, F = RL.F, esc = RL.esc;
  var el, s;
  var EXAMPLES = ['104', '472J', '103K', '223', '101', '1R5'];
  function q(sel) { return el.querySelector(sel); }

  function headExtra() {
    return '<div class="zl-seg" id="capMode" role="group" aria-label="Direction"><button type="button" data-v="decode">Code to value</button><button type="button" data-v="encode">Value to code</button></div>';
  }
  function discSvg(code, ok) {
    var t = esc(String(code || '').toUpperCase().slice(0, 5)) || '–';
    var fs = t.length > 4 ? 30 : 38;
    return '<svg viewBox="0 0 260 230" class="rl-disc" role="img" aria-label="Ceramic disc capacitor marked ' + t + '">' +
      '<defs><radialGradient id="cpBody" cx=".38" cy=".32" r=".8"><stop offset="0" stop-color="#F2A863"/><stop offset=".65" stop-color="#C96A26"/><stop offset="1" stop-color="#9A4A14"/></radialGradient>' +
      '<linearGradient id="cpLead" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7C8590"/><stop offset=".5" stop-color="#EEF1F4"/><stop offset="1" stop-color="#7C8590"/></linearGradient>' +
      '<filter id="cpBlur" x="-30%" y="-100%" width="160%" height="300%"><feGaussianBlur stdDeviation="6"/></filter></defs>' +
      '<ellipse cx="130" cy="214" rx="70" ry="7" class="rl-res-shadow" filter="url(#cpBlur)"/>' +
      '<rect x="102" y="128" width="6" height="86" rx="3" fill="url(#cpLead)"/><rect x="152" y="128" width="6" height="86" rx="3" fill="url(#cpLead)"/>' +
      '<ellipse cx="130" cy="88" rx="84" ry="78" fill="url(#cpBody)"/>' +
      '<ellipse cx="104" cy="50" rx="30" ry="16" fill="#fff" opacity=".18" transform="rotate(-24 104 50)"/>' +
      '<text x="130" y="' + (96 + fs * 0.1) + '" text-anchor="middle" font-size="' + fs + '" class="rl-cap-text' + (ok ? '' : ' is-bad') + '">' + t + '</text>' +
      '</svg>';
  }

  function html() {
    var tolOpts = '<option value="">No letter</option>' + Object.keys(C.CAP_TOL).map(function (k) { return '<option value="' + k + '">' + k + ', ' + C.CAP_TOL[k] + '</option>'; }).join('');
    return '' +
      '<div class="rl-main rl-two">' +
        '<div class="rl-inputs">' +
          '<div class="rl-figure-hero rl-disc-wrap" id="capDisc"></div>' +
          '<div data-mode="decode" class="rl-stack">' +
            '<div class="zl-field"><label class="zl-label" for="capIn">Code on the capacitor</label><input class="zl-input rl-mono" id="capIn" type="text" autocomplete="off" spellcheck="false" autocapitalize="characters" maxlength="8" placeholder="104" aria-describedby="capHint"><span class="zl-hint" id="capHint">Three digits in pF, then an optional tolerance letter.</span></div>' +
            '<div class="rl-examples" role="group" aria-label="Examples">' + EXAMPLES.map(function (c) { return '<button type="button" class="zl-chip rl-mono" data-code="' + c + '">' + c + '</button>'; }).join('') + '</div>' +
          '</div>' +
          '<div data-mode="encode" class="rl-stack">' +
            '<div class="rl-row2">' +
              '<div class="zl-field"><label class="zl-label" for="capValIn">Capacitance</label><input class="zl-input num" id="capValIn" type="text" autocomplete="off" spellcheck="false" autocapitalize="off" placeholder="100n, 4n7, 0.1u" aria-describedby="capValHint"><span class="zl-hint" id="capValHint">Use p, n or u, like 4n7 or 0.1u.</span></div>' +
              '<div class="zl-field"><label class="zl-label" for="capTolSel">Tolerance</label><select class="zl-select" id="capTolSel">' + tolOpts + '</select></div>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="rl-result" aria-live="polite">' +
          '<div data-mode="decode">' +
            '<div class="rl-result-head"><span class="rl-label">Capacitance</span>' + RL.copyBtn('capacitor') + '</div>' +
            '<output class="rl-big num" id="capOut">–</output>' +
            '<div class="rl-badges"><span class="zl-badge" id="capTol" hidden></span></div>' +
            '<ul class="rl-units" id="capUnits" aria-label="In other units"></ul>' +
          '</div>' +
          '<div data-mode="encode">' +
            '<div class="rl-result-head"><span class="rl-label">Code to look for</span>' + RL.copyBtn('capacitor') + '</div>' +
            '<output class="rl-big rl-mono" id="capCodeOut">–</output>' +
            '<p class="rl-sub" id="capCodeSub"></p>' +
            '<ul class="rl-units" id="capUnits2" aria-label="The value in other units"></ul>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<div class="rl-working rl-working-split">' +
        '<div class="rl-formula" id="capFormula" aria-live="polite"></div>' +
        '<div class="rl-formats"><h3>Tolerance letters</h3><ul class="rl-tol-grid">' +
          Object.keys(C.CAP_TOL).map(function (k) { return '<li><b class="rl-mono">' + k + '</b><span>' + C.CAP_TOL[k] + '</span></li>'; }).join('') +
        '</ul><p class="zl-hint">B, C and D are used on small values, under 10 pF.</p></div>' +
      '</div>';
  }

  function bind(root, state) {
    el = root; s = state;
    RL.seg(q('#capMode'), function (v) { s.mode = v; RL.changed('capacitor'); });
    q('#capIn').addEventListener('input', function () { s.code = this.value; RL.changed('capacitor'); });
    q('#capValIn').addEventListener('input', function () { s.value = this.value; RL.changed('capacitor'); });
    q('#capTolSel').addEventListener('change', function () { s.tol = this.value; RL.changed('capacitor'); });
    q('.rl-examples').addEventListener('click', function (e) {
      var b = e.target.closest('[data-code]'); if (!b) return;
      s.code = b.getAttribute('data-code'); q('#capIn').value = s.code; RL.changed('capacitor', { now: true });
    });
  }
  function sync(root, state) {
    el = root; s = state;
    q('#capIn').value = s.code || ''; q('#capValIn').value = s.value || ''; q('#capTolSel').value = s.tol || '';
  }
  function units(pf, cur) {
    var all = C.formatCap(pf).all;
    return Object.keys(all).map(function (k) { return '<li' + (all[k] === cur ? ' class="is-main"' : '') + '><span>' + k + '</span><b class="num">' + esc(all[k]) + '</b></li>'; }).join('');
  }

  function render(root, state) {
    el = root; s = state;
    RL.setSeg(q('#capMode'), s.mode);
    RL.$$('[data-mode]', el).forEach(function (n) { n.hidden = n.getAttribute('data-mode') !== s.mode; });
    var Cs = F.v('C');
    if (s.mode === 'decode') {
      var r = C.decodeCap(s.code);
      RL.$$('.rl-examples [data-code]', el).forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-code') === String(s.code || '').toUpperCase().trim())); });
      q('#capDisc').innerHTML = discSvg(s.code, r.ok);
      if (!r.ok) {
        RL.setError(q('#capIn'), String(s.code || '').trim() ? r.error : '');
        RL.bump(q('#capOut'), '–'); q('#capTol').hidden = true; q('#capUnits').innerHTML = '';
        q('#capFormula').innerHTML = '<h3>Working</h3>' + F.row([Cs, '(' + F.v('d', 1) + F.v('d', 2) + ') × 10<sup>' + F.v('d', 3) + '</sup> pF'], '', { answer: false }) + F.note('Type a code, or tap one of the examples.');
        return { ok: false };
      }
      RL.setError(q('#capIn'), '');
      var main = C.formatCap(r.pf).primary;
      RL.bump(q('#capOut'), main);
      q('#capTol').hidden = !r.tol; q('#capTol').textContent = r.tol ? r.tol.letter + ' = ' + r.tol.text : '';
      q('#capUnits').innerHTML = units(r.pf, main);
      var code = String(s.code).toUpperCase().trim(), m = /^(\d{2})(\d)/.exec(code);
      var f = '<h3>Working</h3>';
      if (m) {
        var d = +m[2], e = d === 8 ? -2 : d === 9 ? -1 : d;
        f += F.row([Cs, '(' + F.v('d', 1) + F.v('d', 2) + ') × 10<sup>' + F.v('d', 3) + '</sup> pF', F.n(String(+m[1])) + ' × 10<sup>' + e + '</sup> pF', F.n(main)], 'C = ' + (+m[1]) + ' times 10 to the ' + e + ' pF = ' + main);
        f += F.note(d >= 8 ? 'A third digit of ' + d + ' means ×' + (d === 8 ? '0.01' : '0.1') + ', for values under 10 pF.' : 'The first two digits are the value and the third is how many zeros follow, in picofarads.');
      } else f += F.note(esc(r.working) + '.');
      if (r.tol) f += F.row([F.v('C') + '<sub>min</sub> … ' + F.v('C') + '<sub>max</sub>', tolRange(r.pf, r.tol.letter)], '', { cls: 'f-soft' });
      q('#capFormula').innerHTML = f;
      return { ok: true, title: main + (r.tol ? ' ' + r.tol.text : ''), detail: 'marked ' + code, copy: code + ' = ' + main + ' (' + C.formatCap(r.pf).all.pF + ')' + (r.tol ? ', ' + r.tol.text : '') };
    }
    // encode
    var p = C.parseCap(s.value);
    var enc = p.ok ? C.encodeCap(p.pf, s.tol) : p;
    RL.setError(q('#capValIn'), enc.ok || !String(s.value || '').trim() ? '' : enc.error);
    q('#capDisc').innerHTML = discSvg(enc.ok ? enc.code : '', enc.ok);
    if (!enc.ok) {
      RL.bump(q('#capCodeOut'), '–'); q('#capCodeSub').textContent = ''; q('#capUnits2').innerHTML = '';
      q('#capFormula').innerHTML = '<h3>Working</h3>' + F.note(String(s.value || '').trim() ? 'Fix the value to see its code.' : 'Type a value like 100n or 4n7.');
      return { ok: false };
    }
    var mainV = C.formatCap(p.pf).primary;
    RL.bump(q('#capCodeOut'), enc.code);
    q('#capCodeSub').textContent = mainV + (s.tol ? ', ' + C.CAP_TOL[s.tol] : '') + (p.pf < 100 && p.pf >= 10 ? '. Small values are often printed as just the number, like ' + C.trimN(p.pf) + '.' : '');
    q('#capUnits2').innerHTML = units(p.pf, mainV);
    q('#capFormula').innerHTML = '<h3>Working</h3>' + F.row([F.n(C.formatCap(p.pf).all.pF), F.n(enc.working), F.n(enc.code)], C.formatCap(p.pf).all.pF + ' = ' + enc.code) +
      F.note('Write the value in picofarads, keep the first two digits, then count the zeros.' + (s.tol ? ' The letter ' + s.tol + ' adds the tolerance.' : ''));
    return { ok: true, title: enc.code, detail: mainV + (s.tol ? ' ' + C.CAP_TOL[s.tol] : ''), copy: mainV + ' = code ' + enc.code };
  }

  function tolRange(pf, letter) {
    var t = C.CAP_TOL[letter], m;
    if ((m = /±([\d.]+)%/.exec(t))) return F.n(C.formatCap(pf * (1 - m[1] / 100)).primary + ' … ' + C.formatCap(pf * (1 + m[1] / 100)).primary);
    if ((m = /±([\d.]+) pF/.exec(t))) return F.n(C.formatCap(pf - +m[1]).primary + ' … ' + C.formatCap(pf + +m[1]).primary);
    return F.n(C.formatCap(pf * 0.8).primary + ' … ' + C.formatCap(pf * 1.8).primary);
  }

  RL.tool({
    id: 'capacitor', label: 'Capacitor', title: 'Capacitor code',
    desc: 'Decode ceramic capacitor codes, or find the code for a value.',
    defaults: { mode: 'decode', code: '104', value: '4n7', tol: 'J' }, headExtra: headExtra, html: html, bind: bind, sync: sync, render: render
  });
})();
