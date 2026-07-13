const adminStatus = document.getElementById('admin-status');
const adminHero = document.getElementById('admin-hero');
const loginCard = document.getElementById('admin-login-card');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('admin-login-error');
const logoutButton = document.getElementById('admin-logout');
const totalUsersCount = document.getElementById('total-users-count');
const activeCount = document.getElementById('active-count');
const activeSubscriptionsCount = document.getElementById('active-subscriptions-count');
const inactiveCount = document.getElementById('inactive-count');
const trialCount = document.getElementById('trial-count');
const monthlyRevenue = document.getElementById('monthly-revenue');
const booksCount = document.getElementById('books-count');
const subscriptionBars = document.getElementById('subscription-bars');
const activityLog = document.getElementById('activity-log');
const accountsTable = document.getElementById('accounts-table');
const booksTable = document.getElementById('books-table');
const bookForm = document.getElementById('book-form');
const bookError = document.getElementById('book-error');
const bookSuccess = document.getElementById('book-success');
const bookPdfFiles = document.getElementById('book-pdf-files');
const bookUploadSummary = document.getElementById('book-upload-summary');
const aiForm = document.getElementById('ai-form');
const aiError = document.getElementById('ai-error');
const aiSuccess = document.getElementById('ai-success');
const aiMeta = document.getElementById('ai-meta');
const refreshAccounts = document.getElementById('refresh-accounts');
const refreshBooks = document.getElementById('refresh-books');
const exportCsv = document.getElementById('export-csv');

let latestAccounts = [];
let latestBooks = [];
let latestPlans = [];

function setStatus(message, tone = 'ready') {
  if (!adminStatus) return;
  adminStatus.textContent = message;
  adminStatus.dataset.tone = tone;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function planLabel(planId) {
  if (!planId) return 'لا توجد خطة';
  const plan = latestPlans.find((item) => String(item.id) === String(planId) || String(item.slug) === String(planId));
  return plan?.name || plan?.title || planId;
}

function isTrialAccount(account) {
  return String(account.status || account.plan_id || '').toLowerCase().includes('trial');
}

function planPrice(planId) {
  const plan = latestPlans.find((item) => String(item.id) === String(planId) || String(item.slug) === String(planId));
  const rawPrice = plan?.monthly_price ?? plan?.price_monthly ?? plan?.price ?? plan?.amount;
  const price = Number(rawPrice);
  return Number.isFinite(price) ? price : 0;
}

function currency(value) {
  if (!Number.isFinite(value) || value <= 0) return '—';
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    maximumFractionDigits: 0,
  }).format(value);
}

function showLogin(message = '') {
  if (adminHero) adminHero.hidden = true;
  dashboard.hidden = true;
  logoutButton.hidden = true;
  loginCard.hidden = false;
  setStatus(message || 'سجل دخولك بحساب أدمن');
}

function showDashboard() {
  if (adminHero) adminHero.hidden = false;
  loginCard.hidden = true;
  dashboard.hidden = false;
  logoutButton.hidden = false;
  setStatus('أنت داخل لوحة الأدمن', 'success');
}

function lessonsFromText(value) {
  return String(value || '')
    .split('\n')
    .map((lesson) => lesson.trim())
    .filter(Boolean)
    .map((title, index) => ({ title, order: index + 1 }));
}

function getSelectedPdfFiles() {
  return Array.from(bookPdfFiles?.files || [])
    .filter((file) => file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
}

function titleFromFile(file) {
  return file.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' ').trim();
}

function setBookSaving(isSaving, message = '') {
  const button = bookForm.querySelector('button[type="submit"]');
  button.disabled = isSaving;
  button.textContent = isSaving ? (message || 'جاري رفع الكتب...') : 'إضافة الكتاب';
}

function updateBookUploadSummary() {
  const files = getSelectedPdfFiles();

  if (!files.length) {
    bookUploadSummary.textContent = 'لم يتم اختيار ملفات بعد.';
    return;
  }

  const names = files.slice(0, 3).map((file) => file.name).join('، ');
  const more = files.length > 3 ? ` و ${files.length - 3} ملفات أخرى` : '';
  bookUploadSummary.textContent = `تم اختيار ${files.length} ملف PDF: ${names}${more}`;
}

function renderSubscriptionBars(accounts) {
  const groups = new Map();
  const total = Math.max(accounts.length, 1);
  accounts.forEach((account) => {
    const label = account.plan_id ? planLabel(account.plan_id) : 'بدون اشتراك';
    groups.set(label, (groups.get(label) || 0) + 1);
  });

  const colors = ['#18d5bd', '#f5b83b', '#9aa3af', '#111827'];
  const rows = Array.from(groups.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  subscriptionBars.innerHTML = rows.length
    ? rows.map(([label, count], index) => {
      const percent = Math.round((count / total) * 100);
      return `
        <div class="subscription-row">
          <header><span>${escapeHtml(label)}</span><b>${percent}%</b></header>
          <div class="subscription-track">
            <span class="subscription-fill" style="--value:${percent}%;--color:${colors[index]};"></span>
          </div>
        </div>
      `;
    }).join('')
    : '<p class="muted-cell">لا توجد اشتراكات بعد.</p>';
}

function renderActivity(accounts, books) {
  const items = [];
  const active = accounts.find((account) => account.is_active);
  const trial = accounts.find((account) => isTrialAccount(account));
  const newestBook = books[0];

  if (active) {
    items.push({
      title: 'اشتراك نشط',
      detail: active.display_name || active.email,
      time: formatDate(active.ends_at),
    });
  }

  if (trial) {
    items.push({
      title: 'حساب تجريبي',
      detail: trial.display_name || trial.email,
      time: formatDate(trial.ends_at),
    });
  }

  if (newestBook) {
    items.push({
      title: 'كتاب مضاف',
      detail: newestBook.title,
      time: formatDate(newestBook.updated_at || newestBook.created_at),
    });
  }

  items.push({
    title: 'تحديث البيانات',
    detail: `${accounts.length} مستخدم و ${books.length} كتاب`,
    time: 'الآن',
  });

  activityLog.innerHTML = items.slice(0, 4).map((item) => `
    <div class="activity-item">
      <div class="activity-copy">
        <strong>${escapeHtml(item.title)}</strong>
        <small>${escapeHtml(item.detail || '-')}</small>
      </div>
      <span class="activity-time">${escapeHtml(item.time || '-')}</span>
    </div>
  `).join('');
}

function renderAccountMetrics(accounts) {
  const active = accounts.filter((account) => account.is_active);
  const trials = accounts.filter((account) => isTrialAccount(account));
  const revenue = active.reduce((sum, account) => sum + planPrice(account.plan_id), 0);

  totalUsersCount.textContent = accounts.length;
  activeCount.textContent = active.length;
  activeSubscriptionsCount.textContent = active.length;
  inactiveCount.textContent = accounts.length - active.length;
  trialCount.textContent = trials.length;
  monthlyRevenue.textContent = currency(revenue);
  renderSubscriptionBars(accounts);
}

function accountStatus(account) {
  if (isTrialAccount(account)) return { className: 'trial', label: 'تجريبي' };
  if (account.is_active) return { className: 'active', label: 'نشط' };
  return { className: 'inactive', label: 'منتهي' };
}

function renderAccounts(accounts) {
  latestAccounts = accounts;
  renderAccountMetrics(accounts);

  accountsTable.innerHTML = accounts.length
    ? accounts.slice(0, 8).map((account) => {
      const status = accountStatus(account);
      const teacherName = account.display_name || 'بدون اسم';
      return `
        <tr>
          <td>
            <span class="teacher-cell">
              <strong>${escapeHtml(teacherName)}</strong>
              <small>${escapeHtml(account.email || '-')}</small>
            </span>
          </td>
          <td>${account.school_name ? escapeHtml(account.school_name) : '<span class="muted-cell">غير محددة</span>'}</td>
          <td><span class="status-pill ${status.className}">${status.label}</span></td>
          <td>${formatDate(account.ends_at)}</td>
          <td>${account.last_seen_at ? formatDate(account.last_seen_at) : '<span class="muted-cell">غير متاح</span>'}</td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="5" class="muted-cell">لا توجد حسابات بعد.</td></tr>';

  renderActivity(latestAccounts, latestBooks);
}

function renderBooks(books) {
  latestBooks = books;
  booksCount.textContent = books.length;
  booksTable.innerHTML = books.length
    ? books.map((book) => {
      const lessonsCount = Array.isArray(book.lessons) ? book.lessons.length : 0;
      const safeTitle = escapeHtml(book.title || '-');
      const title = book.pdf_url ? `<a href="${escapeHtml(book.pdf_url)}" target="_blank" rel="noreferrer">${safeTitle}</a>` : safeTitle;
      return `
        <tr>
          <td>${title}</td>
          <td>${escapeHtml(book.subject || '-')}</td>
          <td>${escapeHtml(book.grade || '-')}</td>
          <td>${escapeHtml(book.term || '-')}</td>
          <td>${lessonsCount} درس</td>
          <td><span class="status-pill ${book.status === 'active' ? 'active' : 'inactive'}">${book.status === 'active' ? 'فعال' : 'معطل'}</span></td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="6" class="muted-cell">لم تتم إضافة كتب بعد.</td></tr>';

  renderActivity(latestAccounts, latestBooks);
}

async function loadPlans() {
  try {
    latestPlans = await globalThis.TahderApi.listPlans();
  } catch (_) {
    latestPlans = [];
  }
}

async function loadAccounts() {
  accountsTable.innerHTML = '<tr><td colspan="5" class="muted-cell">جاري تحميل الحسابات...</td></tr>';
  const accounts = await globalThis.TahderApi.adminListAccounts();
  renderAccounts(accounts);
}

async function loadBooks() {
  booksTable.innerHTML = '<tr><td colspan="6" class="muted-cell">جاري تحميل الكتب...</td></tr>';
  const books = await globalThis.TahderApi.adminListBooks();
  renderBooks(books);
}

async function loadAiSettings() {
  aiMeta.textContent = 'جاري تحميل إعدادات AI...';
  const rows = await globalThis.TahderApi.adminGetAiSettings();
  const settings = rows?.[0];

  if (!settings) {
    aiMeta.textContent = 'لا توجد إعدادات AI بعد.';
    return;
  }

  aiForm.elements.provider.value = settings.provider || 'gemini';
  aiForm.elements.model.value = settings.model || 'gemini-2.5-flash';
  aiForm.elements.temperature.value = settings.temperature ?? 0.35;
  aiForm.elements.systemPrompt.value = settings.system_prompt || '';
  aiForm.elements.isEnabled.checked = Boolean(settings.is_enabled);
  aiMeta.textContent = `التوكن الحالي: ${settings.api_key_hint || 'غير محفوظ'} · آخر تحديث: ${formatDate(settings.updated_at)}`;
}

async function loadDashboard() {
  showDashboard();
  await loadPlans();
  await Promise.all([loadAccounts(), loadBooks(), loadAiSettings()]);
}

async function bootAdmin() {
  if (!globalThis.TahderApi?.isConfigured()) {
    showLogin('لم يتم ربط الموقع بقاعدة البيانات');
    return;
  }

  const session = globalThis.TahderApi.readSession();
  if (!session) {
    showLogin();
    return;
  }

  try {
    const allowed = await globalThis.TahderApi.isAdmin(session);
    if (!allowed) {
      await globalThis.TahderApi.signOut();
      showLogin('هذا الحساب ليس أدمن');
      return;
    }

    await loadDashboard();
  } catch (error) {
    showLogin(error.message);
  }
}

function downloadAccountsCsv() {
  const headers = ['email', 'display_name', 'phone', 'plan_id', 'status', 'ends_at'];
  const rows = latestAccounts.map((account) => headers.map((key) => {
    const value = String(account[key] ?? '').replaceAll('"', '""');
    return `"${value}"`;
  }).join(','));
  const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'tahder-accounts.csv';
  link.click();
  URL.revokeObjectURL(url);
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');

  try {
    const session = await globalThis.TahderApi.signIn(email, password);
    const allowed = await globalThis.TahderApi.isAdmin(session);

    if (!allowed) {
      await globalThis.TahderApi.signOut();
      throw new Error('هذا الحساب صحيح لكنه ليس أدمن.');
    }

    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutButton.addEventListener('click', async () => {
  await globalThis.TahderApi.signOut();
  showLogin('تم تسجيل الخروج');
});

bookForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  bookError.hidden = true;
  bookSuccess.hidden = true;

  const formData = new FormData(bookForm);
  const selectedFiles = getSelectedPdfFiles();
  const baseBook = {
    title: String(formData.get('title') || '').trim(),
    subject: String(formData.get('subject') || '').trim(),
    grade: String(formData.get('grade') || '').trim(),
    term: String(formData.get('term') || '').trim(),
    academicYear: String(formData.get('academicYear') || '').trim(),
    pdfUrl: String(formData.get('pdfUrl') || '').trim(),
    lessons: lessonsFromText(formData.get('lessons')),
    status: 'active',
  };

  try {
    setBookSaving(true);

    if (selectedFiles.length) {
      for (const [index, file] of selectedFiles.entries()) {
        setBookSaving(true, `جاري رفع ${index + 1} من ${selectedFiles.length}...`);
        const upload = await globalThis.TahderApi.uploadBookPdf(file);
        await globalThis.TahderApi.adminCreateBook({
          ...baseBook,
          title: selectedFiles.length === 1 ? (baseBook.title || titleFromFile(file)) : titleFromFile(file),
          pdfUrl: upload.url,
        });
      }
    } else {
      await globalThis.TahderApi.adminCreateBook(baseBook);
    }

    bookSuccess.textContent = selectedFiles.length > 1
      ? `تم رفع وإضافة ${selectedFiles.length} كتب بنجاح.`
      : 'تمت إضافة الكتاب بنجاح.';
    bookSuccess.hidden = false;
    bookForm.reset();
    updateBookUploadSummary();
    await loadBooks();
  } catch (error) {
    bookError.textContent = error.message;
    bookError.hidden = false;
  } finally {
    setBookSaving(false);
  }
});

bookPdfFiles?.addEventListener('change', updateBookUploadSummary);

aiForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  aiError.hidden = true;
  aiSuccess.hidden = true;

  const formData = new FormData(aiForm);
  const settings = {
    provider: String(formData.get('provider') || 'gemini'),
    model: String(formData.get('model') || '').trim(),
    apiKey: String(formData.get('apiKey') || '').trim(),
    systemPrompt: String(formData.get('systemPrompt') || '').trim(),
    temperature: Number(formData.get('temperature') || 0.35),
    isEnabled: Boolean(formData.get('isEnabled')),
  };

  try {
    await globalThis.TahderApi.adminSaveAiSettings(settings);
    aiSuccess.textContent = 'تم حفظ إعدادات الذكاء الاصطناعي.';
    aiSuccess.hidden = false;
    aiForm.elements.apiKey.value = '';
    await loadAiSettings();
  } catch (error) {
    aiError.textContent = error.message;
    aiError.hidden = false;
  }
});

refreshAccounts.addEventListener('click', () => loadAccounts());
refreshBooks.addEventListener('click', () => loadBooks());
exportCsv?.addEventListener('click', downloadAccountsCsv);

bootAdmin();
