
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
  var live = null;          // { key, items, idx, dur, obj, born }
  var swap = null;          // { from, to, t0 }
  var last = 0, raf = 0;

  // --- materials ----------------------------------------------------------
  var M = {};
  function mats() {
    M.dark  = new THREE.MeshPhysicalMaterial({ color: 0x3a3e46, metalness: .78, roughness: .38, clearcoat: .5, clearcoatRoughness: .3 });
    M.steel = new THREE.MeshStandardMaterial({ color: 0xb4bac0, metalness: .85, roughness: .3 });
    M.gold  = new THREE.MeshStandardMaterial({ color: 0xE8B23C, metalness: .88, roughness: .24 });
    M.teal  = new THREE.MeshStandardMaterial({ color: 0x2BB3A3, metalness: .85, roughness: .28 });
    M.white = new THREE.MeshPhysicalMaterial({ color: 0xf2f2f0, metalness: .05, roughness: .28, clearcoat: .8 });
    M.black = new THREE.MeshBasicMaterial({ color: 0x000000 });
    M.glass = new THREE.MeshPhysicalMaterial({ transmission: .94, thickness: .08, roughness: .06, metalness: 0, ior: 1.5, color: 0xffffff });
    M.rubber= new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: .2, roughness: .7 });
  }

  // A studio painted into a canvas: one broad warm strip overhead, a cool
  // kicker behind. PMREM turns it into the reflections the metal needs.
  function studio() {
    var c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    var g = c.getContext('2d');
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

  function airpods() {
    var g = new THREE.Group();
    var c = box(1.5, 1.22, 1.12, .34, M.white); g.add(c);          // case
    var lid = new THREE.Mesh(new THREE.BoxGeometry(1.44, .02, 1.06), M.steel);
    lid.position.y = .34; g.add(lid);                               // hinge seam
    var led = new THREE.Mesh(new THREE.CircleGeometry(.045, 16), new THREE.MeshBasicMaterial({ color: 0x8bd6a0 }));
    led.position.set(0, -.1, .565); g.add(led);
    [-.42, .42].forEach(function (x) {                              // two buds, out of the case
      var b = new THREE.Group();
      var bud = new THREE.Mesh(new THREE.SphereGeometry(.27, 24, 18), M.white);
      bud.scale.set(1, .82, .9); bud.position.y = .42; b.add(bud);
      var stem = box(.16, .95, .16, .075, M.white);
      stem.position.set(0, -.2, -.02); b.add(stem);
      var tip = new THREE.Mesh(new THREE.SphereGeometry(.145, 16, 12), M.rubber);
      tip.position.set(x > 0 ? .2 : -.2, .48, .02); tip.scale.set(.9, 1, .8); b.add(tip);
      b.position.set(x * 2.25, .18, .05);
      b.rotation.z = x > 0 ? -.2 : .2;
      g.add(b);
    });
    return g;
  }

  function powerbank() {
    var g = new THREE.Group();
    g.add(box(1.9, 3.0, .82, .22, M.dark));
    var panel = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), lit('232,178,60', .5));
    panel.position.z = .42; panel.position.y = .45; g.add(panel);
    for (var i = 0; i < 4; i++) {                                   // charge dots
      var d = new THREE.Mesh(new THREE.CircleGeometry(.055, 14), new THREE.MeshBasicMaterial({ color: 0xE8B23C }));
      d.position.set(-.33 + i * .22, -.95, .42); g.add(d);
    }
    [-.45, .0, .45].forEach(function (x, i) {                        // ports
      var p = new THREE.Mesh(new THREE.BoxGeometry(i === 1 ? .3 : .24, .12, .1), M.black);
      p.position.set(x, 1.52, 0); g.add(p);
    });
    return g;
  }

  function charger() {
    var g = new THREE.Group();
    g.add(box(1.5, 1.5, 1.1, .3, M.white));
    [-.3, .3].forEach(function (x) {                                 // prongs
      var p = new THREE.Mesh(new THREE.CylinderGeometry(.075, .075, .8, 14), M.steel);
      p.position.set(x, 1.1, 0); g.add(p);
    });
    var usb = new THREE.Mesh(new THREE.BoxGeometry(.34, .13, .1), M.black);
    usb.position.set(0, -.76, 0); g.add(usb);
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

  function monoblok() {
    var g = new THREE.Group();
    var shell = slab(4.4, 2.8, .3, .12, M.dark); shell.position.y = 1.1; g.add(shell);
    var s = new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.5), lit('43,179,163', .68));
    s.position.set(0, 1.1, .16); g.add(s);
    var neck = box(.5, .95, .22, .06, M.steel); neck.position.set(0, -.72, -.15); g.add(neck);
    var foot = box(1.9, .12, 1.0, .05, M.steel); foot.position.set(0, -1.24, .05); g.add(foot);
    var kb = box(2.9, .1, .95, .04, M.dark); kb.position.set(0, -1.24, 1.5); g.add(kb);
    g.position.y = -.35;
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

  function deskset() {
    var g = new THREE.Group();
    var t = tower(); t.scale.setScalar(.62); t.position.set(-2.35, -.55, 0); g.add(t);
    var m = monoblok(); m.position.set(1.15, .1, 0); m.scale.setScalar(.82); g.add(m);
    return g;
  }

  function passport() {
    var g = new THREE.Group();
    var cover = slab(2.1, 2.9, .18, .1, new THREE.MeshStandardMaterial({ color: 0x123024, metalness: .3, roughness: .6 }));
    cover.rotation.z = .06; g.add(cover);
    var emblem = new THREE.Mesh(new THREE.TorusGeometry(.36, .045, 10, 28), M.gold);
    emblem.position.set(0, .35, .1); emblem.rotation.z = .06; g.add(emblem);
    var card = slab(2.4, 1.5, .07, .11, M.white);
    card.position.set(1.15, -.85, .3); card.rotation.z = -.05; g.add(card);
    var photo = new THREE.Mesh(new THREE.PlaneGeometry(.58, .74), M.rubber);
    photo.position.set(.52, -.83, .34); photo.rotation.z = -.05; g.add(photo);
    return g;
  }

  var CATALOG = {
    nasiya:    [{ n: 'Pasport va 50%',   b: passport }],
    telefon:   [{ n: 'iPhone 18 Pro',    b: function () { return phone(0x6d6a68); } },
                { n: 'iPhone 18',        b: function () { return phone(0x2c3d5a); } },
                { n: 'Smartfonlar',      b: function () { return phone(0x14140f); } }],
    aksessuar: [{ n: 'AirPods',          b: airpods },
                { n: 'Quvvat banki',     b: powerbank },
                { n: 'Zaryadlagich',     b: charger }],
    gaming:    [{ n: 'Oʻyin noutbugi',   b: function () { return laptop({ glow: true }); } },
                { n: 'Oʻyin kompyuteri', b: tower }],
    ofis:      [{ n: 'Noutbuk',          b: function () { return laptop({}); } },
                { n: 'Monoblok',         b: monoblok }],
    desktop:   [{ n: 'Kompyuter toʻplami', b: deskset }]
  };

  // --- lifecycle ----------------------------------------------------------
  function boot() {
    if (typeof THREE === 'undefined' || !THREE.WebGLRenderer) return false;
    canvas = document.createElement('canvas');
    canvas.className = 'stage3d';
    try {
      renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    } catch (e) { return false; }
    if (!renderer.getContext()) return false;
    renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.outputColorSpace = THREE.SRGBColorSpace;

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
    var ph = PHOTOS[key];
    if (ph && ph.length) return ph;        // real photos win over the models
    return gl ? CATALOG[key] : null;
  }

  function build(key, idx) {
    var item = live.items[idx];
    var holder = new THREE.Group();
    holder.add(item.b());
    holder.userData.name = item.n;
    frame3d(holder);
    return holder;
  }

  // Centre the object on the origin and scale it so it fills the slot, leaving
  // room for the turntable swing to carry it round without clipping.
  function frame3d(holder) {
    var inner = holder.children[0];
    if (!inner) return;
    inner.position.set(0, 0, 0);
    inner.scale.setScalar(1);
    var b = new THREE.Box3().setFromObject(inner);
    var size = new THREE.Vector3(), mid = new THREE.Vector3();
    b.getSize(size); b.getCenter(mid);
    inner.position.set(-mid.x, -mid.y, -mid.z);
    var vh = 2 * cam.position.z * Math.tan(cam.fov * Math.PI / 360);
    var vw = vh * cam.aspect;
    var span = Math.max(size.x, size.z);          // the swing shows depth as width
    var k = Math.min(vh * .80 / (size.y || 1), vw * .82 / (span || 1));
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
    if (!instant && !RM) {
      img.classList.remove('in');
      void img.offsetWidth;
      img.classList.add('in');
    } else { img.classList.add('in'); }
    caption(item.n);
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
    var next = build(live.key, idx);
    if (instant || RM) {
      if (live.obj) pivot.remove(live.obj);
      pivot.add(next); live.obj = next;
      caption(next.userData.name);
    } else {
      var vh = 2 * cam.position.z * Math.tan(cam.fov * Math.PI / 360);
      swap = { from: live.obj, to: next, t0: performance.now(), span: vh * cam.aspect * 1.25 };
      pivot.add(next);
      next.position.x = swap.span;
    }
  }

  function caption(text) {
    if (!live || !live.slot) return;
    var c = live.slot.parentNode.querySelector('.art__cap');
    if (c) c.textContent = text || '';
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
    if (!list || !list.length) { leave(); return; }   // nothing to show: the drawing stays

    if (gl) slot.appendChild(canvas);
    slideEl.classList.add('has3d');
    live = { key: key, slot: slot, items: list, idx: -1,
             dur: Math.max(1800, (slideMs || 9000) / list.length), born: performance.now() };
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
  function snapshot(slideEl) {
    if (!gl || !slideEl || !live || !live.obj) return;   // photos keep their own <img>
    var img = slideEl.querySelector('.art__snap');
    if (!img || !canvas.width) return;
    try {
      renderer.render(scene, cam);
      img.src = canvas.toDataURL('image/png');
      slideEl.classList.add('snapped');
    } catch (e) { /* tainted or lost context: just let the drawing show */ }
  }

  function leave() {
    if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
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
    if (swap) {                                // 620ms hand-over between products
      var k = Math.min(1, (now - swap.t0) / 620);
      var e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
      var span = swap.span;
      if (swap.from) {
        swap.from.position.x = -e * span;
        swap.from.rotation.y = -e * .7;
      }
      swap.to.position.x = (1 - e) * span;
      swap.to.rotation.y = (1 - e) * .7;
      swap.to.scale.setScalar(swap.to.userData.k);
      if (k >= .45 && swap.from) { pivot.remove(swap.from); swap.from = null; caption(swap.to.userData.name); }
      if (k >= 1) { live.obj = swap.to; swap.to.position.x = 0; swap.to.rotation.y = 0; swap = null; }
    }

    if (!RM) {
      pivot.rotation.y = Math.sin(t * .34) * .42;
      pivot.rotation.x = Math.sin(t * .21) * .07;
      pivot.position.y = Math.sin(t * .27) * .12;
    }
    renderer.render(scene, cam);
  }

  function start() { if (!raf) { last = 0; raf = requestAnimationFrame(frame); } }
  function stop()  { if (raf) { cancelAnimationFrame(raf); raf = 0; } }

  return {
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
    init: function () { gl = boot(); return gl; },
    probe: function (fn) { if (live && live.obj) return fn(live.obj, THREE, scene, cam, renderer, canvas); },
    debug: function () {
      if (!live) return { gl: gl, live: false };
      var o = live.obj, b = o ? new THREE.Box3().setFromObject(o) : null, sz = new THREE.Vector3();
      if (b) b.getSize(sz);
      return { key: live.key, idx: live.idx, kids: pivot.children.length,
               scale: o ? +o.scale.x.toFixed(4) : null,
               pos: o ? [+o.position.x.toFixed(2), +o.position.y.toFixed(2)] : null,
               worldSize: b ? [+sz.x.toFixed(2), +sz.y.toFixed(2), +sz.z.toFixed(2)] : null,
               aspect: +cam.aspect.toFixed(3), swapping: !!swap };
    },
    enter: enter, leave: leave, snapshot: snapshot, fit: fit,
    available: function () { return gl; }
  };
})();
