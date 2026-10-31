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

/* ---------------------------------------------------------------------------
   v2 additions: SMD codes, Ohm's law, LED resistor, loaded divider, divider
   pair search, capacitor codes and unit helpers. Still pure functions.
   --------------------------------------------------------------------------- */
(function (root) {
  'use strict';
  var C = root.ResistorCore;

  function fail(msg, extra) { var o = { ok: false, error: msg }; for (var k in extra) o[k] = extra[k]; return o; }
  function clean(x, sig) { return Number(Number(x).toPrecision(sig || 12)); }
  var SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  function pow10Text(e) { return '10' + String(e).split('').map(function (c) { return SUP[c]; }).join(''); }

  /* All values of a series between lo and hi (inclusive), ascending */
  function eValues(name, lo, hi) {
    var base = C.SERIES[name], shift = name === 'E96' ? 2 : 1, out = [];
    for (var d = Math.floor(Math.log10(lo)) - 1; d <= Math.floor(Math.log10(hi)) + 1; d++) {
      for (var k = 0; k < base.length; k++) {
        var v = Number(base[k] + 'e' + (d - shift));
        if (v >= lo * (1 - 1e-9) && v <= hi * (1 + 1e-9)) out.push(v);
      }
    }
    return out;
  }

  /* Smallest standard value at or above value */
  function nextE(value, name) {
    if (!(value > 0) || !isFinite(value)) return null;
    var list = eValues(name, value / 10, value * 10);
    for (var i = 0; i < list.length; i++) if (list[i] >= value * (1 - 1e-9)) return list[i];
    return null;
  }

  /* ---------- SMD resistor codes ---------- */
  var EIA_MULT = { Z: -3, Y: -2, R: -2, X: -1, S: -1, A: 0, B: 1, H: 1, C: 2, D: 3, E: 4, F: 5 };
  var SMD_HELP = 'SMD codes are 3 digits (472), 4 digits (4702), R notation (4R7, R47) or EIA-96, two digits and a letter (01C).';

  function decodeSMD(input) {
    var raw = String(input == null ? '' : input).trim();
    var s = raw.toUpperCase().replace(/\s+/g, '');
    if (!s) return fail('Type the code printed on the part. ' + SMD_HELP);
    var m;
    if (/^0{1,4}$/.test(s)) return { ok: true, ohms: 0, format: 'jumper', label: 'Zero-ohm link', tol: null, working: s + ' marks a zero-ohm jumper link.' };
    if ((m = /^(\d{2})(\d)$/.exec(s))) {
      var e3 = Number(m[2]);
      if (e3 > 7) return fail('A third digit of ' + e3 + ' would mean ×' + pow10Text(e3) + ', which is not used on resistors. Check the code, or try 4 digits.');
      return { ok: true, ohms: Number(Number(m[1]) + 'e' + e3), format: '3-digit', label: '3-digit code', tol: 5,
        sig: m[1], exp: e3, working: Number(m[1]) + ' × ' + pow10Text(e3) + ' Ω' };
    }
    if ((m = /^(\d{3})(\d)$/.exec(s))) {
      var e4 = Number(m[2]);
      if (e4 > 7) return fail('A last digit of ' + e4 + ' would mean ×' + pow10Text(e4) + ', which is not used on resistors. Check the code.');
      return { ok: true, ohms: Number(Number(m[1]) + 'e' + e4), format: '4-digit', label: '4-digit code', tol: 1,
        sig: m[1], exp: e4, working: Number(m[1]) + ' × ' + pow10Text(e4) + ' Ω' };
    }
    if ((m = /^(\d*)R(\d*)$/.exec(s)) && (m[1] + m[2]).length >= 1 && (m[1] + m[2]).length <= 4) {
      var v = Number((m[1] || '0') + '.' + (m[2] || '0'));
      var res = { ok: true, ohms: v, format: 'R', label: 'R notation', tol: (m[1] + m[2]).length >= 3 ? 1 : 5,
        working: 'R marks the decimal point: ' + s + ' = ' + String(v) + ' Ω' };
      if (/^\d{2}R$/.test(s)) {
        var alt = decodeEIA(m[1], 'R');
        if (alt.ok) res.alt = 'Read as EIA-96 it would be ' + C.formatOhms(alt.ohms) + '. R notation is far more common.';
      }
      return res;
    }
    if ((m = /^(\d{2})([A-Z])$/.exec(s))) {
      if (!(m[2] in EIA_MULT)) return fail(m[2] + ' is not an EIA-96 multiplier letter. Use Z, Y/R, X/S, A, B/H, C, D, E or F, like 01C.');
      return decodeEIA(m[1], m[2]);
    }
    if (/^\d{1,2}$/.test(s)) return fail('"' + raw + '" is too short. ' + SMD_HELP);
    if (/^\d{5,}$/.test(s)) return fail('"' + raw + '" is too long. ' + SMD_HELP);
    if (/R.*R/.test(s)) return fail('Use only one R. It stands in for the decimal point, like 4R7 for 4.7 Ω.');
    return fail('Could not read "' + raw + '". ' + SMD_HELP);
  }

  function decodeEIA(dd, letter) {
    var n = Number(dd);
    if (n < 1 || n > 96) return fail('EIA-96 codes run from 01 to 96, then a letter. ' + dd + ' is out of range.');
    var base = C.SERIES.E96[n - 1], e = EIA_MULT[letter];
    var ohms = Number(base + 'e' + e);
    return { ok: true, ohms: ohms, format: 'EIA-96', label: 'EIA-96 code', tol: 1, sig: String(base), exp: e,
      working: dd + ' is E96 value ' + base + ', ' + letter + ' means ×' + pow10Text(e) + ': ' + base + ' × ' + pow10Text(e) + ' Ω' };
  }

  function rNotation(v) { return String(clean(v, 6)).replace(/^0\./, 'R').replace('.', 'R').replace(/^(\d+)$/, '$1R0'); }

  /* Equivalent markings for a value in every format */
  function encodeSMD(value) {
    var out = { three: null, four: null, eia: null };
    if (!(value > 0)) return out;
    var e2 = C.encode(value, 2);
    if (e2.ok) out.three = e2.mult >= 0 && e2.mult <= 7 ? e2.digits.join('') + e2.mult : (value < 10 ? rNotation(value) : null);
    var e3 = C.encode(value, 3);
    if (e3.ok) out.four = e3.mult >= 0 && e3.mult <= 7 ? e3.digits.join('') + e3.mult : (value < 100 ? rNotation(value) : null);
    if (e3.ok) {
      var mant = Number(e3.digits.join(''));
      var idx = C.SERIES.E96.indexOf(mant);
      if (idx >= 0) {
        var exp = e3.mult;
        // E96 mantissa is 100..976, so value = mant × 10^exp
        var letter = { '-3': 'Z', '-2': 'Y', '-1': 'X', 0: 'A', 1: 'B', 2: 'C', 3: 'D', 4: 'E', 5: 'F' }[exp];
        if (letter) out.eia = (idx + 1 < 10 ? '0' : '') + (idx + 1) + letter;
      }
    }
    return out;
  }

  /* ---------- Ohm's law ---------- */
  var OHM_PAIRS = {
    VI: { R: 'V/I', P: 'VI' }, VR: { I: 'V/R', P: 'V2/R' }, VP: { I: 'P/V', R: 'V2/P' },
    IR: { V: 'IR', P: 'I2R' }, IP: { V: 'P/I', R: 'P/I2' }, RP: { V: 'sqrt(PR)', I: 'sqrt(P/R)' }
  };
  var NAMES = { V: 'Voltage', I: 'Current', R: 'Resistance', P: 'Power' };
  function ohmsLaw(given) {
    var keys = ['V', 'I', 'R', 'P'].filter(function (k) { return given[k] != null; });
    if (keys.length !== 2) return fail('Enter exactly two of voltage, current, resistance and power.');
    for (var i = 0; i < 2; i++) {
      var x = given[keys[i]];
      if (!isFinite(x) || x <= 0) return fail(NAMES[keys[i]] + ' must be a number above zero.', { field: keys[i] });
    }
    var V = given.V, I = given.I, R = given.R, P = given.P, pair = keys.join('');
    switch (pair) {
      case 'VI': R = V / I; P = V * I; break;
      case 'VR': I = V / R; P = V * V / R; break;
      case 'VP': I = P / V; R = V * V / P; break;
      case 'IR': V = I * R; P = I * I * R; break;
      case 'IP': V = P / I; R = P / (I * I); break;
      case 'RP': V = Math.sqrt(P * R); I = Math.sqrt(P / R); break;
    }
    return { ok: true, V: clean(V), I: clean(I), R: clean(R), P: clean(P), pair: pair, formulas: OHM_PAIRS[pair] };
  }

  /* ---------- LED series resistor ---------- */
  var RATINGS = [[0.125, '1/8 W'], [0.25, '1/4 W'], [0.5, '1/2 W'], [1, '1 W'], [2, '2 W'], [5, '5 W']];
  function ratingFor(power) {
    var need = power * 2;
    for (var i = 0; i < RATINGS.length; i++) if (RATINGS[i][0] >= need * (1 - 1e-9)) return { watts: RATINGS[i][0], label: RATINGS[i][1], need: need };
    return { watts: null, label: 'Over 5 W', need: need };
  }
  function ledResistor(o) {
    var vs = o.vs, vf = o.vf, ma = o.ma, n = o.n;
    if (!(vs > 0)) return fail('Enter the supply voltage, like 5 or 12.', { field: 'vs' });
    if (!(vf > 0)) return fail('Enter the LED forward voltage, like 2.0.', { field: 'vf' });
    if (!(ma > 0)) return fail('Enter the LED current in mA. 20 mA suits most 5 mm LEDs; 2 to 10 mA is plenty for indicators.', { field: 'ma' });
    if (!(n >= 1) || Math.floor(n) !== n) return fail('Use a whole number of LEDs, 1 or more.', { field: 'n' });
    var drop = clean(vs - n * vf);
    if (drop <= 0) return fail('The supply is too low. ' + n + ' LED' + (n > 1 ? 's' : '') + ' at ' + vf + ' V need more than ' + clean(n * vf, 6) + ' V, before the resistor has anything left to drop.', { tooLow: true, need: clean(n * vf, 6), field: 'vs' });
    var I = ma / 1000, exact = clean(drop / I);
    function opt(series) {
      var r = nextE(exact, series), cur = drop / r, p = drop * cur;
      return { series: series, ohms: r, current: clean(cur), power: clean(p), rating: ratingFor(p) };
    }
    return { ok: true, drop: drop, exact: exact, current: I, power: clean(drop * I), e12: opt('E12'), e24: opt('E24'), lowHeadroom: drop < 0.5 };
  }

  /* ---------- Divider with load, and E-series pair search ---------- */
  function loadedDivider(vin, r1, r2, rl) {
    var base = C.divider(vin, r1, r2);
    if (!base) return null;
    var out = { vout: base.vout, current: base.current, ratio: base.ratio, p1: Math.pow(base.current, 2) * r1, p2: Math.pow(base.current, 2) * r2 };
    if (rl > 0) {
      var r2l = C.parallelR([r2, rl]);
      var vl = vin * r2l / (r1 + r2l);
      out.loaded = { r2eff: r2l, vout: vl, drop: (base.vout - vl) / base.vout * 100, load: vl / rl, current: vin / (r1 + r2l) };
    }
    return out;
  }

  function bestDividerPair(vin, vout, series, count) {
    if (!(vin > 0)) return fail('Enter Vin above 0 V.', { field: 'vin' });
    if (!(vout > 0) || !(vout < vin)) return fail('Target Vout must be above 0 V and below Vin (' + vin + ' V).', { field: 'vout' });
    var k = vout / vin, r2s = eValues(series, 1000, 99999), all = [];
    r2s.forEach(function (r2) {
      var ideal = r2 * (1 / k - 1);
      var r1 = C.nearestE(ideal, series).value;
      [r1, nextE(ideal, series)].forEach(function (a) {
        var v = vin * r2 / (a + r2);
        all.push({ r1: a, r2: r2, vout: clean(v), error: clean((v - vout) / vout * 100, 6) });
      });
    });
    all.sort(function (a, b) {
      var d = Math.abs(a.error) - Math.abs(b.error);
      if (Math.abs(d) > 1e-9) return d;
      return Math.abs(Math.log(a.r2 / 1e4)) - Math.abs(Math.log(b.r2 / 1e4));
    });
    var seen = {}, top = [];
    for (var i = 0; i < all.length && top.length < (count || 3); i++) {
      var key = (all[i].r1 / all[i].r2).toPrecision(8);
      if (!seen[key]) { seen[key] = 1; top.push(all[i]); }
    }
    return { ok: true, best: top[0], options: top, idealRatio: clean(1 / k - 1) };
  }

  /* ---------- Capacitor codes (values in pF) ---------- */
  var CAP_TOL = { B: '±0.1 pF', C: '±0.25 pF', D: '±0.5 pF', F: '±1%', G: '±2%', J: '±5%', K: '±10%', M: '±20%', Z: '+80% / −20%' };
  var CAP_HELP = 'Ceramic caps use 3 digits in picofarads (104 = 100 nF), optionally followed by a tolerance letter (J, K or M).';
  function decodeCap(input) {
    var raw = String(input == null ? '' : input).trim();
    var s = raw.toUpperCase().replace(/\s+/g, '').replace(/PF$/, '');
    if (!s) return fail('Type the code on the capacitor. ' + CAP_HELP);
    var tol = null, m = /^(.*?)([BCDFGJKMZ])$/.exec(s);
    if (m && m[1] && !/R$/.test(m[1])) { tol = { letter: m[2], text: CAP_TOL[m[2]] }; s = m[1]; }
    var pf, working;
    if ((m = /^(\d{2})(\d)$/.exec(s))) {
      var d = Number(m[2]);
      if (d === 7) return fail('7 is not used as a capacitor multiplier digit. Check the code. ' + CAP_HELP);
      var e = d === 8 ? -2 : d === 9 ? -1 : d;
      pf = Number(Number(m[1]) + 'e' + e);
      working = Number(m[1]) + ' × ' + pow10Text(e) + ' pF';
    } else if ((m = /^(\d{1,2})$/.exec(s))) {
      pf = Number(m[1]); working = 'One or two digits are the value itself: ' + pf + ' pF';
    } else if ((m = /^(\d*)R(\d+)$/.exec(s)) && (m[1] + m[2]).length <= 3) {
      pf = Number((m[1] || '0') + '.' + m[2]); working = 'R marks the decimal point: ' + pf + ' pF';
    } else if (/^\d{4,}$/.test(s)) {
      return fail('"' + raw + '" has too many digits. ' + CAP_HELP);
    } else {
      return fail('Could not read "' + raw + '". ' + CAP_HELP);
    }
    return { ok: true, pf: clean(pf), tol: tol, working: working };
  }

  /* "100n", "4n7", "0.1u", "4.7 nF", "100 pF", "1µ" -> pF */
  var CAP_EXP = { P: 0, N: 3, U: 6, 'µ': 6, 'μ': 6, M: 9 };
  function parseCap(input) {
    var raw = String(input == null ? '' : input).trim();
    var s = raw.replace(/\s+/g, '').replace(/f(arads?)?$/i, '');
    if (!s) return fail('Type a capacitance, like 100n, 4n7 or 0.1u.');
    var m;
    function ex(u) { if (!u) return 0; var up = u.toUpperCase(); return CAP_EXP[up] != null ? CAP_EXP[up] : CAP_EXP[u]; }
    if ((m = /^(\d+)([pnuµμ])(\d+)$/i.exec(s))) return { ok: true, pf: clean(Number(m[1] + '.' + m[3]) * Math.pow(10, ex(m[2]))) };
    if ((m = /^(\d+\.?\d*|\.\d+)([pnuµμ])?$/i.exec(s))) return { ok: true, pf: clean(Number(m[1]) * Math.pow(10, ex(m[2]))) };
    return fail('Could not read "' + raw + '". Use a number and p, n or u, like 100n, 4n7 or 0.1u.');
  }

  function encodeCap(pf, tolLetter) {
    if (!(pf > 0)) return fail('Enter a capacitance above zero.');
    var suffix = tolLetter && CAP_TOL[tolLetter] ? tolLetter : '';
    if (pf < 10) {
      var enc0 = C.encode(pf, 2);
      if (!enc0.ok) return fail('Values under 10 pF need two significant figures at most, like 4.7 pF.');
      return { ok: true, code: rNotation(pf) + suffix, working: 'Under 10 pF, R marks the decimal point.' };
    }
    var enc = C.encode(pf, 2);
    if (!enc.ok || enc.mult < 0) {
      var r = C.nearestE(pf, 'E12').value;
      return fail(formatCap(pf).primary + ' needs more than two significant figures, and codes only have two. The nearest E12 value is ' + formatCap(r).primary + '.', { suggest: r });
    }
    if (enc.mult > 6) return fail('That is too large for a 3-digit code. Codes go up to 99 × 10⁶ pF (99 µF).');
    var dd = enc.digits.join('');
    return { ok: true, code: dd + enc.mult + suffix, working: Number(dd) + ' × ' + pow10Text(enc.mult) + ' pF' };
  }

  function trimN(x, sig) { return String(parseFloat(Number(x).toPrecision(sig || 4))); }
  function group(x) {
    var s = trimN(x, 6), p = s.split('.');
    p[0] = p[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return p.join('.');
  }
  function formatCap(pf) {
    var all = { pF: group(pf) + ' pF', nF: group(pf / 1e3) + ' nF', 'µF': group(pf / 1e6) + ' µF' };
    var primary = pf < 1000 ? trimN(pf) + ' pF' : pf < 1e6 ? trimN(pf / 1e3) + ' nF' : trimN(pf / 1e6) + ' µF';
    return { primary: primary, all: all };
  }

  var ext = {
    eValues: eValues, nextE: nextE, decodeSMD: decodeSMD, encodeSMD: encodeSMD, EIA_MULT: EIA_MULT,
    ohmsLaw: ohmsLaw, ledResistor: ledResistor, ratingFor: ratingFor, RATINGS: RATINGS,
    loadedDivider: loadedDivider, bestDividerPair: bestDividerPair,
    decodeCap: decodeCap, encodeCap: encodeCap, parseCap: parseCap, formatCap: formatCap, CAP_TOL: CAP_TOL,
    pow10Text: pow10Text, trimN: trimN
  };
  for (var k in ext) C[k] = ext[k];
})(typeof window !== 'undefined' ? window : globalThis);
