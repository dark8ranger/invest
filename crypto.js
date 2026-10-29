(() => {
 'use strict';
 const base='https://data-api.binance.vision/api/v3/';
 const coins=[['btc','BTCUSDT','比特币'],['eth','ETHUSDT','以太坊']];
 let active=false,interval=null,pending=false;
 const chartTimes=new Map();
 const $=id=>document.getElementById(id);
 async function request(path){const response=await fetch(base+path,{signal:AbortSignal.timeout(15000),credentials:'omit'});if(!response.ok)throw new Error('行情请求失败');return response.json();}
 async function price(id,symbol){
  try{
   const data=await request('ticker/24hr?symbol='+symbol);
   const last=Number(data.lastPrice),change=Number(data.priceChangePercent),stamp=Number(data.closeTime);
   if(data.symbol!==symbol||!Number.isFinite(last)||last<=0||!Number.isFinite(change)||!Number.isFinite(stamp)||stamp<=0)throw new Error('行情格式错误');
   $(id+'-value').textContent=last.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
   $(id+'-change').textContent=(change>0?'+':'')+change.toFixed(2)+'% · 24 小时';
   $(id+'-change').dataset.direction=change>0?'up':change<0?'down':'flat';
   $(id+'-time').textContent='行情时间：'+new Date(stamp).toLocaleString('zh-CN',{hour12:false})+'（本地时间）';
  }catch{$(id+'-time').textContent='价格更新失败；原有数值未更新，请刷新重试。';}
 }
 async function chart(id,symbol,name,force){
  if(!force&&Date.now()-(chartTimes.get(id)||0)<300000)return;
  const status=$(id+'-chart-status');status.textContent='正在加载最近 90 天 K 线…';
  try{
   const data=await request('klines?symbol='+symbol+'&interval=1d&limit=90');
   if(!Array.isArray(data))throw new Error('日线格式错误');
   const bars=data.filter(row=>Array.isArray(row)&&Number.isFinite(Number(row[0]))).map(row=>({date:new Date(Number(row[0])).toISOString().slice(0,10),open:Number(row[1]),high:Number(row[2]),low:Number(row[3]),close:Number(row[4])})).filter(b=>[b.open,b.high,b.low,b.close].every(n=>Number.isFinite(n)&&n>0)&&b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close)).sort((a,b)=>a.date.localeCompare(b.date));
   if(bars.length<2)throw new Error('日线不足');
   window.InvestCharts.draw(id,bars,{name,period:'最近 90 天',unit:'天'});
   chartTimes.set(id,Date.now());status.textContent='';
  }catch{status.textContent='K 线加载失败；可刷新重试，或通过下方官网链接查看。';}
 }
 async function refresh(force=false){
  if(!active||pending)return;
  pending=true;$('refresh-crypto').disabled=true;
  try{await Promise.allSettled(coins.flatMap(([id,symbol,name])=>[price(id,symbol),chart(id,symbol,name,force)]));}
  finally{pending=false;$('refresh-crypto').disabled=false;}
 }
 $('refresh-crypto').onclick=()=>refresh(true);
 window.InvestCrypto={setActive(value){active=value;window.InvestLiquidation.setActive(value);$('crypto-overview').hidden=!active;$('crypto-guides').hidden=!active;if(interval!==null){clearInterval(interval);interval=null;}if(active){refresh();interval=setInterval(()=>{if(!document.hidden)refresh();},60000);}}};
})();
