(() => {
  const configReady = window.APP_SUPABASE_URL && window.APP_SUPABASE_PUBLISHABLE_KEY && window.supabase;
  if (!configReady) return;

  const client = window.supabase.createClient(window.APP_SUPABASE_URL, window.APP_SUPABASE_PUBLISHABLE_KEY);
  window.forumAuth = client;

  const text = (selector, value, type = '') => {
    const element = document.querySelector(selector);
    if (!element) return;
    element.textContent = value;
    element.className = `form-message ${type}`;
  };

  const setBusy = (button, busy, label) => {
    if (!button) return;
    button.disabled = busy;
    button.textContent = busy ? '请稍候…' : label;
  };

  const updateNav = (user) => {
    document.querySelectorAll('[data-auth-nav]').forEach((link) => {
      link.href = user ? 'profile.html' : 'auth.html';
      link.textContent = user ? '我的账户' : '登录 / 注册';
    });
  };

  const initAccountPage = async () => {
    const account = document.querySelector('[data-account-page]');
    if (!account) return;
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      window.location.replace('auth.html?next=profile');
      return;
    }
    const name = user.user_metadata?.username || 'Telegram 社区成员';
    document.querySelectorAll('[data-profile-name]').forEach((element) => {
      element.textContent = element.classList.contains('profile-avatar') ? name.slice(0, 1) : name;
    });
    document.querySelector('[data-profile-email]').textContent = user.email || '';
    document.querySelector('[data-profile-created]').textContent = new Intl.DateTimeFormat('zh-CN', { dateStyle: 'long' }).format(new Date(user.created_at));
    document.querySelector('[data-signout]').addEventListener('click', async () => {
      await client.auth.signOut();
      window.location.assign('index.html');
    });
  };

  const showPanel = (name) => {
    document.querySelectorAll('[data-auth-panel]').forEach((panel) => panel.hidden = panel.dataset.authPanel !== name);
    document.querySelectorAll('[data-auth-switch]').forEach((button) => button.classList.toggle('selected', button.dataset.authSwitch === name));
    text('[data-auth-message]', '');
  };

  const initAuthPage = () => {
    if (!document.querySelector('[data-auth-page]')) return;
    const initialMode = new URLSearchParams(window.location.search).get('mode');
    showPanel(initialMode === 'update' ? 'update' : 'login');

    document.querySelectorAll('[data-auth-switch]').forEach((button) => button.addEventListener('click', () => showPanel(button.dataset.authSwitch)));

    document.querySelector('[data-login-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const button = event.currentTarget.querySelector('button[type="submit"]');
      setBusy(button, true, '登录');
      const { error } = await client.auth.signInWithPassword({ email: form.get('email'), password: form.get('password') });
      setBusy(button, false, '登录');
      if (error) return text('[data-auth-message]', error.message === 'Invalid login credentials' ? '邮箱或密码不正确。' : error.message, 'error');
      const next = new URLSearchParams(window.location.search).get('next');
      window.location.assign(next ? `${next}.html` : 'profile.html');
    });

    document.querySelector('[data-signup-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const username = String(form.get('username')).trim();
      const password = String(form.get('password'));
      const confirm = String(form.get('confirmPassword'));
      if (username.length < 2) return text('[data-auth-message]', '用户名至少需要 2 个字符。', 'error');
      if (password.length < 8) return text('[data-auth-message]', '密码至少需要 8 个字符。', 'error');
      if (password !== confirm) return text('[data-auth-message]', '两次输入的密码不一致。', 'error');
      const button = event.currentTarget.querySelector('button[type="submit"]');
      setBusy(button, true, '创建账户');
      const { data, error } = await client.auth.signUp({
        email: form.get('email'), password,
        options: { emailRedirectTo: `${window.location.origin}/auth.html`, data: { username } }
      });
      setBusy(button, false, '创建账户');
      if (error) return text('[data-auth-message]', error.message, 'error');
      if (data.user?.identities?.length === 0) return text('[data-auth-message]', '该邮箱已注册，请直接登录或重置密码。', 'error');
      text('[data-auth-message]', '账户已创建。请前往邮箱点击验证链接后再登录。', 'success');
      event.currentTarget.reset();
    });

    document.querySelector('[data-reset-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const button = event.currentTarget.querySelector('button[type="submit"]');
      setBusy(button, true, '发送重置邮件');
      const { error } = await client.auth.resetPasswordForEmail(new FormData(event.currentTarget).get('email'), { redirectTo: `${window.location.origin}/auth.html?mode=update` });
      setBusy(button, false, '发送重置邮件');
      if (error) return text('[data-auth-message]', error.message, 'error');
      text('[data-auth-message]', '如果邮箱已注册，重置链接已发送。请检查收件箱。', 'success');
    });

    document.querySelector('[data-update-form]').addEventListener('submit', async (event) => {
      event.preventDefault();
      const form = new FormData(event.currentTarget);
      const password = String(form.get('password'));
      if (password.length < 8) return text('[data-auth-message]', '密码至少需要 8 个字符。', 'error');
      const button = event.currentTarget.querySelector('button[type="submit"]');
      setBusy(button, true, '更新密码');
      const { error } = await client.auth.updateUser({ password });
      setBusy(button, false, '更新密码');
      if (error) return text('[data-auth-message]', error.message, 'error');
      text('[data-auth-message]', '密码已更新，请使用新密码登录。', 'success');
      event.currentTarget.reset();
      showPanel('login');
    });
  };

  client.auth.getUser().then(({ data }) => {
    updateNav(data.user);
    const filename = location.pathname.split('/').pop() || 'index.html';
    if (!data.user && filename !== 'auth.html') {
      const page = filename.replace('.html', '') || 'index';
      location.replace(`auth.html?next=${encodeURIComponent(page)}`);
    }
  });
  client.auth.onAuthStateChange((_event, session) => updateNav(session?.user || null));
  document.addEventListener('DOMContentLoaded', () => { initAuthPage(); initAccountPage(); });
})();
