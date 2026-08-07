document.addEventListener('DOMContentLoaded', async () => {
  const db = window.forumAuth;
  const target = new URLSearchParams(location.search).get('with');
  const title = document.querySelector('[data-chat-title]'), list = document.querySelector('[data-message-list]'), form = document.querySelector('[data-message-form]');
  const { data: { user } } = await db.auth.getUser();
  if (!user || !target) return location.assign('messages.html');
  const { data: profile } = await db.from('public_profile_cards').select('*').eq('id', target).single();
  if (!profile) { title.textContent = '用户不存在。'; form.hidden = true; return; }
  title.textContent = `与 ${profile.username} 私聊`;
  const { data: conversationId, error: beginError } = await db.rpc('start_direct_chat', { target });
  if (beginError) { title.textContent = '暂时无法建立会话：请先成为好友。'; form.hidden = true; return; }
  const esc = value => String(value || '').replace(/[&<>"']/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[char]);
  async function load() {
    const { data = [], error } = await db.from('chat_messages').select('*').eq('conversation_id', conversationId).order('created_at', { ascending: true });
    if (error) { list.textContent = `消息加载失败：${error.message}`; return; }
    const hydrated = await Promise.all(data.map(async message => {
      if (!message.media_path) return message;
      const { data: signed } = await db.storage.from('chat-media').createSignedUrl(message.media_path, 3600);
      return { ...message, mediaUrl: signed?.signedUrl || '' };
    }));
    list.innerHTML = hydrated.length ? hydrated.map(message => `<div class="bubble ${message.sender_id === user.id ? 'mine' : ''}">${esc(message.body)}${message.mediaUrl ? `<img src="${message.mediaUrl}" alt="聊天图片">` : ''}<small>${new Date(message.created_at).toLocaleString('zh-CN')}</small></div>`).join('') : '<p>开始和好友聊天吧。</p>';
    list.scrollTop = list.scrollHeight;
  }
  await load();
  const timer = setInterval(load, 3500); window.addEventListener('beforeunload', () => clearInterval(timer));
  form.addEventListener('submit', async event => {
    event.preventDefault(); const data = new FormData(form), body = String(data.get('body')).trim(), file = data.get('image');
    if (!body && (!file || !file.size)) return;
    let media_path = null, media_type = null;
    if (file?.size) {
      if (file.size > 10485760) return alert('图片不能超过 10MB');
      media_path = `chat/${conversationId}/${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]/g, '_')}`; media_type = file.type;
      const { error: uploadError } = await db.storage.from('chat-media').upload(media_path, file, { contentType: file.type });
      if (uploadError) return alert(`图片上传失败：${uploadError.message}`);
    }
    const { error } = await db.from('chat_messages').insert({ conversation_id: conversationId, sender_id: user.id, body, media_path, media_type });
    if (error) return alert(error.message); form.reset(); load();
  });
});
