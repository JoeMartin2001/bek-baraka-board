/* Confirms the board degrades to its engraved drawings when WebGL is absent. */
const fs=require('fs'); const PORT=9333, BASE=process.argv[2], OUT=process.argv[3];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map(); const probs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown') probs.push('EXC: '+((m.params.exceptionDetails.exception||{}).description||'').split('\n')[0]);});
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true}).then(r=>r.result&&r.result.value);
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'?slide=4&still=1'}); await sleep(2800);
  console.log('WebGL present :', await js("(function(){var c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))})()"));
  console.log('Stage3D active:', await js("Stage3D.available()"));
  console.log('slide has3d   :', await js("document.querySelector('.s-phones').classList.contains('has3d')"));
  console.log('svg visible   :', await js("getComputedStyle(document.querySelector('.s-phones .art__in > svg')).visibility"));
  console.log('canvas in DOM :', await js("!!document.querySelector('canvas.stage3d')"));
  const s=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(`${OUT}/fallback.png`,Buffer.from(s.data,'base64'));
  console.log(probs.length?'PROBLEMS:\n'+probs.join('\n'):'no exceptions');
  ws.close(); process.exit(0);
})();
