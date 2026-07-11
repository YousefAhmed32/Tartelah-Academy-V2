# Admin Guide

Login at `/login` with an admin account (seeded: `admin@tartelah.com` / `Admin1234!`).

## Daily Operations Checklist
1. **Dashboard** (`/admin`) — check the Operations Intelligence strip and pending-enrollment banner first; both link directly into the relevant queue.
2. **طلبات التسجيل (Enrollment Requests)** (`/admin/enrollments`) — review payment proof, approve (creates the subscription + assigns a teacher) or reject with a note.
3. **العمليات (Operations Center)** (`/admin/operations`) — three tabs:
   - **الآن (Live)** — today's sessions bucketed by state (live, starting soon, missing check-in, missing link, late, attendance pending, completed, cancelled).
   - **الجدول الزمني (Timeline)** — filterable history (date/teacher/status/payroll status/needs-review-only).
   - **قائمة المراجعة (Needs Review)** — sessions with missing check-ins, unfinalized attendance, lateness, or internal contradictions. Actions: Start Review → Correct (opens the same attendance-correction form used elsewhere) → Resolve/Dismiss.

## Managing People
- **الطلاب / المعلمون** — tabbed CRM (info, edit, reset password for students; info/edit/salary/gender for teachers). Deactivating a user (not deleting) is the standard way to revoke access while preserving history.
- Creating a teacher **requires** setting gender (`معلم`/`معلمة`) — this drives the correct Arabic honorific and avatar everywhere the teacher is shown publicly.

## Sessions & Scheduling
- **الحصص والجداول** (`/admin/sessions`) — admin can create/edit/cancel/reschedule *any* teacher's session (ownership bypass is intentional for admin, not a bug).
- Payroll correction is reachable from three places (Sessions table, Teachers CRM, Operations Center) — all three call the identical backend endpoint, so use whichever is convenient.

## Content
- **الدورات / المقالات / قصص النجاح / إدارة الموقع** — each has its own CMS page under "المحتوى". Success Stories and Academy Settings are singletons (one config document each) — there's nothing to "create," only to edit.

## Reports
- **التقارير والإحصائيات** — revenue, session volume, leaderboards.
- **أداء المعلمين (Teacher Performance)** — org-wide payroll-readiness summary + per-teacher drill-down.
- **سجل النشاط (Audit Log)** — every sensitive action (enrollment decisions, payroll corrections, password resets, etc.), human-readable.

## Settings
- **الإعدادات** — Academy name/contact/social/working-hours/footer/newsletter, all reflected live on the public site and footer.
