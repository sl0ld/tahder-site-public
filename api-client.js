(function (global) {
  const config = global.TAHDER_CONFIG || {};
  const authKey = 'tahder-site-auth';

  function apiBaseUrl() {
    return String(config.apiBaseUrl || '').replace(/\/+$/, '');
  }

  function isConfigured() {
    return Boolean(apiBaseUrl());
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

  async function parseResponse(response) {
    const text = await response.text();
    if (!text) return null;

    try {
      return JSON.parse(text);
    } catch {
      return { message: text };
    }
  }

  async function request(path, options = {}) {
    if (!isConfigured()) throw new Error('لم يتم ربط الموقع بالباك إند بعد.');

    const session = Object.prototype.hasOwnProperty.call(options, 'session') ? options.session : readSession();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
    if (options.body instanceof FormData) delete headers['Content-Type'];

    const response = await fetch(`${apiBaseUrl()}${path}`, {
      ...options,
      headers,
    });
    const body = await parseResponse(response);

    if (!response.ok) throw new Error(body?.message || body?.error || 'تعذر الاتصال بالخادم.');
    return body;
  }

  function normalizeSession(result) {
    const session = {
      ...result,
      access_token: result?.access_token || result?.token,
      user: result?.user || {
        id: result?.user_id,
        email: result?.email,
        user_metadata: result?.metadata || {},
      },
    };

    if (!session.user?.email && result?.email) session.user.email = result.email;
    return session;
  }

  async function signIn(email, password) {
    const session = normalizeSession(await request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
      session: null,
    }));
    saveSession(session);
    return session;
  }

  async function signUp(email, password, metadata = {}) {
    const result = await request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, metadata }),
      session: null,
    });

    if (result?.session || result?.access_token || result?.token) {
      result.session = normalizeSession(result.session || result);
      saveSession(result.session);
    }

    return result;
  }

  async function updateProfile(session, profile) {
    return request('/me/profile', {
      method: 'PATCH',
      body: JSON.stringify(profile),
      session,
    });
  }

  async function signOut() {
    const session = readSession();
    if (session) {
      try {
        await request('/auth/logout', { method: 'POST', session });
      } catch (_) {
        // Keep logout reliable even when the server session already expired.
      }
    }
    clearSession();
  }

  async function createTrialSubscription(session) {
    return request('/subscriptions/trial', {
      method: 'POST',
      body: JSON.stringify({ user_id: session.user.id }),
      session,
    });
  }

  async function getActiveSubscription(session) {
    return request('/me/subscription', { session });
  }

  async function listPlans() {
    return request('/plans', { session: null });
  }

  async function activateSignupSubscription(planId, session = readSession()) {
    return request('/subscriptions/activate-signup', {
      method: 'POST',
      body: JSON.stringify({ plan_id: planId }),
      session,
    });
  }

  async function listPreparations(session = readSession()) {
    return request('/me/preparations?limit=20', { session });
  }

  async function listLinkedDevices(session = readSession()) {
    return request('/me/linked-devices?limit=20', { session });
  }

  async function recordActivity(session, eventType, metadata = {}) {
    return request('/activity-logs', {
      method: 'POST',
      body: JSON.stringify({ event_type: eventType, metadata }),
      session,
    });
  }

  async function isAdmin(session = readSession()) {
    const result = await request('/admin/me', { session });
    return Boolean(result?.is_admin || result?.isAdmin);
  }

  async function adminListAccounts(session = readSession()) {
    return request('/admin/accounts', { session });
  }

  async function adminListBooks(session = readSession()) {
    return request('/admin/books', { session });
  }

  async function uploadBookPdf(file, session = readSession()) {
    if (!file || file.type !== 'application/pdf') throw new Error('اختر ملف PDF صحيح.');
    const formData = new FormData();
    formData.append('file', file);
    return request('/admin/books/upload', {
      method: 'POST',
      body: formData,
      session,
    });
  }

  async function adminCreateBook(book, session = readSession()) {
    return request('/admin/books', {
      method: 'POST',
      body: JSON.stringify(book),
      session,
    });
  }

  async function adminGetAiSettings(session = readSession()) {
    return request('/admin/ai-settings', { session });
  }

  async function adminSaveAiSettings(settings, session = readSession()) {
    return request('/admin/ai-settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
      session,
    });
  }

  global.TahderApi = {
    activateSignupSubscription,
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
    listPlans,
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
