document.addEventListener('DOMContentLoaded', async () => {
  const db = window.forumAuth;
  const { data: { session } } = await db.auth.getSession();
  if (!session) return location.replace('auth.html?next=admin');

  const esc = value => String(value || '—').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const showError = message => {
    document.querySelector('[data-users]').innerHTML = `<tr><td colspan="7">${esc(message)}</td></tr>`;
  };

  async function load() {
    const response = await fetch('/api/admin-users', {
      headers: { authorization: `Bearer ${session.access_token}`, 'cache-control': 'no-cache' }
    });
    if (!response.ok) {
      let error = {};
      try { error = await response.json(); } catch { /* response is not JSON */ }
      const labels = {
        missing_login_session: '登录状态缺失，请退出后重新登录。',
        invalid_or_expired_session: '登录已过期，请退出后重新登录。',
        primary_admin_only: '当前账号不是主管理员邮箱 3538882915@qq.com。',
        server_configuration_missing: 'Cloudflare 缺少 Supabase 服务端密钥。',
        profile_query_failed: '数据库查询失败。',
        server_request_failed: '后台函数运行失败，请查看 Cloudflare 实时日志。'
      };
      showError(`${labels[error.error] || '无法读取管理数据。'}（状态 ${response.status}；${error.error || 'unknown_error'}）`);
      return;
    }
    const users = await response.json();
    document.querySelector('[data-count]').textContent = users.length;
    document.querySelector('[data-users]').innerHTML = users.map(user => `<tr>
      <td>${esc(user.username)}</td><td>${esc(user.email)}</td>
      <td>${new Date(user.created_at).toLocaleString('zh-CN')}</td><td>${esc(user.role)}</td>
      <td>${esc(user.registration_audit?.province)}</td><td>${esc(user.registration_audit?.device_name)}</td>
      <td>${user.role === 'admin' ? '主管理员' : `<button data-id="${user.id}" data-role="${user.role === 'superadmin' ? 'member' : 'superadmin'}">${user.role === 'superadmin' ? '撤销超管' : '设为超管'}</button>`}</td>
    </tr>`).join('');
  }

  document.addEventListener('click', async event => {
    const id = event.target.dataset.id;
    if (!id) return;
    const response = await fetch('/api/admin-users', {
      method: 'PATCH',
      headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' },
      body: JSON.stringify({ id, role: event.target.dataset.role })
    });
    if (!response.ok) return alert('操作失败，请刷新后重试。');
    load();
  });

  load();
});
