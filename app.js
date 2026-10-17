(() => {
 'use strict';
 const resources = window.INVEST_RESOURCES;
 const $ = selector => document.querySelector(selector);
 const titles = {all:'发现精选',stocks:'美股投资',crypto:'加密货币',tools:'投资工具',favorites:'我的收藏'};
 const hashes = {all:'home',stocks:'stocks',crypto:'crypto',tools:'tools',favorites:'favorites'};
 const read = (key,fallback) => {try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}};
 const saved = read('invest:favorites',[]);
 let favorites = new Set(Array.isArray(saved) ? saved.filter(id=>resources.some(r=>r.id===id)) : []);
 let view='all', filter='全部', query='', sort='featured', timer;
 const write = (key,value) => {try{localStorage.setItem(key,JSON.stringify(value));}catch{notify('浏览器未允许本地存储，本次设置仅在当前页面保留');}};
 const storedTheme=read('invest:theme',null);
 let dark=storedTheme === 'dark' || (storedTheme===null && matchMedia('(prefers-color-scheme: dark)').matches);
 function setTheme(){document.documentElement.dataset.theme=dark?'dark':'light';$('#theme-toggle').textContent=dark?'☀':'☾';$('#theme-toggle').setAttribute('aria-label',dark?'切换浅色模式':'切换深色模式');}
 setTheme();
 function notify(message){$('#toast').textContent=message;$('#toast').classList.add('visible');clearTimeout(timer);timer=setTimeout(()=>$('#toast').classList.remove('visible'),2200);}
 function scope(){return resources.filter(r=>view==='all'||(view==='favorites'?favorites.has(r.id):r.category===view));}
 function renderFilters(){const groups=['全部',...new Set(scope().map(r=>r.group))];if(!groups.includes(filter))filter='全部';$('#filters').replaceChildren(...groups.map(group=>{const button=document.createElement('button');button.textContent=group;button.className=filter===group?'selected':'';button.setAttribute('aria-pressed',String(filter===group));button.onclick=()=>{filter=group;renderFilters();render();};return button;}));}
 function render(){
  const terms=query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const list=scope().filter(r=>(filter==='全部'||r.group===filter)&&terms.every(term=>[r.name,r.description,r.group,...r.tags].join(' ').toLowerCase().includes(term)));
  list.sort(sort==='name'?(a,b)=>a.name.localeCompare(b.name,'zh-CN'):(a,b)=>Number(b.featured)-Number(a.featured));
  $('#resource-grid').replaceChildren(...list.map(r=>{
   const card=document.createElement('article');card.className='resource-card';
   const link=document.createElement('a');link.href=r.url;link.target='_blank';link.rel='noopener noreferrer';link.className='resource-link';link.setAttribute('aria-label',r.name+'（新窗口打开）');
   const top=document.createElement('div');top.className='card-top';const logo=document.createElement('span');logo.className='resource-logo';logo.textContent=r.logo;logo.style.background=r.color;const nameWrap=document.createElement('div');const name=document.createElement('h3');name.textContent=r.name;const domain=document.createElement('span');domain.className='resource-domain';domain.textContent=new URL(r.url).hostname.replace(/^www\./,'');nameWrap.append(name,domain);top.append(logo,nameWrap);const description=document.createElement('p');description.textContent=r.description;
   const meta=document.createElement('div');meta.className='card-meta';const group=document.createElement('span');group.className='group-tag';group.textContent=r.group;meta.append(group);if(r.featured){const badge=document.createElement('span');badge.className='featured-tag';badge.textContent='精选';meta.append(badge);}const arrow=document.createElement('span');arrow.className='card-arrow';arrow.textContent='↗';meta.append(arrow);link.append(top,description,meta);
   const star=document.createElement('button');star.className='favorite-button'+(favorites.has(r.id)?' saved':'');star.textContent=favorites.has(r.id)?'★':'☆';star.setAttribute('aria-label',(favorites.has(r.id)?'取消收藏 ':'收藏 ')+r.name);star.setAttribute('aria-pressed',String(favorites.has(r.id)));star.onclick=()=>{const exists=favorites.has(r.id);exists?favorites.delete(r.id):favorites.add(r.id);write('invest:favorites',[...favorites]);notify(exists?'已取消收藏':'已添加到我的收藏');if(view==='favorites')renderFilters();render();};card.append(link,star);return card;
  }));
  $('#result-count').textContent=list.length+' 个资源';$('#favorite-count').textContent=favorites.size;
  $('#section-title').textContent=query?'搜索结果':view==='all'?'精选资源':titles[view];
  $('#empty-state').hidden=list.length>0;$('#empty-message').textContent=view==='favorites'&&!query?'点击资源卡片右上角的 ☆，建立你的常用资源列表。':'换个关键词或分类，再试一次。';
 }
 function navigate(){const hash=location.hash.slice(1);view=Object.keys(hashes).find(key=>hashes[key]===hash)||'all';filter='全部';query='';$('#search').value='';$('#breadcrumb').textContent=titles[view];document.querySelectorAll('[data-view]').forEach(a=>{a.classList.toggle('active',a.dataset.view===view);if(a.dataset.view===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});document.querySelectorAll('[data-category]').forEach(b=>b.classList.toggle('active',b.dataset.category===view));$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');renderFilters();render();}
 addEventListener('hashchange',navigate);
 document.querySelectorAll('[data-category]').forEach(b=>b.onclick=()=>{location.hash=hashes[b.dataset.category];});
 $('#show-favorites').onclick=()=>{location.hash='favorites';$('#directory').scrollIntoView({behavior:'smooth',block:'start'});};
 $('#search').addEventListener('input',e=>{query=e.target.value;render();});
 $('#search-button').onclick=()=>{query=$('#search').value;render();$('#directory').scrollIntoView({behavior:'smooth'});};
 document.querySelectorAll('[data-query]').forEach(b=>b.onclick=()=>{if(view!=='all'){history.replaceState(null,'','#home');navigate();}filter='全部';query=b.dataset.query;$('#search').value=query;renderFilters();render();});
 $('#sort').onchange=e=>{sort=e.target.value;render();};
 $('#reset').onclick=()=>{if(view==='all'){query='';filter='全部';$('#search').value='';renderFilters();render();}else location.hash='home';};
 $('#theme-toggle').onclick=()=>{dark=!dark;setTheme();write('invest:theme',dark?'dark':'light');};
 $('#menu-toggle').onclick=()=>{const open=$('#sidebar').classList.toggle('open');$('#menu-toggle').setAttribute('aria-expanded',String(open));};
 document.addEventListener('click',event=>{if(!$('#sidebar').contains(event.target)&&!$('#menu-toggle').contains(event.target)){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');}});
 document.addEventListener('keydown',event=>{if(event.key==='/'&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){event.preventDefault();$('#search').focus();}if(event.key==='Escape'){$('#sidebar').classList.remove('open');$('#menu-toggle').setAttribute('aria-expanded','false');$('#search').blur();}});
 $('#year').textContent=new Date().getFullYear();navigate();
})();
