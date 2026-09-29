
/* ===========================================================================
   Stage3D — the product objects
   One WebGL canvas that moves into whichever slide is on screen, so the seam
   still clips it correctly. Every object is built from primitives: no model
   files, nothing to download, and the whole thing still opens from file://.
   If WebGL is missing or refuses to start, nothing here runs and the engraved
   SVG drawings stay exactly as they are.
   =========================================================================== */
var Stage3D = (function () {
  var RM = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var renderer, scene, cam, pivot, canvas, env, gl = false;
  var PHOTOS = {};          // slide key -> [{ img, n }], supplied from CONFIG
  var BUILT = {};           // key:idx -> holder, built once and reused for the life of the page
  var T = { init: 0, firstFrame: 0 };   // startup timings, readable through debug()
  var SWING_Y = .78, SWING_X = .11, SWING_Z = .05, BOB = .16, FILL = .88;   // ambient drift, and how much of the slot to fill
  var live = null;          // { key, items, idx, dur, obj, born }
  var swap = null;          // { from, to, t0 }
  var last = 0, raf = 0;

  // --- materials ----------------------------------------------------------
  var M = {};
  function mats() {
    M.dark  = new THREE.MeshStandardMaterial({ color: 0x3a3e46, metalness: .78, roughness: .36 });
    M.steel = new THREE.MeshStandardMaterial({ color: 0xb4bac0, metalness: .85, roughness: .3 });
    M.gold  = new THREE.MeshStandardMaterial({ color: 0xE8B23C, metalness: .88, roughness: .24 });
    M.teal  = new THREE.MeshStandardMaterial({ color: 0x2BB3A3, metalness: .85, roughness: .28 });
    M.white = new THREE.MeshStandardMaterial({ color: 0xf2f2f0, metalness: .05, roughness: .26 });
    M.black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    M.rubber= new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .2, roughness: .7 });
  }

  // A studio painted into a canvas: one broad warm strip overhead, a cool
  // kicker behind. PMREM turns it into the reflections the metal needs.
  function studio() {
    var c = document.createElement('canvas'); c.width = 512; c.height = 256;
    var g = c.getContext('2d'); g.scale(.5, .5);
    g.fillStyle = '#000'; g.fillRect(0, 0, 1024, 512);
    var grd = g.createLinearGradient(0, 0, 0, 512);
    grd.addColorStop(0, '#17120a'); grd.addColorStop(.5, '#000'); grd.addColorStop(1, '#000');
    g.fillStyle = grd; g.fillRect(0, 0, 1024, 512);
    grd = g.createLinearGradient(0, 30, 0, 170);
    grd.addColorStop(0, 'rgba(0,0,0,0)'); grd.addColorStop(.5, 'rgba(255,206,128,.92)'); grd.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = grd; g.fillRect(90, 30, 840, 140);
    g.fillStyle = 'rgba(150,180,205,.4)'; g.fillRect(0, 296, 1024, 20);
    g.fillStyle = 'rgba(255,255,255,.14)'; g.fillRect(770, 120, 80, 300);
    var t = new THREE.CanvasTexture(c);
    t.mapping = THREE.EquirectangularReflectionMapping;
    var p = new THREE.PMREMGenerator(renderer);
    var e = p.fromEquirectangular(t).texture;
    p.dispose(); t.dispose();
    return e;
  }

  function screenTex(w, h, rgb, a) {
    var c = document.createElement('canvas'); c.width = w; c.height = h;
    var x = c.getContext('2d');
    x.fillStyle = '#05070a'; x.fillRect(0, 0, w, h);
    var rg = x.createRadialGradient(w * .5, h * .38, 6, w * .5, h * .38, h * .72);
    rg.addColorStop(0, 'rgba(' + rgb + ',' + a + ')'); rg.addColorStop(1, 'rgba(' + rgb + ',0)');
    x.fillStyle = rg; x.fillRect(0, 0, w, h);
    var t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }
  function lit(rgb, a) { return new THREE.MeshBasicMaterial({ map: screenTex(512, 512, rgb, a) }); }
  // RoundedBoxGeometry rounds every axis equally, so its radius cannot exceed
  // half the smallest dimension — ask for more and the geometry collapses.
  function box(w, h, d, r, m) {
    var rr = Math.max(.001, Math.min(r, Math.min(w, h, d) / 2 - 1e-4));
    return new THREE.Mesh(new THREE.RoundedBoxGeometry(w, h, d, 5, rr), m);
  }

  // For anything thin with big corner radii — a phone, a card, a screen — an
  // extruded rounded rectangle is the right shape: generous corners in X and Y,
  // a thin depth, and a small bevel to catch the light along the edge.
  function slab(w, h, d, r, m) {
    r = Math.min(r, Math.min(w, h) / 2);
    var x = -w / 2, y = -h / 2, sh = new THREE.Shape();
    sh.moveTo(x + r, y);
    sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r);
    sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r);
    sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
    var bev = Math.min(d * .3, .028);
    var g = new THREE.ExtrudeGeometry(sh, {
      depth: Math.max(.001, d - bev * 2), bevelEnabled: true,
      bevelThickness: bev, bevelSize: bev, bevelSegments: 3, curveSegments: 14
    });
    g.computeBoundingBox();
    var bb = g.boundingBox;
    g.translate(0, 0, -(bb.min.z + bb.max.z) / 2);
    g.computeVertexNormals();
    return new THREE.Mesh(g, m);
  }

  // --- the objects --------------------------------------------------------
  function phone(bodyColor) {
    var g = new THREE.Group();
    var frameM = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: .86, roughness: .3 });
    g.add(slab(1.64, 3.36, .17, .34, frameM));                 // titanium frame
    g.add(slab(1.52, 3.24, .19, .30, M.dark));                 // body
    var s = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 3.12), lit('232,178,60', .78));
    s.position.z = .098; g.add(s);
    var island = slab(.46, .15, .03, .075, M.black); island.position.set(0, 1.30, .108); g.add(island);
    // camera plateau with three lenses — the silhouette that says "phone"
    var plate = slab(.90, .90, .10, .26, frameM); plate.position.set(-.28, .98, -.12); g.add(plate);
    [[-.16, 1.16], [.12, 1.16], [-.02, .80]].forEach(function (p) {
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(.16, .16, .09, 24), M.dark);
      lens.rotation.x = Math.PI / 2; lens.position.set(p[0], p[1], -.19); g.add(lens);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(.16, .025, 8, 24), M.steel);
      ring.position.set(p[0], p[1], -.20); g.add(ring);
    });
    return g;
  }




  function laptop(o) {
    o = o || {};
    var g = new THREE.Group();
    g.add(box(4.3, .17, 2.95, .07, M.dark));
    var kb = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 1.5), M.rubber);
    kb.rotation.x = -Math.PI / 2; kb.position.set(0, .088, -.35); g.add(kb);
    var pad = new THREE.Mesh(new THREE.PlaneGeometry(1.4, .95), new THREE.MeshStandardMaterial({ color: 0x1b1f24, metalness: .9, roughness: .3 }));
    pad.rotation.x = -Math.PI / 2; pad.position.set(0, .089, .86); g.add(pad);
    var lid = new THREE.Group();
    var shell = slab(4.3, 2.78, .13, .1, M.dark); shell.position.y = 1.39; lid.add(shell);
    var s = new THREE.Mesh(new THREE.PlaneGeometry(4.02, 2.5), lit(o.teal === false ? '232,178,60' : '43,179,163', .5));
    s.position.set(0, 1.39, .07); lid.add(s);
    lid.position.set(0, .085, -1.47); lid.rotation.x = -.3; g.add(lid);
    if (o.glow) {
      var gl = new THREE.Mesh(new THREE.PlaneGeometry(3.7, .13),
        new THREE.MeshBasicMaterial({ color: 0x2BB3A3, transparent: true, opacity: .8, blending: THREE.AdditiveBlending }));
      gl.position.set(0, -.06, 1.49); g.add(gl);
    }
    g.position.y = -.75;
    return g;
  }


  // an Android flagship: a punch-hole camera and a vertical camera bar,
  // which is what tells it apart from the iPhone at a glance
  function android(bodyColor) {
    var g = new THREE.Group();
    var frameM = new THREE.MeshStandardMaterial({ color: bodyColor, metalness: .7, roughness: .34 });
    g.add(slab(1.60, 3.40, .16, .22, frameM));
    g.add(slab(1.50, 3.30, .18, .19, M.dark));
    var sc = new THREE.Mesh(new THREE.PlaneGeometry(1.44, 3.20), lit('80,200,140', .62));
    sc.position.z = .093; g.add(sc);
    var hole = new THREE.Mesh(new THREE.CircleGeometry(.055, 16), M.black);
    hole.position.set(0, 1.42, .1); g.add(hole);
    var bar = slab(.42, 1.26, .09, .2, frameM); bar.position.set(-.5, .86, -.115); g.add(bar);
    [1.28, .86, .44].forEach(function (y) {
      var lens = new THREE.Mesh(new THREE.CylinderGeometry(.135, .135, .08, 24), M.dark);
      lens.rotation.x = Math.PI / 2; lens.position.set(-.5, y, -.18); g.add(lens);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(.135, .02, 8, 24), M.steel);
      ring.position.set(-.5, y, -.19); g.add(ring);
    });
    return g;
  }

  // an iPad, slightly turned so it is not a bigger phone: thin even bezels,
  // one camera in the corner, the pencil clipped to its edge
  function tablet() {
    var g = new THREE.Group();
    g.add(slab(3.30, 4.40, .14, .22, M.steel));
    g.add(slab(3.20, 4.30, .16, .19, M.dark));
    var sc = new THREE.Mesh(new THREE.PlaneGeometry(3.02, 4.12), lit('232,178,60', .55));
    sc.position.z = .083; g.add(sc);
    var cam = new THREE.Mesh(new THREE.CylinderGeometry(.11, .11, .06, 20), M.dark);
    cam.rotation.x = Math.PI / 2; cam.position.set(-1.28, 1.86, -.09); g.add(cam);
    var pen = new THREE.Mesh(new THREE.CylinderGeometry(.06, .06, 2.6, 12), M.white);
    pen.position.set(1.74, .3, 0); g.add(pen);
    var tip = new THREE.Mesh(new THREE.ConeGeometry(.06, .2, 12), M.white);
    tip.position.set(1.74, -1.1, 0); tip.rotation.x = Math.PI; g.add(tip);
    return g;
  }

  // Ray-Ban smart glasses: the Wayfarer's thick frame, a small camera at
  // each hinge, temples folded back so the silhouette reads from a distance
  function glasses() {
    var g = new THREE.Group();
    var frameM = new THREE.MeshStandardMaterial({ color: 0x15110c, metalness: .35, roughness: .32 });
    var lensM  = new THREE.MeshStandardMaterial({ color: 0x2a3c40, metalness: .9, roughness: .12, transparent: true, opacity: .82 });
    [-1.02, 1.02].forEach(function (x) {
      var rim = slab(1.84, 1.34, .22, .5, frameM); rim.position.x = x; g.add(rim);
      var lens = slab(1.52, 1.04, .06, .4, lensM); lens.position.set(x, -.03, .04); g.add(lens);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(.075, .018, 8, 20), M.steel);
      ring.position.set(x < 0 ? -1.72 : 1.72, .46, .115); g.add(ring);
      var camd = new THREE.Mesh(new THREE.CircleGeometry(.06, 18), M.black);
      camd.position.set(x < 0 ? -1.72 : 1.72, .46, .116); g.add(camd);
    });
    var bridge = box(.5, .22, .22, .08, frameM); bridge.position.y = .3; g.add(bridge);
    [-1, 1].forEach(function (sgn) {
      var temple = box(.16, .2, 3.4, .06, frameM);
      temple.position.set(sgn * 1.9, .42, -1.8); g.add(temple);
      var tip = box(.16, .3, .9, .06, frameM);
      tip.position.set(sgn * 1.9, .2, -3.4); tip.rotation.x = .35; g.add(tip);
    });
    g.rotation.x = .18;
    return g;
  }

  function tower() {
    var g = new THREE.Group();
    g.add(box(1.9, 4.0, 2.0, .1, M.dark));
    var inner = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.2), lit('43,179,163', .72));
    inner.rotation.y = Math.PI / 2; inner.position.set(.97, .1, 0); g.add(inner);
    for (var i = 0; i < 2; i++) {                                   // fans
      var f = new THREE.Mesh(new THREE.TorusGeometry(.42, .05, 8, 26), M.teal);
      f.rotation.y = Math.PI / 2; f.position.set(.93, .95 - i * 1.1, 0); g.add(f);
    }
    var btn = new THREE.Mesh(new THREE.CircleGeometry(.08, 16), new THREE.MeshBasicMaterial({ color: 0xE8B23C }));
    btn.position.set(0, 1.72, 1.005); g.add(btn);
    return g;
  }



  var CATALOG = {
    telefon:   [{ n: 'iPhone 18',        b: function () { return phone(0x2c3d5a); } },
                { n: 'Android telefon',  b: function () { return android(0x3b3f47); } },
                { n: 'iPad',             b: tablet },
                { n: 'Ray-Ban Meta',     b: glasses }],
    gaming:    [{ n: 'Oʻyin noutbugi',   b: function () { return laptop({ glow: true }); } },
                { n: 'Oʻyin kompyuteri', b: tower }]
  };
  // A slide shows a few of its items each visit and carries on from there
  // next time round, so a short slide still gets through the whole range.
  var CURSOR = {}, LAST_MS = 7000;
  var PER_ITEM = 3000;                    // no object gets less than this

  // --- lifecycle ----------------------------------------------------------
  function boot() {
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) return false;
    canvas = document.createElement('canvas');
    canvas.className = 'stage3d';
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;
    renderer.setPixelRatio(Math.min(1.25, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.42;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    // A kiosk that runs all day will lose its GL context sooner or later —
    // a driver reset, the GPU dozing. Without this the slot goes black for
    // good. Fall back to the drawings, then pick up again when it returns.
    canvas.addEventListener('webglcontextlost', function (ev) {
      ev.preventDefault();
      var el = live && live.slideEl, ms = live && live.ms;
      gl = false; stop();
      if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      live = null; swap = null;
      if (el) enter(el, ms);                    // photos stay, models yield to the drawing
    }, false);
    canvas.addEventListener('webglcontextrestored', function () {
      env = studio(); scene.environment = env; // its render target died with the context
      gl = true;
      var el = document.querySelector('.slide.on');
      if (el) enter(el, LAST_MS);
    }, false);

    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(26, 1, .1, 100);
    cam.position.set(0, .5, 13); cam.lookAt(0, 0, 0);
    pivot = new THREE.Group(); scene.add(pivot);

    mats();
    env = studio(); scene.environment = env; scene.environmentIntensity = 1.9;
    var key  = new THREE.DirectionalLight(0xffdca8, 3.0); key.position.set(4, 5, 6);   scene.add(key);
    var rim  = new THREE.DirectionalLight(0x8fd0ff, 2.2); rim.position.set(-5, 1.5, -4); scene.add(rim);
    var fill = new THREE.DirectionalLight(0xffffff, .8);  fill.position.set(-1, -2, 5);  scene.add(fill);

    return true;
  }

  function items(key) {
    var ph = PHOTOS[key] || [], md = gl ? (CATALOG[key] || []) : [];
    return ph.length || md.length ? ph.concat(md) : null;   // photos first, then the models
  }

  function build(key, item) {
    var id = key + ':' + item.n, holder = BUILT[id];
    if (!holder) {
      holder = new THREE.Group();
      holder.add(item.b());
      holder.userData.name = item.n;
      BUILT[id] = holder;
    }
    holder.position.set(0, 0, 0);
    holder.rotation.set(0, 0, 0);
    frame3d(holder);                 // cheap, and the slot may have resized
    return holder;
  }

  // Centre the object and scale it to the slot. Estimating from the view
  // height is not enough: the camera is a perspective one, so the turntable
  // swing carries corners nearer the lens, where they project larger. Solve it
  // by projecting the corners at the swing extremes and converging on a fit.
  var probeNode = null;
  function frame3d(holder) {
    var inner = holder.children[0];
    if (!inner) return;
    inner.position.set(0, 0, 0);
    holder.scale.setScalar(1);
    holder.position.set(0, 0, 0);
    holder.rotation.set(0, 0, 0);
    holder.updateMatrixWorld(true);

    var bb = new THREE.Box3().setFromObject(inner);
    var size = new THREE.Vector3(), mid = new THREE.Vector3();
    bb.getSize(size); bb.getCenter(mid);
    inner.position.set(-mid.x, -mid.y, -mid.z);

    var hx = size.x / 2, hy = size.y / 2, hz = size.z / 2, corners = [];
    for (var i = 0; i < 8; i++)
      corners.push(new THREE.Vector3(i & 1 ? hx : -hx, i & 2 ? hy : -hy, i & 4 ? hz : -hz));

    cam.updateMatrixWorld();
    if (!probeNode) probeNode = new THREE.Object3D();
    var q = probeNode, v = new THREE.Vector3();
    var poses = [];
    [SWING_Y, -SWING_Y].forEach(function (ry) {
      [SWING_X, -SWING_X].forEach(function (rx) {
        [SWING_Z, -SWING_Z].forEach(function (rz) { poses.push([ry, rx, rz]); });
      });
    });

    function worst(k) {
      var m = 0;
      for (var pi = 0; pi < poses.length; pi++) {
        q.rotation.set(poses[pi][1], poses[pi][0], poses[pi][2]);
        q.scale.setScalar(k);
        q.position.set(0, BOB, 0);
        q.updateMatrixWorld(true);
        for (var c = 0; c < corners.length; c++) {
          v.copy(corners[c]).applyMatrix4(q.matrixWorld).project(cam);
          if (Math.abs(v.x) > m) m = Math.abs(v.x);
          if (Math.abs(v.y) > m) m = Math.abs(v.y);
        }
      }
      return m;
    }

    var k = 1;
    for (var it = 0; it < 10; it++) {
      var m = worst(k);
      if (!isFinite(m) || m <= 1e-6) break;
      var next = k * (FILL / m);
      if (!isFinite(next) || next <= 0) break;
      if (Math.abs(next - k) < 1e-4) { k = next; break; }
      k = next;
    }
    holder.userData.k = k;
    holder.scale.setScalar(k);
  }

  // photographs live in their own <img> per slot; models share the one canvas
  function showPhoto(item, instant) {
    var img = live.slot.querySelector('.art__photo');
    if (!img) {
      img = document.createElement('img');
      img.className = 'art__photo'; img.alt = '';
      live.slot.appendChild(img);
    }
    if (canvas && canvas.parentNode === live.slot) canvas.style.display = 'none';
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
    // a photo that has not arrived yet must not blank the slot either
    var el = live.slideEl;
    img.onload = img.onerror = null;
    if (img.complete && img.naturalWidth) el.classList.add('has3d');
    else {
      img.onload  = function () { if (live && live.slot === img.parentNode) el.classList.add('has3d'); };
      // a missing file: back to the drawing, no caption, and move on if there is more
      img.onerror = function () {
        if (!live || live.slot !== img.parentNode) return;
        img.style.display = 'none';
        el.classList.remove('has3d');
        caption('');
        live.bad = (live.bad || 0) + 1;
        if (live.bad < live.items.length) setItem((live.idx + 1) % live.items.length, true);
      };
    }
  }

  function hidePhoto() {
    var img = live.slot && live.slot.querySelector('.art__photo');
    if (img) img.style.display = 'none';
    if (canvas) canvas.style.display = '';
  }

  function setItem(idx, instant) {
    if (!live) return;
    live.idx = idx;
    var item = live.items[idx];
    if (item.img) {
      if (gl && live.obj) { pivot.remove(live.obj); live.obj = null; }
      live.obj = null;
      swap = null;
      showPhoto(item, instant);
      return;
    }
    if (!gl) return;
    hidePhoto();
    var next = build(live.key, item);
    if (instant || RM) {
      if (live.obj) pivot.remove(live.obj);
      pivot.add(next); live.obj = next;
      caption(next.userData.name);
    } else {
      swap = { from: live.obj, to: next, t0: performance.now() };
      pivot.add(next);
      next.scale.setScalar(.0001);
    }
  }

  function caption(text) {
    if (!live || !live.slot) return;
    var c = live.slot.parentNode.querySelector('.art__cap');
    if (!c) return;
    c.textContent = '';
    String(text || '').split('\u02BB').forEach(function (part, i) {   // oʻ / gʻ, tightened like the rest
      if (i) { var m = document.createElement('i'); m.className = 'uz'; m.textContent = '\u02BB'; c.appendChild(m); }
      if (part) c.appendChild(document.createTextNode(part));
    });
  }

  function fit() {
    if (!gl || !live || !live.slot) return;
    var r = live.slot.getBoundingClientRect();
    if (!r.width || !r.height) return;
    renderer.setSize(r.width, r.height, false);   // CSS owns the element size
    cam.aspect = r.width / r.height;
    cam.updateProjectionMatrix();
    if (live && live.obj) frame3d(live.obj);
  }

  // --- public -------------------------------------------------------------
  function enter(slideEl, slideMs) {
    var slot = slideEl.querySelector('[data-3d]');
    if (!slot) { leave(); return; }
    var key = slot.getAttribute('data-3d');
    var list = items(key);
    if (!list || !list.length) {                       // nothing to show: the drawing comes back
      leave();
      slideEl.classList.remove('has3d');               // even when this slide was never live
      return;
    }

    // this visit's share of the range, starting where the last visit stopped
    var ms = slideMs || LAST_MS, take = Math.max(1, Math.min(list.length, Math.floor(ms / PER_ITEM)));
    var from = CURSOR[key] || 0, pick = [];
    for (var i = 0; i < take; i++) pick.push(list[(from + i) % list.length]);
    CURSOR[key] = (from + take) % list.length;
    LAST_MS = ms;

    if (gl) { canvas.classList.add('pending'); slot.appendChild(canvas); }
    slideEl.classList.remove('has3d');            // the drawing holds the slot until we have drawn
    live = { key: key, slot: slot, slideEl: slideEl, ms: ms, items: pick, idx: -1,
             dur: ms / pick.length, born: performance.now() };
    if (gl) {
      if (live.obj) { pivot.remove(live.obj); live.obj = null; }
      while (pivot.children.length) pivot.remove(pivot.children[0]);
    }
    live.obj = null;
    swap = null;
    if (gl) fit();
    setItem(0, true);
    start();
  }

  // Freeze the current frame into the slide being left, so the seam still has
  // something to wipe away while the live canvas moves on.

  function leave() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
    if (live && live.slideEl) live.slideEl.classList.remove('has3d');   // the drawing comes back
    live = null; swap = null; stop();
  }

  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!live) return;

    // the carousel runs whether the item is a model or a photograph
    if (!swap && live.items.length > 1 && now - live.born > live.dur * (live.idx + 1)) {
      setItem((live.idx + 1) % live.items.length);
    }
    if (!gl || !live.obj) return;
    if (now - last < 33) return;              // 30fps is plenty for a turntable
    last = now;

    var t = now / 1000;
    if (swap) {                                // 700ms hand-over, in place
      var k = Math.min(1, (now - swap.t0) / 700);
      var ease = function (u) { return u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2; };
      var outp = ease(Math.min(1, k / .6));            // one leaves over the first 60%
      var inp  = ease(Math.max(0, (k - .4) / .6));     // the next arrives over the last 60%
      if (swap.from) {
        swap.from.scale.setScalar(Math.max(.0001, swap.from.userData.k * (1 - outp)));
        swap.from.rotation.y = outp * 1.15;
      }
      swap.to.scale.setScalar(Math.max(.0001, swap.to.userData.k * inp));
      swap.to.rotation.y = (1 - inp) * -1.15;
      if (outp >= 1 && swap.from) { pivot.remove(swap.from); swap.from = null; caption(swap.to.userData.name); }
      if (k >= 1) {
        live.obj = swap.to;
        swap.to.scale.setScalar(swap.to.userData.k);
        swap.to.rotation.y = 0;
        swap = null;
      }
    }

    if (!RM) {
      pivot.rotation.y = Math.sin(t * .23) * SWING_Y * .72 + Math.sin(t * .097) * SWING_Y * .28;
      pivot.rotation.x = Math.sin(t * .15) * SWING_X * .7  + Math.sin(t * .064) * SWING_X * .3;
      pivot.rotation.z = Math.sin(t * .081) * SWING_Z;
      pivot.position.y = Math.sin(t * .19) * BOB * .7 + Math.sin(t * .053) * BOB * .3;
    }
    renderer.render(scene, cam);
    if (canvas.classList.contains('pending')) {  // first real frame: now hide the drawing
      canvas.classList.remove('pending');
      live.slideEl.classList.add('has3d');
    }
  }

  function start() { if (!raf && !document.hidden) { last = 0; raf = requestAnimationFrame(frame); } }
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else if (live) start();
  });
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  // Build every model and compile every shader up front, in small idle
  // slices, so a slide's first visit never has to do it in front of the
  // customer. Runs while the hero is on screen, which has no 3D of its own.
  function warm() {
    if (!gl) return;
    var jobs = [];
    Object.keys(CATALOG).forEach(function (key) {
      CATALOG[key].forEach(function (item) { jobs.push([key, item]); });
    });
    var later = window.requestIdleCallback || function (f) { setTimeout(f, 40); };
    (function step() {
      if (!gl || !jobs.length) return;
      var j = jobs.shift(), holder = build(j[0], j[1]);
      if (!live || !live.obj) {                           // never disturb a slide being shown
        pivot.add(holder);
        try { renderer.compile(scene, cam); } catch (e) {}
        pivot.remove(holder);
      }
      later(step);
    })();
  }

  return {
    warm: warm,
    // CONFIG.rasm -> { key: [{ img, n }] }; a slide with photos shows those
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
    init: function () { var t0 = performance.now(); gl = boot(); T.init = Math.round(performance.now() - t0); return gl; },
    probe: function (fn) { if (live && live.obj) return fn(live.obj, THREE, scene, cam, renderer, canvas); },
    debug: function () {
      var mem = gl && renderer ? renderer.info.memory : null;
      var fr  = gl && renderer ? renderer.info.render.frame : 0;
      if (!live) return { gl: gl, live: false, geometries: mem && mem.geometries, textures: mem && mem.textures, frames: fr, initMs: T.init };
      var o = live.obj, b = o ? new THREE.Box3().setFromObject(o) : null, sz = new THREE.Vector3();
      if (b) b.getSize(sz);
      return { key: live.key, idx: live.idx, kids: pivot.children.length,
               geometries: mem && mem.geometries, textures: mem && mem.textures, frames: fr, initMs: T.init,
               scale: o ? +o.scale.x.toFixed(4) : null,
               pos: o ? [+o.position.x.toFixed(2), +o.position.y.toFixed(2)] : null,
               worldSize: b ? [+sz.x.toFixed(2), +sz.y.toFixed(2), +sz.z.toFixed(2)] : null,
               aspect: +cam.aspect.toFixed(3), swapping: !!swap };
    },
    enter: enter, leave: leave, fit: fit,
    available: function () { return gl; }
  };
})();
