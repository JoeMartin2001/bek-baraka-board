const fs=require('fs'); const PORT=9333, URL_=process.argv[2], OUT=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:URL_}); await sleep(2500);

  // Freeze the cut at a chosen progress by pausing every running animation.
  for (const at of [180, 330, 470, 640]) {
    await send("Page.navigate",{url:URL_}); await sleep(2400);
    await js("dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))");
    await sleep(at);
    await js("document.getAnimations().forEach(function(a){a.pause()})");
    await sleep(120);
    const r=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(`${OUT}/cut-${at}ms.png`, Buffer.from(r.data,'base64'));
  }
  console.log('ok'); ws.close(); process.exit(0);
})();
