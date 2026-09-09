/* Streams frames while one cut plays, so the seam can be judged as motion. */
const fs = require('fs');
const PORT = 9333, URL_ = process.argv[2], OUT = process.argv[3];
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let list;
  for (let i = 0; i < 40; i++) {
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if (list.length) break; } catch (e) {}
    await sleep(250);
  }
  const ws = new WebSocket(list.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); const frames = [];
  let capturing = false, t0 = 0;
  ws.addEventListener('message', ev => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) { pending.get(m.id)(m.result); pending.delete(m.id); }
    if (m.method === 'Page.screencastFrame') {
      if (capturing) frames.push({ t: Date.now() - t0, data: m.params.data });
      ws.send(JSON.stringify({ id: ++id, method: 'Page.screencastFrameAck',
                               params: { sessionId: m.params.sessionId } }));
    }
  });
  const send = (method, params = {}) => new Promise(r => {
    const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params }));
  });

  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: URL_ });
  await sleep(3000);
  await send('Page.startScreencast', { format: 'jpeg', quality: 82, everyNthFrame: 1, maxWidth: 1280, maxHeight: 720 });
  await sleep(400);
  capturing = true; t0 = Date.now();
  await send('Runtime.evaluate', { expression: "dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))" });
  await sleep(1500);
  capturing = false;
  await send('Page.stopScreencast');
  frames.forEach((f, i) => fs.writeFileSync(`${OUT}/f${String(i).padStart(3,'0')}_${f.t}ms.jpg`, Buffer.from(f.data,'base64')));
  console.log('frames captured:', frames.length, '| times(ms):', frames.map(f=>f.t).join(','));
  ws.close(); process.exit(0);
})();
