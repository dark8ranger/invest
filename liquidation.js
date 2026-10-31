(() => {
 'use strict';
 const $=id=>document.getElementById(id), periods=[1,4,12,24];
 const symbols=new Map(['BTC','ETH','SOL'].flatMap(coin=>['USDT','USDC'].map(quote=>[coin+quote,coin])));
 let active=false,socket=null,retry=null,timer=null,start=0,events=[],hours=24,connected=false;
 const money=n=>'$'+(n>=1e8?(n/1e8).toFixed(2)+'亿':n>=1e4?(n/1e4).toFixed(2)+'万':n.toLocaleString('en-US',{maximumFractionDigits:0}));
 function selected(h){const since=Date.now()-h*3600000;return events.filter(e=>e.time>=since);}
 function totals(list){return list.reduce((a,e)=>{a[e.long?'long':'short']+=e.value;return a;},{long:0,short:0});}
 function render(){
  const now=Date.now();events=events.filter(e=>e.time>now-86400000);
  const list=selected(hours), map=new Map();
  for(const e of list){if(!map.has(e.symbol))map.set(e.symbol,{symbol:e.symbol,long:0,short:0});map.get(e.symbol)[e.long?'long':'short']+=e.value;}
  const rows=[...map.values()].map(r=>({...r,total:r.long+r.short})).sort((a,b)=>b.total-a.total);
  const host=$('liq-map');host.replaceChildren();
  if(!rows.length){const p=document.createElement('p');p.className='liq-empty';p.textContent=connected?'正在监听真实爆仓事件，尚无可展示记录。':'暂无已采集数据；连接成功后自动显示真实事件。';host.append(p);}
  else{
   // Recursive balanced partitions preserve the relative area of each coin.
   function tile(items,x,y,w,h){
    if(items.length===1){const r=items[0],el=document.createElement('div');el.className='liq-tile';el.style.cssText=`left:${x}%;top:${y}%;width:${w}%;height:${h}%;background:${r.long>=r.short?'#21a58f':'#ef354e'}`;el.title=`${r.symbol} · ${money(r.total)} · 多单 ${(r.long/r.total*100).toFixed(1)}%`;
     const b=document.createElement('strong');b.textContent=r.symbol.replace(/USDT$|USDC$/,'');const v=document.createElement('span');v.textContent=money(r.total);el.append(b,v);if(w*h>700){const p=document.createElement('small');p.textContent='多单 '+(r.long/r.total*100).toFixed(1)+'%';el.append(p);}host.append(el);return;
    }
    const sum=items.reduce((s,r)=>s+r.total,0);let acc=0,i=0;while(i<items.length-1&&acc<sum/2){acc+=items[i++].total;}const ratio=acc/sum;
    if(w*1.6>=h){tile(items.slice(0,i),x,y,w*ratio,h);tile(items.slice(i),x+w*ratio,y,w*(1-ratio),h);}else{tile(items.slice(0,i),x,y,w,h*ratio);tile(items.slice(i),x,y+h*ratio,w,h*(1-ratio));}
   }
   tile(rows,0,0,100,100);
  }
  for(const h of periods){const t=totals(selected(h)),sum=t.long+t.short;$('liq-total-'+h).textContent=money(sum);$('liq-long-'+h).textContent=money(t.long);$('liq-short-'+h).textContent=money(t.short);$('liq-bar-'+h).style.width=(sum?t.long/sum*100:0)+'%';}
  const total=totals(list),sum=total.long+total.short;$('liq-detail').textContent=list.length?`所选窗口已采集 ${list.length} 条抽样事件 · 多单 ${sum?(total.long/sum*100).toFixed(1):0}% · 空单 ${sum?(total.short/sum*100).toFixed(1):0}%`:'尚无事件，不代表市场没有爆仓。';
  $('liq-coverage').textContent=start?'本次连续采集开始：'+new Date(start).toLocaleString('zh-CN',{hour12:false})+' · 不补齐打开页面之前的数据。':'';
 }
 function connect(){
  if(!active)return;
  $('liq-status').textContent='正在连接 Binance 公开爆仓流…';
  try{const ws=new WebSocket('wss://fstream.binance.com/market/stream');socket=ws;
   ws.onopen=()=>{if(socket!==ws)return;ws.send(JSON.stringify({method:'SUBSCRIBE',params:[...symbols.keys()].map(symbol=>symbol.toLowerCase()+'@forceOrder'),id:1}));connected=true;$('liq-status').textContent='● 已连接 · Binance USDⓈ-M 抽样爆仓流';};
   ws.onmessage=message=>{if(socket!==ws||!active)return;try{const raw=JSON.parse(message.data),payload=raw.data||raw;for(const data of Array.isArray(payload)?payload:[payload]){const o=data.o;if(data.e!=='forceOrder'||!o||!['BUY','SELL'].includes(o.S)||!symbols.has(o.s))continue;const value=Number(o.ap)*Number(o.z),time=Number(o.T);if(!Number.isFinite(value)||value<=0||!Number.isFinite(time)||Math.abs(Date.now()-time)>86400000)continue;events.push({symbol:symbols.get(o.s),value,time,long:o.S==='SELL'});}render();}catch{}};
   ws.onerror=()=>{if(socket===ws)$('liq-status').textContent='连接异常，请检查网络；数据未更新。';};
   ws.onclose=()=>{if(socket!==ws)return;connected=false;$('liq-status').textContent='连接已断开，5 秒后重连；重连期间存在数据缺口。';if(active)retry=setTimeout(connect,5000);};
  }catch{$('liq-status').textContent='当前浏览器无法连接公开数据流。';}
 }
 document.querySelectorAll('[data-liq-hours]').forEach(button=>button.onclick=()=>{hours=Number(button.dataset.liqHours);document.querySelectorAll('[data-liq-hours]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));render();});
 window.InvestLiquidation={setActive(value){if(active===value)return;active=value;$('liquidation-overview').hidden=!active;clearTimeout(retry);clearInterval(timer);if(!active){const ws=socket;socket=null;connected=false;if(ws)ws.close();return;}events=[];start=Date.now();render();connect();timer=setInterval(render,10000);}};
})();
