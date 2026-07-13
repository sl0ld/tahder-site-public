insert into preparation_templates (
  id,
  lesson_id,
  version,
  warmup,
  vocabulary,
  objectives,
  strategies,
  teaching_aids,
  thinking_skills,
  closure,
  enrichment,
  homework,
  quiz,
  full_content,
  quality_score,
  status,
  generated_by
)
select
  uuid(),
  l.id,
  1,
  concat('تمهيد قصير يربط خبرات الطلاب بعنوان الدرس: ', l.lesson_title),
  json_array('مفردات الدرس', 'الفكرة الرئيسة', 'تطبيق المهارة'),
  json_array(
    concat('أن يقرأ الطالب درس ', l.lesson_title, ' قراءة صحيحة.'),
    'أن يحدد الطالب الفكرة الرئيسة والتفاصيل الداعمة.',
    'أن يطبق الطالب مهارة الدرس في نشاط قصير داخل الحصة.'
  ),
  json_array('التعلم التعاوني', 'فكر زاوج شارك', 'القراءة الموجهة', 'سؤال خروج'),
  json_array('الكتاب المدرسي', 'منصة مدرستي', 'السبورة التفاعلية', 'ورقة عمل قصيرة'),
  'الملاحظة، الاستنتاج، الربط، التطبيق.',
  concat('تلخيص سريع لدرس ', l.lesson_title, ' مع سؤال خروج يقيس تحقق الهدف.'),
  json_array(
    concat('نشاط إثرائي: يطبق الطالب فكرة درس ', l.lesson_title, ' في مثال جديد.'),
    'مهمة اختيارية تراعي الفروق الفردية بين الطلاب.'
  ),
  json_object(
    'title', concat('واجب ', l.lesson_title),
    'description', concat('واجب قصير على درس ', l.lesson_title, ' يقيس الفهم والتطبيق.'),
    'questions', json_array('سؤال فهم مباشر', 'سؤال تطبيق قصير', 'سؤال تفكير')
  ),
  json_object(
    'title', concat('تقويم ', l.lesson_title),
    'questions', json_array('ما الفكرة الرئيسة؟', 'طبق المهارة في مثال من عندك.')
  ),
  json_object(
    'objectives', concat('أن يقرأ الطالب درس ', l.lesson_title, ' قراءة صحيحة، وأن يحدد الفكرة الرئيسة والتفاصيل الداعمة، وأن يطبق مهارة الدرس في نشاط قصير.'),
    'strategies', 'التمهيد بسؤال قصير، التعلم التعاوني، فكر زاوج شارك، القراءة الموجهة، ثم تقويم ختامي سريع.',
    'resources', 'الكتاب المدرسي، منصة مدرستي، السبورة التفاعلية، بطاقة مهارة، ورقة عمل قصيرة.',
    'closure', concat('تلخيص أهم نقاط درس ', l.lesson_title, '، ثم سؤال خروج يقيس تحقق الهدف.'),
    'enrichment', concat('نشاط إثرائي اختياري: يطبق الطالب فكرة درس ', l.lesson_title, ' في مثال جديد أو يربطها بموقف من حياته اليومية.'),
    'assignment', concat('واجب قصير على درس ', l.lesson_title, ': سؤال فهم مباشر، وسؤال تطبيق، وسؤال تفكير قصير.'),
    'hints', 'ابدأ بقراءة عنوان الدرس والأمثلة، ثم حدد الفكرة الرئيسة، واستخدم الشرح أو النشاط المرفق قبل حل الواجب.',
    'activities', 'نشاط صفي: يعمل الطلاب في مجموعات صغيرة لاستخراج الفكرة الرئيسة وتطبيق المهارة، ثم تعرض كل مجموعة إجابة مختصرة.'
  ),
  70.00,
  'ready',
  'manual'
from curriculum_lessons l
where l.is_active = 1
  and not exists (
    select 1
    from preparation_templates t
    where t.lesson_id = l.id
      and t.version = 1
  );
