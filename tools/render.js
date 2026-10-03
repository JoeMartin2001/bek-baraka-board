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

  let id = 0; const pend = new Map(); const shots = [];
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
      const file = path.join(RAW, `r${String(n++).padStart(6, '0')}.png`);
      fs.writeFileSync(file, Buffer.from(m.params.data, 'base64'));
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
  const lap = (sek * 1000 + CUT) * slides;
  console.log(`lap ${lap}ms over ${slides} slides, filming at ${FPS}fps`);

  await send('Page.startScreencast', { format: 'png', maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });

  // the lap begins where the cut into the first slide ends
  let was = await js("document.getElementById('board').dataset.slide");
  for (;;) {
    const now = await js("document.getElementById('board').dataset.slide");
    if (now === '0' && was !== '0') break;
    was = now; await sleep(20);
  }
  await sleep(CUT);

  collecting = true;
  const t0 = Date.now() / 1000;
  const until = lap + 400;                              // a little tail, trimmed later
  for (let waited = 0; waited < until; waited += 500) {
    await sleep(500);
    process.stdout.write(`\r  ${shots.length} frames, ${Math.round(waited / 1000)}s of ${Math.round(lap / 1000)}s`);
  }
  collecting = false;
  await send('Page.stopScreencast');
  console.log(`\r  ${shots.length} frames over ${(lap / 1000).toFixed(1)}s`);

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
  fs.writeFileSync(path.join(RAW, 'lap.txt'), String(lap / 1000));
  console.log(`  kept ${kept.length} frames from the lap`);

  ws.close(); process.exit(0);
})();
