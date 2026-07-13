set names utf8mb4;
set foreign_key_checks = 0;

create table if not exists linked_devices_archive_20260704 as
select * from linked_devices;

drop table if exists linked_devices;

set foreign_key_checks = 1;

alter table profiles
  add column account_email varchar(255) null after display_name,
  add column madrasati_display_name text null after account_email,
  add column madrasati_email varchar(255) null after madrasati_display_name,
  add column madrasati_user_id varchar(255) null after madrasati_email,
  add column school_id varchar(255) null after madrasati_user_id,
  add column stage text null after school_name,
  add column grade text null after stage,
  add column subject text null after grade;

update profiles p
join users u on u.id = p.user_id
set p.account_email = coalesce(p.account_email, u.email);

create index profiles_account_email_idx on profiles (account_email);
create index profiles_madrasati_email_idx on profiles (madrasati_email);
create index profiles_madrasati_user_idx on profiles (madrasati_user_id);
create index profiles_school_idx on profiles (school_id);

create table curriculum_lessons (
  id char(36) primary key default (uuid()),
  book_id char(36) not null,
  stage varchar(120) null,
  grade varchar(120) not null,
  subject varchar(180) not null,
  term varchar(120) not null,
  academic_year varchar(40) null,
  week_number int null,
  hijri_week_start varchar(40) null,
  hijri_week_end varchar(40) null,
  unit_title text null,
  lesson_title text not null,
  normalized_lesson_title varchar(255) null,
  page_from int null,
  page_to int null,
  source_url text null,
  source_type enum('madrasati_book','tahdiri_distribution','manual','imported') not null default 'manual',
  metadata json null,
  is_active tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint curriculum_lessons_book_fk foreign key (book_id) references curriculum_books(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index curriculum_lessons_lookup_idx
  on curriculum_lessons (grade, subject, term, week_number, is_active);
create index curriculum_lessons_book_idx on curriculum_lessons (book_id);
create index curriculum_lessons_title_idx on curriculum_lessons (normalized_lesson_title);

create table preparation_templates (
  id char(36) primary key default (uuid()),
  lesson_id char(36) not null,
  version int not null default 1,
  warmup text null,
  vocabulary json null,
  objectives json null,
  strategies json null,
  teaching_aids json null,
  thinking_skills text null,
  closure text null,
  enrichment json null,
  homework json null,
  quiz json null,
  full_content json null,
  quality_score decimal(5,2) null,
  status enum('draft','ready','needs_review','archived') not null default 'draft',
  generated_by enum('manual','ai','imported') not null default 'manual',
  created_by char(36) null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint preparation_templates_lesson_fk foreign key (lesson_id) references curriculum_lessons(id) on delete cascade,
  constraint preparation_templates_created_by_fk foreign key (created_by) references users(id) on delete set null,
  unique key preparation_templates_lesson_version_unique (lesson_id, version)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index preparation_templates_lesson_status_idx
  on preparation_templates (lesson_id, status);

alter table preparations
  add column lesson_id char(36) null after user_id,
  add column template_id char(36) null after lesson_id,
  add column madrasati_lesson_ref varchar(255) null after template_id,
  add constraint preparations_lesson_fk foreign key (lesson_id) references curriculum_lessons(id) on delete set null,
  add constraint preparations_template_fk foreign key (template_id) references preparation_templates(id) on delete set null;

create index preparations_lesson_idx on preparations (lesson_id);
create index preparations_madrasati_ref_idx on preparations (madrasati_lesson_ref);
