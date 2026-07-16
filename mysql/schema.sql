set names utf8mb4;
set foreign_key_checks = 0;

drop table if exists activity_logs;
drop table if exists admin_users;
drop table if exists ai_runtime_settings;
drop table if exists preparations;
drop table if exists preparation_templates;
drop table if exists curriculum_lessons;
drop table if exists curriculum_books;
drop table if exists subscriptions;
drop table if exists profiles;
drop table if exists plans;
drop table if exists users;

set foreign_key_checks = 1;

create table users (
  id char(36) primary key,
  email varchar(255) not null unique,
  password_hash varchar(255),
  email_verified_at datetime null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table profiles (
  user_id char(36) primary key,
  display_name text,
  account_email varchar(255) null,
  madrasati_display_name text,
  madrasati_email varchar(255) null,
  madrasati_user_id varchar(255) null,
  school_id varchar(255) null,
  phone text,
  school_name text,
  stage text,
  grade text,
  subject text,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint profiles_user_fk foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index profiles_account_email_idx on profiles (account_email);
create index profiles_madrasati_email_idx on profiles (madrasati_email);
create index profiles_madrasati_user_idx on profiles (madrasati_user_id);
create index profiles_school_idx on profiles (school_id);

create table admin_users (
  user_id char(36) primary key,
  role text not null,
  created_at datetime not null default current_timestamp,
  constraint admin_users_user_fk foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table plans (
  id varchar(120) primary key,
  name_ar text not null,
  price_sar decimal(10,2) not null default 0,
  duration_days int not null,
  features json not null,
  is_active tinyint(1) not null default 1,
  created_at datetime not null default current_timestamp
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table subscriptions (
  id char(36) primary key default (uuid()),
  user_id char(36) not null,
  plan_id varchar(120) not null,
  status enum('trial','active','past_due','cancelled','expired') not null default 'trial',
  starts_at datetime not null default current_timestamp,
  ends_at datetime null,
  payment_reference text,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint subscriptions_user_fk foreign key (user_id) references users(id) on delete cascade,
  constraint subscriptions_plan_fk foreign key (plan_id) references plans(id)
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index subscriptions_user_status_idx on subscriptions (user_id, status, ends_at);

create table curriculum_books (
  id char(36) primary key default (uuid()),
  title text not null,
  subject text not null,
  grade text not null,
  term text not null,
  academic_year text,
  pdf_url text,
  lessons json not null,
  status text not null,
  created_by char(36) null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint curriculum_books_created_by_fk foreign key (created_by) references users(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

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

create table preparations (
  id char(36) primary key default (uuid()),
  user_id char(36) not null,
  lesson_id char(36) null,
  template_id char(36) null,
  madrasati_lesson_ref varchar(255) null,
  lesson_title text not null,
  subject text,
  grade text,
  term text,
  class_names json not null,
  content json not null,
  status enum('draft','ready','exported','archived') not null default 'draft',
  source text not null,
  created_at datetime not null default current_timestamp,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint preparations_user_fk foreign key (user_id) references users(id) on delete cascade,
  constraint preparations_lesson_fk foreign key (lesson_id) references curriculum_lessons(id) on delete set null,
  constraint preparations_template_fk foreign key (template_id) references preparation_templates(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index preparations_user_created_idx on preparations (user_id, created_at);
create index preparations_lesson_idx on preparations (lesson_id);
create index preparations_madrasati_ref_idx on preparations (madrasati_lesson_ref);

create table ai_runtime_settings (
  id int primary key default 1,
  provider text not null,
  model text not null,
  api_key text,
  api_key_hint text,
  system_prompt text,
  temperature decimal(5,2) not null default 0.35,
  is_enabled tinyint(1) not null default 1,
  updated_by char(36) null,
  updated_at datetime not null default current_timestamp on update current_timestamp,
  constraint ai_runtime_settings_updated_by_fk foreign key (updated_by) references users(id) on delete set null
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create table activity_logs (
  id bigint primary key auto_increment,
  user_id char(36) not null,
  event_type text not null,
  metadata json not null,
  created_at datetime not null default current_timestamp,
  constraint activity_logs_user_fk foreign key (user_id) references users(id) on delete cascade
) engine=InnoDB default charset=utf8mb4 collate=utf8mb4_unicode_ci;

create index activity_logs_user_created_idx on activity_logs (user_id, created_at);

insert into plans (id, name_ar, price_sar, duration_days, features, is_active)
values
  ('trial', 'تجربة', 0, 7, json_object('ai_generations', 10), 1),
  ('teacher-half-year', 'اشتراك المعلم نصف السنوي', 40, 180, json_object(), 1),
  ('teacher-yearly', 'اشتراك المعلم السنوي', 70, 365, json_object(), 1),
  ('teacher-monthly', 'اشتراك المعلم الشهري', 29, 30, json_object(), 0)
on duplicate key update
  name_ar = values(name_ar),
  price_sar = values(price_sar),
  duration_days = values(duration_days),
  features = values(features),
  is_active = values(is_active);
