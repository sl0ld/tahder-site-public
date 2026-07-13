'use client';

import { useEffect, useState } from 'react';
import './simulator.css';

const weekDays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
const periods = ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'];

const lessons = [
  {
    id: 'arabic-grade1-m',
    day: 'الأحد',
    period: 'الأولى',
    time: '07:00 - 07:45',
    title: 'الدرس الأول: حرف (م)',
    subject: 'اللغة العربية',
    grade: 'الصف الأول الابتدائي',
    classroom: '1 / أ',
    term: 'الفصل الأول',
    week: 3,
    unit: 'الوحدة الأولى: أسرتي',
  },
  {
    id: 'arabic-grade1-b',
    day: 'الإثنين',
    period: 'الثانية',
    time: '07:50 - 08:35',
    title: 'الدرس الثاني: حرف (ب)',
    subject: 'اللغة العربية',
    grade: 'الصف الأول الابتدائي',
    classroom: '1 / ب',
    term: 'الفصل الأول',
    week: 4,
    unit: 'الوحدة الأولى: أسرتي',
  },
  {
    id: 'arabic-grade1-l',
    day: 'الثلاثاء',
    period: 'الرابعة',
    time: '09:30 - 10:15',
    title: 'الدرس الثالث: حرف (ل)',
    subject: 'اللغة العربية',
    grade: 'الصف الأول الابتدائي',
    classroom: '1 / أ',
    term: 'الفصل الأول',
    week: 5,
    unit: 'الوحدة الأولى: أسرتي',
  },
];

function getSelectedLesson() {
  if (typeof window === 'undefined') return lessons[0];
  const params = new URLSearchParams(window.location.search);
  return lessons.find((lesson) => lesson.id === params.get('lesson')) || lessons[0];
}

function getView() {
  if (typeof window === 'undefined') return 'schedule';
  const params = new URLSearchParams(window.location.search);
  const view = params.get('view');
  const route = params.get('route') || '';
  if (view === 'assignment' || route.includes('Assignments')) return 'assignment';
  if (view === 'enrichment' || route.includes('Enrichments')) return 'enrichment';
  if (view === 'lesson' || route.includes('LessonDetailsNew')) return 'lesson';
  return 'schedule';
}

function lessonUrl(lesson) {
  return `/simulator?view=lesson&route=Teacher/Lessons/LessonDetailsNew&lesson=${lesson.id}`;
}

function assignmentUrl(lesson) {
  return `/simulator?view=assignment&route=Teacher/Assignments/Create&lesson=${lesson.id}`;
}

function enrichmentUrl(lesson) {
  return `/simulator?view=enrichment&route=Teacher/Enrichments/Create&lesson=${lesson.id}`;
}

function Header({ view }) {
  return (
    <header className="sim-header">
      <div>
        <span className="sim-kicker">محاكي مدرستي</span>
        <h1>{{
          lesson: 'إعداد الدرس',
          assignment: 'إضافة واجب',
          enrichment: 'بنك الإثراءات',
          schedule: 'الجدول الأسبوعي للمعلم',
        }[view] || 'الجدول الأسبوعي للمعلم'}</h1>
        <p>بيئة محلية لاختبار إضافة تحضيري أثناء توقف الدراسة.</p>
      </div>
      <nav aria-label="روابط المحاكي">
        <a href="/simulator">جدول المعلم</a>
        <a href={lessonUrl(lessons[0])}>صفحة التحضير</a>
        <a href={assignmentUrl(lessons[0])}>صفحة الواجب</a>
        <a href={enrichmentUrl(lessons[0])}>صفحة الإثراء</a>
      </nav>
    </header>
  );
}

function Sidebar() {
  return (
    <aside className="sim-sidebar" aria-label="قائمة المعلم">
      <strong>منصة المدرسة</strong>
      <a className="is-active" href="/simulator">جدولي</a>
      <a href={lessonUrl(lessons[0])}>الدروس</a>
      <a href={assignmentUrl(lessons[1])}>الواجبات</a>
      <a href={enrichmentUrl(lessons[2])}>الإثراءات</a>
      <a href="/simulator">التقارير</a>
    </aside>
  );
}

function SchedulePage() {
  return (
    <main className="sim-main">
      <section className="sim-toolbar" aria-label="أدوات الأسبوع">
        <button className="prevCalendar" type="button" aria-label="الأسبوع السابق">-</button>
        <div>
          <span>الأسبوع الثالث</span>
          <strong>19 محرم 1448 إلى 23 محرم 1448</strong>
        </div>
        <button className="nextCalendar" type="button" aria-label="الأسبوع التالي">+</button>
      </section>

      <section className="sim-card">
        <div className="sim-card-head">
          <div>
            <h2>الجدول الأسبوعي للمعلم</h2>
            <p>اختر حصة لفتح صفحة التحضير كما يحدث داخل مدرستي.</p>
          </div>
          <div className="sim-actions">
            <button type="button">تحضير حصص الأسبوع</button>
            <button type="button">طباعة الجدول</button>
          </div>
        </div>

        <div className="sim-week-prep" aria-label="ملخص تحضير الأسبوع">
          <div>
            <b>3</b>
            <span>حصص قابلة للتحضير</span>
          </div>
          <div>
            <b>اللغة العربية</b>
            <span>الصف الأول الابتدائي</span>
          </div>
          <div>
            <b>قوالب جاهزة</b>
            <span>تطابق دروس لغتي في قاعدة البيانات</span>
          </div>
        </div>

        <div className="sim-schedule-table">
          <table>
            <thead>
              <tr>
                <th>اليوم</th>
                {periods.map((period) => <th key={period}>{period}</th>)}
              </tr>
            </thead>
            <tbody>
              {weekDays.map((day) => (
                <tr key={day}>
                  <th>{day}</th>
                  {periods.map((period) => {
                    const lesson = lessons.find((item) => item.day === day && item.period === period);
                    return (
                      <td key={`${day}-${period}`}>
                        {lesson ? (
                          <a className="sim-lesson-link" href={lessonUrl(lesson)}>
                            <b>{lesson.subject}</b>
                            <span>{lesson.title}</span>
                            <em>{lesson.grade} - {lesson.classroom}</em>
                            <small>{lesson.time}</small>
                          </a>
                        ) : (
                          <span className="sim-empty-slot">-</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}

function LessonSummary({ lesson }) {
  return (
    <section className="sim-card sim-summary-card">
      <div>
        <span>المادة</span>
        <strong>{lesson.subject}</strong>
      </div>
      <div>
        <span>الصف</span>
        <strong>{lesson.grade}</strong>
      </div>
      <div>
        <span>الفصل</span>
        <strong>{lesson.classroom}</strong>
      </div>
      <div>
        <span>الأسبوع</span>
        <strong>{lesson.week}</strong>
      </div>
    </section>
  );
}

function PrepForm({ lesson }) {
  return (
    <form className="sim-card sim-prep-form" data-lesson-title={lesson.title}>
      <div className="sim-card-head">
        <div>
          <h2>إعداد الدرس</h2>
          <p>{lesson.title} - {lesson.unit}</p>
        </div>
        <div className="sim-actions">
          <button type="button">حفظ كمسودة</button>
          <button type="button">حفظ وإغلاق</button>
        </div>
      </div>

      <div className="sim-tabs" role="tablist" aria-label="مراحل التحضير">
        <button className="is-active" type="button">معلومات الدرس</button>
        <button type="button">الأهداف التعليمية</button>
        <button type="button">استراتيجيات التدريس</button>
        <button type="button">الأنشطة والواجب</button>
        <button type="button">المراجعة والحفظ</button>
      </div>

      <fieldset className="sim-fieldset">
        <legend>المعلومات الأساسية</legend>
        <label>
          <span>الدرس</span>
          <input data-lesson-title value={lesson.title} readOnly />
        </label>
        <label>
          <span>المادة</span>
          <input value={lesson.subject} readOnly />
        </label>
        <label>
          <span>الصف</span>
          <input value={lesson.grade} readOnly />
        </label>
        <label>
          <span>الفصل الدراسي</span>
          <input value={lesson.term} readOnly />
        </label>
      </fieldset>

      <fieldset className="sim-fieldset">
        <legend>حقول التحضير</legend>
        <label className="sim-wide">
          <span>الأهداف التعليمية</span>
          <textarea name="objectives" placeholder="تكتب هنا أهداف الدرس التعليمية" />
        </label>
        <label>
          <span>استراتيجيات التدريس</span>
          <textarea name="strategies" placeholder="استراتيجيات التدريس المستخدمة" />
        </label>
        <label>
          <span>الوسائل ومصادر التعلم</span>
          <textarea name="resources" placeholder="الكتاب المدرسي، منصة مدرستي..." />
        </label>
        <label>
          <span>الأنشطة المدرسية</span>
          <textarea name="activities" placeholder="نشاط صفي أو نشاط تعاوني" />
        </label>
        <label>
          <span>الإغلاق والتقويم</span>
          <textarea name="closure" placeholder="سؤال خروج أو تقويم ختامي" />
        </label>
        <label>
          <span>الإثراءات</span>
          <textarea name="enrichment" placeholder="مصدر إثرائي أو نشاط إضافي" />
        </label>
        <label>
          <span>الواجب</span>
          <textarea name="assignment" placeholder="واجب الدرس" />
        </label>
        <label className="sim-wide">
          <span>تلميحات للطلاب</span>
          <textarea name="hints" placeholder="توجيهات مختصرة قبل حل الواجب" />
        </label>
      </fieldset>

      <div className="sim-footer-actions">
        <button type="button">السابق</button>
        <a className="sim-link-button" href={assignmentUrl(lesson)}>إضافة واجب</a>
        <a className="sim-link-button" href={enrichmentUrl(lesson)}>إضافة إثراء</a>
        <button className="sim-primary" type="button">حفظ التحضير</button>
      </div>
    </form>
  );
}

function AssignmentPage() {
  const lesson = getSelectedLesson();
  const sequence = [
    {
      name: 'learning_track',
      options: [
        'الوحدة الابتدائية - الصف الأول الابتدائي - مقررات العام الدراسي - اللغة العربية',
        'الوحدة الأولى: أسرتي',
      ],
    },
    {
      name: 'learning_unit',
      options: ['أخلاق وفضائل', 'أسرتي', 'مدرستي'],
    },
    {
      name: 'learning_lesson',
      options: ['الوظيفة النحوية (رفع المبتدأ والخبر بالعلامات الفرعية)', lesson.title],
    },
  ];

  return (
    <main className="sim-main">
      <section className="sim-breadcrumb">
        <a href={lessonUrl(lesson)}>إعداد الدرس</a>
        <span>/</span>
        <strong>إضافة واجب</strong>
      </section>
      <LessonSummary lesson={lesson} />
      <form className="sim-card sim-prep-form" data-lesson-title={lesson.title}>
        <div className="sim-card-head">
          <div>
            <h2>إضافة واجب</h2>
            <p>محاكاة صفحة الواجب في مدرستي لاختبار تعبئة الإضافة.</p>
          </div>
          <div className="sim-actions">
            <button type="button">حفظ كمسودة</button>
            <button className="sim-primary" type="button">إرسال الواجب</button>
          </div>
        </div>

        <fieldset className="sim-fieldset">
          <legend>المعلومات الأساسية</legend>
          <div className="sim-wide">
            <span>التسلسل التعليمي</span>
            <div className="sim-select-stack">
              {sequence.map((item) => (
                <select key={item.name} name={item.name} defaultValue="">
                  <option value="">اختر من القائمة</option>
                  {item.options.map((option) => <option key={option}>{option}</option>)}
                </select>
              ))}
            </div>
          </div>
          <label className="sim-wide">
            <span>اسم الواجب</span>
            <input name="assignment_title" placeholder="اسم الواجب" />
          </label>
          <div className="sim-wide sim-choice-group" role="radiogroup" aria-label="مصدر الواجب">
            <span>مصدر الواجب</span>
            <label><input name="assignment_source" type="radio" value="كتاب الطالب" /> كتاب الطالب</label>
            <label><input name="assignment_source" type="radio" value="نشاط خارجي أو من ملف" /> نشاط خارجي أو من ملف</label>
            <label><input name="assignment_source" type="radio" value="بنك الأسئلة" /> بنك الأسئلة</label>
            <label><input name="assignment_source" type="radio" value="كتاب النشاط" /> كتاب النشاط</label>
          </div>
          <label className="sim-wide">
            <span>وصف الواجب</span>
            <textarea name="assignment_description" placeholder="وصف الواجب وتعليماته" />
          </label>
          <div className="sim-wide sim-upload-box" aria-label="المرفقات">
            <b>المرفقات</b>
            <p>اسحب الملفات وأسقطها هنا عند الرفع</p>
            <button type="button">رفع ملف</button>
          </div>
          <label>
            <span>رقم الصفحة</span>
            <input name="assignment_page" placeholder="رقم الصفحة" />
          </label>
          <label>
            <span>رقم السؤال</span>
            <input name="assignment_question" placeholder="رقم السؤال في الكتاب" />
          </label>
          <div className="sim-choice-group" role="radiogroup" aria-label="طريقة تسليم الواجب">
            <span>طريقة تسليم الواجب</span>
            <label><input name="assignment_delivery" type="radio" value="ملف" /> ملف</label>
            <label><input name="assignment_delivery" type="radio" value="كتابة" /> كتابة</label>
            <label><input name="assignment_delivery" type="radio" value="خارج النظام" /> خارج النظام</label>
          </div>
          <label>
            <span>درجة الواجب</span>
            <input name="assignment_grade" type="number" min="1" max="100" step="0.5" placeholder="00.00" />
          </label>
        </fieldset>
      </form>
    </main>
  );
}

function EnrichmentPage() {
  const lesson = getSelectedLesson();

  return (
    <main className="sim-main">
      <section className="sim-breadcrumb">
        <a href={lessonUrl(lesson)}>إعداد الدرس</a>
        <span>/</span>
        <strong>بنك الإثراءات</strong>
      </section>
      <LessonSummary lesson={lesson} />
      <form className="sim-card sim-prep-form" data-lesson-title={lesson.title}>
        <div className="sim-card-head">
          <div>
            <h2>إضافة إثراء</h2>
            <p>محاكاة بنك الإثراءات وروابط عين داخل مدرستي.</p>
          </div>
          <div className="sim-actions">
            <button type="button">بحث في عين</button>
            <button className="sim-primary" type="button">حفظ الإثراء</button>
          </div>
        </div>

        <fieldset className="sim-fieldset">
          <legend>بيانات الإثراء</legend>
          <label>
            <span>عنوان الإثراء</span>
            <input name="enrichment_title" placeholder="عنوان الإثراء" />
          </label>
          <label>
            <span>نوع الإثراء</span>
            <select name="enrichment_type" defaultValue="">
              <option value="">اختر النوع</option>
              <option>رابط</option>
              <option>فيديو</option>
              <option>ملف</option>
            </select>
          </label>
          <label className="sim-wide">
            <span>رابط الإثراء</span>
            <input name="enrichment_url" placeholder="https://ien.edu.sa/..." />
          </label>
          <label className="sim-wide">
            <span>وصف الإثراء</span>
            <textarea name="enrichment_description" placeholder="وصف مختصر للإثراء" />
          </label>
        </fieldset>
      </form>
    </main>
  );
}

function LessonPage() {
  const lesson = getSelectedLesson();

  return (
    <main className="sim-main">
      <section className="sim-breadcrumb">
        <a href="/simulator">الجدول الأسبوعي للمعلم</a>
        <span>/</span>
        <strong>تفاصيل الدرس</strong>
      </section>
      <LessonSummary lesson={lesson} />
      <PrepForm lesson={lesson} />
    </main>
  );
}

export default function MadrasatiSimulatorPage() {
  const [view, setView] = useState('schedule');

  useEffect(() => {
    setView(getView());
  }, []);

  return (
    <div className="sim-page">
      <Header view={view} />
      <div className="sim-layout">
        <Sidebar />
        {{
          lesson: <LessonPage />,
          assignment: <AssignmentPage />,
          enrichment: <EnrichmentPage />,
          schedule: <SchedulePage />,
        }[view] || <SchedulePage />}
      </div>
    </div>
  );
}
