/* Confirms the slot never goes empty: a slide with photographs shows one and
   hides its drawing, a slide without keeps the drawing. */
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
  console.log('photo shown   :', await js("(function(){var i=document.querySelector('.s-phones .art__photo');return !!i&&i.naturalWidth>0})()"));
  console.log('drawing hidden:', await js("getComputedStyle(document.querySelector('.s-phones .art__in > svg')).opacity"));
  console.log('caption       :', await js("document.querySelector('.s-phones .art__cap').textContent"));
  console.log('no canvas     :', await js("document.querySelectorAll('.art__in canvas').length===0"));
  await send('Page.navigate',{url:BASE+'?slide=3&still=1'}); await sleep(2000);
  console.log('gaming photo  :', await js("(function(){var i=document.querySelector('.s-game .art__photo');return !!i&&i.naturalWidth>0})()"));
  console.log('gaming caption:', await js("document.querySelector('.s-game .art__cap').textContent"));
  // a slide pointed at a file that is not there must keep its drawing
  await send('Page.navigate',{url:BASE+'?slide=3&still=1'}); await sleep(800);
  await js("Slot.setPhotos({gaming:[{rasm:'assets/products/yoq.png',nom:'Yoʻq'}]});Slot.enter(document.querySelector('.s-game'),7000)");
  await sleep(1500);
  console.log('missing file  :', await js("JSON.stringify({drawing:getComputedStyle(document.querySelector('.s-game .art__in > svg')).opacity,cap:document.querySelector('.s-game .art__cap').textContent})"));
  const s=await send('Page.captureScreenshot',{format:'png'});
  fs.writeFileSync(`${OUT}/fallback.png`,Buffer.from(s.data,'base64'));
  console.log(probs.length?'PROBLEMS:\n'+probs.join('\n'):'no exceptions');
  ws.close(); process.exit(0);
})();
