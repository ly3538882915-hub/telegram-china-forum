document.addEventListener('DOMContentLoaded', async () => {
  const db = window.forumAuth; if (!db) return;
  const box = document.querySelector('[data-post-list]');
  const { data, error } = await db.from('posts').select('*,profiles!posts_author_id_fkey(username),post_media(*)').eq('official', true).order('created_at', { ascending: false });
  if (error) { box.textContent = `加载失败：${error.message}`; return; }
  const esc = value => String(value || '').replace(/[&<>]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;' })[char]);
  box.innerHTML = data.length ? data.map(post => `<article class="post"><b class="official">论坛官方</b><h2>${esc(post.profiles?.username || '管理员')}</h2>${post.show_timestamp ? `<p class="post-meta">${new Date(post.created_at).toLocaleString('zh-CN')}</p>` : ''}<div class="post-body">${esc(post.body)}</div></article>`).join('') : '<p class="forum-note">暂无官方公告。</p>';
});
