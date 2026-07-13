require('dotenv').config();

const path = require('path');
const fs = require('fs');
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const mysql = require('mysql2/promise');
const next = require('next');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = Number(process.env.PORT || 3001);
const isDev = process.env.NODE_ENV !== 'production';
const jwtSecret = process.env.JWT_SECRET || 'local-dev-change-me';
const publicBaseUrl = (process.env.PUBLIC_BASE_URL || `http://127.0.0.1:${port}`).replace(/\/+$/, '');
const siteRoot = path.join(__dirname, '..');
const uploadsDir = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(path.join(uploadsDir, 'books'), { recursive: true });
const nextApp = next({ dev: isDev, dir: siteRoot });
const nextHandle = nextApp.getRequestHandler();

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST,
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE || process.env.MYSQL_DB,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  namedPlaceholders: true,
});

app.use(cors());
app.use(express.json({ limit: '4mb' }));
app.use('/assets', express.static(path.join(siteRoot, 'assets')));
app.use('/uploads', express.static(uploadsDir));

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(uploadsDir, 'books'),
    filename: (_req, file, callback) => {
      const safeName = String(file.originalname || 'book.pdf')
        .replace(/[^a-zA-Z0-9.\-_]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'book.pdf';
      callback(null, `${Date.now()}-${safeName}`);
    },
  }),
  fileFilter: (_req, file, callback) => {
    const isPdf = file.mimetype === 'application/pdf' || String(file.originalname).toLowerCase().endsWith('.pdf');
    callback(isPdf ? null : new Error('Only PDF files are allowed.'), isPdf);
  },
});

function sendError(res, status, message) {
  return res.status(status).json({ message });
}

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function normalizePlan(row) {
  return {
    ...row,
    price_sar: Number(row.price_sar || 0),
    features: parseJson(row.features, {}),
    is_active: Boolean(row.is_active),
  };
}

function normalizePreparation(row) {
  return {
    ...row,
    content: parseJson(row.content, {}),
  };
}

function normalizeBook(row) {
  return {
    ...row,
    lessons: parseJson(row.lessons, []),
  };
}

function normalizeArabic(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[إأآ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/[^\u0600-\u06FFa-zA-Z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function firstText(...values) {
  return values.map((value) => String(value || '').trim()).find(Boolean) || '';
}

function templateContent(row) {
  const fullContent = parseJson(row?.full_content, null);
  if (fullContent) return fullContent;

  return {
    warmup: row?.warmup || '',
    vocabulary: parseJson(row?.vocabulary, []),
    objectives: parseJson(row?.objectives, []),
    strategies: parseJson(row?.strategies, []),
    resources: parseJson(row?.teaching_aids, []),
    thinking_skills: row?.thinking_skills || '',
    closure: row?.closure || '',
    enrichment: parseJson(row?.enrichment, []),
    homework: parseJson(row?.homework, null),
    quiz: parseJson(row?.quiz, null),
  };
}

function normalizeLessonMatch(row) {
  return {
    id: row.id,
    book_id: row.book_id,
    stage: row.stage,
    grade: row.grade,
    subject: row.subject,
    term: row.term,
    academic_year: row.academic_year,
    week_number: row.week_number,
    unit_title: row.unit_title,
    lesson_title: row.lesson_title,
    page_from: row.page_from,
    page_to: row.page_to,
    source_url: row.source_url,
    source_type: row.source_type,
  };
}

function extractLessonContext(body = {}) {
  const pageContext = body.page_context || body.pageContext || {};
  return {
    lessonTitle: firstText(body.lesson_title, body.lessonTitle, pageContext.lesson, body.title),
    subject: firstText(body.subject, pageContext.subject),
    grade: firstText(body.grade, pageContext.grade),
    term: firstText(body.term, pageContext.term),
    weekNumber: Number(body.week_number || body.weekNumber || pageContext.week_number || pageContext.week || 0) || null,
    visibleText: normalizeArabic([
      body.visible_text,
      body.page_summary?.visible_text,
      pageContext.lesson,
      pageContext.subject,
      pageContext.grade,
      pageContext.term,
      body.source_url,
    ].filter(Boolean).join(' ')),
  };
}

function scoreLesson(row, context) {
  const title = normalizeArabic(context.lessonTitle);
  const subject = normalizeArabic(context.subject);
  const grade = normalizeArabic(context.grade);
  const term = normalizeArabic(context.term);
  const rowTitle = normalizeArabic(`${row.lesson_title || ''} ${row.unit_title || ''}`);
  const rowSubject = normalizeArabic(row.subject);
  const rowGrade = normalizeArabic(row.grade);
  const rowTerm = normalizeArabic(row.term);
  let score = 0;

  if (title && rowTitle.includes(title)) score += 70;
  if (title && title.includes(rowTitle) && rowTitle.length > 3) score += 55;
  if (title && title.split(' ').some((part) => part.length > 3 && rowTitle.includes(part))) score += 20;
  if (subject && (rowSubject.includes(subject) || subject.includes(rowSubject))) score += 30;
  if (grade && (rowGrade.includes(grade) || grade.includes(rowGrade))) score += 30;
  if (term && (rowTerm.includes(term) || term.includes(rowTerm))) score += 25;
  if (context.weekNumber && Number(row.week_number) === context.weekNumber) score += 35;
  if (context.visibleText && context.visibleText.includes(rowTitle) && rowTitle.length > 3) score += 35;

  return score;
}

async function findCurriculumLesson(context) {
  const [rows] = await pool.query(
    `select id, book_id, stage, grade, subject, term, academic_year, week_number,
            unit_title, lesson_title, normalized_lesson_title, page_from, page_to,
            source_url, source_type
     from curriculum_lessons
     where is_active = 1`,
  );
  const ranked = rows
    .map((row) => ({ row, score: scoreLesson(row, context) }))
    .sort((a, b) => b.score - a.score);

  return ranked[0]?.score > 0 ? ranked[0] : null;
}

async function getReadyTemplate(lessonId) {
  const [rows] = await pool.query(
    `select *
     from preparation_templates
     where lesson_id = ? and status in ('ready', 'draft', 'needs_review')
     order by status = 'ready' desc, version desc, updated_at desc
     limit 1`,
    [lessonId],
  );
  return rows[0] || null;
}

function makeToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email },
    jwtSecret,
    { expiresIn: '30d' },
  );
}

function publicUser(user) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata || {},
  };
}

async function getUserByEmail(email) {
  const [rows] = await pool.query(
    'select id, email, password_hash, created_at, updated_at from users where email = ? limit 1',
    [email],
  );
  return rows[0] || null;
}

async function getUserById(id) {
  const [rows] = await pool.query(
    'select id, email, password_hash, created_at, updated_at from users where id = ? limit 1',
    [id],
  );
  return rows[0] || null;
}

async function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';

  if (!token) return sendError(res, 401, 'تسجيل الدخول مطلوب.');

  try {
    const payload = jwt.verify(token, jwtSecret);
    const user = await getUserById(payload.sub);
    if (!user) return sendError(res, 401, 'الجلسة غير صالحة.');
    req.user = user;
    return next();
  } catch (_) {
    return sendError(res, 401, 'الجلسة منتهية أو غير صالحة.');
  }
}

async function requireAdmin(req, res, next) {
  const [rows] = await pool.query(
    'select user_id, role from admin_users where user_id = ? limit 1',
    [req.user.id],
  );

  if (!rows.length) return sendError(res, 403, 'هذا الحساب ليس أدمن.');
  req.admin = rows[0];
  return next();
}

async function activeSubscription(userId) {
  const [rows] = await pool.query(
    `select s.id, s.plan_id, s.status, s.starts_at, s.ends_at, p.name_ar, p.duration_days
     from subscriptions s
     left join plans p on p.id = s.plan_id
     where s.user_id = ?
       and s.status in ('trial', 'active')
       and s.starts_at <= now()
       and (s.ends_at is null or s.ends_at > now())
     order by coalesce(s.ends_at, '2999-12-31') desc, s.created_at desc
     limit 1`,
    [userId],
  );
  return rows[0] || null;
}

async function createSubscription(userId, planId) {
  const [plans] = await pool.query(
    'select id, duration_days from plans where id = ? and is_active = 1 limit 1',
    [planId],
  );
  const plan = plans[0];
  if (!plan) throw new Error('الباقة غير موجودة.');

  const id = uuidv4();
  const status = plan.id === 'trial' ? 'trial' : 'active';
  await pool.query(
    `insert into subscriptions (id, user_id, plan_id, status, starts_at, ends_at)
     values (?, ?, ?, ?, now(), date_add(now(), interval ? day))`,
    [id, userId, plan.id, status, Number(plan.duration_days)],
  );
  return activeSubscription(userId);
}

app.get('/api/health', async (_req, res) => {
  await pool.query('select 1');
  res.json({ ok: true });
});

app.get('/api/plans', async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      'select id, name_ar, price_sar, duration_days, features, is_active from plans where is_active = 1 order by price_sar asc',
    );
    res.json(rows.map(normalizePlan));
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/signup', async (req, res, next) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const metadata = req.body.metadata || {};

  if (!email || !password) return sendError(res, 400, 'البريد وكلمة المرور مطلوبة.');
  if (password.length < 8) return sendError(res, 400, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.');

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [existing] = await connection.query('select id from users where email = ? limit 1', [email]);
    if (existing.length) {
      await connection.rollback();
      return sendError(res, 409, 'هذا البريد مسجل مسبقاً.');
    }

    const id = uuidv4();
    const passwordHash = await bcrypt.hash(password, 10);
    const displayName = String(metadata.display_name || email.split('@')[0]).trim();
    const phone = String(metadata.phone || '').trim();

    await connection.query(
      'insert into users (id, email, password_hash, email_verified_at) values (?, ?, ?, now())',
      [id, email, passwordHash],
    );
    await connection.query(
      'insert into profiles (user_id, display_name, phone) values (?, ?, ?)',
      [id, displayName, phone || null],
    );
    await connection.commit();

    const user = { id, email, user_metadata: { selected_plan: metadata.selected_plan || 'trial' } };
    const session = { access_token: makeToken(user), user: publicUser(user) };
    return res.status(201).json({ session, user: session.user });
  } catch (error) {
    await connection.rollback();
    return next(error);
  } finally {
    connection.release();
  }
});

app.post('/api/auth/login', async (req, res, next) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    const password = String(req.body.password || '');
    const user = await getUserByEmail(email);

    if (!user || !user.password_hash) return sendError(res, 401, 'بيانات الدخول غير صحيحة.');
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return sendError(res, 401, 'بيانات الدخول غير صحيحة.');

    const token = makeToken(user);
    res.json({ access_token: token, user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

app.post('/api/auth/logout', auth, (_req, res) => {
  res.json({ ok: true });
});

app.patch('/api/me/profile', auth, async (req, res, next) => {
  try {
    const displayName = req.body.display_name ?? req.body.displayName ?? null;
    const phone = req.body.phone ?? null;
    await pool.query(
      `insert into profiles (user_id, display_name, phone)
       values (?, ?, ?)
       on duplicate key update display_name = values(display_name), phone = values(phone)`,
      [req.user.id, displayName, phone],
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/subscription', auth, async (req, res, next) => {
  try {
    res.json(await activeSubscription(req.user.id));
  } catch (error) {
    next(error);
  }
});

app.post('/api/subscriptions/trial', auth, async (req, res, next) => {
  try {
    const subscription = await activeSubscription(req.user.id) || await createSubscription(req.user.id, 'trial');
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

app.post('/api/subscriptions/activate-signup', auth, async (req, res, next) => {
  try {
    const planId = String(req.body.plan_id || req.body.selected_plan_id || 'trial');
    const subscription = await activeSubscription(req.user.id) || await createSubscription(req.user.id, planId);
    res.json(subscription);
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/preparations', auth, async (req, res, next) => {
  try {
    const limit = Math.min(Number(req.query.limit || 20), 100);
    const [rows] = await pool.query(
      `select id, lesson_title, subject, grade, term, content, status, source, created_at
       from preparations
       where user_id = ?
       order by created_at desc
       limit ?`,
      [req.user.id, limit],
    );
    res.json(rows.map(normalizePreparation));
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/preparations', auth, async (req, res, next) => {
  try {
    const lesson = req.body.lesson || {};
    const content = req.body.content || {};
    const id = uuidv4();

    await pool.query(
      `insert into preparations
       (id, user_id, lesson_id, template_id, madrasati_lesson_ref,
        lesson_title, subject, grade, term, class_names, content, status, source)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        req.user.id,
        lesson.lesson_id || lesson.lessonId || null,
        lesson.template_id || lesson.templateId || req.body.template_id || null,
        lesson.madrasati_lesson_ref || lesson.madrasatiLessonRef || lesson.source_url || null,
        String(lesson.lesson_title || 'درس بدون عنوان'),
        lesson.subject || null,
        lesson.grade || null,
        lesson.term || null,
        JSON.stringify(lesson.class_names || []),
        JSON.stringify(content),
        String(req.body.status || 'ready'),
        String(req.body.source || 'extension'),
      ],
    );

    const [rows] = await pool.query(
      `select id, lesson_id, template_id, madrasati_lesson_ref,
              lesson_title, subject, grade, term, content, status, source, created_at
       from preparations
       where id = ? and user_id = ?
       limit 1`,
      [id, req.user.id],
    );
    res.status(201).json(normalizePreparation(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/me/linked-devices', auth, async (req, res, next) => {
  try {
    res.json([]);
  } catch (error) {
    next(error);
  }
});

app.post('/api/me/linked-devices', auth, async (_req, res, next) => {
  try {
    return res.status(201).json({
      ok: true,
      disabled: true,
      message: 'Device linking is disabled. Madrasati identity verification is used instead.',
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/curriculum/match', auth, async (req, res, next) => {
  try {
    const context = extractLessonContext(req.body || {});
    const match = await findCurriculumLesson(context);

    if (!match) {
      return sendError(res, 404, 'لم يتم العثور على درس مطابق في المنهج.');
    }

    const template = await getReadyTemplate(match.row.id);
    return res.json({
      lesson: normalizeLessonMatch(match.row),
      match_score: match.score,
      template: template ? {
        id: template.id,
        version: template.version,
        status: template.status,
        content: templateContent(template),
      } : null,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/preparation-template/:lessonId', auth, async (req, res, next) => {
  try {
    const template = await getReadyTemplate(req.params.lessonId);
    if (!template) return sendError(res, 404, 'لا يوجد قالب تحضير جاهز لهذا الدرس.');

    return res.json({
      id: template.id,
      lesson_id: template.lesson_id,
      version: template.version,
      status: template.status,
      content: templateContent(template),
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/generate-preparation', auth, async (req, res, next) => {
  try {
    const context = extractLessonContext(req.body || {});
    const match = await findCurriculumLesson(context);

    if (!match) {
      return sendError(res, 404, 'لم يتم العثور على درس مطابق في المنهج.');
    }

    const template = await getReadyTemplate(match.row.id);
    if (!template) {
      return sendError(res, 404, 'لا يوجد قالب تحضير جاهز لهذا الدرس بعد.');
    }

    return res.json({
      lesson: normalizeLessonMatch(match.row),
      template_id: template.id,
      content: templateContent(template),
      source: 'preparation_template',
      match_score: match.score,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/generate-preparation-disabled', auth, async (_req, res) => {
  return sendError(res, 501, 'توليد التحضير بالذكاء لم يتم ربطه بعد في الباك إند.');
});

app.post('/api/activity-logs', auth, async (req, res, next) => {
  try {
    await pool.query(
      'insert into activity_logs (user_id, event_type, metadata) values (?, ?, ?)',
      [req.user.id, String(req.body.event_type || 'site_event'), JSON.stringify(req.body.metadata || {})],
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/me', auth, async (req, res, next) => {
  try {
    const [rows] = await pool.query('select role from admin_users where user_id = ? limit 1', [req.user.id]);
    res.json({ is_admin: Boolean(rows.length), role: rows[0]?.role || null });
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/accounts', auth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `select u.email, p.display_name, p.phone, s.plan_id, s.status,
              (s.status in ('trial', 'active') and s.starts_at <= now() and (s.ends_at is null or s.ends_at > now())) as is_active,
              s.ends_at
       from users u
       left join profiles p on p.user_id = u.id
       left join subscriptions s on s.id = (
         select s2.id from subscriptions s2
         where s2.user_id = u.id
         order by s2.created_at desc
         limit 1
       )
       order by u.created_at desc`,
    );
    res.json(rows.map((row) => ({ ...row, is_active: Boolean(row.is_active) })));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/books', auth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query(
      `select id, title, subject, grade, term, academic_year, pdf_url, lessons, status, created_at, updated_at
       from curriculum_books
       order by updated_at desc, created_at desc`,
    );
    res.json(rows.map(normalizeBook));
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/books/upload', auth, requireAdmin, upload.single('file'), async (req, res) => {
  if (!req.file) return sendError(res, 400, 'اختر ملف PDF صحيح.');
  const relativePath = `/uploads/books/${req.file.filename}`;
  res.status(201).json({
    path: relativePath,
    url: `${publicBaseUrl}${relativePath}`,
  });
});

app.post('/api/admin/books', auth, requireAdmin, async (req, res, next) => {
  try {
    const id = uuidv4();
    await pool.query(
      `insert into curriculum_books
       (id, title, subject, grade, term, academic_year, pdf_url, lessons, status, created_by)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        String(req.body.title || '').trim(),
        String(req.body.subject || '').trim(),
        String(req.body.grade || '').trim(),
        String(req.body.term || '').trim(),
        String(req.body.academicYear || req.body.academic_year || '').trim() || null,
        String(req.body.pdfUrl || req.body.pdf_url || '').trim() || null,
        JSON.stringify(req.body.lessons || []),
        String(req.body.status || 'active'),
        req.user.id,
      ],
    );
    const [rows] = await pool.query('select * from curriculum_books where id = ?', [id]);
    res.status(201).json(normalizeBook(rows[0]));
  } catch (error) {
    next(error);
  }
});

app.get('/api/admin/ai-settings', auth, requireAdmin, async (_req, res, next) => {
  try {
    const [rows] = await pool.query('select * from ai_runtime_settings order by id limit 1');
    res.json(rows);
  } catch (error) {
    next(error);
  }
});

app.put('/api/admin/ai-settings', auth, requireAdmin, async (req, res, next) => {
  try {
    const apiKey = String(req.body.apiKey || req.body.api_key || '').trim();
    const apiKeyHint = apiKey ? `${apiKey.slice(0, 4)}...${apiKey.slice(-4)}` : null;
    const [current] = await pool.query('select api_key from ai_runtime_settings where id = 1');
    const storedKey = apiKey || current[0]?.api_key || null;
    const storedHint = apiKeyHint || (storedKey ? `${storedKey.slice(0, 4)}...${storedKey.slice(-4)}` : null);

    await pool.query(
      `insert into ai_runtime_settings
       (id, provider, model, api_key, api_key_hint, system_prompt, temperature, is_enabled, updated_by)
       values (1, ?, ?, ?, ?, ?, ?, ?, ?)
       on duplicate key update
         provider = values(provider),
         model = values(model),
         api_key = values(api_key),
         api_key_hint = values(api_key_hint),
         system_prompt = values(system_prompt),
         temperature = values(temperature),
         is_enabled = values(is_enabled),
         updated_by = values(updated_by)`,
      [
        String(req.body.provider || 'gemini'),
        String(req.body.model || 'gemini-2.5-flash'),
        storedKey,
        storedHint,
        String(req.body.systemPrompt || req.body.system_prompt || ''),
        Number(req.body.temperature ?? 0.35),
        req.body.isEnabled || req.body.is_enabled ? 1 : 0,
        req.user.id,
      ],
    );
    res.json({ ok: true });
  } catch (error) {
    next(error);
  }
});

const browserAssetFiles = new Set([
  'config.js',
  'api-client.js',
  'site.js',
  'signup.js',
  'review.js',
  'admin.js',
  'tools.js',
]);

app.get('/:asset', (req, res, nextMiddleware) => {
  if (!browserAssetFiles.has(req.params.asset)) return nextMiddleware();
  res.sendFile(path.join(siteRoot, req.params.asset));
});

app.get('/index.html', (_req, res) => res.redirect(308, '/'));
app.get('/tools.html', (_req, res) => res.redirect(308, '/tools'));
app.get('/signup.html', (_req, res) => res.redirect(308, '/signup'));
app.get('/review.html', (_req, res) => res.redirect(308, '/review'));
app.get('/admin.html', (_req, res) => res.redirect(308, '/admin'));

app.all('*', (req, res) => {
  return nextHandle(req, res);
});

app.use((error, _req, res, _next) => {
  console.error(error);
  sendError(res, 500, error.message || 'حدث خطأ غير متوقع.');
});

nextApp.prepare().then(() => {
  app.listen(port, () => {
    console.log(`Tahder Next server running on ${publicBaseUrl}`);
  });
});
