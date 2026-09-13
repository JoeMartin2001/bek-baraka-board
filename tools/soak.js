/* Runs the loop fast for a while and samples everything that could grow:
   live Animation objects, GPU geometries and textures, JS heap. Anything
   that climbs with laps is a leak, and leaks are what "gets messy after a
   couple of loops" looks like. */
const PORT=9333, BASE=process.argv[2], SECS=+(process.argv[3]||60);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map(); const probs=[];
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data);
    if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);}
    if(m.method==='Runtime.exceptionThrown') probs.push(((m.params.exceptionDetails.exception||{}).description||'').split('\n')[0]);});
  const send=(m,p={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method:m,params:p}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true}).then(r=>r.result&&r.result.value);
  await send('Page.enable'); await send('Runtime.enable'); await send('Performance.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'?sek=1.2'}); await sleep(2500);
  const sample=async()=>{
    const m=(await send('Performance.getMetrics')).metrics; const o={}; m.forEach(x=>o[x.name]=x.value);
    const d=JSON.parse(await js("JSON.stringify(Stage3D.debug())"));
    return { anims: await js("document.getAnimations().length"),
             geom: d.geometries, tex: d.textures,
             heapMB: +(o.JSHeapUsedSize/1048576).toFixed(1),
             nodes: o.Nodes, layers: o.LayoutObjects,
             slide: await js("document.getElementById('board').dataset.slide") };
  };
  console.log('   t   slide  animations  geometries  textures  heapMB   nodes');
  const t0=Date.now();
  while(Date.now()-t0 < SECS*1000){
    const s=await sample();
    console.log(String(Math.round((Date.now()-t0)/1000)).padStart(4)+'s   '+String(s.slide).padStart(3)+
      String(s.anims).padStart(12)+String(s.geom).padStart(12)+String(s.tex).padStart(10)+
      String(s.heapMB).padStart(8)+String(s.nodes).padStart(8));
    await sleep(10000);
  }
  console.log(probs.length?'PROBLEMS: '+probs.slice(0,3).join(' | '):'no exceptions');
  ws.close(); process.exit(0);
})();
