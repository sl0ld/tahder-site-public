insert into plans (id, name_ar, price_sar, duration_days, features, is_active)
values
  ('teacher-half-year', 'اشتراك المعلم نصف السنوي', 40, 180, json_object(), 1),
  ('teacher-yearly', 'اشتراك المعلم السنوي', 70, 365, json_object(), 1)
on duplicate key update
  name_ar = values(name_ar),
  price_sar = values(price_sar),
  duration_days = values(duration_days),
  features = values(features),
  is_active = values(is_active);

update plans
set is_active = 0
where id = 'teacher-monthly';
