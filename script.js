const menu=document.querySelector('.menu-button'),nav=document.querySelector('nav');
const manifest=document.createElement('link');manifest.rel='manifest';manifest.href='manifest.webmanifest';document.head.appendChild(manifest);
if(document.querySelector('.social-shell')){const link=document.createElement('link');link.rel='stylesheet';link.href='social-premium.css';document.head.appendChild(link)}
if(document.querySelector('.people-page')){const link=document.createElement('link');link.rel='stylesheet';link.href='people-photos.css';document.head.appendChild(link);const source=document.createElement('script');source.src='people-photos.js';document.head.appendChild(source)}
if(document.querySelector('[data-entry-view]')){const style=document.createElement('link');style.rel='stylesheet';style.href='wiki-polish.css';document.head.appendChild(style);const source=document.createElement('script');source.src='wiki-polish.js';document.head.appendChild(source)}
if(document.querySelector('.quick-links')){
 const links=[
  ['poll.html','data-poll-entry','投','社区投票','参与当前公开讨论','blue'],
  ['wiki.html','data-wiki-entry','百','电报中国百科','浏览词条、提交修改建议','blue'],
  ['rankings.html','data-ranking-entry','排','职务资料展示','查看截至 2026 年 8 月的资料整理','yellow'],
  ['enterprise.html','data-enterprise-entry','企','企业公示','查看在华相关企业与论坛主体资料','red']
 ];
 const holder=document.querySelector('.quick-links');
 links.forEach(([href,attr,icon,title,copy,color])=>{if(holder.querySelector(`[${attr}]`))return;const item=document.createElement('a');item.href=href;item.setAttribute(attr,'true');item.innerHTML=`<span class="quick-icon ${color}">${icon}</span><span><strong>${title}</strong><small>${copy}</small></span><b>→</b>`;holder.appendChild(item)});
}
if(menu&&nav){nav.id||='primary-navigation';menu.setAttribute('aria-controls',nav.id);menu.setAttribute('aria-expanded','false');const close=()=>{nav.classList.remove('is-open');menu.setAttribute('aria-expanded','false')};menu.addEventListener('click',()=>{const open=nav.classList.toggle('is-open');menu.setAttribute('aria-expanded',String(open))});nav.addEventListener('click',event=>{if(event.target.closest('a'))close()});window.addEventListener('keydown',event=>{if(event.key==='Escape')close()});window.addEventListener('resize',()=>{if(window.innerWidth>720)close()})}
if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));
