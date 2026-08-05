(() => {
  const db = window.forumAuth;
  if (!db) return;
  let user = null, canModerate = false, files = [];
  const note = document.querySelector('[data-forum-note]');
  const form = document.querySelector('[data-post-form]');
  const list = document.querySelector('[data-post-list]');
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const mediaUrl = path => db.storage.from('forum-media').getPublicUrl(path).data.publicUrl;

  function render(posts) {
    list.innerHTML = posts.length ? posts.map(post => `<article class="post"><div class="post-top"><div><div class="post-author">${post.official ? '<span class="official">官方公告</span> ' : ''}${esc(post.profiles?.username || '社区成员')}</div><div class="post-meta">${new Date(post.created_at).toLocaleString('zh-CN')}</div></div>${user && (user.id === post.author_id || canModerate) ? `<button class="delete-post" data-id="${post.id}">删除</button>` : ''}</div><div class="post-body">${esc(post.body)}</div><div class="post-media">${(post.post_media || []).map(media => media.mime_type.startsWith('image/') ? `<img src="${mediaUrl(media.path)}" alt="用户上传图片">` : `<audio controls src="${mediaUrl(media.path)}"></audio>`).join('')}</div></article>`).join('') : '<p class="forum-note">暂无内容，来发布第一条吧。</p>';
  }
  async function load() { const { data, error } = await db.from('posts').select('*,profiles(username),post_media(*)').order('created_at', { ascending: false }); if (error) list.textContent = `加载失败：${error.message}`; else render(data); }
  async function init() {
    ({ data: { user } } = await db.auth.getUser());
    if (user) {
      const { data: profile } = await db.from('profiles').select('role').eq('id', user.id).single();
      canModerate = ['admin', 'superadmin'].includes(profile?.role);
      note.textContent = canModerate ? '管理模式：可发布官方公告，并删除任意帖子。' : '已登录：可发布内容并删除自己的帖子。';
      document.querySelector('[data-official-wrap]').hidden = !canModerate;
    } else form.querySelector('button').disabled = true;
    await load();
  }
  form.querySelector('input[type=file]').addEventListener('change', event => { files = [...event.target.files]; document.querySelector('[data-file-list]').textContent = files.map(file => file.name).join('、'); });
  form.addEventListener('submit', async event => {
    event.preventDefault(); if (!user) return location.assign('auth.html');
    const fields = new FormData(form); const body = String(fields.get('body')).trim(); const official = fields.has('official');
    const { data: post, error } = await db.from('posts').insert({ author_id: user.id, body, official }).select().single();
    if (error) return alert(error.message);
    for (const file of files) {
      if (file.size > 20971520) { await db.from('posts').delete().eq('id', post.id); return alert('单个文件不能超过 20MB'); }
      const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`;
      const { error: uploadError } = await db.storage.from('forum-media').upload(path, file, { contentType: file.type });
      if (uploadError) { await db.from('posts').delete().eq('id', post.id); return alert(`文件上传失败：${uploadError.message}`); }
      await db.from('post_media').insert({ post_id: post.id, path, mime_type: file.type });
    }
    form.reset(); files = []; document.querySelector('[data-file-list]').textContent = ''; await load();
  });
  list.addEventListener('click', async event => { const id = event.target.dataset.id; if (!id || !confirm('确定删除这条内容吗？')) return; const { error } = await db.from('posts').delete().eq('id', id); if (error) alert(error.message); else load(); });
  document.addEventListener('DOMContentLoaded', init);
})();
