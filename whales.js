(() => {
 'use strict';
 const $=id=>document.getElementById(id),cutoff=()=>Date.now()/1000-259200;
 const states={btc:{cursor:null,rows:[],blocks:[],busy:false,exhausted:false},eth:{cursor:null,rows:[],blocks:[],busy:false,exhausted:false}};
 const hex=n=>'0x'+n.toString(16),stamp=n=>new Date(n*1000).toLocaleString('zh-CN',{hour12:false});
 async function request(url,body){const r=await fetch(url,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,credentials:'omit',signal:AbortSignal.timeout(25000)});if(!r.ok)throw Error('接口返回 '+r.status);return r.json();}
 async function rpc(method,params,coin='eth'){const r=await request(coin==='btc'?'https://bitcoin-rpc.publicnode.com':'https://ethereum-rpc.publicnode.com',{jsonrpc:'2.0',method,params,id:1});if(r.error||r.result==null)throw Error('RPC 请求失败');return r.result;}
 function save(coin){const s=states[coin];s.rows=s.rows.filter(r=>r.time>=cutoff());s.blocks=s.blocks.filter(b=>b.time>=cutoff());try{localStorage.setItem('invest-whales-'+coin,JSON.stringify({rows:s.rows,blocks:s.blocks}));}catch{}}
 function render(coin){const s=states[coin],host=$(coin+'-records');host.replaceChildren();s.rows=s.rows.filter(r=>r.time>=cutoff());const rows=[...s.rows].sort((a,b)=>b.time-a.time);$(coin+'-count').textContent=rows.length+' 条已发现记录';
  if(!rows.length){const p=document.createElement('p');p.className='whale-empty';p.textContent='已扫描区块内尚无符合门槛的记录；可继续扫描较早区块。这不代表最近三天全网没有大额转账。';host.append(p);}
  for(const row of rows){const card=document.createElement('article');card.className='whale-record';const title=document.createElement('h3');title.textContent=Number(row.amount).toLocaleString('en-US',{maximumFractionDigits:8})+' '+coin.toUpperCase();const date=document.createElement('p');date.textContent=stamp(row.time)+' · 区块 '+row.height;const from=document.createElement('p');from.textContent='转出：'+row.from;const to=document.createElement('p');to.textContent='接收：'+row.to;const a=document.createElement('a');a.href=(coin==='btc'?'https://www.blockchain.com/explorer/transactions/btc/':'https://etherscan.io/tx/')+row.hash;a.target='_blank';a.rel='noopener noreferrer';a.textContent='查看链上交易 ↗';card.append(title,date,from,to,a);host.append(card);}
  const blocks=s.blocks.filter(b=>b.time>=cutoff());$(coin+'-coverage').textContent=blocks.length?`本浏览器已扫描 ${blocks.length} 个区块 · 最早 ${stamp(Math.min(...blocks.map(b=>b.time)))} · 最新 ${stamp(Math.max(...blocks.map(b=>b.time)))} · 区间内可能有缺口`:'尚未完成区块扫描。';
 }
 function add(coin,row){const s=states[coin];if(!s.rows.some(r=>r.key===row.key))s.rows.push(row);}
 async function scan(coin,recent){const s=states[coin];if(s.busy)return;if(!recent&&s.exhausted){$(coin+'-status').textContent='已扫描到 72 小时边界，可点击扫描最新区块。';return;}s.busy=true;$(coin+'-refresh').disabled=true;$(coin+'-older').disabled=true;let scanned=0;
  try{
   if(recent||s.cursor===null){s.exhausted=false;if(coin==='btc'){s.cursor=await rpc('getbestblockhash',[],'btc');}else{s.cursor=Number(BigInt(await rpc('eth_blockNumber',[])))-12;}}
   const max=coin==='btc'?4:40;
   for(let i=0;i<max;i++){
    $(coin+'-status').textContent=`正在扫描 ${i+1} / ${max} 个区块…`;
    let height,time;
    if(coin==='btc'){
     const b=await rpc('getblock',[s.cursor,2],'btc');if(!Array.isArray(b.tx)||!Number.isFinite(b.time)||!b.previousblockhash)throw Error('区块数据不完整');height=b.height;time=b.time;if(time<cutoff()){s.exhausted=true;break;}
     for(const tx of b.tx){if(!/^[a-f0-9]{64}$/i.test(tx.txid)||tx.vin?.some(v=>v.coinbase))continue;for(const out of tx.vout||[]){const value=Math.round(Number(out.value)*1e8),address=out.scriptPubKey?.address;if(!Number.isSafeInteger(value)||value<=1000*1e8||!address)continue;add(coin,{key:tx.txid+':'+out.n,hash:tx.txid,amount:String(value/1e8),from:'多个输入（来源地址请在交易详情核对）',to:String(address),height,time});}}
     s.cursor=b.previousblockhash;
    }else{
     const b=await rpc('eth_getBlockByNumber',[hex(s.cursor),true]);if(!Array.isArray(b.transactions))throw Error('区块数据不完整');height=Number(BigInt(b.number));time=Number(BigInt(b.timestamp));if(time<cutoff()){s.exhausted=true;break;}
     for(const tx of b.transactions){if(!tx.to||!/^0x[a-f0-9]{64}$/i.test(tx.hash)||BigInt(tx.value)<=10000n*10n**18n)continue;const receipt=await rpc('eth_getTransactionReceipt',[tx.hash]);if(receipt.status!=='0x1')continue;const value=BigInt(tx.value);add(coin,{key:tx.hash,hash:tx.hash,amount:(value/10n**18n).toString()+'.'+(value%10n**18n).toString().padStart(18,'0'),from:String(tx.from),to:String(tx.to),height,time});}
     s.cursor=height-1;
    }
    if(!s.blocks.some(b=>b.height===height))s.blocks.push({height,time});scanned++;save(coin);render(coin);
   }
   $(coin+'-status').textContent=`本次扫描完成 ${scanned} 个区块。未扫描部分不在统计范围内。`;
  }catch(error){$(coin+'-status').textContent='免费接口暂时不可用或被限流；已完成的记录保留，可稍后重试。（'+error.message+'）';}
  finally{save(coin);render(coin);s.busy=false;$(coin+'-refresh').disabled=false;$(coin+'-older').disabled=false;}
 }
 for(const coin of ['btc','eth']){try{const data=JSON.parse(localStorage.getItem('invest-whales-'+coin));if(data&&Array.isArray(data.rows)&&Array.isArray(data.blocks)){states[coin].rows=data.rows.filter(r=>typeof r.key==='string'&&Number.isFinite(r.time)&&r.time>=cutoff()&&(coin==='btc'?/^[a-f0-9]{64}$/i:/^0x[a-f0-9]{64}$/i).test(r.hash));states[coin].blocks=data.blocks.filter(b=>Number.isFinite(b.height)&&Number.isFinite(b.time));}}catch{}render(coin);$(coin+'-refresh').onclick=()=>scan(coin,true);$(coin+'-older').onclick=()=>scan(coin,false);scan(coin,true);}
})();
