(() => {
  const portraits = {
    '吴晨':'wu-chen.jpg', '李星月':'li-xingyue.jpg', '康佑伟':'kang-youwei.jpg',
    '陈志强':'chen-zhiqiang.jpg', '鑫鑫然':'xin-xinran.jpg', '郭峻雄':'guo-junxiong.jpg'
  };
  const photo = (name, className) => {
    const file = portraits[name];
    return `<div class="${className}"><span>${name.slice(0,1)}</span><img src="people-images/${file}" alt="${name}照片" onload="this.parentElement.classList.add('has-photo')" onerror="this.remove()"></div>`;
  };
  document.querySelectorAll('.member-card').forEach(card => {
    const name = card.querySelector('h3')?.textContent.trim(); const old = card.querySelector('.member-avatar');
    if (name && old && portraits[name]) old.outerHTML = photo(name, 'member-photo');
  });
  document.querySelectorAll('.executive-card').forEach(card => {
    const name = card.querySelector('h3')?.textContent.trim(); const old = card.querySelector('.exec-avatar');
    if (name && old && portraits[name]) old.outerHTML = photo(name, 'exec-photo');
  });
  const grid = document.querySelector('.member-grid');
  if (grid && ![...grid.querySelectorAll('h3')].some(el => el.textContent.trim() === '郭峻雄')) {
    const card = document.createElement('article'); card.className = 'member-card';
    card.innerHTML = `<div class="member-head">${photo('郭峻雄','member-photo')}<div><p>党委候补委员 · 代理事长</p><h3>郭峻雄</h3></div><b>06</b></div><dl><div><dt>公示信息</dt><dd>现任电报科技中国区党委候补委员、代理事长。</dd></div><div><dt>工作分工</dt><dd>相关工作信息以公开公示资料为准。</dd></div></dl>`;
    grid.appendChild(card);
  }
})();
