const siteSessionKey = 'tahder-site-session';

const loadingState = document.getElementById('dashboard-loading');
const errorState = document.getElementById('dashboard-error');
const errorText = document.getElementById('dashboard-error-text');
const dashboardContent = document.getElementById('dashboard-content');
const retryButton = document.getElementById('retry-dashboard');
const logoutButton = document.getElementById('dashboard-logout');
const sidebarStatus = document.getElementById('sidebar-status');
const metricPreparations = document.getElementById('metric-preparations');
const metricSubscription = document.getElementById('metric-subscription');
const metricPlan = document.getElementById('metric-plan');
const metricExtension = document.getElementById('metric-extension');
const prepList = document.getElementById('dashboard-prep-list');
const preparationsEmpty = document.getElementById('preparations-empty');
const subscriptionCopy = document.getElementById('subscription-copy');
const extensionCopy = document.getElementById('extension-copy');

const samplePreparations = [
  {
    id: 'sample-1',
    lesson_title: 'نص الاستماع: التعاون',
    subject: 'لغتي',
    grade: 'الصف الأول',
    status: 'ready',
    created_at: new Date().toISOString(),
  },
];

function homeUrl(hash = '') {
  const base = location.pathname.endsWith('.html') ? 'index.html' : '/';
  return `${base}${hash}`;
}

function isLocalHost() {
  return location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '127.0.0.1.nip.io';
}

function readSiteSession() {
  try {
    const stored = localStorage.getItem(siteSessionKey);
    return stored ? JSON.parse(stored) : null;
  } catch (_) {
    localStorage.removeItem(siteSessionKey);
    return null;
  }
}

function setView(view) {
  loadingState.hidden = view !== 'loading';
  errorState.hidden = view !== 'error';
  dashboardContent.hidden = view !== 'content';
}

function subscriptionLabel(subscription, siteSession) {
  const status = subscription?.status || siteSession?.subscription || 'inactive';
  if (status === 'trial') return 'تجربة';
  if (status === 'active') return 'نشط';
  if (status === 'demo') return 'تجربة محلية';
  if (status === 'past_due') return 'يحتاج مراجعة';
  if (status === 'cancelled') return 'ملغي';
  if (status === 'expired') return 'منتهي';
  return 'غير مفعل';
}

function planLabel(subscription, siteSession) {
  if (subscription?.name_ar) return subscription.name_ar;
  if (subscription?.plan_id === 'teacher-yearly') return 'اشتراك المعلم السنوي';
  if (subscription?.plan_id === 'teacher-monthly') return 'اشتراك المعلم الشهري';
  if (subscription?.plan_id === 'trial' || siteSession?.subscription === 'trial') return 'تجربة مجانية';
  if (siteSession?.subscription === 'demo') return 'تجربة محلية';
  return 'غير محددة';
}

function formatDate(value) {
  if (!value) return 'غير محدد';
  try {
    return new Date(value).toLocaleDateString('ar-SA');
  } catch (_) {
    return 'غير محدد';
  }
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function normalizePreparation(row) {
  return {
    id: row.id,
    lesson_title: row.lesson_title || 'درس بدون عنوان',
    subject: row.subject || 'مادة غير محددة',
    grade: row.grade || 'مرحلة غير محددة',
    status: row.status || 'ready',
    created_at: row.created_at,
  };
}

function renderPreparations(preparations) {
  metricPreparations.textContent = preparations.length.toLocaleString('ar-SA');
  preparationsEmpty.hidden = preparations.length > 0;
  prepList.hidden = preparations.length === 0;

  prepList.innerHTML = preparations.slice(0, 6).map((prep) => `
    <article class="dashboard-prep-item">
      <span>${escapeHtml(prep.subject).slice(0, 2)}</span>
      <div>
        <strong>${escapeHtml(prep.lesson_title)}</strong>
        <small>${escapeHtml(prep.subject)} · ${escapeHtml(prep.grade)} · ${formatDate(prep.created_at)}</small>
      </div>
      <em>${escapeHtml(prep.status)}</em>
    </article>
  `).join('');
}

function renderSubscription(subscription, siteSession) {
  const label = subscriptionLabel(subscription, siteSession);
  const plan = planLabel(subscription, siteSession);
  metricSubscription.textContent = label;
  metricPlan.textContent = `الخطة: ${plan}`;
  sidebarStatus.textContent = label;
  subscriptionCopy.textContent = subscription?.ends_at
    ? `اشتراكك الحالي: ${plan}. ينتهي في ${formatDate(subscription.ends_at)}.`
    : `حالة الاشتراك الحالية: ${label}. الخطة: ${plan}.`;
}

function renderExtensionStatus(hasSession) {
  metricExtension.textContent = hasSession ? 'جاهزة للاستخدام' : 'تحتاج تسجيل دخول';
  extensionCopy.textContent = hasSession
    ? 'ثبّت الإضافة وافتح صفحة التحضير داخل مدرستي. ستظهر اللوحة في الصفحات المناسبة فقط.'
    : 'سجل الدخول أولًا حتى تستطيع الإضافة التحقق من الحساب والاشتراك.';
}

async function loadDashboard() {
  setView('loading');
  const authSession = globalThis.TahderApi?.readSession?.() || null;
  const siteSession = readSiteSession();
  const hasLocalDemo = isLocalHost() && Boolean(siteSession?.email && siteSession?.subscription);

  try {
    if (!authSession && !hasLocalDemo) {
      throw new Error('سجل الدخول أو أنشئ حسابًا لعرض لوحة المعلم.');
    }

    if (!authSession && hasLocalDemo) {
      renderSubscription(null, siteSession);
      renderExtensionStatus(true);
      renderPreparations(samplePreparations);
      setView('content');
      return;
    }

    let subscription = null;
    let preparations = [];

    try {
      subscription = await globalThis.TahderApi.getActiveSubscription(authSession);
    } catch (_) {
      subscription = null;
    }

    try {
      const rows = await globalThis.TahderApi.listPreparations(authSession);
      preparations = rows.map(normalizePreparation);
    } catch (error) {
      throw new Error('تعذر تحميل آخر التحاضير. تحقق من الاتصال ثم حاول مرة أخرى.');
    }

    renderSubscription(subscription, siteSession);
    renderExtensionStatus(true);
    renderPreparations(preparations);
    setView('content');
  } catch (error) {
    errorText.textContent = error.message || 'تعذر تحميل لوحة المعلم.';
    sidebarStatus.textContent = 'غير متاح';
    setView('error');
  }
}

retryButton.addEventListener('click', loadDashboard);

logoutButton.addEventListener('click', async () => {
  await globalThis.TahderApi?.signOut?.().catch(() => {});
  localStorage.removeItem(siteSessionKey);
  window.location.href = homeUrl('#account');
});

loadDashboard();
