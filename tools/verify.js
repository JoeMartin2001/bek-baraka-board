/* Full regression for the board: sizes, reduced motion, both QRs, the loop.
   Runs against a real Chrome over CDP — headless virtual-time does not drive
   requestAnimationFrame, so timing checks must not use it. */
const fs=require('fs'); const PORT=9333, BASE=process.argv[2], OUT=process.argv[3];
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

  async function at(w,h,url,name,wait=3000){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:false});
    await send('Page.navigate',{url}); await sleep(wait);
    const r=await send('Page.captureScreenshot',{format:'png'});
    if(OUT) fs.writeFileSync(`${OUT}/${name}.png`,Buffer.from(r.data,'base64'));
    const o=await js(`JSON.stringify({dx:document.documentElement.scrollWidth-document.documentElement.clientWidth,
                                      dy:document.documentElement.scrollHeight-document.documentElement.clientHeight})`);
    console.log(`  ${name.padEnd(16)} ${String(w)+'x'+h}`.padEnd(38), 'overflow', o);
  }

  console.log('--- sizes (overflow must be 0,0) ---');
  await at(1366,768, BASE+'?slide=2&still=1','size-1366');
  await at(1920,1080,BASE+'?slide=5&still=1','size-1920');
  await at(3840,2160,BASE+'?slide=6&still=1','size-3840');
  await at(1600,1200,BASE+'?slide=7&still=1','size-4x3');
  await at(2560,1080,BASE+'?slide=1&still=1','size-ultrawide');

  console.log('--- reduced motion ---');
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  await at(1920,1080,BASE+'?slide=2&still=1','rm-2');
  await at(1920,1080,BASE+'?slide=6&still=1','rm-6');
  await send('Emulation.setEmulatedMedia',{features:[]});

  console.log('--- QR canvases ---');
  await send('Emulation.setDeviceMetricsOverride',{width:1920,height:1080,deviceScaleFactor:1,mobile:false});
  await send('Page.navigate',{url:BASE+'?slide=7&still=1'}); await sleep(3000);
  for(const q of ['qr-baraka','qr-nextnout']){
    const d=await js(`document.getElementById('${q}').toDataURL('image/png')`);
    fs.writeFileSync(`${OUT}/${q}.png`, Buffer.from(d.split(',')[1],'base64'));
  }
  console.log('  saved both canvases for decoding');

  console.log('--- unattended loop (sek=2) ---');
  await send('Page.navigate',{url:BASE+'?sek=2'}); await sleep(1200);
  const seen=[];
  for(let i=0;i<22;i++){ seen.push(await js("document.getElementById('board').dataset.slide")); await sleep(800); }
  console.log('  ', seen.join(' '));

  console.log('--- full-speed cycle length ---');
  await send('Page.navigate',{url:BASE}); await sleep(1500);
  const t0=Date.now(); let last='0', laps=0;
  while(Date.now()-t0 < 80000 && laps<1){
    const v=await js("document.getElementById('board').dataset.slide");
    if(last!=='0'&&v==='0') laps++;
    last=v; await sleep(250);
  }
  console.log(`   one full lap: ${((Date.now()-t0)/1000).toFixed(1)}s (7 slides x 9s + cuts)`);

  console.log(problems.length?'PROBLEMS:\n'+problems.join('\n'):'no console errors or exceptions');
  ws.close(); process.exit(0);
})();
