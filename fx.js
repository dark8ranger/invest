(() => {
 'use strict';
 const currencies=['CNY','EUR','HKD','JPY'];
 const $=id=>document.getElementById(id);
 let active=false,pending=false,lastSuccess=0;
 async function refresh(force=false){
  if(!active||pending||(!force&&lastSuccess&&Date.now()-lastSuccess<1800000))return;
  pending=true;$('refresh-fx').disabled=true;$('fx-status').textContent='正在获取最近可用汇率…';
  try{
   const response=await fetch('https://api.frankfurter.dev/v2/rates?base=USD&quotes=CNY,EUR,HKD,JPY',{credentials:'omit',signal:AbortSignal.timeout(15000)});
   if(!response.ok)throw new Error('汇率请求失败');
   const data=await response.json();
   if(!Array.isArray(data))throw new Error('汇率格式错误');
   const rates=new Map(data.filter(row=>row.base==='USD'&&currencies.includes(row.quote)).map(row=>[row.quote,row]));
   for(const currency of currencies){
    const row=rates.get(currency);
    if(!row||!Number.isFinite(row.rate)||row.rate<=0||!/^\d{4}-\d{2}-\d{2}$/.test(row.date))throw new Error('汇率数据不完整');
   }
   for(const currency of currencies){
    const row=rates.get(currency);
    $('fx-'+currency+'-value').textContent=row.rate.toLocaleString('en-US',{minimumFractionDigits:4,maximumFractionDigits:4});
    $('fx-'+currency+'-date').textContent='数据日期：'+row.date;
   }
   lastSuccess=Date.now();$('fx-status').textContent='已获取最近可用参考汇率';
  }catch{
   $('fx-status').textContent=lastSuccess?'更新失败，当前保留上次汇率及数据日期，请刷新重试。':'汇率暂时无法加载，请稍后点击“刷新汇率”重试。';
  }finally{pending=false;$('refresh-fx').disabled=false;}
 }
 $('refresh-fx').onclick=()=>refresh(true);
 window.InvestFx={setActive(value){active=value;$('fx-overview').hidden=!active;$('rates-overview').hidden=!active;if(active)refresh();}};
})();
