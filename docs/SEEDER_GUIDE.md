# Seeder Guide

## Running It

```bash
cd server
npm run seed
```

This **destructively clears and repopulates** every real collection in the `tartelah` database (`User, Course, Package, Subscription, Session, Attendance, Evaluation, Homework, Memorization, Revision, Notification, Enrollment, EnrollmentRequest, ScheduleRule, Testimonial, FAQ, Article, ArticleCategory, AcademySettings, SuccessStory, ContactMessage, AuditLog`). **Never run it against a production database** — it has no environment guard, by design (it's a dev/staging tool only).

## What It Creates

- **26 users**: 2 admins, 6 teachers (one deliberately left with an unresolved `gender` to exercise the neutral-avatar/no-honorific fallback path), 18 students, all with realistic Arabic+English names.
- **4 packages**, **8 courses** (mixed `published`/`draft`/`archived` status, mixed category/difficulty, some featured) with full curriculum/SEO/media-metadata fields populated.
- **4 article categories + 10 articles** across every status (`draft`/`published`/`scheduled`/`archived`), some featured/pinned, with view/like counts.
- Singleton **AcademySettings** and **SuccessStory** configs.
- **18 subscriptions** spanning every status (`active`/`expired`/`cancelled`/`paused`/`pending`).
- **6 enrollment requests** spanning the full pipeline (`pending`/`under_review`/`approved`/`rejected`).
- **12 schedule rules** (one intentionally `paused`) generating **~100 sessions** — a realistic mix of `completed`/`missed`/`cancelled`/`scheduled`, with attendance, payroll status (`payable`/`non_payable`/`pending_review`/`excluded`), outcome, and delay fields populated so the Operations Center, payroll reports, and Needs-Review queue all have real data to show.
- Evaluations, homework (with graded + ungraded submissions), memorization/revision logs, ~50 notifications across every type/priority/read-state, course enrollments, testimonials, FAQs, contact messages across every status, and a handful of representative audit-log entries.

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@tartelah.com` | `Admin1234!` |
| Admin 2 | `admin2@tartelah.com` | `Admin1234!` |
| Teacher 1 (male) | `teacher1@tartelah.com` | `Teacher1234!` |
| Teacher 2 (female) | `teacher2@tartelah.com` | `Teacher1234!` |
| Teachers 3–6 | `teacher3..6@tartelah.com` | `Teacher1234!` |
| Students 1–18 | `student1..18@tartelah.com` | `Student1234!` |

The separate dev-only Quick Login panel (visible only outside production) uses its own accounts (`teacher@tartelah.com`, `teacher.female@tartelah.com`, `student@tartelah.com`), auto-created on server boot by `server/src/seed/devSeed.js` if missing — these coexist with the main seed and don't need to be run separately.

## Deliberately Out of Scope

The seeder does **not** create data for entities that don't exist in the schema: Wallet, Payments/Invoices (real gateway), Certificates, Quizzes/Assignments (as a concept separate from `Homework`), Support Tickets, a `Parent` role, Achievements, or Classrooms. Building those would be a real feature-development effort, not a seeding task — see `KNOWN_LIMITATIONS.md` for the roadmap note.

## Extending It

The script (`server/src/seed/seed.js`) uses small local helpers (`rand`, `randInt`, `pick`, `daysFromNow`) and manual Arabic name pools rather than an external faker library — keep that pattern if you add more volume, and remember every new field you add to a model should get a realistic value here too, not just a default.
