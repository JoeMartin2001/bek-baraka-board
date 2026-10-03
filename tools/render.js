/* Films the board as a seamless looping video.

     sh tools/make-video.sh                      # the whole job, start to finish
     node tools/render.js <url> <rawDir> [fps]   # just the frames

   A television's browser is usually an old WebKit with none of the CSS this
   board leans on, so the board is filmed once here and the set just plays the
   file.

   Frames come from Chrome's screencast and carry their own timestamps. They
   arrive only when something changes, and not on a tidy cadence, so nothing is
   assumed about their spacing: each is written with the time it was taken and
   ffmpeg resamples to an even frame rate afterwards. Stepping a virtual clock
   instead would be neater, but a screenshot taken while that clock is stopped
   never comes back once the page has nothing left to draw.

   Two page-lifetime animations are frozen for the film: the sunburst's slow
   turn and the burn-in drift. Neither completes a whole number of cycles in one
   lap, so leaving them running would make the loop jump. Everything else
   restarts with its slide, so it loops cleanly.

   Filming starts the instant the cut into the first slide finishes and runs
   exactly one lap, so that cut plays again at the end and lands precisely where
   the file wraps. */
const fs = require('fs'), path = require('path');
const PORT = 9333, URL_ = process.argv[2], RAW = process.argv[3], FPS = +(process.argv[4] || 30);
// PNG costs Chrome so much to encode that the screencast could only deliver
// about 23 frames a second, and half the frames in the finished file were
// repeats. JPEG at full quality encodes far faster, keeps the timeline full,
// and is indistinguishable once H.264 has been over it.
const FMT = process.argv[5] || 'jpeg';
const QUAL = +(process.argv[6] || 85);   // intermediate only; H.264 follows
const CUT = 880;                       // the seam, as the engine sets it
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  fs.rmSync(RAW, { recursive: true, force: true });
  fs.mkdirSync(RAW, { recursive: true });

  let list;
  for (let i = 0; i < 60; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.length) break; } catch (e) {}
    await sleep(250);
  }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));

  let id = 0; const pend = new Map(); const shots = []; const writes = [];
  let collecting = false, n = 0;
  ws.addEventListener('close', () => { console.error('\nthe browser connection closed'); process.exit(1); });
  process.on('unhandledRejection', e => { console.error('\n' + ((e && e.stack) || e)); process.exit(1); });

  const send = (m, p = {}) => new Promise((res, rej) => {
    const i = ++id;
    const bell = setTimeout(() => { pend.delete(i); rej(new Error(m + ' never answered')); }, 30000);
    pend.set(i, v => { clearTimeout(bell); res(v); });
    ws.send(JSON.stringify({ id: i, method: m, params: p }));
  });
  const js = e => send('Runtime.evaluate', { expression: e, returnByValue: true }).then(r => {
    if (r && r.exceptionDetails) throw new Error('page threw: ' + (r.exceptionDetails.text || ''));
    return r && r.result && r.result.value;
  });

  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
    if (m.method === 'Page.screencastFrame') {
      send('Page.screencastFrameAck', { sessionId: m.params.sessionId }).catch(() => {});
      if (!collecting) return;
      const file = path.join(RAW, `r${String(n++).padStart(6, '0')}.${FMT === 'jpeg' ? 'jpg' : 'png'}`);
      // off the event loop: a synchronous write here delays the acknowledgement
      // and the next frame with it, which showed up as stalls in the capture
      writes.push(fs.promises.writeFile(file, Buffer.from(m.params.data, 'base64')));
      shots.push({ file: file, t: m.params.metadata.timestamp });
    }
  });

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ });

  for (let i = 0; i < 200; i++) {                       // wait for the board itself
    if (await js("!!(document.getElementById('board') && window.CONFIG)")) break;
    await sleep(100);
  }
  await sleep(1500);                                    // fonts, photographs, first paint

  await js(`(function(){var s=document.createElement('style');
    s.textContent='.slide::before{animation:none!important}.board{animation:none!important}';
    document.head.appendChild(s);})();''`);

  const slides = await js("document.querySelectorAll('[data-slide-el]').length");
  const sek = await js("(function(){var q=new URLSearchParams(location.search);return parseFloat(q.get('sek'))||CONFIG.sekund})()");
  const nominal = (sek * 1000 + CUT) * slides;
  console.log(`about ${nominal}ms over ${slides} slides, filming at ${FPS}fps`);

  // The engine's timers drift a little, so the lap is never exactly the
  // arithmetic figure. Have the page mark every slide change and measure the
  // real one, or the wipe at the end gets clipped and the loop jumps.
  await js(`(function(){window.__marks=[];var b=document.getElementById('board');
    new MutationObserver(function(){window.__marks.push([Date.now()/1000,b.dataset.slide]);})
      .observe(b,{attributes:true,attributeFilter:['data-slide']});})();''`);

  await send('Page.startScreencast', Object.assign(
    { format: FMT, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 },
    FMT === 'jpeg' ? { quality: QUAL } : {}));

  // the lap begins where the cut into the first slide ends
  let was = await js("document.getElementById('board').dataset.slide");
  for (;;) {
    const now = await js("document.getElementById('board').dataset.slide");
    if (now === '0' && was !== '0') break;
    was = now; await sleep(20);
  }
  await sleep(CUT);

  // Nothing talks to the browser while it is filming: asking it anything, even
  // twice a second, was enough to cost a tenth of the frames.
  collecting = true;
  const t0 = Date.now() / 1000;
  for (let waited = 0; waited < nominal + 1500; waited += 500) {
    await sleep(500);
    process.stdout.write(`\r  ${shots.length} frames, ${Math.round(waited / 1000)}s`);
  }
  collecting = false;

  const marks = JSON.parse((await js("JSON.stringify(window.__marks)")) || '[]');
  const back = marks.find(m => m[1] === '0' && m[0] > t0 + 1);
  if (!back) throw new Error('the board never came back round to the first slide');
  const lap = back[0] + CUT / 1000 - t0;
  console.log(`\r  measured lap ${(lap * 1000).toFixed(0)}ms (arithmetic said ${nominal}ms)`);
  await send('Page.stopScreencast');
  await Promise.all(writes);
  console.log(`  ${shots.length} frames over ${lap.toFixed(1)}s ` +
              `(${(shots.length / lap).toFixed(1)}/s captured, ${FPS}/s wanted)`);

  // ffmpeg reads this and resamples it to an even rate
  const kept = shots.filter(s => s.t >= t0);
  if (kept.length < 2) throw new Error('the screencast produced nothing');
  const lines = [];
  for (let i = 0; i < kept.length; i++) {
    const end = (i + 1 < kept.length) ? kept[i + 1].t : kept[i].t + 1 / FPS;
    lines.push(`file '${path.resolve(kept[i].file)}'`, `duration ${(end - kept[i].t).toFixed(6)}`);
  }
  lines.push(`file '${path.resolve(kept[kept.length - 1].file)}'`);
  fs.writeFileSync(path.join(RAW, 'list.txt'), lines.join('\n') + '\n');
  fs.writeFileSync(path.join(RAW, 'lap.txt'), String(lap));
  // what the cadence was, since an uneven one is what a viewer sees as judder
  const gaps = kept.slice(1).map((s, i) => (s.t - kept[i].t) * 1000).sort((a, b) => a - b);
  const at = p => gaps[Math.min(gaps.length - 1, Math.floor(gaps.length * p))];
  const slot = 1000 / FPS;
  console.log(`  kept ${kept.length} frames; gap median ${at(.5).toFixed(1)}ms, ` +
    `p99 ${at(.99).toFixed(1)}ms, max ${gaps[gaps.length - 1].toFixed(1)}ms; ` +
    `${(gaps.filter(g => g > slot).length / gaps.length * 100).toFixed(1)}% longer than a ${FPS}fps slot`);

  ws.close(); process.exit(0);
})();
