/* ---------------------------------------------------------------------------
   Minimal QR encoder: byte mode, EC level M, versions 1-10.
   Enough for a URL or phone number; returns a square array of 0/1.
   Written inline so the board needs no network and no build step.
--------------------------------------------------------------------------- */
var QR = (function () {
  // [ec codewords per block, [blocks, data codewords per block] ...] for level M
  var SPEC = {
    1:  [10, [[1, 16]]],
    2:  [16, [[1, 28]]],
    3:  [26, [[1, 44]]],
    4:  [18, [[2, 32]]],
    5:  [24, [[2, 43]]],
    6:  [16, [[4, 27]]],
    7:  [18, [[4, 31]]],
    8:  [22, [[2, 38], [2, 39]]],
    9:  [22, [[3, 36], [2, 37]]],
    10: [26, [[4, 43], [1, 44]]]
  };
  var ALIGN = {
    1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
    6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50]
  };
  var VERINFO = { // 18-bit version information, versions 7+
    7: 0x07C94, 8: 0x085BC, 9: 0x09A99, 10: 0x0A4D3
  };

  // --- GF(256), primitive polynomial 0x11D -------------------------------
  var EXP = new Uint8Array(512), LOG = new Uint8Array(256);
  (function () {
    for (var i = 0, x = 1; i < 255; i++) {
      EXP[i] = x; LOG[x] = i;
      x <<= 1; if (x & 0x100) x ^= 0x11D;
    }
    for (i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
  })();
  function mul(a, b) { return (a === 0 || b === 0) ? 0 : EXP[LOG[a] + LOG[b]]; }

  function genPoly(n) {
    var p = [1];
    for (var i = 0; i < n; i++) {
      var q = p.concat([0]);
      for (var j = 0; j < p.length; j++) q[j + 1] ^= mul(p[j], EXP[i]);
      p = q;
    }
    return p;
  }

  function ecc(data, n) {
    var g = genPoly(n), res = new Array(n).fill(0);
    for (var i = 0; i < data.length; i++) {
      var f = data[i] ^ res[0];
      res.shift(); res.push(0);
      if (f !== 0) for (var j = 0; j < n; j++) res[j] ^= mul(g[j + 1], f);
    }
    return res;
  }

  // --- data encoding -----------------------------------------------------
  function utf8(str) {
    var out = [], s = encodeURIComponent(str);
    for (var i = 0; i < s.length; i++) {
      if (s[i] === '%') { out.push(parseInt(s.substr(i + 1, 2), 16)); i += 2; }
      else out.push(s.charCodeAt(i));
    }
    return out;
  }

  function capacity(v) {
    var s = SPEC[v], total = 0;
    for (var i = 0; i < s[1].length; i++) total += s[1][i][0] * s[1][i][1];
    return total;
  }

  function pickVersion(len) {
    for (var v = 1; v <= 10; v++) {
      var ccBits = v < 10 ? 8 : 16;
      if (capacity(v) * 8 >= 4 + ccBits + len * 8) return v;
    }
    throw new Error('QR: text too long');
  }

  function bitStream(bytes, v) {
    var bits = [];
    function push(val, n) { for (var i = n - 1; i >= 0; i--) bits.push((val >> i) & 1); }
    push(4, 4);                          // byte mode
    push(bytes.length, v < 10 ? 8 : 16); // character count
    for (var i = 0; i < bytes.length; i++) push(bytes[i], 8);
    var cap = capacity(v) * 8;
    push(0, Math.min(4, cap - bits.length));         // terminator
    while (bits.length % 8) bits.push(0);            // byte align
    var pad = [0xEC, 0x11], k = 0;
    while (bits.length < cap) { push(pad[k++ % 2], 8); }
    var out = [];
    for (i = 0; i < bits.length; i += 8) {
      var b = 0;
      for (var j = 0; j < 8; j++) b = (b << 1) | bits[i + j];
      out.push(b);
    }
    return out;
  }

  function interleave(codewords, v) {
    var spec = SPEC[v], ecLen = spec[0], groups = spec[1];
    var dataBlocks = [], ecBlocks = [], p = 0;
    for (var g = 0; g < groups.length; g++) {
      for (var b = 0; b < groups[g][0]; b++) {
        var blk = codewords.slice(p, p + groups[g][1]);
        p += groups[g][1];
        dataBlocks.push(blk);
        ecBlocks.push(ecc(blk, ecLen));
      }
    }
    var out = [], i, j, maxD = 0;
    for (i = 0; i < dataBlocks.length; i++) maxD = Math.max(maxD, dataBlocks[i].length);
    for (i = 0; i < maxD; i++)
      for (j = 0; j < dataBlocks.length; j++)
        if (i < dataBlocks[j].length) out.push(dataBlocks[j][i]);
    for (i = 0; i < ecLen; i++)
      for (j = 0; j < ecBlocks.length; j++) out.push(ecBlocks[j][i]);
    return out;
  }

  // --- matrix ------------------------------------------------------------
  function build(v) {
    var n = 17 + v * 4;
    var m = [], reserved = [];
    for (var i = 0; i < n; i++) { m.push(new Array(n).fill(0)); reserved.push(new Array(n).fill(0)); }

    function finder(r, c) {
      for (var dr = -1; dr <= 7; dr++) for (var dc = -1; dc <= 7; dc++) {
        var rr = r + dr, cc = c + dc;
        if (rr < 0 || rr >= n || cc < 0 || cc >= n) continue;
        var inRing = (dr >= 0 && dr <= 6 && dc >= 0 && dc <= 6) &&
          (dr === 0 || dr === 6 || dc === 0 || dc === 6 ||
           (dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4));
        m[rr][cc] = inRing ? 1 : 0;
        reserved[rr][cc] = 1;
      }
    }
    finder(0, 0); finder(0, n - 7); finder(n - 7, 0);

    for (i = 8; i < n - 8; i++) {                    // timing
      m[6][i] = m[i][6] = (i % 2 === 0) ? 1 : 0;
      reserved[6][i] = reserved[i][6] = 1;
    }

    var ac = ALIGN[v], last = ac.length - 1;         // alignment
    for (var a = 0; a < ac.length; a++) for (var b = 0; b < ac.length; b++) {
      // every centre except the three that sit under a finder pattern
      if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) continue;
      var r = ac[a], c = ac[b];
      for (var dr = -2; dr <= 2; dr++) for (var dc = -2; dc <= 2; dc++) {
        m[r + dr][c + dc] = (Math.abs(dr) === 2 || Math.abs(dc) === 2 || (dr === 0 && dc === 0)) ? 1 : 0;
        reserved[r + dr][c + dc] = 1;
      }
    }

    m[n - 8][8] = 1; reserved[n - 8][8] = 1;          // dark module

    for (i = 0; i <= 8; i++) {                        // format info areas
      if (!reserved[8][i]) { reserved[8][i] = 1; }
      if (!reserved[i][8]) { reserved[i][8] = 1; }
    }
    for (i = 0; i < 8; i++) { reserved[8][n - 1 - i] = 1; reserved[n - 1 - i][8] = 1; }

    if (v >= 7) for (i = 0; i < 18; i++) {            // version info areas
      reserved[Math.floor(i / 3)][n - 11 + (i % 3)] = 1;
      reserved[n - 11 + (i % 3)][Math.floor(i / 3)] = 1;
    }
    return { m: m, reserved: reserved, n: n };
  }

  function place(grid, codewords) {
    var m = grid.m, res = grid.reserved, n = grid.n;
    var bits = [];
    for (var i = 0; i < codewords.length; i++)
      for (var j = 7; j >= 0; j--) bits.push((codewords[i] >> j) & 1);
    var idx = 0, up = true;
    for (var col = n - 1; col > 0; col -= 2) {
      if (col === 6) col--;                            // skip vertical timing
      for (var k = 0; k < n; k++) {
        var row = up ? n - 1 - k : k;
        for (var c = 0; c < 2; c++) {
          var cc = col - c;
          if (res[row][cc]) continue;
          m[row][cc] = idx < bits.length ? bits[idx] : 0;
          idx++;
        }
      }
      up = !up;
    }
  }

  var MASKS = [
    function (r, c) { return (r + c) % 2 === 0; },
    function (r) { return r % 2 === 0; },
    function (r, c) { return c % 3 === 0; },
    function (r, c) { return (r + c) % 3 === 0; },
    function (r, c) { return (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0; },
    function (r, c) { return (r * c) % 2 + (r * c) % 3 === 0; },
    function (r, c) { return ((r * c) % 2 + (r * c) % 3) % 2 === 0; },
    function (r, c) { return ((r + c) % 2 + (r * c) % 3) % 2 === 0; }
  ];

  function formatBits(mask) {
    var fmt = (0 << 3) | mask;          // level M = 00
    var d = fmt << 10;
    for (var i = 4; i >= 0; i--) if (d & (1 << (i + 10))) d ^= 0x537 << i;
    return ((fmt << 10) | d) ^ 0x5412;
  }

  function applyFormat(grid, mask) {
    var m = grid.m, n = grid.n, f = formatBits(mask);
    for (var i = 0; i < 15; i++) {
      var bit = (f >> i) & 1;
      // copy 1: down column 8, then along row 8 to the left (skipping the timing line)
      if (i < 6) m[i][8] = bit;
      else if (i < 8) m[i + 1][8] = bit;
      else m[n - 15 + i][8] = bit;
      // copy 2: right end of row 8, then up column 8 from the bottom
      if (i < 8) m[8][n - 1 - i] = bit;
      else if (i === 8) m[8][7] = bit;
      else m[8][14 - i] = bit;
    }
    m[n - 8][8] = 1;
  }

  function applyVersion(grid, v) {
    if (v < 7) return;
    var m = grid.m, n = grid.n, d = VERINFO[v];
    for (var i = 0; i < 18; i++) {
      var bit = (d >> i) & 1;
      m[Math.floor(i / 3)][n - 11 + (i % 3)] = bit;
      m[n - 11 + (i % 3)][Math.floor(i / 3)] = bit;
    }
  }

  function penalty(m, n) {
    var score = 0, i, j, run, dark = 0;
    for (i = 0; i < n; i++) {                          // rule 1: runs
      for (var dir = 0; dir < 2; dir++) {
        run = 1;
        for (j = 1; j < n; j++) {
          var a = dir ? m[j][i] : m[i][j], b = dir ? m[j - 1][i] : m[i][j - 1];
          if (a === b) run++;
          else { if (run >= 5) score += 3 + (run - 5); run = 1; }
        }
        if (run >= 5) score += 3 + (run - 5);
      }
    }
    for (i = 0; i < n - 1; i++) for (j = 0; j < n - 1; j++) { // rule 2: 2x2
      var v0 = m[i][j];
      if (v0 === m[i][j + 1] && v0 === m[i + 1][j] && v0 === m[i + 1][j + 1]) score += 3;
    }
    var pat1 = [1,0,1,1,1,0,1,0,0,0,0], pat2 = [0,0,0,0,1,0,1,1,1,0,1];
    for (i = 0; i < n; i++) for (j = 0; j <= n - 11; j++) { // rule 3: finder-like
      var okR = true, okR2 = true, okC = true, okC2 = true;
      for (var k = 0; k < 11; k++) {
        if (m[i][j + k] !== pat1[k]) okR = false;
        if (m[i][j + k] !== pat2[k]) okR2 = false;
        if (m[j + k][i] !== pat1[k]) okC = false;
        if (m[j + k][i] !== pat2[k]) okC2 = false;
      }
      if (okR) score += 40; if (okR2) score += 40;
      if (okC) score += 40; if (okC2) score += 40;
    }
    for (i = 0; i < n; i++) for (j = 0; j < n; j++) dark += m[i][j];
    score += Math.floor(Math.abs(dark * 100 / (n * n) - 50) / 5) * 10;
    return score;
  }

  function encode(text) {
    var bytes = utf8(text);
    var v = pickVersion(bytes.length);
    var codewords = interleave(bitStream(bytes, v), v);
    var best = null, bestScore = Infinity;
    for (var mask = 0; mask < 8; mask++) {
      var grid = build(v);
      place(grid, codewords);
      for (var r = 0; r < grid.n; r++) for (var c = 0; c < grid.n; c++)
        if (!grid.reserved[r][c] && MASKS[mask](r, c)) grid.m[r][c] ^= 1;
      applyFormat(grid, mask);
      applyVersion(grid, v);
      var s = penalty(grid.m, grid.n);
      if (s < bestScore) { bestScore = s; best = grid; }
    }
    return best.m;
  }

  return { encode: encode };
})();
if (typeof module !== 'undefined') module.exports = QR;
