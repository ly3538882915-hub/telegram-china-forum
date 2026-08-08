(() => {
  const portraits = {
    '吴晨':'wu-chen.png', '李星月':'li-xingyue.png', '康佑伟':'kang-youwei.png',
    '陈志强':'chen-zhiqiang.png', '鑫鑫然':'xin-xinran.png', '郭峻雄':'guo-junxiong.jpg'
  };
  const photoPath = name => `people-images/${portraits[name]}`;
  const addFullPhoto = (card, name) => {
    if (!portraits[name] || card.querySelector('.person-photo-full, figure img')) return;
    const figure = document.createElement('figure'); figure.className = 'person-photo-full';
    figure.innerHTML = `<img src="${photoPath(name)}" alt="${name}公示照片" loading="lazy" onload="this.parentElement.classList.add('ready')" onerror="this.parentElement.remove()"><figcaption>${name} · 公示照片</figcaption>`;
    const details = card.querySelector('dl,ul'); details ? card.insertBefore(figure, details) : card.appendChild(figure);
  };
  document.querySelectorAll('.member-card').forEach(card => {
    const name = card.querySelector('h3')?.textContent.trim();
    if (name) addFullPhoto(card, name);
  });
  document.querySelectorAll('.executive-card').forEach(card => {
    const name = card.querySelector('h3')?.textContent.trim();
    if (name) addFullPhoto(card, name);
  });
  const grid = document.querySelector('.member-grid');
  if (grid && ![...grid.querySelectorAll('h3')].some(el => el.textContent.trim() === '郭峻雄')) {
    const card = document.createElement('article'); card.className = 'member-card';
    card.innerHTML = `<div class="member-head"><span class="member-avatar">郭</span><div><p>党委候补委员 · 代理事长</p><h3>郭峻雄</h3></div><b>06</b></div><dl><div><dt>公示信息</dt><dd>现任电报科技中国区党委候补委员、代理事长。</dd></div><div><dt>工作分工</dt><dd>相关工作信息以公开公示资料为准。</dd></div></dl>`;
    grid.appendChild(card); addFullPhoto(card, '郭峻雄');
  }
})();
