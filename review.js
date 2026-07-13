const reviewSessionKey = 'tahder-site-session';
const fields = ['objectives', 'strategies', 'resources', 'closure', 'enrichment', 'assignment'];
const samplePreparation = {
  id: 'sample',
  lesson_title: 'نص الاستماع: التعاون',
  subject: 'لغتي',
  grade: 'الخامس ابتدائي',
  term: 'الفصل الثاني',
  source_url: 'https://schools.madrasati.sa/?Language=1',
  content: {
    objectives: 'أن يحدد الطالب الفكرة الرئيسة في نص الاستماع. أن يشارك في مناقشة حول قيمة التعاون. أن يكتب إجابة قصيرة توضح أثر التعاون في المجتمع.',
    strategies: 'التعلم التعاوني، الحوار والمناقشة، الاستماع الموجه، فكر زاوج شارك، وسؤال خروج سريع.',
    resources: 'الكتاب المدرسي، منصة مدرستي، مقطع صوتي للنص، السبورة، وبطاقات أسئلة قصيرة.',
    closure: 'تلخيص قيمة التعاون بسؤال ختامي: كيف يساعد التعاون على إنجاز العمل بسرعة وإتقان؟',
    enrichment: 'يكتب الطالب موقفاً من حياته احتاج فيه إلى التعاون، ثم يشارك فكرته مع زملائه.',
    assignment: 'حل تدريب قصير عن الفكرة الرئيسة ومعاني الكلمات، وكتابة جملة توضح قيمة التعاون.',
  },
};

const state = {
  preparations: [samplePreparation],
  selected: samplePreparation,
  outputType: 'assignment',
};

const fieldFallbacks = {
  objectives: samplePreparation.content.objectives,
  strategies: samplePreparation.content.strategies,
  resources: samplePreparation.content.resources,
  closure: samplePreparation.content.closure,
  enrichment: samplePreparation.content.enrichment,
  assignment: samplePreparation.content.assignment,
};

const account = document.getElementById('review-account');
const accountHint = document.getElementById('review-account-hint');
const subscriptionPanel = document.getElementById('review-subscription');
const subscriptionStatus = document.getElementById('review-subscription-status');
const status = document.getElementById('review-status');
const locked = document.getElementById('review-locked');
const layout = document.getElementById('review-layout');
const quickbar = document.getElementById('review-quickbar');
const list = document.getElementById('preparation-list');
const sourceTitle = document.getElementById('source-title');
const sourceLink = document.getElementById('source-link');
const editorTitle = document.getElementById('editor-title');
const lessonTitle = document.getElementById('lesson-title');
const lessonSubject = document.getElementById('lesson-subject');
const lessonGrade = document.getElementById('lesson-grade');
const lessonTerm = document.getElementById('lesson-term');
const output = document.getElementById('generated-output');
const aiChat = document.getElementById('ai-chat');
const aiPromptForm = document.getElementById('ai-prompt-form');
const aiPrompt = document.getElementById('ai-prompt');
const aiSuggest = document.getElementById('ai-suggest');

function readSiteSession() {
  const stored = localStorage.getItem(reviewSessionKey);

  try {
    return stored ? JSON.parse(stored) : null;
  } catch (_) {
    localStorage.removeItem(reviewSessionKey);
    return null;
  }
}

function setStatus(text) {
  status.textContent = text;
}

function getAuthSession() {
  return globalThis.TahderApi?.readSession?.() || null;
}

function isLocalHost() {
  return location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '127.0.0.1.nip.io';
}

function hasLocalSiteSession(siteSession) {
  return isLocalHost() && Boolean(siteSession?.email && siteSession?.subscription);
}

function subscriptionLabel(subscription, siteSession) {
  const subscriptionState = subscription?.status || siteSession?.subscription || '';

  if (subscriptionState === 'trial') return '\u062a\u062c\u0631\u0628\u0629';
  if (subscriptionState === 'active') return '\u0646\u0634\u0637';
  if (subscriptionState === 'past_due') return '\u064a\u062d\u062a\u0627\u062c \u0645\u0631\u0627\u062c\u0639\u0629';
  if (subscriptionState === 'cancelled') return '\u0645\u0644\u063a\u064a';
  return '\u0645\u0646\u062a\u0647\u064a';
}

function renderSubscription(subscription, siteSession) {
  if (!subscriptionPanel || !subscriptionStatus) return;

  const rawStatus = subscription?.status || siteSession?.subscription || 'expired';
  subscriptionPanel.hidden = false;
  subscriptionPanel.dataset.status = rawStatus;
  subscriptionStatus.textContent = `\u062d\u0627\u0644\u0629 \u0627\u0644\u0627\u0634\u062a\u0631\u0627\u0643: ${subscriptionLabel(subscription, siteSession)}`;
}

function hideSubscription() {
  if (!subscriptionPanel || !subscriptionStatus) return;

  subscriptionPanel.hidden = true;
  subscriptionPanel.dataset.status = '';
  subscriptionStatus.textContent = '';
}

function showLocalReview(siteSession) {
  showReview();
  state.preparations = [samplePreparation];
  state.selected = samplePreparation;
  account.textContent = siteSession.email;
  accountHint.textContent = '\u0648\u0636\u0639 \u0627\u0644\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629: \u064a\u062a\u0645 \u0639\u0631\u0636 \u062a\u062d\u0636\u064a\u0631 \u062a\u062c\u0631\u064a\u0628\u064a \u0644\u0644\u0645\u0631\u0627\u062c\u0639\u0629.';
  renderSubscription(null, siteSession);
  renderList();
  renderEditor(state.selected);
  setStatus('\u0648\u0636\u0639 \u0627\u0644\u062a\u062c\u0631\u0628\u0629 \u0627\u0644\u0645\u062d\u0644\u064a\u0629');
}

function showLocked() {
  locked.hidden = false;
  layout.hidden = true;
  quickbar.hidden = true;
  account.textContent = 'غير مسجل';
  accountHint.textContent = 'سجل الدخول لفتح صفحة المراجعة.';
  hideSubscription();
  setStatus('تسجيل الدخول مطلوب');
}

function showReview() {
  locked.hidden = true;
  layout.hidden = false;
  quickbar.hidden = false;
}

function isCorruptedText(value) {
  if (typeof value !== 'string') return true;
  const compact = value.trim();
  if (!compact) return true;

  const questionMarks = compact.match(/\?/g)?.length || 0;
  const arabicLetters = compact.match(/[\u0600-\u06FF]/g)?.length || 0;

  return questionMarks >= 4 && (questionMarks > arabicLetters * 0.12 || compact.includes('????'));
}

function readableValue(value, fallback) {
  if (typeof value !== 'string') return fallback;

  const cleaned = value
    .replace(/\?{2,}/g, '')
    .replace(/\s+([،.؟:؛])/g, '$1')
    .replace(/([،.؟:؛]){2,}/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim();

  const hasReadableLetters = /[\u0600-\u06FFA-Za-z0-9]/.test(cleaned);
  if (!hasReadableLetters || cleaned.length < 8) return fallback;
  if (isCorruptedText(cleaned)) return fallback;
  return cleaned || fallback;
}

function normalizeContent(content = {}) {
  return fields.reduce((cleanContent, field) => {
    cleanContent[field] = readableValue(content[field], fieldFallbacks[field]);
    return cleanContent;
  }, {});
}

function normalizePreparation(row) {
  return {
    id: row.id,
    lesson_title: readableValue(row.lesson_title, samplePreparation.lesson_title),
    subject: readableValue(row.subject, samplePreparation.subject),
    grade: readableValue(row.grade, samplePreparation.grade),
    term: readableValue(row.term, samplePreparation.term),
    source_url: row.source_url || 'https://schools.madrasati.sa/?Language=1',
    content: normalizeContent(row.content),
  };
}

async function loadPreparations() {
  const session = getAuthSession();
  const siteSession = readSiteSession();

  if (!session) {
    if (hasLocalSiteSession(siteSession)) {
      showLocalReview(siteSession);
      return;
    }

    showLocked();
    return;
  }

  showReview();
  account.textContent = siteSession?.email || session.user?.email || 'حساب المعلم';
  accountHint.textContent = 'يعرض آخر التحاضير المحفوظة في حسابك.';
  let subscription = null;

  try {
    subscription = await globalThis.TahderApi?.getActiveSubscription?.(session);
  } catch (_) {
    subscription = null;
  }

  renderSubscription(subscription, siteSession);

  if (!globalThis.TahderApi?.isConfigured()) {
    state.preparations = [];
    state.selected = null;
    list.innerHTML = '<div class="empty-state">تعذر الاتصال بحساب تحضيري.</div>';
    setStatus('الاتصال غير مكتمل');
    return;
  }

  try {
    setStatus('جاري تحميل بنك التحاضير...');
    const rows = await globalThis.TahderApi.listPreparations(session);
    state.preparations = rows.length ? rows.map(normalizePreparation) : [samplePreparation];
    state.selected = state.preparations[0];
    renderList();
    renderEditor(state.selected);
    setStatus('تم تحميل المحتوى للمراجعة');
  } catch (error) {
    state.preparations = [];
    state.selected = null;
    list.innerHTML = '<div class="empty-state">تعذر تحميل التحاضير. جرّب التحديث بعد قليل.</div>';
    setStatus('تعذر تحميل بنك التحاضير');
  }
}

function renderList() {
  list.innerHTML = state.preparations.map((prep) => `
    <button class="prep-item ${prep.id === state.selected?.id ? 'active' : ''}" data-prep-id="${prep.id}" type="button">
      <b>${prep.lesson_title}</b>
      <small>${prep.subject} · ${prep.grade} · ${prep.term}</small>
    </button>
  `).join('');
}

function renderEditor(prep) {
  state.selected = prep;
  editorTitle.textContent = prep.lesson_title;
  lessonTitle.value = prep.lesson_title;
  lessonSubject.value = prep.subject;
  lessonGrade.value = prep.grade;
  lessonTerm.value = prep.term;
  sourceTitle.textContent = prep.lesson_title;
  sourceLink.href = prep.source_url || 'https://schools.madrasati.sa/?Language=1';

  fields.forEach((field) => {
    const element = document.querySelector(`[data-field="${field}"]`);
    if (element) element.value = prep.content?.[field] || '';
  });

  renderList();
  generateOutput();
}

function collectContent() {
  const content = {};
  fields.forEach((field) => {
    content[field] = readableValue(document.querySelector(`[data-field="${field}"]`)?.value || '', fieldFallbacks[field]);
  });

  return {
    lesson_title: readableValue(lessonTitle.value, samplePreparation.lesson_title),
    subject: readableValue(lessonSubject.value, samplePreparation.subject),
    grade: readableValue(lessonGrade.value, samplePreparation.grade),
    term: readableValue(lessonTerm.value, samplePreparation.term),
    source_url: sourceLink.href,
    content,
  };
}

function firstSentence(text, fallback) {
  const cleaned = readableValue(text, fallback);
  return cleaned.split(/[.؟!]/).map((part) => part.trim()).find(Boolean) || fallback;
}

function buildHomework(draft) {
  const objective = firstSentence(draft.content.objectives, 'فهم الفكرة الرئيسة وتطبيق مهارة الدرس.');
  const enrichment = firstSentence(draft.content.enrichment, 'اكتب مثالاً من حياتك يرتبط بموضوع الدرس.');

  return [
    `واجب: ${draft.lesson_title}`,
    `سؤال الفهم: وضّح بأسلوبك كيف يحقق الدرس الهدف الآتي: ${objective}`,
    `نشاط إثرائي: ${enrichment}`,
  ].join('\n\n');
}

function buildQuiz(draft) {
  const lesson = draft.lesson_title;
  const subject = draft.subject;

  return [
    `اختبار قصير: ${lesson}`,
    '',
    '1. ما الفكرة الرئيسة التي يدور حولها الدرس؟',
    `أ) موضوع خارج ${subject}`,
    `ب) الفكرة المحورية في درس ${lesson}`,
    'ج) معلومة لا ترتبط بالدرس',
    'د) نشاط جانبي فقط',
    '',
    '2. أي عبارة تدل على فهم الطالب للدرس؟',
    'أ) يكرر العنوان دون شرح',
    'ب) يربط الفكرة بمثال مناسب',
    'ج) يتجاهل المفردات المهمة',
    'د) يختار إجابة عشوائية',
    '',
    '3. كيف يمكن تطبيق ما تعلمه الطالب في موقف جديد؟',
    'أ) بكتابة مثال أو حل نشاط مرتبط بالمهارة',
    'ب) بترك الواجب دون إجابة',
    'ج) بنقل النص دون فهم',
    'د) بتغيير موضوع الدرس',
    '',
    'الإجابات الصحيحة:',
    '1) ب',
    '2) ب',
    '3) أ',
  ].join('\n');
}

function buildReport(draft) {
  const skills = firstSentence(draft.content.objectives, 'اكتسب الطلاب مهارة فهم الفكرة الرئيسة وتطبيقها في سياق مناسب.');
  const measurement = firstSentence(draft.content.closure, 'تم قياس تحقق الفهم من خلال سؤال ختامي ومراجعة إجابات الطلاب.');

  return [
    `تقرير إنجاز درس: ${draft.lesson_title}`,
    `المادة: ${draft.subject}`,
    `الصف: ${draft.grade}`,
    `الفصل الدراسي: ${draft.term}`,
    '',
    `ملخص المهارات المكتسبة: ${skills}`,
    `مؤشرات تحقق الأهداف: ${measurement}`,
    'التوصية القادمة: يوصى بتعزيز المهارة من خلال نشاط تطبيقي قصير وربطها بمواقف حياتية مناسبة لمستوى الطلاب.',
    '',
    'معلم المادة',
  ].join('\n\n');
}

function generateOutput() {
  const draft = collectContent();

  if (state.outputType === 'quiz') {
    output.value = buildQuiz(draft);
    return;
  }

  if (state.outputType === 'report') {
    output.value = buildReport(draft);
    return;
  }

  output.value = buildHomework(draft);
}

function appendAiMessage(role, title, message) {
  const bubble = document.createElement('div');
  const heading = document.createElement('b');
  const paragraph = document.createElement('p');
  bubble.className = `ai-message ${role}`;
  heading.textContent = title;
  paragraph.textContent = message;
  bubble.append(heading, paragraph);
  aiChat.appendChild(bubble);
  aiChat.scrollTop = aiChat.scrollHeight;
}

function buildAssistantReply(prompt = '') {
  const draft = collectContent();
  const request = prompt.trim();
  const lower = request.toLowerCase();

  if (!request) {
    return `أستطيع مساعدتك في درس "${draft.lesson_title}" عبر اقتراح هدف، نشاط، واجب، اختبار قصير، أو تحسين صياغة التحضير.`;
  }

  if (lower.includes('نشاط') || lower.includes('activity')) {
    return `نشاط مقترح لدرس "${draft.lesson_title}": يقسم المعلم الطلاب إلى مجموعات صغيرة، وتختار كل مجموعة مثالاً من واقعها يوضح فكرة الدرس، ثم تعرض النتيجة في دقيقة واحدة مع ربطها بالهدف التعليمي.`;
  }

  if (lower.includes('هدف') || lower.includes('object')) {
    return `هدف تعليمي مقترح: أن يوضح الطالب الفكرة الرئيسة في درس "${draft.lesson_title}" بلغة سليمة، وأن يطبقها في مثال مناسب لمستواه الدراسي.`;
  }

  if (lower.includes('واجب')) {
    return buildHomework(draft);
  }

  if (lower.includes('اختبار') || lower.includes('quiz')) {
    return buildQuiz(draft);
  }

  if (lower.includes('تقرير')) {
    return buildReport(draft);
  }

  return `اقتراح لتحسين التحضير: اجعل أهداف درس "${draft.lesson_title}" قابلة للقياس، واربط الاستراتيجية بنشاط تطبيقي قصير، ثم اختم بسؤال يقيس فهم الطلاب قبل الانتقال للواجب.`;
}

function saveDraft() {
  const draft = collectContent();
  state.selected = { ...state.selected, ...draft };
  const index = state.preparations.findIndex((prep) => prep.id === state.selected.id);
  if (index >= 0) state.preparations[index] = state.selected;
  localStorage.setItem('tahder-review-draft', JSON.stringify(state.selected));
  renderList();
  generateOutput();
  setStatus('تم حفظ التعديلات محلياً');
}

async function copyContent() {
  const draft = collectContent();
  const text = fields.map((field) => `${field}: ${draft.content[field]}`).join('\n\n');
  await navigator.clipboard.writeText(text);
  setStatus('تم نسخ المحتوى');
}

function downloadPdf() {
  const draft = collectContent();
  const report = output.value || '';
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  printWindow.document.write(`
    <html lang="ar" dir="rtl">
      <head>
        <meta charset="utf-8">
        <title>${draft.lesson_title}</title>
        <style>
          body { font-family: Tahoma, Arial, sans-serif; padding: 32px; line-height: 1.9; color: #123d38; }
          h1 { color: #087364; }
          pre { white-space: pre-wrap; font-family: inherit; }
        </style>
      </head>
      <body>
        <h1>${draft.lesson_title}</h1>
        <p>${draft.subject} · ${draft.grade} · ${draft.term}</p>
        <pre>${report}</pre>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
}

document.getElementById('reload-preparations').addEventListener('click', loadPreparations);
document.getElementById('save-draft').addEventListener('click', saveDraft);
document.getElementById('copy-content').addEventListener('click', copyContent);
document.getElementById('open-source').addEventListener('click', () => window.open(sourceLink.href, '_blank', 'noreferrer'));
document.getElementById('generate-output').addEventListener('click', generateOutput);
document.getElementById('download-report').addEventListener('click', downloadPdf);
document.getElementById('review-login').addEventListener('click', () => {
  window.location.href = 'index.html#account';
});

aiSuggest.addEventListener('click', () => {
  appendAiMessage('assistant', 'تحضيري AI', buildAssistantReply('اقترح نشاط'));
});

aiPromptForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const prompt = aiPrompt.value.trim();
  if (!prompt) return;
  appendAiMessage('user', 'أنت', prompt);
  appendAiMessage('assistant', 'تحضيري AI', buildAssistantReply(prompt));
  aiPrompt.value = '';
});

list.addEventListener('click', (event) => {
  const button = event.target.closest('[data-prep-id]');
  if (!button) return;
  const prep = state.preparations.find((item) => item.id === button.dataset.prepId);
  if (prep) renderEditor(prep);
});

document.querySelectorAll('[data-output]').forEach((button) => {
  button.addEventListener('click', () => {
    document.querySelectorAll('[data-output]').forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    state.outputType = button.dataset.output;
    generateOutput();
  });
});

document.querySelectorAll('[data-mode]').forEach((button) => {
  button.addEventListener('click', () => {
    state.outputType = button.dataset.mode === 'preparation' ? 'assignment' : button.dataset.mode;
    if (button.dataset.mode === 'preparation') setStatus('أنت الآن تراجع التحضير قبل الإدراج');
    generateOutput();
  });
});

loadPreparations();
