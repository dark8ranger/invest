/* Browser-only daily OHLC charts using Tencent Finance's public historical quotes. */
(() => {
 'use strict';
 const cache=new Map(),pending=new Set();
 const ns='http://www.w3.org/2000/svg';
 const number=value=>value.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
 function svgElement(tag,attributes={},text){const element=document.createElementNS(ns,tag);for(const [key,value] of Object.entries(attributes))element.setAttribute(key,String(value));if(text!==undefined)element.textContent=text;return element;}
 function normalize(rows){
  if(!Array.isArray(rows))return [];
  const valid=rows.filter(row=>Array.isArray(row)&&/^\d{4}-\d{2}-\d{2}$/.test(row[0])).map(row=>({date:row[0],open:Number(row[1]),close:Number(row[2]),high:Number(row[3]),low:Number(row[4])})).filter(bar=>[bar.open,bar.close,bar.high,bar.low].every(value=>Number.isFinite(value)&&value>0)&&bar.high>=Math.max(bar.open,bar.close)&&bar.low<=Math.min(bar.open,bar.close)).sort((a,b)=>a.date.localeCompare(b.date));
  const unique=[...new Map(valid.map(bar=>[bar.date,bar])).values()];
  if(!unique.length)return [];
  const cutoff=new Date(unique.at(-1).date+'T00:00:00Z');cutoff.setUTCFullYear(cutoff.getUTCFullYear()-1);
  return unique.filter(bar=>bar.date>=cutoff.toISOString().slice(0,10));
 }
 function draw(id,bars,{name=id==='spx'?'标普 500':'纳斯达克 100',period='最近一年',unit='个交易日'}={}){
  const host=document.getElementById(id+'-chart');
  const details=document.createElement('p');details.className='kline-details';
  const svg=svgElement('svg',{viewBox:'0 0 800 280',role:'img',tabindex:'0','aria-label':name+period+'日K线，左右方向键查看每日开高低收'});
  const left=12,right=720,top=12,bottom=240,width=right-left,height=bottom-top;
  const low=Math.min(...bars.map(b=>b.low)),high=Math.max(...bars.map(b=>b.high)),padding=(high-low)*.07||1,min=low-padding,max=high+padding;
  const y=value=>top+(max-value)/(max-min)*height,step=width/bars.length;
  for(let index=0;index<=4;index++){
   const value=min+(max-min)*index/4,position=y(value);
   svg.append(svgElement('line',{x1:left,y1:position,x2:right,y2:position,class:'kline-grid'}),svgElement('text',{x:right+9,y:position+4,class:'kline-axis'},Math.round(value).toLocaleString('en-US')));
  }
  bars.forEach((bar,index)=>{
   const x=left+(index+.5)*step,up=bar.close>=bar.open,color=up?'#2b9d72':'#d16576';
   svg.append(svgElement('line',{x1:x,y1:y(bar.high),x2:x,y2:y(bar.low),stroke:color,'stroke-width':1}),svgElement('rect',{x:x-Math.max(.7,step*.65)/2,y:y(Math.max(bar.open,bar.close)),width:Math.max(.7,step*.65),height:Math.max(1,Math.abs(y(bar.open)-y(bar.close))),fill:color}));
  });
  [0,Math.floor((bars.length-1)/2),bars.length-1].forEach((index,i)=>svg.append(svgElement('text',{x:left+(index+.5)*step,y:264,'text-anchor':i===0?'start':i===2?'end':'middle',class:'kline-axis'},bars[index].date)));
  const cursor=svgElement('line',{y1:top,y2:bottom,class:'kline-cursor',visibility:'hidden'});svg.append(cursor);
  let selected=bars.length-1;
  function show(index,visible=true){selected=Math.max(0,Math.min(bars.length-1,index));const bar=bars[selected];details.textContent=bar.date+'　开 '+number(bar.open)+'　高 '+number(bar.high)+'　低 '+number(bar.low)+'　收 '+number(bar.close);const x=left+(selected+.5)*step;cursor.setAttribute('x1',x);cursor.setAttribute('x2',x);cursor.setAttribute('visibility',visible?'visible':'hidden');}
  svg.addEventListener('pointermove',event=>{const rect=svg.getBoundingClientRect();show(Math.floor(((event.clientX-rect.left)/rect.width*800-left)/step));});
  svg.addEventListener('pointerleave',()=>show(bars.length-1,false));
  svg.addEventListener('keydown',event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();show(selected+(event.key==='ArrowRight'?1:-1));}});
  const range=document.createElement('p');range.className='kline-range';range.textContent=period+' · 日 K · '+bars.length+' '+unit+' · '+bars[0].date+' — '+bars.at(-1).date;
  host.replaceChildren(details,svg,range);show(selected,false);
 }
 function load(id,symbol,force=false){
  const host=document.getElementById(id+'-chart'),status=document.getElementById(id+'-chart-status');
  if(pending.has(id)||(!force&&cache.has(id)))return;
  pending.add(id);status.textContent='正在加载近一年日 K 线…';
  const globalName='invest_history_'+id;delete window[globalName];
  const script=document.createElement('script');script.charset='utf-8';script.referrerPolicy='no-referrer';script.src='https://web.ifzq.gtimg.cn/appstock/app/usfqkline/get?param='+symbol+',day,,,400,qfq&_var='+globalName+'&r='+Date.now();
  let complete=false;
  const finish=message=>{if(complete)return;complete=true;clearTimeout(timeout);script.remove();delete window[globalName];pending.delete(id);status.textContent=message;};
  script.onload=()=>{if(complete)return;const response=window[globalName],entry=response?.data?.[symbol];const bars=response?.code===0?normalize(entry?.day||entry?.qfqday):[];if(bars.length<2){finish('历史行情暂不可用，请点击“刷新行情”重试。');return;}cache.set(id,bars);draw(id,bars);finish('');};
  script.onerror=()=>finish('历史行情连接失败，请点击“刷新行情”重试。');
  const timeout=setTimeout(()=>finish('历史行情加载超时，请点击“刷新行情”重试。'),15000);
  document.head.append(script);
 }
 window.InvestCharts={draw,load(force=false){load('spx','usINX',force);load('ndx','usNDX',force);}};
})();
