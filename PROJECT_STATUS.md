# Project Status — Tartelah Online

**Last Updated:** 2026-07-11 (Operations Center audit)  
**Current Phase:** PRODUCTION READY — Full Educational Operating System + Articles CMS + Courses Management System + Success Stories Homepage Section + Teacher Dashboard Light-Theme Redesign + Intelligent Attendance / Payroll-Ready Operations System + Admin Operations Center + Teacher Identity System & Teachers Page Refactor + **Full-Platform Seeder, Live Audit & Documentation Pass**
**Overall Progress:** 100% (Core) + Scheduling Engine + Articles CMS + Enterprise Courses Module + Success Stories CMS + Session-Centric Attendance Intelligence + Needs-Review Queue + Recurring-Session Dedupe + Canonical Teacher Gender Identity + Redesigned Public Teachers Page + **Comprehensive Seeder Covering All 22 Models + Complete `docs/` Set + Arabic Client Manual**
**Frontend Build:** ✅ Zero errors  
**Backend:** ✅ All endpoints verified + scheduling engine + articles API + courses enterprise API + success-stories API + teacher-performance payroll-readiness API + operations (live/timeline/review-queue) API + public teacher directory API (`/teachers/public`)
**Database:** ✅ MongoDB with ScheduleRule + Session Series + Article + ArticleCategory + Course (expanded) + SuccessStory (singleton) + Session/Attendance extended with payroll-readiness, outcome, delay, and evidence fields + review lifecycle fields + unique {seriesId, scheduledAt} dedupe index + `User.gender` canonical enum
**Tests:** ✅ `npm test` (server, jest) — 68/68 passing, covering attendance-policy/payroll-intelligence logic, the Needs-Review assessment engine, recurring-session dedupe, and the teacher identity resolver/public-projection/migration-audit logic

---

## Media System Rebuilt on MongoDB GridFS (2026-07-16, latest)

Full architecture change, not a patch: every image/file upload (avatars, course thumbnails/covers, article covers, success-story images, homework attachments, payment proofs, and a new academy-logo upload feature) now streams through Multer memory storage straight into MongoDB GridFS — no local disk involved anywhere, closing the "won't survive a redeploy" gap `docs/KNOWN_LIMITATIONS.md` had flagged. One unified endpoint, `GET /api/v1/media/:id`, serves everything with Range support, ETag/conditional-GET, and long-lived immutable caching for public files. Existing model fields (`User.avatar`, `Course.thumbnailImage`/`coverImage`, `Article.coverImage`, `SuccessStory` images) were deliberately **retyped, not renamed** (String path → GridFS ObjectId) to avoid auditing the ~50 existing `.select()`/`.populate()` projections that already name those fields — the single frontend `getFileUrl()` helper is the only place that needed to learn the new bare-id shape, so all 105 existing call sites kept working unchanged. Payment proofs and homework attachments became genuinely private (previously served from an unauthenticated static route) via per-file `metadata.private` + owner/admin/allow-listed access checks — verified live end-to-end (uploader ✅, admin ✅, unrelated user 403, unauthenticated 401). Also fixed two real latent bugs found while building this: course/article "duplicate" was silently sharing the source's image id (would have broken both copies on any future delete/replace), and every image type except avatars never deleted the old file on replace/delete (permanent disk-leak, now fixed for GridFS via `deleteFile()`). Full detail, including the field-retyping rationale, in `docs/MEDIA_SYSTEM.md`.

---

## Real Academy Content Replaces Demo Data (2026-07-16, latest)

Replaced all demo/placeholder Courses, Packages, and mission/vision/about copy with the official academy content sourced from the owner's WhatsApp messages (`datatoadd.md`), rewritten into professional website copy without altering prices, course names, curricula, or age groups. `server/src/scripts/seedRealContent.js` (new, content-only — never touches Users/Sessions/Subscriptions) replaced the 9 demo courses with the 10 real ones (Noor Al-Bayan, the Integrated Kids Program, Juz Amma Tadabbur, Seerah for Kids, the three "الجيل الصاعد" teen/young-adult courses, and the three "الصفوة" adult courses) and the 4 demo packages with the 3 real ones (Silver/Gold/Diamond — 120/150/180 SAR, 12/16/20 sessions/month). `AcademySettings` gained additive `missionQuoteAr`/`visionAr`/`aboutHeadlineAr`/`aboutBodyAr` fields (admin-editable from a new section in `AdminSettingsPage.jsx`), and `AboutPage.jsx` now renders the real mission (the ʿĀʾisha hadith) and vision instead of invented marketing copy. `ProgramsPage.jsx`'s 4 generic fabricated programs were replaced with the 3 real age-tier groups (كورسات الأطفال / الجيل الصاعد / الصفوة) linking to the real Courses page. Home/Pricing pages needed no changes — they already read live from the `Package`/`Course` APIs. Verified via live `curl` against the running API and a full frontend build (zero errors); `npx jest` still 94/96 (the 2 failures are pre-existing, unrelated to this session — `attendancePolicy`/`sessionIntelligence` tests, no files touched).

**Known gap, not fixed this session:** `AboutPage.jsx`'s hero stat badges (+10,000 students, +50,000 hours, +25 countries) and its "Bento grid" credibility claims are pre-existing invented marketing numbers with no source in `datatoadd.md` — left untouched since replacing them would require real figures nobody has provided yet.

---

## Operations Center Full Audit & Rebuild (2026-07-11, latest)

Full detail in `docs/OPERATIONS_CENTER_AUDIT.md`. User reported most Operations Center stats showing 0. Root cause was **100% the seeder**, not backend logic: the session-generation loop used `daysFromNow(-p*3)`/`daysFromNow(1,3,7)`, which structurally never lands a session on day-offset 0 (today) — confirmed against live MongoDB (11 session dates, none matching "today"). Every "Live Now" stat tile is correctly, strictly bound to today's exact date range in `operations.controller.js` — that logic was verified correct end-to-end and left unchanged. Fixed by adding a dedicated 14-scenario "today" generator to `seed.js` covering live/starting-soon/missing-checkin/missing-link/late/completed/cancelled/no-show/student-absent/payroll-review/critical-contradiction cases. A second subtler bug was caught while fixing the first: the backend computes "today" via local-timezone midnight (server runs UTC+3), so naive `now - X minutes` offsets could cross midnight and land in "yesterday" depending on what time the seeder runs — fixed with a `pastToday()` clamp, verified by re-seeding at 2:40 AM local time. Added real new metrics that didn't exist before (No-Show count, Student Absences Today, Attendance/On-Time rates, Revenue Today, Online-Now presence — the last one only possible because this session's earlier socket fix made real-time actually work) and redesigned the Live tab (critical-alert banner, health strip, severity-tinted stat grid, unified deduplicated attention feed replacing 6 redundant boxed lists, quick actions).

---

## Notification Center Redesign & UX/Product Audit (2026-07-11, earlier)

Full detail in `UX_IMPROVEMENTS.md`. Critical finding: real-time notifications had **never actually worked** — `socket.service.js` verified sockets against a nonexistent `JWT_SECRET` env var instead of the real `JWT_ACCESS_SECRET`, so every handshake silently failed; fixed and verified live end-to-end (toast delivered with zero reload). Notification Center gained archive (backend + UI), real bulk endpoints (replacing N-sequential-request loops), a working "select all" (was dead code), day/category grouping toggle, priority-aware sorting, and a corrected unread-badge count (was silently capped/wrong past 30 unread items). Also found and fixed a second silent bug: `ConfirmDialog`'s prop API (`open`/`confirmLabel`/`variant`) didn't match what `AdminArticlesPage.jsx` was passing (`isOpen`/`confirmText`/`isDangerous`), so its two delete-confirmation dialogs never rendered — fixed there and used consistently in new dialogs added for student/teacher deactivation and website-content deletion, none of which had any confirmation step before. Admin dashboard gained a consolidated `PendingTasksCard` (replacing two separate banners) plus a new `pendingHomeworkGrading` signal that didn't exist anywhere before. Subscriptions page gained student-name search (backend + frontend). Verified via a live headless-browser pass across all 41 sidebar pages in all three roles (zero errors) plus `npm run build` and `npx jest` (96/96).

---

## Full-Platform Seeder, Live Audit & Documentation Pass (2026-07-11, earlier session)

Rewrote `server/src/seed/seed.js` from a thin 6-user script into a comprehensive seeder populating all 22 real collections with realistic, interconnected, bilingual data (26 users, 8 courses, 18 subscriptions across every status, ~100 sessions with full payroll/attendance intelligence fields, articles, notifications, audit logs, etc.) — full detail in `docs/SEEDER_GUIDE.md`. Then drove the real running app with a headless-browser pass across every sidebar page in all three dashboards, which caught and fixed a genuine production bug: `AdminSubscriptionsPage` crashed (`students.map is not a function`) due to a shared React Query cache key (`['admin','students'/'teachers','all']`) being unwrapped inconsistently across five different admin pages — standardized to one shape. Added a full `docs/` folder (system overview, features, workflow, permissions, API reference, attendance summary, three role guides, seeder guide, deployment guide, known-limitations) and an Arabic non-technical client manual (`دليل استخدام المنصة.md`). Full detail: `FINAL_REPORT.md`.

Per explicit user decision, the seeder does **not** fabricate entities absent from the real schema and `SCOPE_OF_WORK.md` (Wallet, Payments/Invoices, Certificates, Quizzes, Support Tickets, Parent role, Achievements, Classrooms) — documented as a roadmap gap in `docs/KNOWN_LIMITATIONS.md` rather than invented.

---

## Teacher Identity System & Teachers Page Refactor (2026-07-04, latest)

Added `User.gender` (`male`/`female`, enum-validated, not required/defaulted) as the single canonical source of a teacher's identity — no legacy field existed to infer it from, so every pre-existing teacher is "unresolved" until corrected via the admin UI or the teacher's own settings, never guessed. Built a centralized identity resolver (mirrored in `server/src/utils/teacherIdentityResolver.js` and `client/src/utils/teacherIdentity.js`) that turns `{gender, avatar}` into the correct honorific (`الأستاذ`/`الأستاذة`), avatar (custom photo → gender-correct default → neutral-unresolved default), used everywhere a teacher's identity is shown. Discovered and fixed a real production bug: the public Teachers page was calling the `authenticate + isAdmin`-gated `/admin/teachers` endpoint, which could never succeed for a real anonymous visitor — it silently fell back to 4 hardcoded fake teachers via `.catch(() => FALLBACK_TEACHERS)` every time. Replaced with a genuine public, safely-projected `/teachers/public` API and removed the fake fallback entirely. Fully redesigned the Teachers page and `TeacherCard` (no more hover-only 3D flip, no more `فضيلة الشيخ` hardcoding, no more generic book-icon fallback), added a male/female discovery filter, a public Teacher Profile page, and admin/teacher-self gender controls. Full detail in `docs/TEACHER_IDENTITY_AND_TEACHERS_PAGE_REFACTOR.md`.

---

## Admin Operations Center + Needs Review Queue + Recurring-Session Dedupe (2026-07-04, continuation pass)

Second implementation pass on the attendance/payroll system, building directly on the first pass rather than redoing it. Re-verified all prior code against `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md` first (found and fixed one stale docblock comment — no behavioral drift). Then closed the two biggest gaps flagged at the end of the first pass: `computeConfidence()` was fully implemented and tested but never actually called from any surfaced UI, and recurring-session generation had no de-duplication guard.

Key additions — full detail in `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md` §21–§31:
- **Admin Operations Center** (`/admin/operations`, new page + nav item) — three tabs: الآن (live today's-sessions bucket view), الجدول الزمني (filterable chronological timeline), قائمة المراجعة (Needs Review queue)
- **`assessSessionReview()`** (new, in `sessionIntelligence.service.js`) — deterministic severity + reasons engine (critical/high/medium) covering missing check-ins, unfinalized attendance on completed sessions, significant lateness, late finalization, missing meeting links, and three internal-contradiction checks (cancelled-but-payable, no_show-status-mismatch, outcome-status-mismatch)
- **Review lifecycle** — new `Session.reviewState/reviewedBy/reviewedAt/reviewNote` fields; `PATCH /operations/review/:sessionId` with start_review/resolve/dismiss/reopen actions, all audit-logged
- **Confidence now actually surfaced** — Timeline row drill-down + `GET /sessions/:id`, using plain-language labels (never a raw score, never "proof of attendance")
- **Recurring-session dedupe** — unique partial index `{seriesId, scheduledAt}` on `Session` + `schedule.service.js` rewritten to idempotent `bulkWrite`/`$setOnInsert` upserts instead of `insertMany`; new `server/src/scripts/dedupeSessions.js` cleanup utility for any pre-existing legacy duplicates
- **Audit log UX** — `AdminAuditLogsPage.jsx` rewritten with a full action-label map and human-readable change summaries instead of raw JSON
- **Dashboard intelligence** — compact "needs attention" strip on `AdminDashboardPage.jsx`; teacher-side `needsAttention` count on `TeacherDashboardPage.jsx`

---

## Intelligent Attendance, Session Tracking & Payroll-Ready Operations System (2026-07-04)

Full reverse-engineering + hardening pass on the platform's attendance/payroll pipeline. Prior sessions had already built a working teacher-attendance/salary subsystem (`Session.teacherAttendanceStatus`, `teacherPerformance.service.js`, a cron sweep, dedicated performance dashboards) — this session closed its real trust gaps rather than rebuilding it: payability now visibly (not silently) accounts for student attendance via a `pending_review` state, the audit trail (previously ~90% non-functional due to a call-signature bug) is now correctly wired across the entire session/attendance/subscription/enrollment pipeline, admin corrections are reachable directly from the sessions table, and the teacher check-in/attendance workflow now uses forgiving, graduated time windows instead of a single hard 15-minute cutoff. Full detail, diagrams, and file list in `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md`.

Key additions:
- **`server/src/config/attendancePolicy.js`** (new) — centralized, configurable time-window policy (pre-session access, post-session grace, extended completion, late tolerance, missed/absence thresholds)
- **`server/src/services/sessionIntelligence.service.js`** (new) — deterministic, unit-tested payroll-status and confidence-scoring rules
- **`Session` model** — new `outcome`, `actualStartAt/actualEndAt`, `delayMinutes/delayReasonCode/delayNote`, `teacherLinkOpenedAt/studentLinkOpenedAt`, `attendanceFinalizedAt/By`, `payrollStatus` + related fields — all additive, no destructive migration
- **`Attendance` model** — extended status enum (`left_early`, `technical_issue`), `arrivalTime`, `isFinalized/finalizedAt/finalizedBy`
- **New endpoints** — `PATCH /sessions/:id/delay`, `POST /sessions/:id/link-opened`, `GET /teacher-performance/me|admin/payroll-readiness`
- **Audit trail repaired** — fixed 7 broken `logAction` call sites in `article.controller.js` (wrong argument shape, silently failing since introduction) and added real audit coverage to session check-in/complete/cancel/reschedule/delay, attendance save/finalize/update, admin corrections, subscription create/update, and enrollment approval/rejection
- **Graduated, forgiving cron sweep** (`teacherAttendanceSweep.job.js` rewritten) — replaces the old single 15-minute hard cutoff with a 3-stage model (untouched → `missed` at 4h past end → `no_show` at 7h past end), always admin-correctable
- **Frontend** — `TeacherSessionsPage.jsx` (check-in vs. link-open distinction, delay reporting, extended attendance statuses, draft/finalize split, outcome picker), `TeacherDashboardPage.jsx` (consistent forgiving check-in), `AdminSessionsPage.jsx` (payroll badges + inline correction modal + payrollStatus filter), `TeacherPerformancePage.jsx` / `AdminTeacherPerformancePage.jsx` (payroll-readiness breakdown)

---

## Teacher Dashboard Light-Theme Redesign (2026-07-02)

The Teacher Dashboard (all 11 pages + layout chrome) was redesigned from a full dark-purple theme to a light SaaS theme (`#F8FAFC` background, white cards, violet/gray Tailwind palette) matching the Admin Dashboard's established visual language. The dark purple **sidebar** (brand identity/logo) was intentionally kept unchanged. Admin and Student dashboards were not touched. Full details in `SESSION_HANDOFF.md` → "Teacher Dashboard Redesign (2026-07-02, earlier session)".

**Follow-up stability pass (same day, later):** fixed a root-cause `Suspense` boundary bug that unmounted the whole Teacher layout (blank white page) on every in-app navigation, added an `ErrorBoundary` + `ErrorState` pair so render/query errors show a retry panel instead of crashing the app, and normalized every list-returning teacher query against non-array responses. See `SESSION_HANDOFF.md` → "Teacher Dashboard Stability Fixes (2026-07-02, latest session)".

---

## Success Stories Homepage Section (2026-07-02) — New Capability

Admin-managed homepage section ("قصص النجاح") spotlighting the best teacher, best student, and best achievement — with two mutually-exclusive display modes: three premium cards, or a single hero banner. Full details in `FEATURE_TRACKER.md`.

Key additions:
- **`SuccessStory` model** (singleton, like `AcademySettings`) — `displayMode`, `isActive`, `cards[]` (fixed roles: teacher/student/achievement), `banner`
- **`/api/v1/success-stories`** — public GET (returns `null` if inactive) + admin CRUD + per-slot image upload/remove
- **`ImageCropModal` + `ImageUploadField`** (`client/src/components/ui/`) — new reusable, project-wide image upload primitives (drag&drop, `react-easy-crop`-based crop, client-side canvas compression to JPEG q0.82 / max 1600px, preview, replace, remove). Intended for reuse in future upload flows beyond this feature.
- **`AdminSuccessStoriesPage`** (`/admin/success-stories`, nav under "المحتوى") — light theme (matches CRM admin pages, not the dark CMS-form style), mode switcher, per-card/banner editors, live preview panel
- **`SuccessStoriesSection`** (`client/src/components/home/`) — inserted into `HomePage.jsx` right after the Teachers section, before Testimonials. Renders nothing if the section is inactive or has no usable content for the active mode.

Verified end-to-end via curl (full CRUD, auth guards, role validation, static file serving) and via a headless-browser pass (Playwright) confirming the homepage section and both admin display modes render with no console errors.

---

## ✅ ALL PHASES COMPLETE + EDUCATIONAL OPERATING SYSTEM + ARTICLES CMS + COURSES SYSTEM

| Phase | Status | Details |
|-------|--------|---------|
| Phase 1: Architecture | ✅ | Full design, DB schema, RBAC, API architecture |
| Phase 2: Design System | ✅ | Tailwind tokens, CSS component layer, all layouts |
| Phase 3: Auth System | ✅ | JWT dual-token, RBAC, password reset, email service |
| Phase 4: Marketing Website | ✅ | 7 public pages with all sections |
| Phase 5: Student Dashboard | ✅ | 11 pages + enrollment, API-connected, premium UX |
| Phase 6: Teacher Dashboard | ✅ | 10 pages, API-connected, command center UX |
| Phase 7: Admin Dashboard | ✅ | 12 pages + CRM + management tools, Operations Center |
| Phase 8: Academic Management | ✅ | Attendance, evaluations, homework, progress |
| Phase 9: Sessions & Scheduling | ✅ | **FULL ENGINE** — recurring rules, series generation, exceptions |
| Phase 10: AI Assistant | ✅ | Rule-based Tajweed knowledge base |
| Phase 11: Testing & Optimization | ✅ | 65 live API tests, seed data, SEO, cron jobs |
| **ENROLLMENT FLOW** | ✅ | Full student-to-admin-to-teacher pipeline |
| **SCHEDULING ENGINE** | ✅ | ScheduleRule model, series generation, monthly view |
| **SESSION LIFECYCLE** | ✅ | Complete, cancel, reschedule, attendance, eval, homework |
| **INTELLIGENT ATTENDANCE** | ✅ | Per-session, inline in session card, doesn't override |
| **TEACHER UX** | ✅ | Recurring wizard + month calendar + expandable sessions |
| **ADMIN INTELLIGENCE** | ✅ | Unscheduled students detection + alert |

---

## Scheduling Engine (2026-06-24) — New Capabilities

### What Was Built

#### Backend — New Models
- **`ScheduleRule`** — Recurring schedule rule (teacher+student+frequency+days+time+period)
- **`Session.seriesId`** — Links sessions to their parent ScheduleRule
- **`Session.isException`** — Marks manually-overridden sessions
- **`Session.isMakeup`** — Makeup session flag
- **`Session.rescheduledFrom`** — Stores original date when rescheduled
- **Status expansion** — Added: `rescheduled`, `missed` to session statuses

#### Backend — New Service
- **`schedule.service.js`** — Generates Session documents from ScheduleRule
  - Supports: `daily`, `weekly`, `biweekly`, `monthly`, `custom`
  - Handles: skipDates, sessionsTotal limit, endDate limit
  - Safety: 600-iteration max to prevent infinite loops

#### Backend — New Controller + Routes
- `POST /schedule-rules/preview` — Preview dates without DB write
- `POST /schedule-rules` — Create rule + auto-generate all sessions
- `GET /schedule-rules/my` — Teacher's active rules with stats
- `GET /schedule-rules/:id` — Single rule + upcoming sessions
- `PATCH /schedule-rules/:id` — Update rule (link, pause, resume)
- `POST /schedule-rules/:id/generate-more` — Extend rule, generate more sessions

#### Backend — Session Updates
- `GET /sessions/teacher-month` — Monthly view for teacher (with student filter)
- `GET /sessions/:id` — Single session with attendance
- `PATCH /sessions/:id/reschedule` — Reschedule with student notification
- Smart complete: doesn't override manually-set attendance

#### Backend — Attendance Updates
- `GET /attendance/session/:sessionId` — Get session's attendance record
- `POST /attendance/session/:sessionId` — Create/update attendance (upsert)

#### Frontend — Teacher Sessions Page (FULL REDESIGN)
- **3 tabs**: الشهر الحالي | الجداول الدورية | السجل
- **Month navigation**: Arabic month names, year navigation
- **Sessions grouped by date** with date chips
- **Expandable session cards** with:
  - Attendance controls (حاضر/غائب/متأخر/معذور + notes)
  - Complete / Reschedule / Cancel buttons
  - Quick Evaluation modal (session-linked)
  - Quick Homework modal (student-pre-filled)
  - Meeting link button
- **Schedule Wizard** — 4-step recurring schedule creator:
  - Step 1: Student selection
  - Step 2: Frequency + days picker + time picker
  - Step 3: Sessions count + meeting details
  - Step 4: Preview all generated dates → Confirm

#### Frontend — Teacher Dashboard Updates
- Unscheduled students alert banner (clickable → sessions page)
- Action queue item for unscheduled students
- Pulls active schedule rules to detect unscheduled

#### Frontend — Admin Dashboard Updates
- `unscheduledStudents` count from API
- Alert banner when students have subscriptions but no schedule

#### Frontend — Constants Updates
- `SESSION_STATUS` expanded with: `rescheduled`, `missed`, `no_show`
- New `SCHEDULE_FREQUENCY` constant map
- New `DAYS_OF_WEEK` array with Arabic day names

---

## Data Model

| Model | Status | Key fields |
|-------|--------|-----------|
| User | ✅ | role, isActive, meetingLinks |
| Session | ✅ | seriesId, status (7 values), isException, isMakeup, rescheduledFrom |
| ScheduleRule | ✅ NEW | teacherId, studentId, frequency, daysOfWeek, timeOfDay, sessionsTotal |
| Attendance | ✅ | sessionId, studentId, status, notes |
| Evaluation | ✅ | sessionId, score, type, strengths, improvements |
| Homework | ✅ | assignedTo[], dueDate, submissions[] |
| Subscription | ✅ | sessionsRemaining, status |
| EnrollmentRequest | ✅ | status pipeline: pending→approved |
| Notification | ✅ | type-based, auto-created on key events |

---

## API Flow: Complete Session Lifecycle

```
Admin approves enrollment
  → Subscription created
  → Teacher notified

Teacher logs in
  → Sees unscheduled students alert
  → Opens Sessions page
  → Clicks "إنشاء جدول دوري"

Schedule Wizard:
  1. Select student
  2. Choose: weekly + Monday+Thursday + 8PM
  3. Set: 8 sessions, Zoom link
  4. Preview 8 dates → Confirm
  
→ POST /schedule-rules
  → ScheduleRule created
  → 8 Sessions auto-generated
  → Student notified

Teacher opens any session card
  → Expands → sees attendance controls
  → Marks: حاضر + notes
  → Saves attendance
  → Clicks "تقييم" → quick eval modal
  → Clicks "اكتملت" → session completed
```

---

## For Production Deployment

1. **MongoDB Atlas**: Set `MONGO_URI` in `.env`
2. **JWT Secrets**: 32+ char random secrets
3. **Email (SMTP)**: Gmail/SendGrid credentials
4. **File Storage**: Replace Multer with S3/Cloudinary
5. **SSL/HTTPS**: Required for secure cookies
6. **Run seed**: `npm run seed` (once)

## Demo Credentials
```
Admin:    admin@tartelah.com    / Admin1234!
Teacher1: teacher1@tartelah.com / Teacher1234!
Teacher2: teacher2@tartelah.com / Teacher1234!
Student1: student1@tartelah.com / Student1234!
Student2: student2@tartelah.com / Student1234!
Student3: student3@tartelah.com / Student1234!
```
