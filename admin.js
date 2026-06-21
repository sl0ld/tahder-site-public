const adminStatus = document.getElementById('admin-status');
const adminHero = document.getElementById('admin-hero');
const loginCard = document.getElementById('admin-login-card');
const dashboard = document.getElementById('admin-dashboard');
const loginForm = document.getElementById('admin-login-form');
const loginError = document.getElementById('admin-login-error');
const logoutButton = document.getElementById('admin-logout');
const activeCount = document.getElementById('active-count');
const inactiveCount = document.getElementById('inactive-count');
const booksCount = document.getElementById('books-count');
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

function setStatus(message, tone = 'ready') {
  adminStatus.textContent = message;
  adminStatus.dataset.tone = tone;
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function showLogin(message = '') {
  adminHero.hidden = true;
  dashboard.hidden = true;
  logoutButton.hidden = true;
  loginCard.hidden = false;
  setStatus(message || 'سجل دخولك بحساب أدمن');
}

function showDashboard() {
  adminHero.hidden = false;
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

function renderAccounts(accounts) {
  const active = accounts.filter((account) => account.is_active);
  activeCount.textContent = active.length;
  inactiveCount.textContent = accounts.length - active.length;

  accountsTable.innerHTML = accounts.length
    ? accounts.map((account) => `
      <tr>
        <td>${account.email || '-'}</td>
        <td>${account.display_name || '<span class="muted-cell">بدون اسم</span>'}</td>
        <td>${account.phone || '<span class="muted-cell">غير مضاف</span>'}</td>
        <td>${account.plan_id || '<span class="muted-cell">لا توجد خطة</span>'}</td>
        <td><span class="status-pill ${account.is_active ? 'active' : 'inactive'}">${account.is_active ? 'فعال' : 'غير فعال'}</span></td>
        <td>${formatDate(account.ends_at)}</td>
      </tr>
    `).join('')
    : '<tr><td colspan="6" class="muted-cell">لا توجد حسابات بعد.</td></tr>';
}

function renderBooks(books) {
  booksCount.textContent = books.length;
  booksTable.innerHTML = books.length
    ? books.map((book) => {
      const lessonsCount = Array.isArray(book.lessons) ? book.lessons.length : 0;
      const title = book.pdf_url ? `<a href="${book.pdf_url}" target="_blank" rel="noreferrer">${book.title}</a>` : book.title;
      return `
        <tr>
          <td>${title}</td>
          <td>${book.subject}</td>
          <td>${book.grade}</td>
          <td>${book.term}</td>
          <td>${lessonsCount} درس</td>
          <td><span class="status-pill ${book.status === 'active' ? 'active' : 'inactive'}">${book.status === 'active' ? 'فعال' : 'معطل'}</span></td>
        </tr>
      `;
    }).join('')
    : '<tr><td colspan="6" class="muted-cell">لم تتم إضافة كتب بعد.</td></tr>';
}

async function loadAccounts() {
  accountsTable.innerHTML = '<tr><td colspan="6" class="muted-cell">جاري تحميل الحسابات...</td></tr>';
  const accounts = await globalThis.TahderSupabase.adminListAccounts();
  renderAccounts(accounts);
}

async function loadBooks() {
  booksTable.innerHTML = '<tr><td colspan="6" class="muted-cell">جاري تحميل الكتب...</td></tr>';
  const books = await globalThis.TahderSupabase.adminListBooks();
  renderBooks(books);
}

async function loadAiSettings() {
  aiMeta.textContent = 'جاري تحميل إعدادات AI...';
  const rows = await globalThis.TahderSupabase.adminGetAiSettings();
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
  await Promise.all([loadAccounts(), loadBooks(), loadAiSettings()]);
}

async function bootAdmin() {
  if (!globalThis.TahderSupabase?.isConfigured()) {
    showLogin('لم يتم ربط الموقع بقاعدة البيانات');
    return;
  }

  const session = globalThis.TahderSupabase.readSession();
  if (!session) {
    showLogin();
    return;
  }

  try {
    const allowed = await globalThis.TahderSupabase.isAdmin(session);
    if (!allowed) {
      await globalThis.TahderSupabase.signOut();
      showLogin('هذا الحساب ليس أدمن');
      return;
    }

    await loadDashboard();
  } catch (error) {
    showLogin(error.message);
  }
}

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  loginError.hidden = true;

  const formData = new FormData(loginForm);
  const email = String(formData.get('email') || '');
  const password = String(formData.get('password') || '');

  try {
    const session = await globalThis.TahderSupabase.signIn(email, password);
    const allowed = await globalThis.TahderSupabase.isAdmin(session);

    if (!allowed) {
      await globalThis.TahderSupabase.signOut();
      throw new Error('هذا الحساب صحيح لكنه ليس أدمن.');
    }

    await loadDashboard();
  } catch (error) {
    loginError.textContent = error.message;
    loginError.hidden = false;
  }
});

logoutButton.addEventListener('click', async () => {
  await globalThis.TahderSupabase.signOut();
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
        const upload = await globalThis.TahderSupabase.uploadBookPdf(file);
        await globalThis.TahderSupabase.adminCreateBook({
          ...baseBook,
          title: selectedFiles.length === 1 ? (baseBook.title || titleFromFile(file)) : titleFromFile(file),
          pdfUrl: upload.url,
        });
      }
    } else {
      await globalThis.TahderSupabase.adminCreateBook(baseBook);
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
    await globalThis.TahderSupabase.adminSaveAiSettings(settings);
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

bootAdmin();
