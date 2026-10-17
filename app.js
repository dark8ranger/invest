(() => {
 'use strict';
 const resources = window.INVEST_RESOURCES;
 const $ = selector => document.querySelector(selector);
 const titles = {all:'发现精选',stocks:'美股投资',crypto:'加密货币',tools:'投资工具'};
 const cryptoGroups=['交易平台','学习教育','链上分析','行情数据'];
 const hashes = {all:'home',stocks:'stocks',crypto:'crypto',tools:'tools'};
 const read = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 let view='all', filter='全部', query='', sort='featured', timer;
 const write = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('浏览器未允许本地存储，本次设置仅在当前页面保留');}};
 const storedTheme=read('invest:theme',null);
 let dark=storedTheme === 'dark' || (storedTheme===null && matchMedia('(prefers-color-scheme: dark)').matches);
 function setTheme(){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme-toggle').textContent=dark?'☀':'☾';$('#theme-toggle').setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');}
 setTheme();
 function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
 function scope(){return resources.filter(r=>view==='all'||r.category===view);}
 function renderFilters(){const groups=['全部',...(view==='crypto'?cryptoGroups:[...new Set(scope().map(r=>r.group))])];if(!groups.includes(filter))filter='全部';$('#filters').replaceChildren(...groups.map(group=>{const button=document.createElement('button');button.textContent=group;button.className=filter===group?'selected':'';button.setAttribute('aria-pressed',String(filter===group));button.onclick=()=>{filter=group;renderFilters();render();};return button;}));}
 function render(){
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const list=scope().filter(r=>(filter==='全部'||r.group===filter)&&terms.every(term=>[r.name,r.description,r.group,...r.tags].join(' ').toLowerCase().includes(term)));
  list.sort((a,b)=>{
   if(a.id==='coinbase')return 1;
   if(b.id==='coinbase')return -1;
   return sort==='name'?a.name.localeCompare(b.name,'zh-CN'):Number(b.featured)-Number(a.featured);
  });
  const cards=list.map(r=>{
   const card=document.createElement('article');card.className='resource-card';
   const link=document.createElement('a');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.className='resource-link';link.setAttribute('aria-label',r.name+'（新窗口打开）');
   const top=document.createElement('div');top.className='card-top';const logo=document.createElement('span');logo.className='resource-logo';logo.style.background=r.color;if(r.id==='binance'||r.id==='okx'){const image=document.createElement('img');image.src='./assets/'+(r.id==='binance'?'binance.ico':'okx.png');image.alt='';image.width=39;image.height=39;logo.classList.add('official-logo');logo.append(image);}else logo.textContent=r.logo;const nameWrap=document.createElement('div');const name=document.createElement('h3');name.textContent=r.name;const domain=document.createElement('span');domain.className='resource-domain';domain.textContent=new URL(r.url).hostname.replace(/^www\./,'');nameWrap.append(name,domain);top.append(logo,nameWrap);const description=document.createElement('p');description.textContent=r.description;
   const meta=document.createElement('div');meta.className='card-meta';const group=document.createElement('span');group.className='group-tag';group.textContent=r.group;meta.append(group);if(r.featured){const badge=document.createElement('span');badge.className='featured-tag';badge.textContent='精选';meta.append(badge);}const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent='↗';meta.append(arrow);link.append(top,description,meta);
   card.append(link);return card;
  });
  if(view==='crypto' && filter==='全部'){
   const sections=cryptoGroups.map(group=>{
    const matches=list.map((resource,index)=>resource.group===group?cards[index]:null).filter(Boolean);
    if(!matches.length)return null;
    const section=document.createElement('section');section.className='resource-group';
    const heading=document.createElement('h3');heading.className='resource-group-heading';heading.textContent=group;
    const count=document.createElement('span');count.textContent=matches.length+' 个资源';heading.append(count);
    const grid=document.createElement('div');grid.className='resource-group-grid';grid.append(...matches);
    section.append(heading,grid);return section;
   }).filter(Boolean);
   $('#resource-grid').replaceChildren(...sections);
  }else $('#resource-grid').replaceChildren(...cards);
  $('#result-count').textContent=list.length+' 个资源';
  $('#section-title').textContent=query?'搜索结果':view==='all'?'精选资源':titles[view];
  $('#empty-state').hidden=list.length>0;$('#empty-message').textContent='换个关键词或分类，再试一次。';
 }
 function navigate(){const hash=location.hash.slice(1);view=Object.keys(hashes).find(key=>hashes[key]===hash)||'all';filter='全部';query='';$('#search').value='';$('#breadcrumb').textContent=titles[view];document.querySelectorAll('[data-view]').forEach(a=>{a.classList.toggle('active',a.dataset.view===view);if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');renderFilters();render();renderMarket();}
 let marketInterval=null, marketPending=false;
 function renderMarket(force=false){
  const panel=$('#market-overview');panel.hidden=view!=='stocks';
  if(panel.hidden){clearInterval(marketInterval);marketInterval=null;return;}
  window.InvestCharts.load(force);
  if(force || marketInterval===null)updateMarket();
  if(marketInterval===null)marketInterval=setInterval(()=>{if(!document.hidden)updateMarket();},60000);
 }
 function updateMarket(){
  if(marketPending)return;
  marketPending=true;
  const status=$('#market-status');status.textContent='正在更新行情…';
  $('#refresh-market').disabled=true;
  // This public quote endpoint returns JavaScript assignments, allowing browser-only loading.
  // Clear old globals first so an empty response cannot be mistaken for a new quote.
  delete window.v_usINX;delete window.v_usNDX;
  const script=document.createElement('script');script.charset='gbk';script.referrerPolicy='no-referrer';
  script.src='https://qt.gtimg.cn/q=usINX,usNDX&_='+Date.now();
  let complete=false;
  const finish=message=>{if(complete)return;complete=true;clearTimeout(timeout);script.remove();marketPending=false;$('#refresh-market').disabled=false;status.textContent=message;};
  script.onerror=()=>finish('行情连接失败；已显示的数据不再更新，可点击刷新重试或到腾讯财经查看。');
  script.onload=()=>{
   const quotes=[['spx',window.v_usINX,'.INX'],['ndx',window.v_usNDX,'.NDX']];
   let updated=0;
   for(const [id,raw,code] of quotes){
    if(typeof raw!=='string')continue;
    const fields=raw.split('~'),price=Number(fields[3]),change=Number(fields[31]),percent=Number(fields[32]);
    if(fields[2]!==code || !fields[3] || !fields[31] || !fields[32] || !Number.isFinite(price) || price<=0 || !Number.isFinite(change) || !Number.isFinite(percent) || !/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fields[30]||''))continue;
    $('#'+id+'-value').textContent=price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
    const movement=$('#'+id+'-change');movement.textContent=(change>0?'+':'')+change.toFixed(2)+'  ('+(percent>0?'+':'')+percent.toFixed(2)+'%)';
    movement.dataset.direction=change>0?'up':change<0?'down':'flat';
    $('#'+id+'-time').textContent='行情时间：'+fields[30];updated++;
   }
   delete window.v_usINX;delete window.v_usNDX;
   finish(updated===2?'已获取最近可用行情 · 涨跌对比前收盘':updated?'部分行情未获取成功，未更新的指数保留原值，请重试。':'行情数据暂不可用，请重试或到腾讯财经查看。');
  };
  const timeout=setTimeout(()=>finish('行情请求超时；已显示的数据不再更新，可点击刷新重试。'),12000);
  document.head.append(script);
 }
 $('#refresh-market').onclick=()=>renderMarket(true);
 addEventListener('hashchange',navigate);
 
 $('#search').addEventListener('input',e=>{query=e.target.value;render();});
 $('#search-button').onclick=()=>{query=$('#search').value;render();$('#directory').scrollIntoView({behavior:'smooth'});};
 document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{if(view!=='all'){history.replaceState(null,'','#home');navigate();}filter='全部';query=b.dataset.query;$('#search').value=query;renderFilters();render();});
 $('#sort').onchange=e=>{sort=e.target.value;render();};
 $('#reset').onclick=()=>{if(view==='all'){query='';filter='全部';$('#search').value='';renderFilters();render();}else location.hash='home';};
 $('#theme-toggle').onclick=()=>{dark=!dark;setTheme();write('invest:theme',dark?'dark':'light');};
 $('#menu-toggle').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
 document.addEventListener('click',event=>{if(!$('#sidebar').contains(event.target)&&!$('#menu-toggle').contains(event.target)){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}if(event.key==='Escape'){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#search').blur();}});
 navigate();
})();
