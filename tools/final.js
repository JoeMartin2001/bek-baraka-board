const fs=require('fs'); const PORT=9333, BASE=process.argv[2], OUT=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  for(const i of [1,2,3,4]){
    await send('Page.navigate',{url:`${BASE}?slide=${i}&still=1`});
    await sleep(3200);
    const r=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(`${OUT}/f${i}.png`,Buffer.from(r.data,'base64'));
  }
  console.log('ok'); ws.close(); process.exit(0);
})();
