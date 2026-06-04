(function (global) {
  const config = global.TAHDER_CONFIG || {};
  const authKey = 'tahder-site-auth';

  function isConfigured() {
    return Boolean(config.supabaseUrl && config.publishableKey);
  }

  function saveSession(session) {
    localStorage.setItem(authKey, JSON.stringify(session));
  }

  function clearSession() {
    localStorage.removeItem(authKey);
  }

  function readSession() {
    const value = localStorage.getItem(authKey);
    return value ? JSON.parse(value) : null;
  }

  async function request(path, options = {}) {
    if (!isConfigured()) throw new Error('أضف بيانات Supabase في ملف config.js أولاً.');
    const session = options.session || readSession();
    const response = await fetch(`${config.supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey: config.publishableKey,
        Authorization: session?.access_token ? `Bearer ${session.access_token}` : `Bearer ${config.publishableKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    const body = await parseResponse(response);

    if (!response.ok) throw new Error(body?.error_description || body?.message || body?.error || 'تعذر الاتصال بالخادم.');
    return body;
  }

  async function parseResponse(response) {
    const text = await response.text();

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  async function signIn(email, password) {
    const session = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      session: null,
    });
    saveSession(session);
    return session;
  }

  async function signOut() {
    const session = readSession();
    if (session) {
      try {
        await request('/auth/v1/logout', { method: 'POST', session });
      } catch (_) {
        // Remove the local session even if it already expired remotely.
      }
    }
    clearSession();
  }

  async function getActiveSubscription(session) {
    const subscriptions = await request('/rest/v1/subscriptions?select=id,plan_id,status,starts_at,ends_at&order=created_at.desc', { session });
    const now = Date.now();

    return subscriptions.find((item) =>
      ['trial', 'active'].includes(item.status)
      && Date.parse(item.starts_at) <= now
      && (!item.ends_at || Date.parse(item.ends_at) > now),
    ) || null;
  }

  async function listPreparations(session = readSession()) {
    return request('/rest/v1/preparations?select=id,lesson_title,subject,grade,term,status,source,created_at&order=created_at.desc&limit=20', { session });
  }

  async function recordActivity(session, eventType, metadata = {}) {
    return request('/rest/v1/activity_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, event_type: eventType, metadata }),
      session,
    });
  }

  global.TahderSupabase = {
    getActiveSubscription,
    isConfigured,
    listPreparations,
    readSession,
    recordActivity,
    signIn,
    signOut,
  };
})(globalThis);
