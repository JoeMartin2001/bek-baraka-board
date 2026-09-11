
/* ===========================================================================
   SOZLAMALAR — faqat shu joyni oʻzgartiring
   Settings — this is the only block you need to edit.
   =========================================================================== */
var CONFIG = {
  // Telefon raqamlar. Reklamangizdagidek yozilgan (+998 siz).
  telefon_baraka:   '97 666 68 67',      // Bizda Baraka   (+998 97 666 68 67)
  telefon_nextnout: '99 990 01 10',      // Next Nout      (+998 99 990 01 10)

  // Ijtimoiy tarmoqlar (@ belgisisiz). QR kodlar shulardan yasaladi.
  instagram_baraka:   'bizda_baraka',    // instagram.com/bizda_baraka
  instagram_nextnout: 'next.nout',       // ekranda koʻrinadigan manzil
  telegram_nextnout:  'nextnout',        // t.me/nextnout  — QR shu yerga olib boradi

  manzil:    ['Fargʻona shahri, Mustaqillik koʻchasi 12',  // manzil, 1-qator
              'Telefon bozori, 3-qator'],                  // manzil, 2-qator
  ish_vaqti: 'Har kuni  09:00 – 20:00',  // ish vaqti
  sekund:    9,                          // har bir slayd necha soniya turadi

  // Mahsulot rasmlari. Rasmni assets/products/ ichiga qoʻying va shu yerga
  // yozing. Bir slaydga bir nechta rasm qoʻysangiz — navbatma-navbat oʻtadi.
  // Boʻsh qoldirsangiz, oʻsha slaydda 3D model koʻrinadi.
  //
  // Product photos. Several per slide cycle one after another; leave a slide
  // empty and it shows its 3D model instead.
  rasm: {
    nasiya:    [],
    telefon:   [
      { rasm: 'assets/products/iphone-18-pro.png', nom: 'iPhone 18 Pro' }
    ],
    aksessuar: [],
    gaming:    [],
    ofis:      [],
    desktop:   []
  },

  // Slayd orqasidagi fon rasmi. Matnni bosmasligi uchun xiralashtiriladi.
  // Background photo behind a slide; dimmed so it never fights the words.
  fon: {
    nasiya:    '',
    telefon:   'assets/products/iphone-hero.jpg',
    aksessuar: '',
    gaming:    '',
    ofis:      '',
    desktop:   ''
  }
};

/* ===========================================================================
   ENGINE
   =========================================================================== */
(function () {
  var R = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var board  = document.getElementById('board'),
      seam   = document.getElementById('seam'),
      pbar   = document.getElementById('pbar'),
      slides = [].slice.call(document.querySelectorAll('[data-slide-el]')),
      N      = slides.length;

  // ?slide=3 opens on one slide, ?still=1 holds it there (handy for testing,
  // or if the shop only wants the contact screen showing)
  var Q      = new URLSearchParams(location.search),
      START  = Math.min(N - 1, Math.max(0, (parseInt(Q.get('slide'), 10) || 1) - 1)),
      STILL  = Q.has('still'),
      SEK    = parseFloat(Q.get('sek')) || CONFIG.sekund;   // ?sek=6 overrides the pace

  var cur = START, busy = false, elapsed = 0, holdUntil = 0, last = 0, shownAt = -1;
  var DUR = SEK * 1000;
  var spin = 0, spinTarget = 0;

  // --- fill the board from CONFIG ---------------------------------------
  function at(h) { return String(h || '').replace(/^@/, ''); }
  function set(id, text) { document.getElementById(id).textContent = text; }

  set('tel-baraka',   CONFIG.telefon_baraka);
  set('tel-nextnout', CONFIG.telefon_nextnout);
  set('at-baraka',   '@' + at(CONFIG.instagram_baraka));
  set('at-nextnout', '@' + at(CONFIG.instagram_nextnout));

  var addr = document.getElementById('addr');
  CONFIG.manzil.forEach(function (line) {
    var p = document.createElement('p'); p.textContent = line; addr.appendChild(p);
  });
  set('hours', CONFIG.ish_vaqti);

  // Uzbek oʻ / gʻ: wrap the modifier letter so CSS can close the gap it leaves
  (function tightenUz() {
    var walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), hits = [], n;
    while ((n = walk.nextNode())) if (n.nodeValue.indexOf('\u02BB') > -1) hits.push(n);
    hits.forEach(function (node) {
      var frag = document.createDocumentFragment();
      node.nodeValue.split('\u02BB').forEach(function (part, i) {
        if (i) {
          var m = document.createElement('i');
          m.className = 'uz'; m.textContent = '\u02BB';
          frag.appendChild(m);
        }
        if (part) frag.appendChild(document.createTextNode(part));
      });
      node.parentNode.replaceChild(frag, node);
    });
  })();

  [].forEach.call(document.querySelectorAll('[data-depth]'), function (el) {
    el.style.setProperty('--d', el.getAttribute('data-depth'));
  });

  // --- one QR per brand, generated from CONFIG --------------------------
  function drawQR(canvasId, text) {
    var m = QR.encode(text),
        n = m.length, Q = 2,
        S = Math.max(1, Math.floor(240 / (n + Q * 2))),
        size = (n + Q * 2) * S,
        c = document.getElementById(canvasId);
    c.width = c.height = size;
    var g = c.getContext('2d');
    g.fillStyle = '#ffffff'; g.fillRect(0, 0, size, size);
    g.fillStyle = '#0A0806';
    for (var y = 0; y < n; y++)
      for (var x = 0; x < n; x++)
        if (m[y][x]) g.fillRect((x + Q) * S, (y + Q) * S, S, S);
  }
  drawQR('qr-baraka',   'https://instagram.com/' + at(CONFIG.instagram_baraka));
  drawQR('qr-nextnout', 'https://t.me/' + at(CONFIG.telegram_nextnout));

  Stage3D.setPhotos(CONFIG.rasm);

  // --- background photos, when the shop supplies them --------------------
  Object.keys(CONFIG.fon || {}).forEach(function (key) {
    var src = CONFIG.fon[key];
    if (!src) return;
    var slot = document.querySelector('[data-3d="' + key + '"]');
    var slide = slot && slot.closest('[data-slide-el]');
    if (!slide) return;
    var img = new Image();
    img.onload = function () {              // only once it has actually loaded
      var d = document.createElement('div');
      d.className = 'slide__photo';
      d.style.backgroundImage = 'url("' + src + '")';
      slide.insertBefore(d, slide.firstChild);
    };
    img.src = src;
  });

  // The board drifts a pixel or two for burn-in, and letterboxes on panels that
  // are not 16:9. Give the page behind it the slide's own ground so neither
  // ever reads as an edge.
  function matchEdge(el) {
    document.body.style.backgroundColor = getComputedStyle(el).backgroundColor;
  }

  // --- entrances ---------------------------------------------------------
  function clearAnims(el) {
    el.getAnimations().forEach(function (a) { a.cancel(); });
    el.querySelectorAll('[data-r]').forEach(function (n) {
      n.getAnimations().forEach(function (a) { a.cancel(); });
    });
  }

  function enter(el) {
    el.classList.remove('anim');
    void el.offsetWidth;                 // restart the slide's own keyframes
    el.classList.add('anim');
    Stage3D.enter(el, DUR);
    el.querySelectorAll('[data-r]').forEach(function (n, i) {
      n.getAnimations().forEach(function (a) { a.cancel(); });
      n.animate(
        [{ opacity: 0, transform: 'translate3d(0,2.6rem,0)' },
         { opacity: 1, transform: 'none' }],
        { duration: R ? 260 : 820,
          delay: R ? 0 : 200 + i * 70,
          easing: 'cubic-bezier(.16,1,.3,1)',
          fill: 'both' });
    });
  }

  // --- the cut -----------------------------------------------------------
  var D = 880, E = 'cubic-bezier(.52,.02,.16,1)';

  function go(next, dir) {
    if (busy) return;
    next = (next + N) % N;
    if (next === cur) return;

    busy = true;
    var A = slides[cur], B = slides[next];
    cur = next; elapsed = 0; shownAt = -1;   // re-anchor on the next frame
    board.setAttribute('data-slide', String(cur));
    board.setAttribute('data-brand', B.dataset.brand || 'both');

    Stage3D.snapshot(A);   // freeze a 3D object into the slide being left
    B.getAnimations().forEach(function (a) { a.cancel(); });
    B.classList.add('on');
    matchEdge(B);

    function done() {
      A.classList.remove('on', 'is-out');
      B.classList.remove('is-in');
      clearAnims(A);
      busy = false;
    }

    if (R) {
      B.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 260, fill: 'both' });
      A.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 260, fill: 'both' })
       .finished.then(done);
      enter(B);
      return;
    }

    // The seam uncovers the incoming slide on top of the outgoing one, which
    // simply recedes and blurs underneath. Clipping both would put their edges
    // out of register, because a scaled slide clips in its own scaled space.
    var fromB = dir > 0 ? 'inset(0 100% 0 0)' : 'inset(0 0 0 100%)';

    A.classList.add('is-out');
    B.classList.add('is-in');

    B.animate([{ clipPath: fromB }, { clipPath: 'inset(0 0 0 0)' }],
              { duration: D, easing: E, fill: 'both' });

    A.animate([{ transform: 'scale(1)',   filter: 'blur(0px)', opacity: 1 },
               { transform: 'scale(.94)', filter: 'blur(8px)', opacity: .5 }],
              { duration: D, easing: E, fill: 'both' }).finished.then(done);

    seam.animate([{ transform: 'translateX(' + (dir > 0 ? 0 : 100) + 'rem)', opacity: 0 },
                  { opacity: 1, offset: .1 },
                  { opacity: 1, offset: .88 },
                  { transform: 'translateX(' + (dir > 0 ? 100 : 0) + 'rem)', opacity: 0 }],
                 { duration: D, easing: E, fill: 'both' });

    spinTarget += 22 * dir;              // push the quyosh through the cut
    enter(B);
  }

  // --- one clock drives everything ---------------------------------------
  function frame(now) {
    if (!last) last = now;
    var dt = Math.min(.05, (now - last) / 1000); last = now;
    var t = now / 1000;

    if (!R) {
      board.style.setProperty('--px', (Math.sin(t * .21) + Math.sin(t * .13) * .5).toFixed(4));
      board.style.setProperty('--py', (Math.cos(t * .17) + Math.sin(t * .11) * .4).toFixed(4));

      // burn-in protection: a 1.6px orbit over seven minutes, invisible to a
      // viewer but enough to stop the static frame etching into the panel
      var a = t * 2 * Math.PI / 420;
      board.style.transform = 'translate3d(' + (Math.cos(a) * 1.6).toFixed(2) + 'px,' +
                                               (Math.sin(a) * 1.6).toFixed(2) + 'px,0)';

      spin += (spinTarget - spin) * Math.min(1, dt * 2.4);
      var gap = spinTarget - spin;
      board.style.setProperty('--spin', (t * .55 + spin).toFixed(3) + 'deg');
      board.style.setProperty('--spin-s', (1 + Math.abs(gap) * .0018).toFixed(4));
    }

    // Pace off the wall clock, not off accumulated frame deltas: a monitor
    // that sleeps or a browser that throttles rAF must not stretch the loop.
    if (!busy && !STILL) {
      if (shownAt < 0) shownAt = now - elapsed;
      if (now < holdUntil) shownAt = now - elapsed;   // held: keep the bar where it is
      else elapsed = now - shownAt;
      if (elapsed >= DUR) go(cur + 1, 1);
    }
    pbar.style.transform = 'scaleX(' + ((cur + Math.min(1, elapsed / DUR)) / N).toFixed(4) + ')';

    requestAnimationFrame(frame);
  }

  // --- manual override ---------------------------------------------------
  function nudge() { holdUntil = performance.now() + 15000; }
  function next()  { nudge(); go(cur + 1, 1); }
  function prev()  { nudge(); go(cur - 1, -1); }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(function () {});
  }

  var fsbtn = document.getElementById('fsbtn');
  fsbtn.addEventListener('click', function (ev) {
    ev.stopPropagation();        // never let the button also advance the board
    wake();
    toggleFullscreen();
  });
  addEventListener('fullscreenchange', function () {
    document.body.classList.toggle('is-fs', !!document.fullscreenElement);
    wake();
  });

  addEventListener('keydown', function (e) {
    var k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ') { e.preventDefault(); next(); }
    else if (k === 'ArrowLeft' || k === 'PageUp')            { e.preventDefault(); prev(); }
    else if (k === 'f' || k === 'F') { toggleFullscreen(); }
    else if (k >= '1' && k <= String(N)) { var i = +k - 1; nudge(); go(i, i > cur ? 1 : -1); }
  });

  var sx = 0, moved = false;
  board.addEventListener('pointerdown', function (e) { sx = e.clientX; moved = false; });
  board.addEventListener('pointerup', function (e) {
    var dx = e.clientX - sx;
    if (Math.abs(dx) > 40) { moved = true; dx < 0 ? next() : prev(); }
  });
  board.addEventListener('click', function () { if (!moved) next(); });

  var idle;
  function wake() {
    document.body.classList.remove('idle');
    clearTimeout(idle);
    idle = setTimeout(function () { document.body.classList.add('idle'); }, 2500);
  }
  addEventListener('mousemove', wake); wake();

  // --- start -------------------------------------------------------------
  addEventListener('resize', function () { Stage3D.fit(); });

  function start() {
    Stage3D.init();          // false just means no WebGL; photos still work
    if (START !== 0) {
      slides[0].classList.remove('on');
      slides[START].classList.add('on');
      board.setAttribute('data-slide', String(START));
    }
    board.setAttribute('data-brand', slides[START].dataset.brand || 'both');
    matchEdge(slides[START]);
    enter(slides[START]);
    requestAnimationFrame(frame);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(start);
  else start();
})();
