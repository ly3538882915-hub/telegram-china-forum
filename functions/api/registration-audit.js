const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
const deviceName = ua => {
  const platform = /Android/i.test(ua) ? 'Android' : /iPhone|iPad|iPod/i.test(ua) ? 'iOS' : /Windows/i.test(ua) ? 'Windows' : /Mac OS/i.test(ua) ? 'macOS' : '其他设备';
  const browser = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '浏览器';
  return `${platform} · ${browser}`;
};
export async function onRequestPost({ request, env }) {
  try {
    const authorization = request.headers.get('authorization') || '';
    if (!authorization.startsWith('Bearer ')) return json({ error: 'unauthorized' }, 401);
    const body = await request.json(); if (body.consent !== true) return json({ error: 'consent_required' }, 400);
    const userResponse = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, { headers: { authorization, apikey: env.SUPABASE_SERVICE_ROLE_KEY } });
    if (!userResponse.ok) return json({ error: 'unauthorized' }, 401);
    const { id } = await userResponse.json();
    const response = await fetch(`${env.SUPABASE_URL}/rest/v1/registration_audit?on_conflict=user_id`, { method: 'POST', headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ user_id: id, province: request.cf?.region || request.cf?.regionCode || '未知地区', device_name: deviceName(request.headers.get('user-agent') || '') }) });
    return response.ok ? json({ ok: true }) : json({ error: 'audit_save_failed' }, 500);
  } catch { return json({ error: 'audit_request_failed' }, 500); }
}
