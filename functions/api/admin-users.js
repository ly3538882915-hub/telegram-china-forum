const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

const configurationError = env => !env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY;

async function supabase(env, path, init = {}) {
  return fetch(`${env.SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: env.SUPABASE_SERVICE_ROLE_KEY,
      authorization: `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
      ...init.headers
    }
  });
}

export async function onRequest({ request, env }) {
  try {
    if (configurationError(env)) {
      return json({ error: 'server_configuration_missing' }, 500);
    }

    const accessToken = request.headers.get('authorization') || '';
    if (!accessToken.startsWith('Bearer ')) return json({ error: 'missing_login_session' }, 401);

    const me = await fetch(`${env.SUPABASE_URL}/auth/v1/user`, {
      headers: { authorization: accessToken, apikey: env.SUPABASE_SERVICE_ROLE_KEY }
    });
    if (!me.ok) return json({ error: 'invalid_or_expired_session', status: me.status }, 401);

    const user = await me.json();
    if ((user.email || '').toLowerCase() !== '3538882915@qq.com') {
      return json({ error: 'primary_admin_only' }, 403);
    }

    if (request.method === 'GET') {
      const result = await supabase(
        env,
        'profiles?select=id,username,email,role,level,xp,created_at,registration_audit(province,device_name,consented_at)&order=created_at.desc'
      );
      const body = await result.text();
      if (!result.ok) return json({ error: 'profile_query_failed', status: result.status, detail: body.slice(0, 300) }, result.status);
      return new Response(body, { headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' } });
    }

    if (request.method === 'PATCH') {
      const { id, role, level } = await request.json();
      if (!id || (role !== undefined && !['member', 'superadmin'].includes(role)) || (level !== undefined && (!Number.isInteger(level) || level < 0 || level > 120))) return json({ error: 'invalid_request' }, 400);
      const update = {};
      if (role !== undefined) update.role = role;
      if (level !== undefined) update.level = level;
      if (!Object.keys(update).length) return json({ error: 'invalid_request' }, 400);
      const result = await supabase(env, `profiles?id=eq.${encodeURIComponent(id)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json', prefer: 'return=minimal' },
        body: JSON.stringify(update)
      });
      if (!result.ok) return json({ error: 'role_update_failed', status: result.status }, result.status);
      return json({ ok: true });
    }

    return json({ error: 'method_not_allowed' }, 405);
  } catch (error) {
    console.error('admin-users failed', error);
    return json({ error: 'server_request_failed' }, 500);
  }
}
