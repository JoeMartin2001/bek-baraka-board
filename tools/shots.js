const fs=require('fs'); const PORT=9333, BASE=process.argv[2], OUT=process.argv[3];
const N=parseInt(process.argv[4]||'7',10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map(); const problems=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown') problems.push('EXCEPTION: '+(m.params.exceptionDetails.text||''));
    if(m.method==='Log.entryAdded'&&m.params.entry.level==='error') problems.push('LOG: '+m.params.entry.text);
  });
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true}).then(r=>r.result&&r.result.value);
  await send('Page.enable'); await send('Runtime.enable'); await send('Log.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  for(let i=1;i<=N;i++){
    await send('Page.navigate',{url:`${BASE}?slide=${i}&still=1`});
    await sleep(3200);
    const r=await send('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(`${OUT}/f${i}.png`,Buffer.from(r.data,'base64'));
    const brand=await js("document.getElementById('board').dataset.brand");
    const over=await js("document.documentElement.scrollWidth-document.documentElement.clientWidth");
    console.log(`slide ${i}  brand=${brand}  hOverflow=${over}`);
  }
  console.log(problems.length?'PROBLEMS:\n'+problems.join('\n'):'no console errors or exceptions');
  ws.close(); process.exit(0);
})();
