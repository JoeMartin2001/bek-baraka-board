const PORT=9333, URL_=process.argv[2];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
  let list; for(let i=0;i<40;i++){ try{list=await(await fetch(`http://127.0.0.1:${PORT}/json/list`)).json(); if(list.length)break;}catch(e){} await sleep(250);}
  const ws=new WebSocket(list.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r));
  let id=0; const pend=new Map();
  ws.addEventListener('message',ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){pend.get(m.id)(m.result);pend.delete(m.id);} });
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  const js=e=>send('Runtime.evaluate',{expression:e,returnByValue:true}).then(r=>r.result&&r.result.value);
  await send('Page.enable'); await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:URL_}); await sleep(2500);
  await js("dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))");
  await sleep(380);
  console.log(await js(`(function(){
    var s=[].slice.call(document.querySelectorAll('[data-slide-el]'));
    return JSON.stringify(s.map(function(el,i){
      var cs=getComputedStyle(el);
      return {i:i, cls:el.className, z:cs.zIndex, op:cs.opacity, filter:cs.filter,
              clip:cs.clipPath, transform:cs.transform};
    }),null,1);
  })()`));
  ws.close(); process.exit(0);
})();
