/* Samples main-thread cost over a window. Script/RecalcStyle/Layout are the
   numbers that matter here: GPU cost under headless SwiftShader is nothing
   like a real machine, but main-thread work is. */
const PORT=9333, BASE=process.argv[2], SECS=+(process.argv[3]||10);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}});
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true}).then(r=>r.result&&r.result.value);
  await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});

  const grab=async()=>{
    const m=(await send('Performance.getMetrics')).metrics;
    const o={}; m.forEach(x=>o[x.name]=x.value); return o;
  };
  for(const [label,url] of [['slide 3 (3D laptop)', BASE+'?slide=3&still=1'],
                            ['slide 8 (no 3D)',     BASE+'?slide=8&still=1'],
                            ['full loop',           BASE]]){
    await send('Page.navigate',{url}); await sleep(3500);
    // count rAF callbacks actually firing, as a sanity check on the loops
    await js("window.__f=0;(function c(){window.__f++;requestAnimationFrame(c)})()");
    const a=await grab(); await sleep(SECS*1000); const b=await grab();
    const frames=await js("window.__f");
    const d=(k)=>((b[k]||0)-(a[k]||0));
    const wall=d('Timestamp')||SECS;
    const pct=(k)=>(d(k)/wall*100).toFixed(1).padStart(5)+'%';
    console.log(`${label.padEnd(20)} task${pct('TaskDuration')}  script${pct('ScriptDuration')}` +
                `  style${pct('RecalcStyleDuration')}  layout${pct('LayoutDuration')}` +
                `  | ${(frames/wall).toFixed(0)} rAF/s`);
  }
  ws.close(); process.exit(0);
})();
