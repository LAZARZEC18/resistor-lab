/* Resistor Lab core: colour code tables (IEC 60062), decoding, encoding,
   value parsing, E-series lookup and simple circuit maths.
   Pure functions only, so they can be tested without the page. */
(function (root) {
  'use strict';

  var COLORS = ['black', 'brown', 'red', 'orange', 'yellow', 'green', 'blue', 'violet', 'grey', 'white', 'gold', 'silver'];

  // digit, multiplier exponent, tolerance (%), temperature coefficient (ppm/K)
  var INFO = {
    black:  { name: 'Black',  hex: '#1d1d1f', digit: 0, mult: 0, tempco: 250 },
    brown:  { name: 'Brown',  hex: '#7a4824', digit: 1, mult: 1, tol: 1, tempco: 100 },
    red:    { name: 'Red',    hex: '#d22e2e', digit: 2, mult: 2, tol: 2, tempco: 50 },
    orange: { name: 'Orange', hex: '#f08519', digit: 3, mult: 3, tempco: 15 },
    yellow: { name: 'Yellow', hex: '#f4d11d', digit: 4, mult: 4, tempco: 25 },
    green:  { name: 'Green',  hex: '#2c9a4b', digit: 5, mult: 5, tol: 0.5, tempco: 20 },
    blue:   { name: 'Blue',   hex: '#2a63d5', digit: 6, mult: 6, tol: 0.25, tempco: 10 },
    violet: { name: 'Violet', hex: '#8a4fd2', digit: 7, mult: 7, tol: 0.1, tempco: 5 },
    grey:   { name: 'Grey',   hex: '#8d8f92', digit: 8, mult: 8, tol: 0.05, tempco: 1 },
    white:  { name: 'White',  hex: '#f5f4ef', digit: 9, mult: 9 },
    gold:   { name: 'Gold',   hex: '#c9a23b', mult: -1, tol: 5 },
    silver: { name: 'Silver', hex: '#bcc1c6', mult: -2, tol: 10 }
  };

  var LAYOUT = {
    4: ['digit', 'digit', 'mult', 'tol'],
    5: ['digit', 'digit', 'digit', 'mult', 'tol'],
    6: ['digit', 'digit', 'digit', 'mult', 'tol', 'tempco']
  };

  var SERIES = {
    E12: [10, 12, 15, 18, 22, 27, 33, 39, 47, 56, 68, 82],
    E24: [10, 11, 12, 13, 15, 16, 18, 20, 22, 24, 27, 30, 33, 36, 39, 43, 47, 51, 56, 62, 68, 75, 82, 91],
    E96: [100, 102, 105, 107, 110, 113, 115, 118, 121, 124, 127, 130, 133, 137, 140, 143, 147, 150, 154, 158,
      162, 165, 169, 174, 178, 182, 187, 191, 196, 200, 205, 210, 215, 221, 226, 232, 237, 243, 249, 255,
      261, 267, 274, 280, 287, 294, 301, 309, 316, 324, 332, 340, 348, 357, 365, 374, 383, 392, 402, 412,
      422, 432, 442, 453, 464, 475, 487, 499, 511, 523, 536, 549, 562, 576, 590, 604, 619, 634, 649, 665,
      681, 698, 715, 732, 750, 768, 787, 806, 825, 845, 866, 887, 909, 931, 953, 976]
  };

  function validFor(color, role) {
    var i = INFO[color];
    if (!i) return false;
    if (role === 'digit') return typeof i.digit === 'number';
    if (role === 'mult') return typeof i.mult === 'number';
    if (role === 'tol') return typeof i.tol === 'number';
    if (role === 'tempco') return typeof i.tempco === 'number';
    return false;
  }

  function optionsFor(role) {
    return COLORS.filter(function (c) { return validFor(c, role); });
  }

  function trim(x, sig) {
    return String(parseFloat(Number(x).toPrecision(sig || 6)));
  }

  function formatOhms(v, sig) {
    if (!isFinite(v)) return '∞ Ω';
    if (v === 0) return '0 Ω';
    var units = [[1e9, 'GΩ'], [1e6, 'MΩ'], [1e3, 'kΩ']];
    for (var k = 0; k < units.length; k++) {
      if (Math.abs(v) >= units[k][0] * 0.9999999) return trim(v / units[k][0], sig) + ' ' + units[k][1];
    }
    return trim(v, sig) + ' Ω';
  }

  function formatMultiplier(m) {
    var labels = { '-2': '0.01', '-1': '0.1', 0: '1', 1: '10', 2: '100', 3: '1k', 4: '10k', 5: '100k', 6: '1M', 7: '10M', 8: '100M', 9: '1G' };
    return '×' + labels[m];
  }

  function formatPercent(p) {
    return '±' + trim(p) + '%';
  }

  function bandValueText(color, role) {
    var i = INFO[color];
    if (!i) return '';
    if (role === 'digit') return String(i.digit);
    if (role === 'mult') return formatMultiplier(i.mult);
    if (role === 'tol') return formatPercent(i.tol);
    if (role === 'tempco') return i.tempco + ' ppm/K';
    return '';
  }

  function roleLabel(role, digitIndex) {
    if (role === 'digit') return ['1st', '2nd', '3rd'][digitIndex] + ' digit';
    if (role === 'mult') return 'Multiplier';
    if (role === 'tol') return 'Tolerance';
    return 'Tempco';
  }

  /* bands: array of colour keys, length 4, 5 or 6 */
  function decode(bands) {
    var layout = LAYOUT[bands.length];
    if (!layout) return { ok: false, error: 'Use 4, 5 or 6 bands.' };
    var digits = '', mult = 0, tol = null, tempco = null;
    for (var k = 0; k < layout.length; k++) {
      var role = layout[k], c = bands[k];
      if (!validFor(c, role)) {
        return { ok: false, error: (INFO[c] ? INFO[c].name : 'That colour') + ' cannot be used as the ' + roleLabel(role, k).toLowerCase() + ' band.' };
      }
      if (role === 'digit') digits += INFO[c].digit;
      else if (role === 'mult') mult = INFO[c].mult;
      else if (role === 'tol') tol = INFO[c].tol;
      else tempco = INFO[c].tempco;
    }
    // Build through a string so 47 x 10^-1 is exactly 4.7, not 4.700000000000001
    var ohms = Number(String(parseInt(digits, 10)) + 'e' + mult);
    var spread = ohms * tol / 100;
    return {
      ok: true,
      ohms: ohms,
      tol: tol,
      tempco: tempco,
      min: Number((ohms - spread).toPrecision(12)),
      max: Number((ohms + spread).toPrecision(12)),
      digits: digits,
      mult: mult
    };
  }

  var EXP = { r: 0, k: 3, m: 6, g: 9 };

  function fail(msg) { return { ok: false, error: msg }; }

  /* Accepts 4k7, 4.7k, 4.7 kΩ, 220, 220R, 1M, 2M2, 0R47, 1e3, 10 ohm */
  function parseValue(input) {
    var raw = String(input == null ? '' : input).trim();
    if (!raw) return fail('Type a value, for example 4k7, 220 or 1M.');
    var s = raw.replace(/\s+/g, '').replace(/(ohms?|Ω|Ω)$/i, '');
    if (/^-/.test(s)) return fail('Resistance cannot be negative. Remove the minus sign.');
    s = s.replace(/meg/i, 'M').replace(/^([rkmg])(\d)/i, '0$1$2');
    if (/m/.test(s)) return fail('Lowercase m means milli. Use a capital M for megaohms, like 1M or 2M2.');
    var m;
    if ((m = /^(\d+)([rkmg])(\d*)$/i.exec(s))) {
      return { ok: true, value: Number(m[1] + '.' + (m[3] || '0') + 'e' + EXP[m[2].toLowerCase()]) };
    }
    if ((m = /^(\d+\.?\d*|\.\d+)([rkmg])?$/i.exec(s))) {
      return { ok: true, value: Number(m[1] + 'e' + (m[2] ? EXP[m[2].toLowerCase()] : 0)) };
    }
    if (/^(\d+\.?\d*|\.\d+)e[+-]?\d+$/i.test(s)) {
      return { ok: true, value: Number(s) };
    }
    return fail('Could not read "' + raw + '". Use a number with an optional R, k, M or G, like 4k7, 4.7k, 220 or 0R47.');
  }

  /* value -> significant digits + multiplier exponent for 2 (4-band) or 3 (5/6-band) digits */
  function encode(value, nDigits) {
    if (!isFinite(value) || value < 0) return fail('Enter a resistance of 0 Ω or more.');
    var limit = Math.pow(10, nDigits);
    var bandName = nDigits === 2 ? '4-band' : '5-band';
    if (value === 0) return { ok: true, digits: new Array(nDigits).fill(0), mult: 0 };
    for (var e = -2; e <= 9; e++) {
      var n = e >= 0 ? value / Math.pow(10, e) : value * Math.pow(10, -e);
      if (n < limit - 1e-9) {
        var r = Math.round(n);
        if (Math.abs(n - r) > 1e-6 * Math.max(1, n)) {
          if (e === -2 && n < 1) return fail('Too small: colour bands only go down to 0.01 Ω.');
          var rounded = Number(value.toPrecision(nDigits));
          var msg = formatOhms(value, 8) + ' needs more than ' + nDigits + ' significant digits. ';
          msg += nDigits === 2 ? 'Switch to 5-band, or use ' + formatOhms(rounded) + '.' : 'Try ' + formatOhms(rounded) + ' instead.';
          return fail(msg);
        }
        if (r >= limit) continue;
        if (r === 0) return fail('Too small: colour bands only go down to 0.01 Ω.');
        var digits = String(r);
        while (digits.length < nDigits) digits = '0' + digits;
        return { ok: true, digits: digits.split('').map(Number), mult: e };
      }
    }
    return fail('Too large: the biggest ' + bandName + ' value is ' + formatOhms((limit - 1) * 1e9) + '.');
  }

  var DIGIT_COLOR = COLORS.slice(0, 10);
  var MULT_COLOR = { '-2': 'silver', '-1': 'gold' };
  for (var d = 0; d <= 9; d++) MULT_COLOR[d] = COLORS[d];

  /* returns colour keys for digit + multiplier bands */
  function encodeColors(value, nDigits) {
    var enc = encode(value, nDigits);
    if (!enc.ok) return enc;
    var colors = enc.digits.map(function (x) { return DIGIT_COLOR[x]; });
    colors.push(MULT_COLOR[enc.mult]);
    return { ok: true, colors: colors };
  }

  function nearestE(value, name) {
    if (!(value > 0) || !isFinite(value)) return null;
    var base = SERIES[name];
    var shift = name === 'E96' ? 2 : 1;
    var dec = Math.floor(Math.log10(value));
    var best = null, bestDist = Infinity;
    for (var dd = dec - 1; dd <= dec + 1; dd++) {
      for (var k = 0; k < base.length; k++) {
        var c = Number(base[k] + 'e' + (dd - shift));
        var dist = Math.abs(Math.log(c / value));
        if (dist < bestDist) { bestDist = dist; best = c; }
      }
    }
    var off = (value - best) / best * 100;
    return { series: name, value: best, standard: Math.abs(value - best) / value < 1e-9, offPercent: off };
  }

  function seriesR(list) {
    return list.reduce(function (a, b) { return a + b; }, 0);
  }

  function parallelR(list) {
    if (!list.length) return NaN;
    if (list.some(function (r) { return r === 0; })) return 0;
    return 1 / list.reduce(function (a, r) { return a + 1 / r; }, 0);
  }

  function divider(vin, r1, r2) {
    var total = r1 + r2;
    if (!(total > 0)) return null;
    return { vout: vin * r2 / total, current: vin / total, ratio: r2 / total };
  }

  function formatSI(v, unit, sig) {
    if (!isFinite(v)) return '–';
    if (v === 0) return '0 ' + unit;
    var a = Math.abs(v);
    var steps = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n']];
    for (var k = 0; k < steps.length; k++) {
      if (a >= steps[k][0] * 0.9999999) return trim(v / steps[k][0], sig || 4) + ' ' + steps[k][1] + unit;
    }
    return trim(v / 1e-12, sig || 4) + ' p' + unit;
  }

  var api = {
    COLORS: COLORS, INFO: INFO, LAYOUT: LAYOUT, SERIES: SERIES,
    validFor: validFor, optionsFor: optionsFor, decode: decode, parseValue: parseValue,
    encode: encode, encodeColors: encodeColors, nearestE: nearestE,
    seriesR: seriesR, parallelR: parallelR, divider: divider,
    formatOhms: formatOhms, formatSI: formatSI, formatMultiplier: formatMultiplier, formatPercent: formatPercent,
    bandValueText: bandValueText, roleLabel: roleLabel
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ResistorCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
