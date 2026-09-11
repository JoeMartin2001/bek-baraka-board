/* The pacing is now timers plus a CSS rail, so prove it still advances,
   still honours a manual nudge, and still freezes under ?still=1. */
const PORT=9333, BASE=process.argv[2];
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
  const slide=()=>js("document.getElementById('board').dataset.slide");
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

  await send('Page.navigate',{url:BASE+'?sek=2'}); await sleep(1200);
  const seen=[]; for(let i=0;i<26;i++){ seen.push(await slide()); await sleep(900); }
  console.log('advance  :', seen.join(' '));

  console.log('rail     :', await js("getComputedStyle(document.getElementById('pbar')).animationName"),
              '| plays:', await js("getComputedStyle(document.getElementById('pbar')).animationPlayState"));

  await send('Page.navigate',{url:BASE+'?sek=3'}); await sleep(1500);
  const before=await slide();
  await js("dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))");
  await sleep(1400);
  const after=await slide();
  console.log('nudge    :', before,'->',after,'(advanced once)');
  await sleep(6000);
  const held=await slide();
  console.log('hold     : still', held, held===after ? '(held, as intended)' : '(FAILED: advanced during hold)');
  await sleep(12000);
  console.log('resume   : now', await slide(), '(should have moved on after the 15s hold)');

  await send('Page.navigate',{url:BASE+'?slide=3&still=1'}); await sleep(1200);
  const s1=await slide(); await sleep(6000); const s2=await slide();
  console.log('still=1  :', s1, '->', s2, s1===s2 ? '(frozen, as intended)' : '(FAILED: advanced)');
  console.log(probs.length?'PROBLEMS:\n'+probs.join('\n'):'no exceptions');
  ws.close(); process.exit(0);
})();
