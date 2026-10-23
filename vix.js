(() => {
 'use strict';
 let loaded=false,pending=false;
 const $=id=>document.getElementById(id);
 window.InvestVix={async load(force=false){
  if(pending||(loaded&&!force))return;
  pending=true;$('vix-chart-status').textContent='正在加载 Cboe 官方日线…';
  try{
   const response=await fetch('./assets/vix.json',{cache:'no-cache',signal:AbortSignal.timeout(12000)});
   if(!response.ok)throw new Error('加载失败');
   const data=await response.json();
   const bars=data.bars?.filter(b=>/^\d{4}-\d{2}-\d{2}$/.test(b.date)&&[b.open,b.high,b.low,b.close].every(n=>Number.isFinite(n)&&n>0)&&b.high>=Math.max(b.open,b.close)&&b.low<=Math.min(b.open,b.close)).sort((a,b)=>a.date.localeCompare(b.date));
   if(!bars||bars.length<2)throw new Error('数据不足');
   const last=bars.at(-1),previous=bars.at(-2),change=last.close-previous.close,percent=change/previous.close*100;
   $('vix-value').textContent=last.close.toFixed(2);
   $('vix-change').textContent=(change>0?'+':'')+change.toFixed(2)+' ('+(percent>0?'+':'')+percent.toFixed(2)+'%) · 对比前收盘';
   $('vix-change').dataset.direction=change>0?'up':change<0?'down':'flat';
   $('vix-time').textContent='最近收盘日期：'+last.date+'（美东交易日）';
   window.InvestCharts.draw('vix',bars,{name:'VIX 恐慌指数'});
   $('vix-chart-status').textContent='';loaded=true;
  }catch{$('vix-chart-status').textContent='VIX 数据加载失败，请点击上方“刷新行情”重试。';}
  finally{pending=false;}
 }};
})();
