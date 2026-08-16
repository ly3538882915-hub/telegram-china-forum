const bootWikiPolish = () => {
  const article = document.querySelector('[data-entry-view]');
  const toc = document.querySelector('.wiki-toc');
  if (!article) return;
  const dateLine = /^\d{4}\s*年(?:\s*\d{1,2}\s*月)?(?:\s*(?:[-—–至到])\s*\d{4}\s*年(?:\s*\d{1,2}\s*月)?)?$/;
  const headings = new Set(['任职经历时间线', '人物履历', '现任职务', '现任职务包括', '工作分工', '说明']);
  let finished = false;
  const polish = () => {
    const content = article.querySelector('.wiki-content');
    if (!content || finished) return;
    finished = true;
    let sectionNo = 0, timeline = null;
    [...content.children].forEach(node => {
      const raw = node.textContent.trim();
      const normalized = raw.replace(/^#{1,3}\s*/, '').replace(/：$/, '');
      const isHeading = headings.has(normalized) || /^#{1,2}\s+/.test(raw);
      const isDate = dateLine.test(normalized) || /^###\s+/.test(raw);
      const dateWithText = raw.match(/^(\d{4}\s*年(?:\s*\d{1,2}\s*月)?(?:\s*(?:[-—–至到])\s*\d{4}\s*年(?:\s*\d{1,2}\s*月)?)?)\s+(.+)$/);
      if (isHeading) {
        const h2 = document.createElement('h2'); h2.className = 'wiki-section-title'; h2.id = `wiki-polish-${++sectionNo}`; h2.textContent = normalized;
        node.replaceWith(h2);
        timeline = (normalized === '人物履历' || normalized === '任职经历时间线') ? document.createElement('div') : null;
        if (timeline) { timeline.className = 'wiki-timeline'; h2.after(timeline); }
        return;
      }
      if (isDate) {
        const h3 = document.createElement('h3'); h3.className = 'wiki-year'; h3.textContent = normalized;
        if (timeline) { timeline.appendChild(h3); node.remove(); } else node.replaceWith(h3);
        return;
      }
      if (dateWithText && timeline) {
        const h3 = document.createElement('h3'); h3.className = 'wiki-year'; h3.textContent = dateWithText[1];
        const detail = document.createElement('p'); detail.textContent = dateWithText[2];
        timeline.append(h3, detail); node.remove();
        return;
      }
      if (timeline && node.tagName === 'P') timeline.appendChild(node);
      if (/^(现任职务包括|工作分工)[:：]/.test(raw)) node.classList.add('wiki-keyline');
    });
    if (toc) toc.innerHTML = `<b>目录</b><a href="#overview">概述</a>${[...content.querySelectorAll('.wiki-section-title')].map(h => `<a href="#${h.id}">${h.textContent}</a>`).join('')}<a href="#sources">维护信息</a>`;
  };
  const observer = new MutationObserver(() => { polish(); observer.disconnect(); });
  observer.observe(article, {childList:true, subtree:true});
  polish();
};
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootWikiPolish); else bootWikiPolish();
