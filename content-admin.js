document.addEventListener('DOMContentLoaded', async () => {
  const db = window.forumAuth;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return location.replace('auth.html?next=content-admin');
  const box = document.querySelector('[data-content-list]');
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
  const api = (method, body) => fetch('/api/content-admin', { method, headers: { authorization:`Bearer ${session.access_token}`, 'content-type':'application/json' }, body: body && JSON.stringify(body) });
  async function save(form) {
    const fields = new FormData(form), button = form.querySelector('button'), status = form.querySelector('[data-save-status]');
    const payload = { id: fields.get('id'), recommended_score: Number(fields.get('recommended_score')), is_pinned: fields.get('is_pinned') === 'on', is_featured: fields.get('is_featured') === 'on' };
    button.disabled = true; button.textContent = '保存中…'; status.textContent = '正在发送…';
    try {
      const response = await api('PATCH', payload);
      if (!response.ok) throw new Error((await response.text()).slice(0, 180));
      status.textContent = '已保存 ✓'; button.textContent = '已保存';
    } catch (error) { status.textContent = `保存失败：${error.message}`; button.disabled = false; button.textContent = '保存'; }
  }
  async function load() {
    const response = await api('GET');
    if (!response.ok) { box.textContent = `无法读取内容：${(await response.text()).slice(0,180)}`; return; }
    const posts = await response.json();
    box.innerHTML = posts.map(post => `<article class="content-admin-row"><b>${esc(post.author_name)} ${post.official ? '· 官方公告' : ''}</b><p>${esc(post.body)}</p><form class="content-admin-controls" data-recommend-form><input type="hidden" name="id" value="${post.id}"><label>推荐热度 <input type="number" name="recommended_score" min="0" value="${post.recommended_score}"></label><label><input type="checkbox" name="is_pinned" ${post.is_pinned ? 'checked' : ''}> 置顶</label><label><input type="checkbox" name="is_featured" ${post.is_featured ? 'checked' : ''}> 加精</label><button type="submit">保存</button><span data-save-status></span></form></article>`).join('');
    box.querySelectorAll('[data-recommend-form]').forEach(form => form.addEventListener('submit', event => { event.preventDefault(); save(form); }));
  }
  load();
});
