# Tahder Workflow

## 1. Website Signup

1. Teacher opens `signup.html`.
2. Website loads plans from `GET /api/plans`.
3. Teacher creates an account using the email that should match the teacher identity in Madrasati.
4. Website sends signup data to `POST /api/auth/signup`.
5. Backend creates rows in `users` and `profiles`.
6. Website calls `POST /api/subscriptions/activate-signup`.
7. Backend creates an active or trial row in `subscriptions`.
8. Teacher is redirected to `index.html#account`.

## 2. Login And Account

1. Teacher signs in from the website.
2. Website sends credentials to `POST /api/auth/login`.
3. Backend checks `users.password_hash`.
4. Backend returns a JWT session.
5. Website loads the active subscription and recent preparations.
6. Login activity is saved in `activity_logs`.

## 3. Madrasati Identity Check

There is no device lock.

The extension should work only when the signed-in Tahder account matches the teacher identity currently open in Madrasati.

1. Teacher signs in to Tahder.
2. Teacher opens Madrasati.
3. Extension reads the visible Madrasati identity from the page, such as teacher name, email if available, user id, and school id.
4. Backend compares that identity against `users` and `profiles`.
5. If it does not match, the extension blocks preparation actions.

## 4. Curriculum And Fast Preparation

Fast preparation depends on pre-indexed curriculum data.

1. `curriculum_books` stores official book metadata and PDF links.
2. `curriculum_lessons` stores each lesson as a separate searchable row.
3. `preparation_templates` stores the ready preparation payload for each lesson.
4. `preparations` stores the teacher-specific saved copy after review or editing.

The fast path is:

Madrasati lesson context -> `curriculum_lessons` match -> `preparation_templates` -> extension autofill.

AI is used for improvement and missing templates, not as the default path for every click.

## 5. Extension Inside Madrasati

1. Extension detects schedule and lesson-preparation pages.
2. Extension reads current week, lesson title, subject, grade, class, and teacher identity.
3. Extension verifies the Tahder account against the current Madrasati teacher identity.
4. Extension calls the backend to match the lesson.
5. Backend returns the ready template quickly.
6. Extension shows a review preview.
7. Teacher approves.
8. Extension fills Madrasati fields.
9. Teacher saves in Madrasati.
10. Backend saves a copy in `preparations`.

## 6. Admin

Admin dashboard manages:

- Accounts and subscriptions.
- Curriculum books.
- Indexed curriculum lessons.
- Preparation templates.
- AI settings.
- Activity logs and errors.

## Active Database Tables

- `users`
- `profiles`
- `admin_users`
- `plans`
- `subscriptions`
- `curriculum_books`
- `curriculum_lessons`
- `preparation_templates`
- `preparations`
- `ai_runtime_settings`
- `activity_logs`

`linked_devices` has been removed. Account protection is based on Madrasati identity verification, not device locking.
