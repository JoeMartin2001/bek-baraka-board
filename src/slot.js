/* ===========================================================================
   Slot — the product picture on a slide
   Each product slide has one slot. A slide with photographs in CONFIG shows
   them in turn; a slide without keeps its engraved drawing. The drawing also
   stays up until a photograph has actually loaded, so the slot is never empty.

   Nothing here runs per frame: one timer advances the pictures, and the board
   has no requestAnimationFrame loop at all.
   =========================================================================== */
var Slot = (function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var PHOTOS = {};          // slide key -> [{ img, n }], supplied from CONFIG
  var CURSOR = {};          // slide key -> where the last visit stopped
  var PER_ITEM = 3000;      // no picture gets less time than this
  var LAST_MS = 7000;
  var live = null;          // { key, slot, slideEl, items, idx, dur }
  var timer = 0;

  function items(key) {
    var ph = PHOTOS[key];
    return ph && ph.length ? ph : null;
  }

  function caption(text) {
    if (!live || !live.slot) return;
    var c = live.slot.parentNode.querySelector('.art__cap');
    if (!c) return;
    c.textContent = '';
    String(text || '').split('ʻ').forEach(function (part, i) {   // oʻ / gʻ, tightened like the rest
      if (i) { var m = document.createElement('i'); m.className = 'uz'; m.textContent = 'ʻ'; c.appendChild(m); }
      if (part) c.appendChild(document.createTextNode(part));
    });
  }

  function show(item, instant) {
    var img = live.slot.querySelector('.art__photo');
    if (!img) {
      img = document.createElement('img');
      img.className = 'art__photo'; img.alt = '';
      live.slot.appendChild(img);
    }
    img.src = item.img;
    img.style.display = 'block';
    // a JPEG has no transparency, so its edges are feathered into the room
    img.classList.toggle('feather', /\.jpe?g(\?|$)/i.test(item.img));
    if (!instant && !RM) {
      img.classList.remove('in');
      void img.offsetWidth;
      img.classList.add('in');
    } else { img.classList.add('in'); }
    caption(item.n);

    // a picture that has not arrived yet must not blank the slot either
    var el = live.slideEl;
    img.onload = img.onerror = null;
    if (img.complete && img.naturalWidth) el.classList.add('has-rasm');
    else {
      img.onload = function () { if (live && live.slot === img.parentNode) el.classList.add('has-rasm'); };
      // a missing file: back to the drawing, no caption, and on to the next
      img.onerror = function () {
        if (!live || live.slot !== img.parentNode) return;
        img.style.display = 'none';
        el.classList.remove('has-rasm');
        caption('');
        live.bad = (live.bad || 0) + 1;
        if (live.bad < live.items.length) setItem((live.idx + 1) % live.items.length, true);
      };
    }
  }

  function setItem(idx, instant) {
    if (!live) return;
    live.idx = idx;
    show(live.items[idx], instant);
  }

  // Each deadline is crossed once. This visit's list is already cut to the
  // length of the slide and CURSOR carries the place into the next visit, so
  // there is nothing to wrap back to.
  function tick() {
    if (!live || live.idx + 1 >= live.items.length) return;
    setItem(live.idx + 1);
    timer = setTimeout(tick, live.dur);
  }

  function enter(slideEl, slideMs) {
    clearTimeout(timer);
    var slot = slideEl.querySelector('[data-slot]');
    if (!slot) { leave(); return; }
    var list = items(slot.getAttribute('data-slot'));
    if (!list) {                                  // nothing to show: the drawing stays
      leave();
      slideEl.classList.remove('has-rasm');       // even when this slide was never live
      return;
    }

    // this visit's share of the range, starting where the last visit stopped
    var key = slot.getAttribute('data-slot');
    var ms = slideMs || LAST_MS;
    var take = Math.max(1, Math.min(list.length, Math.floor(ms / PER_ITEM)));
    var from = CURSOR[key] || 0, pick = [];
    for (var i = 0; i < take; i++) pick.push(list[(from + i) % list.length]);
    CURSOR[key] = (from + take) % list.length;
    LAST_MS = ms;

    slideEl.classList.remove('has-rasm');         // the drawing holds the slot until one loads
    live = { key: key, slot: slot, slideEl: slideEl, items: pick, idx: -1, dur: ms / pick.length };
    setItem(0, true);
    if (pick.length > 1) timer = setTimeout(tick, live.dur);
  }

  function leave() {
    clearTimeout(timer);
    if (live && live.slideEl) live.slideEl.classList.remove('has-rasm');   // the drawing comes back
    live = null;
  }

  return {
    // CONFIG.rasm -> { key: [{ img, n }] }
    setPhotos: function (map) {
      PHOTOS = {};
      Object.keys(map || {}).forEach(function (k) {
        var v = map[k];
        if (!v) return;
        var arr = (typeof v === 'string') ? [{ rasm: v }] : (v.length ? v : null);
        if (!arr) return;
        var out = [];
        arr.forEach(function (e) {
          var src = (typeof e === 'string') ? e : e.rasm;
          if (src) out.push({ img: src, n: (e && e.nom) || '' });
        });
        if (out.length) PHOTOS[k] = out;
      });
    },
    enter: enter,
    leave: leave,
    debug: function () {
      if (!live) return { live: false };
      return { key: live.key, idx: live.idx, of: live.items.length,
               src: (live.items[live.idx] || {}).img, dur: Math.round(live.dur) };
    }
  };
})();
