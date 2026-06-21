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

    if (!response.ok) throw new Error(body?.error_description || body?.message || body?.msg || body?.error || 'تعذر الاتصال بالخادم.');
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

  function safeStorageName(name) {
    return String(name || 'book.pdf')
      .trim()
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      || 'book.pdf';
  }

  async function uploadBookPdf(file, session = readSession()) {
    if (!isConfigured()) throw new Error('أضف بيانات Supabase في ملف config.js أولاً.');
    if (!session?.access_token) throw new Error('سجل دخول الأدمن قبل رفع الملفات.');
    if (!file || file.type !== 'application/pdf') throw new Error('اختر ملف PDF صحيح.');

    const bucket = config.booksBucket || 'curriculum-books';
    const path = `books/${Date.now()}-${safeStorageName(file.name)}`;
    const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${bucket}/${path}`, {
      method: 'POST',
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/pdf',
        'x-upsert': 'false',
      },
      body: file,
    });
    const body = await parseResponse(response);

    if (!response.ok) throw new Error(body?.message || body?.error || 'تعذر رفع ملف PDF.');

    return {
      path,
      url: encodeURI(`${config.supabaseUrl}/storage/v1/object/public/${bucket}/${path}`),
    };
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

  async function signUp(email, password, metadata = {}) {
    const result = await request('/auth/v1/signup', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        data: metadata,
      }),
      session: null,
    });

    if (result?.session) saveSession(result.session);
    return result;
  }

  async function updateProfile(session, profile) {
    return request('/rest/v1/profiles', {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(profile),
      session,
    });
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

  async function createTrialSubscription(session) {
    const startsAt = new Date();
    const endsAt = new Date(startsAt);
    endsAt.setDate(endsAt.getDate() + 14);

    return request('/rest/v1/subscriptions?select=id,plan_id,status,starts_at,ends_at', {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({
        user_id: session.user.id,
        plan_id: 'trial',
        status: 'trial',
        starts_at: startsAt.toISOString(),
        ends_at: endsAt.toISOString(),
      }),
      session,
    });
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
    return request('/rest/v1/preparations?select=id,lesson_title,subject,grade,term,content,status,source,created_at&order=created_at.desc&limit=20', { session });
  }

  async function listLinkedDevices(session = readSession()) {
    return request('/rest/v1/linked_devices?select=id,label,last_seen_at,is_active,created_at&order=last_seen_at.desc&limit=20', { session });
  }

  async function recordActivity(session, eventType, metadata = {}) {
    return request('/rest/v1/activity_logs', {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({ user_id: session.user.id, event_type: eventType, metadata }),
      session,
    });
  }

  async function isAdmin(session = readSession()) {
    return request('/rest/v1/rpc/is_admin', {
      method: 'POST',
      body: JSON.stringify({}),
      session,
    });
  }

  async function adminListAccounts(session = readSession()) {
    return request('/rest/v1/rpc/admin_list_accounts', {
      method: 'POST',
      body: JSON.stringify({}),
      session,
    });
  }

  async function adminListBooks(session = readSession()) {
    return request('/rest/v1/rpc/admin_list_books', {
      method: 'POST',
      body: JSON.stringify({}),
      session,
    });
  }

  async function adminCreateBook(book, session = readSession()) {
    return request('/rest/v1/rpc/admin_create_book', {
      method: 'POST',
      body: JSON.stringify({
        book_title: book.title,
        book_subject: book.subject,
        book_grade: book.grade,
        book_term: book.term,
        book_academic_year: book.academicYear,
        book_pdf_url: book.pdfUrl,
        book_lessons: book.lessons,
        book_status: book.status,
      }),
      session,
    });
  }

  async function adminGetAiSettings(session = readSession()) {
    return request('/rest/v1/rpc/admin_get_ai_settings', {
      method: 'POST',
      body: JSON.stringify({}),
      session,
    });
  }

  async function adminSaveAiSettings(settings, session = readSession()) {
    return request('/rest/v1/rpc/admin_save_ai_settings', {
      method: 'POST',
      body: JSON.stringify({
        ai_provider: settings.provider,
        ai_model: settings.model,
        ai_api_key: settings.apiKey,
        ai_system_prompt: settings.systemPrompt,
        ai_temperature: settings.temperature,
        ai_is_enabled: settings.isEnabled,
      }),
      session,
    });
  }

  global.TahderSupabase = {
    adminCreateBook,
    adminGetAiSettings,
    adminListAccounts,
    adminListBooks,
    adminSaveAiSettings,
    createTrialSubscription,
    uploadBookPdf,
    getActiveSubscription,
    isAdmin,
    isConfigured,
    listLinkedDevices,
    listPreparations,
    readSession,
    recordActivity,
    signIn,
    signUp,
    signOut,
    updateProfile,
  };
})(globalThis);
