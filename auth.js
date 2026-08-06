(() => {
  if (!window.APP_SUPABASE_URL || !window.APP_SUPABASE_PUBLISHABLE_KEY || !window.supabase) return;
  const client = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_PUBLISHABLE_KEY);
  window.forumAuth = client;

  const message = (value, type = '') => { const el = document.querySelector('[data-auth-message]'); if (el) { el.textContent = value; el.className = `form-message ${type}`; } };
  const busy = (button, state, label) => { if (button) { button.disabled = state; button.textContent = state ? '请稍候…' : label; } };
  const updateNav = user => document.querySelectorAll('[data-auth-nav]').forEach(link => { link.href = user ? 'profile.html' : 'auth.html'; link.textContent = user ? '我的账户' : '登录 / 注册'; });

  async function submitAudit(session) {
    const saved = localStorage.getItem('forum_registration_audit_consent');
    if (!saved || !session?.access_token) return;
    try {
      const consent = JSON.parse(saved);
      if (consent.sent) return;
      const result = await fetch('/api/registration-audit', { method: 'POST', headers: { authorization: `Bearer ${session.access_token}`, 'content-type': 'application/json' }, body: JSON.stringify({ consent: true, version: consent.version }) });
      if (result.ok) { consent.sent = true; localStorage.setItem('forum_registration_audit_consent', JSON.stringify(consent)); }
    } catch { /* Never block login if optional audit delivery has a temporary failure. */ }
  }

  function showPanel(name) { document.querySelectorAll('[data-auth-panel]').forEach(panel => panel.hidden = panel.dataset.authPanel !== name); document.querySelectorAll('[data-auth-switch]').forEach(button => button.classList.toggle('selected', button.dataset.authSwitch === name)); message(''); }

  function initAuthPage() {
    if (!document.querySelector('[data-auth-page]')) return;
    showPanel(new URLSearchParams(location.search).get('mode') === 'update' ? 'update' : 'login');
    document.querySelectorAll('[data-auth-switch]').forEach(button => button.addEventListener('click', () => showPanel(button.dataset.authSwitch)));

    document.querySelector('[data-login-form]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const button = event.currentTarget.querySelector('[type=submit]'); busy(button, true, '登录');
      const { error } = await client.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') }); busy(button, false, '登录');
      if (error) return message(error.message === 'Invalid login credentials' ? '邮箱或密码不正确。' : error.message, 'error');
      const next = new URLSearchParams(location.search).get('next'); location.assign(next ? `${next}.html` : 'profile.html');
    });

    document.querySelector('[data-signup-form]').addEventListener('submit', async event => {
      event.preventDefault(); const form = new FormData(event.currentTarget); const username = String(form.get('username')).trim(); const password = String(form.get('password'));
      if (username.length < 2) return message('用户名至少需要 2 个字符。', 'error');
      if (password.length < 8) return message('密码至少需要 8 个字符。', 'error');
      if (password !== String(form.get('confirmPassword'))) return message('两次输入的密码不一致。', 'error');
      if (!form.get('auditConsent')) return message('请先阅读并同意注册信息说明。', 'error');
      const button = event.currentTarget.querySelector('[type=submit]'); busy(button, true, '创建账户');
      const { data, error } = await client.auth.signUp({ email: form.get('email'), password, options: { emailRedirectTo: `${location.origin}/auth.html`, data: { username } } }); busy(button, false, '创建账户');
      if (error) return message(error.message, 'error');
      if (data.user?.identities?.length === 0) return message('该邮箱已注册，请直接登录或重置密码。', 'error');
      localStorage.setItem('forum_registration_audit_consent', JSON.stringify({ version: '2026-08-06', sent: false }));
      message('账户已创建。请前往邮箱点击验证链接后再登录。', 'success'); event.currentTarget.reset();
    });

    document.querySelector('[data-reset-form]').addEventListener('submit', async event => { event.preventDefault(); const button = event.currentTarget.querySelector('[type=submit]'); busy(button, true, '发送重置邮件'); const { error } = await client.auth.resetPasswordForEmail(new FormData(event.currentTarget).get('email'), { redirectTo: `${location.origin}/auth.html?mode=update` }); busy(button, false, '发送重置邮件'); message(error ? error.message : '如邮箱已注册，重置链接已发送。请检查收件箱。', error ? 'error' : 'success'); });
    document.querySelector('[data-update-form]').addEventListener('submit', async event => { event.preventDefault(); const password = String(new FormData(event.currentTarget).get('password')); if (password.length < 8) return message('密码至少需要 8 个字符。', 'error'); const button = event.currentTarget.querySelector('[type=submit]'); busy(button, true, '更新密码'); const { error } = await client.auth.updateUser({ password }); busy(button, false, '更新密码'); if (error) return message(error.message, 'error'); message('密码已更新，请使用新密码登录。', 'success'); event.currentTarget.reset(); showPanel('login'); });
  }

  async function initProfile() { const account = document.querySelector('[data-account-page]'); if (!account) return; const { data: { user } } = await client.auth.getUser(); if (!user) return location.replace('auth.html?next=profile'); const name = user.user_metadata?.username || '社区成员'; document.querySelectorAll('[data-profile-name]').forEach(el => el.textContent = el.classList.contains('profile-avatar') ? name.slice(0, 1) : name); document.querySelector('[data-profile-email]').textContent = user.email || ''; document.querySelector('[data-profile-created]').textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(user.created_at)); document.querySelector('[data-signout]').addEventListener('click', async () => { await client.auth.signOut(); location.assign('index.html'); }); }

  client.auth.getSession().then(async ({ data }) => {
    updateNav(data.session?.user || null); submitAudit(data.session);
    const filename = location.pathname.split('/').pop() || 'index.html';
    if (!data.session && filename !== 'auth.html' && filename !== 'auth' && filename !== 'privacy.html' && filename !== 'access-denied.html') return location.replace(`auth.html?next=${encodeURIComponent(filename.replace('.html', '') || 'index')}`);
    if (!data.session) return;
    const { data: profile } = await client.from('profiles').select('level').eq('id', data.session.user.id).single();
    const need = (filename === 'leadership.html' || filename === 'leadership') ? 5 : (filename === 'executives.html' || filename === 'executives') ? 10 : 0;
    if (need && (profile?.level || 0) < need) return location.replace(`access-denied.html?need=${need}`);
    const beat = () => fetch('/api/activity', { method:'POST', headers:{authorization:`Bearer ${data.session.access_token}`} }).catch(() => {});
    beat(); window.setInterval(beat, 300000);
  });
  client.auth.onAuthStateChange((_event, session) => { updateNav(session?.user || null); submitAudit(session); });
  document.addEventListener('DOMContentLoaded', () => { initAuthPage(); initProfile(); });
  document.addEventListener('DOMContentLoaded', async () => {
    if (!document.querySelector('[data-profile-level]')) return;
    const { data: { user } } = await client.auth.getUser(); if (!user) return;
    const { data } = await client.from('profiles').select('level,xp').eq('id', user.id).single();
    if (!data) return;
    document.querySelector('[data-profile-level]').textContent = `LV${data.level}`;
    const needed = data.level >= 120 ? 0 : 20 + data.level * 10;
    document.querySelector('[data-profile-xp]').textContent = data.level >= 120 ? '已满级' : `${data.xp} / ${needed} XP`;
  });
})();
