# Tartelah Online — Complete Platform Feature Audit

**Audit date:** 2026-08-12
**Method:** Read-only forensic source-code inspection (frontend + backend + database models + config + docs). No code was modified. Every claim below is traced to a real file; docs (`docs/*.md`) were used only as a cross-check, never as a substitute for code inspection — two doc/code mismatches were caught and are flagged in §55.
**Repo:** `client/` (React 18 + Vite 6 + Tailwind 3 SPA) + `server/` (Node/Express 4 + MongoDB/Mongoose 8 REST API), single MongoDB database, Socket.io for realtime.

---

## Executive Summary

**Platform type:** Production Quran-learning academy platform — 1-on-1 (and small ad-hoc group) live online Quran/Tajweed/memorization tuition, run through **admin-managed subscriptions**, not self-service booking.

**Architecture:** Frontend/backend separated SPA + REST API (`/api/v1`), monolithic single-instance Node backend, MongoDB (Mongoose ODM), Socket.io for real-time notifications/presence, MongoDB GridFS for all file storage (no local disk, no S3/Cloudinary).

**User roles:** Exactly 3 — `admin`, `teacher`, `student`. No `parent`/`guardian` role exists anywhere in the codebase (confirmed by direct grep, zero real matches).

**Total features/sub-features cataloged:** **187** (see §49 matrix and §50 counts)

| Status | Count |
|---|---|
| ✅ Fully Implemented | 141 |
| 🟡 Partial | 19 |
| 🔵 Backend Only | 10 |
| 🟣 Frontend/UI Only | 7 |
| ⚪ Static/Demo | 8 |
| ❌ Not Implemented (searched, confirmed absent) | 12 items called out explicitly in §54 |

**Main product capabilities today:** public marketing site + course catalog + teacher directory; JWT auth with refresh rotation; admin-managed enrollment→subscription pipeline with manual payment-proof approval; a mature session-based scheduling/attendance/payroll engine with a ledgered lesson-wallet system; teacher-recorded memorization/revision/evaluation/homework tracking; a real OpenAI-backed AI assistant (public concierge + authenticated tutor); Socket.io real-time notifications + SMTP email; a very thorough admin back-office (22 pages) including a live Operations Center and an audit-log trail. **Not present:** exams/quizzes, certificates, a parent portal, any payment gateway, real user-to-user messaging, and English/i18n localization despite it being referenced as an architecture goal.

---

## 1. Project Architecture

| Aspect | Finding |
|---|---|
| Project type | Full-stack web app, frontend/backend separated |
| Architecture | REST API (`/api/v1`) + SPA; not GraphQL, not microservices |
| Frontend | React 18.3, Vite 6, TailwindCSS 3.4, React Router 6.28, TanStack Query 5.62, Zustand 5, Framer Motion 11, `socket.io-client` 4.8 |
| Backend | Node/Express 4.21, Mongoose 8.9 (MongoDB), `jsonwebtoken` 9, `bcryptjs`, `socket.io` 4.8, `openai` 6.45, `node-cron` 3, `nodemailer` 6.9, `helmet`, `express-rate-limit`, `express-mongo-sanitize`, `joi` 18, `multer` |
| Database | MongoDB via Mongoose; 26 top-level models; file storage also lives in MongoDB (GridFS) |
| Auth | Dual-token JWT — 15-min access token (JSON body, held in memory client-side) + 7-day refresh token (httpOnly cookie), `tokenVersion` revocation |
| Storage | MongoDB GridFS (bucket `media`), unified `GET /api/v1/media/:id` endpoint. No Cloudinary/S3/local-disk in the live code path (legacy `server/uploads/*` files are dead leftovers, not read by current code) |
| External services | OpenAI (`gpt-5.4-mini`, real, key-gated with deterministic fallback), SMTP (Nodemailer), Socket.io. **No** payment gateway, Zoom/Meet SDK, Google OAuth, Firebase, Analytics/Pixel, SMS provider |
| Deployment | PM2 (`server/ecosystem.config.js`, single instance — cron jobs run in-process, more than 1 instance would duplicate them) + manual Nginx/Let's Encrypt runbook (`DEPLOYMENT_CHECKLIST.md`), prod port `5007`. **No Docker, no CI/CD** (`.github/workflows` absent) |
| Key deps | See table above; `jspdf`/`jspdf-autotable`/`html2canvas` (client, for CSV/PDF report export), `react-easy-crop` (avatar cropping) |

**Server entry:** `server/server.js` — `http.createServer` wrapping Express (Socket.io needs the raw HTTP server), connects DB, mounts `/api/v1` via `server/src/routes/index.js` (27 route modules), starts 3 cron jobs + 2 boot-time migrations after DB connects.

**Client entry:** `client/src/main.jsx` → `BrowserRouter` + `QueryClientProvider` + `App`. `client/src/App.jsx` — 5 layouts (`PublicLayout`, `AuthLayout`, `StudentLayout`, `TeacherLayout`, `AdminLayout`), all pages lazy-loaded per role.

---

## 2. User Role Discovery

Only **three** roles exist on `User.role` (`server/src/models/User.js:11`): `admin`, `teacher`, `student`. No `Teacher`/`Student` collection — a teacher/student is a `User` document with that role plus profile fields. Confirmed no parent/guardian anywhere (grep across `server/src` and `client/src`, only false-positive substring hits like "transparent").

### Admin
- **Auth:** same JWT system, `role: 'admin'`
- **Dashboard:** `/admin` — 19 sidebar pages (§33)
- **Permissions:** Full CRUD on students/teachers/courses/packages/subscriptions/sessions/schedule-rules; approves/rejects `EnrollmentRequest`s; overrides any session's attendance/payroll (audit-logged); manages site content (articles, testimonials-backend, FAQs, success stories, academy settings); views Operations Center + audit logs + reports; resets any password; activates/deactivates accounts
- **Middleware:** `isAdmin` = `authorize('admin')` (`rbac.middleware.js`)
- **Relationship to other roles:** admin↔teacher (assigns, evaluates performance, corrects payroll), admin↔student (enrollment approval, wallet adjustments)

### Teacher
- **Dashboard:** `/teacher` — 11 pages (§32)
- **Permissions:** views/manages only own assigned students/sessions/homework/evaluations (ownership-checked at controller level, not just role level — confirmed in `attendance.controller.js`); checks in/marks/finalizes attendance for own sessions only; creates evaluations, homework, memorization/revision records; manages own meeting links + `gender` self-service; sees own payroll-readiness (never another teacher's)
- **Middleware:** `isTeacher` = `authorize('admin','teacher')` — historically named "isTeacher" but actually means admin-or-teacher; `isAdminOrTeacher` is the same function
- **Relationship:** teacher↔student (1:1 assignment via `ScheduleRule`/`Session`), teacher↔admin (payroll, oversight)

### Student
- **Dashboard:** `/student` — 11 pages (§32)
- **Permissions:** views only own sessions/subscription/homework/evaluations/progress; submits homework; browses/enrolls in courses (marketing catalog) and submits enrollment/payment-proof requests (real subscription pipeline); cannot set own `gender` (teacher-identity-specific, blocked by role check); cannot see other students' data
- **Middleware:** `isStudent` = `authorize('student')`
- **Relationship:** student↔teacher (assigned via subscription/ScheduleRule), student↔admin (enrollment approval, wallet/subscription management)

### Parent / Guardian
**❌ Does not exist.** No model field, no route, no page, no middleware role. `docs/KNOWN_LIMITATIONS.md` confirms this was a deliberate scope decision ("only `admin`/`teacher`/`student` exist").

---

## 3. Authentication & Account System

| Feature | Status | Evidence |
|---|---|---|
| Register | ✅ | `auth.controller.js:register` — role always forced to `student` (`registerSchema` never accepts a client-supplied `role`, explicit anti-privilege-escalation comment) |
| Login | ✅ | `auth.controller.js:login` — bcrypt compare, `isActive` gate |
| Logout | ✅ | `auth.controller.js:logout` — bumps `tokenVersion` (revokes outstanding refresh tokens), clears cookie |
| JWT issuance (access + refresh) | ✅ | `issueTokens()` — 15-min access token in JSON body only; 7-day refresh token httpOnly-cookie only, never in JSON |
| Refresh rotation/revocation | ✅ | `auth.controller.js:refresh` — validates `tokenVersion` match; client auto-refresh interceptor in `client/src/utils/api.js:20-51` |
| Cookie security | ✅ | `httpOnly:true`, `secure` in prod only, `sameSite:'none'` prod / `'lax'` dev |
| Password hashing | ✅ | bcryptjs cost 12, `User.js` pre-save hook |
| Forgot/reset password | ✅ | SHA-256 hashed reset token, 30-min expiry, `tokenVersion` bump on reset (kills other sessions), generic response (no email enumeration) |
| Change password | ✅ | Authenticated, bumps `tokenVersion`, reissues tokens for current device |
| Email verification (enforced) | 🟡 Partial | `User.isEmailVerified` field exists but **nothing ever sets it except the seeder** — no `/verify-email` route/flow exists |
| Google/Facebook/Apple login | ❌ Not Implemented | Zero matches anywhere |
| OTP | ❌ Not Implemented | Zero matches anywhere |
| Account activation/suspension | ✅ | `User.isActive`, checked in login/authenticate/refresh; admin toggles via `updateStudent`/`updateTeacher` |
| Avatar upload | ✅ | `POST /users/me/avatar` → GridFS via `media.service.js` |
| Profile completion / edit | ✅ | `PATCH /users/me`, allow-listed fields only |
| Device/session management | ❌ Not Implemented | Single refresh cookie per user; no device list, no per-device revoke |
| Dev quick-login | ✅ (non-prod only) | `devLogin` hard-disabled + 404'd when `NODE_ENV==='production'` |
| Role assignment | ✅ (admin only) | Only admin-created teacher accounts (`createTeacher`) or the forced-`student` self-register path; no client-controllable role field |
| Protected routes (frontend) | ✅ | Layout-level redirect-to-login (UX only; real enforcement is server-side) |
| Authorization middleware | ✅ | `rbac.middleware.js` — `authorize(...roles)`, `isAdmin`, `isTeacher`, `isStudent`, `isAdminOrTeacher` |
| Ownership checks (beyond role) | ✅ | `attendance.controller.js` rejects a teacher touching another teacher's record even though the route only requires `isAdminOrTeacher` |

**Frontend:** `client/src/pages/auth/{LoginPage,RegisterPage,ForgotPasswordPage,ResetPasswordPage}.jsx`, `client/src/store/authStore.js` (Zustand), `client/src/utils/api.js` (axios instance, auto-refresh-on-401).

---

## 4. Public Website

12 marketing pages (`client/src/pages/marketing/`):

| Page/Feature | Status | Evidence |
|---|---|---|
| Homepage hero + pricing preview | ✅ | `HomePage.jsx` → `usePackages()` → `GET /packages` |
| Homepage **Testimonials carousel** | ⚪ Static-Demo | `TestimonialsSection.jsx` — fully hardcoded arrays + static screenshot images, never calls the API |
| Homepage **Teachers carousel** | ⚪ Static-Demo | `TeachersSection.jsx` — 11 hardcoded fictional teachers, disconnected from the real `/teachers/public` API |
| Homepage **Success Stories** | ✅ | `SuccessStoriesSection.jsx` → `GET /success-stories` (real, admin-managed) |
| About page | 🟣 Frontend-only | `AboutPage.jsx` — stats/values are hardcoded constants; only contact info is real (`GET /website/settings`) |
| Programs/tracks page | ⚪ Static-Demo | `ProgramsPage.jsx` — fully hardcoded array, zero API calls |
| Courses listing (search/filter/paginate/featured) | ✅ | `CoursesPage.jsx` → `GET /courses`, `/courses/featured` |
| Course detail + YouTube embed | ✅ | `CourseDetailPage.jsx` → `GET /courses/:slug`, real iframe via `utils/youtube.js` |
| Teachers listing (search/filter/paginate) | ✅ | `TeachersPage.jsx` → `GET /teachers/public` |
| Teacher profile page | ✅ | `TeacherProfilePage.jsx` → `GET /teachers/public/:id` |
| Pricing/packages page | ✅ | `PricingPage.jsx` → `usePackages({activeOnly:true})` |
| FAQ page | ⚪ Static-Demo | `FAQPage.jsx` hardcodes 8 Q&As — despite a real, working FAQ backend already correctly consumed elsewhere (`ContactPage.jsx`) |
| Contact form | ✅ | `ContactPage.jsx` → `POST /website/contact` → `ContactMessage` model, notifies all admins |
| Newsletter signup | ✅ | `Footer.jsx` → `POST /website/newsletter` → `NewsletterSubscriber` (toggle-gated by `AcademySettings.newsletterEnabled`) |
| Articles/blog listing + search + featured | ✅ | `ArticlesPage.jsx` → `GET /articles/search`, `/articles`, `/articles/featured` |
| Article detail + like/bookmark | ✅ | `ArticleDetailPage.jsx` → `GET /articles/:slug`, `POST /articles/:slug/{like,bookmark}` |
| WhatsApp floating button | ✅ (static link, contextual text) | Single company number from settings; message text built dynamically from page context (course/teacher name) |
| Social links (FB/IG/Twitter/YouTube) | ✅ | Dynamic from `AcademySettings`, not hardcoded |
| Language switch (AR/EN) | ❌ Not Implemented | No i18n library anywhere; `<html lang="ar" dir="rtl">` hardcoded; contradicts CLAUDE.md's stated "Arabic + English Support" principle |
| RTL support | ✅ | Consistently applied per-page |
| SEO metadata | 🟡 Partial | Only one static `<meta>`/OG block in `client/index.html`; no per-route dynamic title/meta (no react-helmet), no sitemap.xml/robots.txt found |

**Orphaned backend:** `Testimonial` model + full CRUD API (`website.routes.js`) has **zero frontend consumer**, public or admin.

---

## 5. Student System

11 pages under `client/src/pages/student/`. Full chain-trace:

| Feature | Status | Evidence |
|---|---|---|
| Dashboard stats (attendance rate, sessions, etc.) | ✅ real, DB-computed | `GET /students/me/stats` → `student.controller.getMyStats` |
| Profile edit | ✅ | `PATCH /users/me` (allow-list: names, phone, bio, specialization) |
| Password change | ✅ | `PATCH /auth/change-password` |
| Course browsing (marketing catalog) | ✅ | Same public `GET /courses` as marketing site |
| Enrollment request submission | ✅ | `StudentEnrollmentPage.jsx` → `POST /enrollments` |
| Payment-proof upload | ✅ | `POST /enrollments/:id/payment-proof` → GridFS, private |
| Enrollment status tracking | ✅ | `GET /enrollments/me` |
| Class schedule (upcoming) | ✅ | `GET /sessions/upcoming` |
| Session list (upcoming/past tabs) | ✅ | `GET /sessions/:tab` |
| Session cancellation (self) | ✅ | `PATCH /sessions/:id/cancel` (controller allows student-owner) |
| Meeting/session links | ✅ | Carried on `Session`/teacher `meetingLinks` |
| Attendance history (student-facing) | 🟡 Partial | Only an aggregate % on dashboard; **no per-session attendance list/endpoint exists for students** |
| Memorization progress view | ✅ | `GET /memorization/student/me` |
| Revision progress view | ✅ | `GET /revision/student/me` |
| Evaluations view | ✅ | `GET /evaluations/student/me` |
| Homework view + submit (text + up to 3 files) | ✅ | `GET /homework`, `POST /homework/:id/submit` |
| Lesson wallet / balance | ✅ | `GET /wallet/me` → real ledgered `LessonWallet`/`LessonTransaction` |
| Subscription/package status | ✅ | `GET /subscriptions/me` |
| Payment history | 🟡 Partial | No itemized `Payment` model; closest is wallet's embedded transaction list + enrollment payment-proof record |
| Notifications | ✅ | `StudentNotificationsPage.jsx` + shared `NotificationCenter`, real-time via Socket.io |
| Messages/chat with teacher/admin | ❌ Not Implemented | No `Conversation`/`Message` model anywhere; only AI chat + notifications exist |
| Certificates | ❌ Not Implemented | Only a boolean flag on `Course` (`certificateAvailable`), no generation/issuance |
| Exams/quizzes | ❌ Not Implemented | Zero matches repo-wide beyond substring "example" |
| Settings (profile/password) | ✅ | `StudentSettingsPage.jsx` |

---

## 6. Teacher System

11 pages under `client/src/pages/teacher/`:

| Feature | Status | Evidence |
|---|---|---|
| Profile (bio, specialization, gender self-service) | 🟡 Partial | `PATCH /users/me`; **no structured Ijazah/Sanad/qualification fields** exist on `User` — only free-text bio |
| Dashboard stats + today's sessions | ✅ | `GET /teachers/me/stats`, `GET /schedule-rules/my` |
| Assigned students list | ✅ | `GET /teachers/me/students` |
| Session scheduling (create/preview/reschedule/delay/cancel, month view, history) | ✅ | `POST /schedule-rules/preview`, `POST /schedule-rules`, `GET /sessions/teacher-month`, `GET /sessions/history`, `PATCH /sessions/:id/{reschedule,delay,cancel,start}` |
| Recurring availability (ScheduleRule) | ✅ | `ScheduleRule` model — daily/weekly/biweekly/monthly/custom, days-of-week, skip-dates |
| Attendance marking | ✅ | `GET /attendance/teacher`, `PATCH /attendance/:id`, session-level `POST /attendance/session/:id` |
| Memorization entry form | ✅ | `POST /memorization` (surah/ayah-range + quality + notes) |
| Revision entry form | ✅ | `POST /revision` (same shape) |
| Evaluation creation (tajweed/hifz/nazra/behavior/general, score 1-10) | ✅ | `POST /evaluations` |
| Homework assignment (multi-student, due date) | ✅ | `POST /homework` |
| Homework grading (0-10 + feedback) | ✅ | `PATCH /homework/:id/grade` |
| Teacher payroll/earnings view | 🟡 Partial | `GET /teacher-performance/me/payroll-readiness` returns a **readiness status only** — no itemized "my payroll history" endpoint exists (`TeacherPayrollEntry` ledger is admin-only) |
| Teacher performance metrics (attendance trend, punctuality, completion) | ✅ | `GET /teacher-performance/me/{summary,trend,attendance}` |
| Meeting-link management (Zoom/Meet/Teams/custom) | ✅ | `GET/POST/DELETE /teachers/me/links` |
| Notifications | ✅ | Real-time, shared `NotificationCenter` |
| Class notes | 🟣 Bundled, not standalone | Free-text fields exist inside evaluation (`notesAr`)/homework, no dedicated "class notes" feature |
| Messages/chat with student/admin | ❌ Not Implemented | Same as student — no messaging model exists |
| Settings (profile/password/gender) | ✅ | `TeacherSettingsPage.jsx` |

---

## 7. Parent System

**Confirmed absent — no implementation of any kind.** No model field, route, page, or middleware. Documented as an intentional scope exclusion in `docs/KNOWN_LIMITATIONS.md`. See §2.

---

## 8. Admin Dashboard — Complete Audit

22 pages under `client/src/pages/admin/`. Sidebar defined in `client/src/layouts/AdminLayout.jsx` (`NAV_GROUPS`).

### 8.1 Admin Menu Inventory (exact sidebar order)

| Group | Menu item | Route | Status |
|---|---|---|---|
| المنصة (Platform) | لوحة التحكم (Dashboard) | `/admin` | ✅ working, real aggregation |
| المنصة | مركز العمليات (Operations Center) | `/admin/operations` | ✅ working, live |
| المنصة | طلبات التسجيل (Enrollment Requests) | `/admin/enrollments` | ✅ working |
| إدارة المستخدمين (Users) | الطلاب (Students) | `/admin/students` | ✅ working |
| إدارة المستخدمين | المعلمون (Teachers) | `/admin/teachers` | ✅ working |
| الأكاديمية (Academy) | الباقات والأسعار (Packages) | `/admin/packages` | ✅ working |
| الأكاديمية | المقررات والمستويات (Courses) | `/admin/courses` | ✅ working |
| الأكاديمية | الحصص (Sessions) | `/admin/sessions` | ✅ working |
| الأكاديمية | جداول الحصص (Schedule Rules) | `/admin/schedule-rules` | ✅ working |
| الأكاديمية | الاشتراكات (Subscriptions) | `/admin/subscriptions` | ✅ working |
| المحتوى (Content) | المقالات والمدونة (Articles) | `/admin/articles` (+editor) | ✅ working |
| المحتوى | رسائل التواصل (Contact Messages) | `/admin/contact-messages` | ✅ working |
| المحتوى | إدارة الموقع (Website) | `/admin/website` | 🟡 partial (see gap below) |
| المحتوى | قصص النجاح (Success Stories) | `/admin/success-stories` | ✅ working |
| التقارير والنظام (Reports/System) | التقارير والإحصائيات (Reports) | `/admin/reports` | 🟡 partial — KPIs real, trend charts synthetic |
| التقارير والنظام | أداء المعلمين (Teacher Performance) | `/admin/teacher-performance` | ✅ working |
| التقارير والنظام | الإشعارات (Notifications) | `/admin/notifications` | ✅ working |
| التقارير والنظام | سجل الأنشطة (Audit Logs) | `/admin/audit-logs` | ✅ working |
| التقارير والنظام | الإعدادات (Settings) | `/admin/settings` | 🟡 partial (some allow-listed fields have no form) |

Not in sidebar but reachable via drill-in: `AdminStudentDetailPage`, `AdminCourseFormPage`, `AdminArticleEditorPage`.

**Dead route constants** (defined in `client/src/config/constants.js` but never wired to a `<Route>` in `App.jsx`, no page imports them): `ADMIN_ADMINS` (`/admin/admins`), `ADMIN_LEVELS` (`/admin/levels`) — there is no UI to manage other admin accounts or a separate "levels" entity anywhere.

### 8.2 Granular Action Inventory by Domain

**Students** (`AdminStudentsPage.jsx`, `AdminStudentDetailPage.jsx`): List · Search · Filter (active/inactive) · Paginate · View CRM profile · Edit (name/email/phone/bio) · Deactivate (soft) · Reactivate · Admin password reset · Academic drill-down (evaluations/attendance/homework/memorization/revision) · Edit Evaluation · Delete Evaluation · Edit Attendance record. 🔵 `updateHomework` (`PATCH /admin/homework/:id`) exists on the backend with no frontend caller (homework tab is read-only).

**Teachers** (`AdminTeachersPage.jsx`): Create (with mandatory gender/identity classification) · List/Search/Paginate (with studentCount/sessionCount aggregation) · View CRM profile · Edit (contact/specialization/salary-per-session/gender) · Activate/Deactivate · Admin password reset · Performance tab (attendance trend chart, punctuality/completion rate, salary summary, inline attendance correction, PDF export).

**Courses** (`AdminCoursesPage.jsx`, `AdminCourseFormPage.jsx`): Create · Full edit (curriculum builder/SEO/tags/outcomes) · Publish/Unpublish toggle · Feature/Unfeature toggle · Duplicate (deep clone, resets to draft) · Delete · Bulk actions (publish/unpublish/feature/archive/delete on multi-select) · Thumbnail upload · Cover upload · Search/Filter(status/category/difficulty)/Sort/Table-Grid toggle/Paginate · Stats cards. Categories are hardcoded frontend enums (not a manageable DB entity, unlike Article categories).

**Packages** (`AdminPackagesPage.jsx`): Create · Edit · Activate/Deactivate toggle · Duplicate (client-composed). No hard-delete route exists by design.

**Subscriptions/Wallet** (`AdminSubscriptionsPage.jsx`): Create subscription · Edit status/end-date/notes · Wallet balance/transaction view · Manual balance Adjust (audited ledger entry, never a raw overwrite) · Freeze · Resume · Grant Compensation lessons · Search · Filter by status · Paginate.

**Enrollment Requests / Payments** (`AdminEnrollmentsPage.jsx`): View payment proof (private image via `PrivateImage` component) · Approve (assigns teacher + level/group + start date, creates Subscription, credits wallet) · Reject (reason required) · Status filter tabs · Paginate · Pending-count sidebar badge.

**Sessions** (`AdminSessionsPage.jsx`): Create session (any teacher/student pair) · Edit · Cancel (reason required) · Reschedule · Attendance/payroll correction modal · Filter (status/teacher/date-range/payroll-status) · Paginate.

**Schedule Rules** (`AdminScheduleRulesPage.jsx`): Full edit (reassign teacher/student, recurrence, days, time, duration, link, end date; syncs not-yet-happened generated sessions) · Pause/Activate toggle · Generate additional sessions · Delete (future-only, preserves history) · Filter (status/teacher) · Paginate.

**Operations Center** (`AdminOperationsCenterPage.jsx`) — genuinely live, not mock: **Live tab** (today's buckets: live-now, starting-soon, missing-check-in, missing-link, late-teachers, attendance-pending, no-show, cancelled; computed health metrics incl. socket-presence online counts) · **Timeline tab** (filterable, annotated with window/review/confidence state) · **Review Queue tab** (severity-ranked flagged sessions; Start Review / Resolve / Dismiss / Reopen; inline attendance/payroll correction).

**Notifications** (`AdminNotificationsPage.jsx`): Broadcast to all/by-role with priority · Individual notification with live user search · Notification log/center view. (Note: broadcast+logs are mounted twice under different prefixes — redundant, not broken.)

**Articles/Blog** (`AdminArticlesPage.jsx`, `AdminArticleEditorPage.jsx`): Create/Edit (rich HTML editor, SEO panel, tags, cover upload, auto-save draft every 60s) · Publish/Unpublish · Feature · Pin · Duplicate · Soft-Delete · Restore · Category CRUD (real DB-backed, unlike course categories) · Filter by status/search/"Deleted" view/Paginate.

**Success Stories** (`AdminSuccessStoriesPage.jsx`): Toggle section active · Switch display mode (3-cards vs banner) · Edit each card's text/badge/CTA · Upload/remove per-card image · Upload/remove banner image (singleton doc, live preview panel).

**Contact Messages** (`AdminContactPage.jsx`): Status tabs (new/read/replied/archived) · Search · Stats cards · Mark read/replied/archived · Delete · Quick-reply via mailto/WhatsApp deep link.

**Website Settings** (`AdminWebsitePage.jsx` + `AdminSettingsPage.jsx` "Academy" tab): editable — academy name (AR/EN), tagline, logo upload, mission/vision/about, contact (phone/whatsapp/email/address), social links (FB/IG/Twitter/YouTube), working hours, support text, emergency contact, Google Maps embed, footer description/copyright, privacy/terms/cookies URLs, newsletter enable+text, Zoom client ID, Google Meet toggle, SMTP host/port/user. 🔵 **Gap:** `maintenanceMode`, `maintenanceMessage`, and `linkedin` are backend-allow-listed on `AcademySettings` but **no form field anywhere sets them** — maintenance mode cannot be toggled from any UI.

**Testimonials & FAQs:** 🔵 Backend-only — `website.controller.js` has full `getTestimonials/createTestimonial/deleteTestimonial` and `getFAQs/createFAQ/deleteFAQ`, wired in routes, but **no admin page manages either** anywhere in the 22 admin pages.

**Newsletter Subscribers:** 🔵 Orphaned — subscription capture works (`NewsletterSubscriber` model + public endpoint) but **there is no admin GET route at all** (not just missing UI) to list/export the captured emails.

**Audit Logs** (`AdminAuditLogsPage.jsx`): Real stats (total/today/unique actors/last-7-days) · Filterable table (entity/action) with human-readable Arabic change summaries · Paginate.

**Reports** (`AdminReportsPage.jsx`): KPI totals (revenue, sessions, students, attendance breakdown, teacher payroll, top-5 teachers) are **real aggregation**. 🟣 **The three "monthly trend" charts and KPI sparklines are synthetic** — `monthlyData()` splits one current total across 6 months using a hardcoded weight curve (`[0.82, 0.91, 0.87, 1.04, 1.13, 1.23]`); sparklines are fully static arrays unrelated to any backend data. **This is presented as if real historical data and should be flagged to stakeholders as misleading.**

**Teacher Performance/Payroll** (`AdminTeacherPerformancePage.jsx`): Org-wide sortable/searchable table · Payroll readiness breakdown · Export CSV + PDF salary report · Persisted Payroll Ledger browser (reads `TeacherPayrollEntry`, not a live recount).

**Dashboard Home** (`AdminDashboardPage.jsx`): all numbers from `GET /admin/stats` — genuine parallelized MongoDB aggregation (totals, active subscriptions, pending enrollments, today's session counts, ungraded-homework backlog, package-expiry-soon students, monthly completed/cancelled/payable/late counts, revenue). **Nothing here is hardcoded** — contrast with the Reports page trend charts above.

**AI Assistant** — not part of admin nav; a student/public-facing feature (see §14).

### 8.3 Flagged Items Summary
- 🟣 UI-only stub buttons: **none found** — every admin action button traces to real backend logic.
- 🔵 Backend-only, no frontend: `updateHomework`, Testimonials CRUD, FAQs CRUD.
- 🔵 Orphaned data: Newsletter subscribers have no admin visibility whatsoever.
- 🔵 Settings with no UI: `maintenanceMode`, `maintenanceMessage`, `linkedin`.
- 🟣 Synthetic/misleading: Reports page trend charts + sparklines.
- ❌ No "Manage Admins" UI despite `ADMIN_ADMINS` route constant existing.

---

## 9. Course & Program System

**Model — `Course.js`** (single flat document, no separate Lesson/Program/Category models): bilingual name/description/short-description, `slug` (unique/sparse), `thumbnailImage`/`coverImage` (GridFS ids), `introVideoUrl` (YouTube-only), `category` (enum: tajweed/hifz/nazra/arabic/quran/other — **not a manageable taxonomy, just an enum**), `subCategory`, `tags[]`, `language`, `instructor` (ref User), `difficulty`/`level`, `ageGroup`, `estimatedDuration`, `lessonsCount`, `durationWeeks`, learning outcomes/requirements/target-audience (bilingual arrays), `curriculum` (embedded sections, each with plain-string `lessons[]` — **no per-lesson content/video/completion tracking**), `order`, `featured`, `status` (draft/published/archived), `isActive`, `enrollmentEnabled`, `certificateAvailable`, `enrollmentCount`/`studentsCount` (🟡 dead counters — never incremented anywhere), `rating`/`reviewCount` (⚪ seed-only fake numbers, no submission path), embedded SEO subdocument.

**API:** Public `GET /courses`, `/courses/featured`, `/courses/:slug`. Admin: `GET /courses/admin/{stats,all,:id}`, `POST /courses/admin/:id/{thumbnail,cover,publish,feature,duplicate}`, `PUT /courses/admin/:id`, `DELETE /courses/admin/:id`, `POST /courses/bulk`, `POST /courses`. **Status: ✅ Fully Implemented as a marketing catalog**, but 🟡 **no real link to student learning** — no "My Courses"/lesson-consumption page exists; the actual student↔teacher relationship runs through `Package`/`Subscription`, not `Course`.

**Programs/Categories as a distinct taxonomy:** ❌ Not Implemented — `category` is a plain enum field, not a manageable model (unlike `ArticleCategory`, which is real and CRUD-able).

**Enrollment workflow (real, but Package-based, not Course-based):** `EnrollmentRequest.js` references `packageId`, not `courseId`. Student applies → uploads payment proof → admin reviews (`PATCH /enrollments/:id/review`) → approves (assigns teacher+level+group, creates `Subscription`, credits `LessonWallet`) or rejects. **Status: ✅ Fully Implemented** end-to-end.

---

## 10. Programs & Categories

See §9 — `Course.category` is an enum, not a real taxonomy model. The one real, DB-backed taxonomy in the platform is `ArticleCategory` (bilingual name/slug/color/icon/order, full CRUD via `article.routes.js`).

---

## 11. Lesson System

**❌ No real per-lesson entity exists.** `Course.curriculum[].lessons` is an array of plain display strings — no video/audio/PDF attachment, no order-based unlocking, no completion tracking, no student progress-per-lesson, no notes/bookmarks/comments/quizzes at the lesson level. The "lesson" concept that **is** functionally tracked in the platform is the 1:1 live **Session** (§12), which is a scheduled class, not a piece of course content.

---

## 12. Live Class / Session System

**`Session.js`** — the most mature model in the codebase. Core fields: student/teacher refs, `subscriptionId`, optional `courseId` link, `seriesId` (→ `ScheduleRule`), title, `scheduledAt`, duration, `status` (scheduled/ongoing/completed/cancelled/rescheduled/missed/no_show), `meetingLink`/`meetingProvider` (zoom/meet/teams/other/custom — free-text link, **no real SDK integration**), notes/teacherNotes. Cancellation fields, `isException/isMakeup/rescheduledFrom`. Teacher attendance: `teacherStartedAt`, `teacherAttendanceStatus` (pending/on_time/late/absent/excused), who-marked-it, late-minutes. Timing accuracy: `actualStartAt/actualEndAt`, `delayMinutes`, `delayReasonCode` (7-value enum), `delayNote`. `outcome` (9-value enum). Evidence-only click tracking (`teacherLinkOpenedAt/studentLinkOpenedAt` — explicitly documented as not proof of attendance). Wallet-consumption linkage (`subscriptionConsumed*`, `lessonConsumedTransactionId`). `payrollStatus` (pending/payable/non_payable/pending_review/excluded) + reason/setBy/setAt. Admin review queue (`reviewState`: open/in_review/resolved/dismissed). Teacher acceptance workflow. Compensation-grant linkage. Unique partial index prevents duplicate occurrences per `ScheduleRule`+timestamp.

**API:** `GET /sessions/{upcoming,history,teacher-month,:id}`, `POST /sessions`, `PATCH /sessions/:id/{start,complete,finish,cancel,reschedule,delay,accept,decline}`, `POST /sessions/:id/link-opened`. `cancel` deliberately has no route-level role gate — the controller authorizes teacher-owner/admin/student-owner individually (documented design choice).

**`ScheduleRule.js`** (recurring weekly/biweekly/monthly/daily/custom teacher↔student pairing): `daysOfWeek[]`, `timeOfDay`, duration, start/end date, `sessionsTotal`, `skipDates[]`, `timezone` (default `Asia/Riyadh`). API: `POST /schedule-rules/preview` (dry-run), `POST /schedule-rules` (create+generate), `GET /schedule-rules/my`, `PATCH/DELETE /schedule-rules/:id`, `POST /:id/generate-more`. **Status: ✅ Fully Implemented** — genuine recurring, teacher/admin-driven scheduling, not student self-booking.

**`Attendance.js`**: one record per session (unique index on `sessionId`), status (present/absent/late/excused/left_early/technical_issue), `isFinalized`. API: `GET /attendance/teacher`, `GET/POST /attendance/session/:sessionId`, `PATCH /attendance/:id`.

**Calendar UI:** 🟡 Partial — no calendar-grid library (`react-big-calendar`/`FullCalendar` absent); all schedule/session pages render a grouped **list view** (by day), not an interactive drag/drop calendar grid.

**Booking service:** `booking.service.js` provides `assertNoConflict()` (overlap-detection, throws 409 on double-booking), invoked from session creation — this is a 🔵 **backend conflict-guard**, not a self-service "student picks teacher/time" booking flow (no `booking.routes.js`/controller, no frontend slot-picker UI exists).

---

## 13. Booking System

See §12 — booking, in the "student picks a teacher and time slot" sense, **does not exist as a self-service feature**. What exists is (a) admin/teacher-driven scheduling via `ScheduleRule`/`Session`, and (b) a backend double-booking guard (`booking.service.js`). **Status: 🔵 Backend-only conflict prevention, not a full booking system.**

---

## 14. Quran-Specific Systems

| Concept | Status | Evidence |
|---|---|---|
| Memorization tracking (surah/ayah-range, quality grade, teacher notes) | ✅ Fully Implemented | `Memorization.js`, `POST /memorization`, `GET /memorization/{student/me,teacher}` — no page/juz field |
| Revision tracking (identical shape) | ✅ Fully Implemented | `Revision.js`, `revision.routes.js` (reuses `memorization.controller.js` handlers) |
| Evaluation (tajweed/hifz/nazra/behavior/general, 1-10 score, strengths/improvements) | ✅ Fully Implemented, 🟡 Partial on tajweed granularity | `Evaluation.js` — tajweed is only a coarse `type` category tag, no per-rule (Noon Sakinah, Madd, etc.) mastery tracking |
| Tajweed granular rule tracking | ❌ Not Implemented | Only exists as static Arabic Q&A text in the AI knowledge base + the evaluation category tag |
| Ijazah / Sanad program tracking | ❌ Not Implemented | Appears only as prose marketing copy (seed data, About page, hardcoded teacher carousel) — **no structured field** on `User` for a sanad chain, reciter, or certification date |
| Recitation audio submission/grading | ❌ Not Implemented (⚪ static demo exists) | Homepage `RecitationWidget.jsx` is a static demo player (commented out, not rendered); homework attachments generically allow audio mimetypes, but there is no purpose-built "submit recitation for teacher grading" workflow |
| AI Feedback (thumbs up/down on chatbot answers) | ✅ Implemented as designed | `AIFeedback.js` — chat-quality feedback, not academic recitation feedback |
| AI Assistant (real LLM) | ✅ Fully Implemented | `ai.service.js` — genuine OpenAI (`gpt-5.4-mini`), two personas: authenticated "tutor" (tajweed/memorization Q&A) + public "concierge" (tool-calling: `get_course_details`, `get_teacher_details`, `get_packages`, `search_courses`, `search_teachers`, `search_ai_knowledge`, `get_platform_contact` — all grounded in real DB reads, prompt-injection-resistant instructions, human-handoff marker). **Deterministic rule-based fallback** (hardcoded Arabic tajweed Q&A) runs automatically when `OPENAI_API_KEY` is unset or the call fails — never a hard failure or fake success |

**Frontend evidence:** `TeacherProgressPage.jsx` (tabbed memorization/revision entry forms), `StudentProgressPage.jsx` (display), `TeacherEvaluationsPage.jsx`/`StudentEvaluationsPage.jsx`, `AIAssistantPage.jsx`.

---

## 15. Exam System

**❌ Not Implemented.** Repo-wide search for "exam"/"quiz" returns zero real matches (only the substring "example" in placeholder text). No `Exam`/`Question`/`Quiz` model, route, or page exists anywhere. Confirmed explicitly out-of-scope in `docs/KNOWN_LIMITATIONS.md`.

---

## 16. Homework & Assignments

**`Homework.js`**: teacher-owned, `titleAr`, `descriptionAr`, `dueDate`, `assignedTo[]` (multi-student), optional `courseId` link, `status` (active/closed), `maxGrade` (default 10), embedded `submissions[]` (content text + up to 3 file attachments — image/PDF/audio/video mimetypes allowed — `submittedAt`, `grade` 0-10, `teacherFeedback`, `gradedAt`, `status`: submitted/graded/returned). No explicit `isLate` boolean — lateness is computed by comparing `dueDate` to `submittedAt` client-side.

**API:** `GET /homework` (student, own), `GET /homework/teacher` (own-created), `POST /homework` (create, Joi-validated), `PATCH /homework/:id/grade`, `POST /homework/:id/submit` (multer, up to 3 files). **Status: ✅ Fully Implemented end-to-end**, clean create(teacher)/submit(student)/grade(teacher) separation, backend-enforced.

**Frontend:** `TeacherHomeworkPage.jsx` (create/list/grade), `StudentHomeworkPage.jsx` (list/submit).

---

## 17. Progress Tracking

| Tracked progress | Status | Mechanism |
|---|---|---|
| Attendance rate (student dashboard) | ✅ | Real aggregate `%` from `Attendance` records |
| Course/lesson completion % | ❌ Not Implemented | No lesson entity exists to complete (§11) |
| Memorization progress (surah/ayah log) | ✅ | `Memorization` records over time, no auto-computed "% of Quran memorized" rollup found |
| Revision progress | ✅ | `Revision` records over time |
| Evaluation history/trend | ✅ | `Evaluation` records, `isSharedWithStudent` flag |
| Teacher performance trend (attendance/punctuality/completion) | ✅ | `teacherPerformance.controller.js` — real aggregation over `Session`/`Attendance`/`TeacherPayrollEntry` |
| Learning streak / achievements / badges | ❌ Not Implemented | Confirmed absent in `docs/KNOWN_LIMITATIONS.md` and by grep |
| Payroll readiness state machine | ✅ | `payrollStatus` on `Session`, computed by `sessionIntelligence.service.js` |

---

## 18. Payment System

**No payment gateway integration exists.** Grep for Stripe/PayPal/Paymob/Moyasar/Tap/HyperPay/MyFatoorah/Fawry/Mada/STC-Pay across the entire repo returns zero real hits. **No coupon/discount/promo system.** **No trial concept.**

**Actual flow — manual, proof-of-payment + admin approval (✅ Fully Implemented):**
1. Student picks a `Package`, submits an `EnrollmentRequest` (`POST /enrollments`).
2. Student uploads payment proof (`POST /enrollments/:id/payment-proof`) — GridFS, private, category `payment-proof`.
3. Admin reviews (`PATCH /enrollments/:id/review`) — approve (assigns teacher/level/group, creates `Subscription`, credits `LessonWallet` via an idempotent transaction) or reject (reason required).
4. Student + assigned teacher notified.

`Subscription.js`: status enum (pending/active/expired/cancelled/paused), start/end dates, `invoiceNumber`, renewal chain (new doc per renewal, preserves billing history), `sessionsRemaining` now a **read-only mirror** of the wallet (not the source of truth — see §19).

---

## 19. Subscriptions & Packages

**`Package.js`**: name, price, currency, `durationDays`, `sessionsPerMonth`, features array, `isActive`, `isPopular`, `sortOrder`. Public `GET /packages` (active only); admin `GET /packages/admin/all`, `POST/PATCH`. No hard-delete (deactivate only, by design).

**`Subscription.js` / `subscription.routes.js`**: admin-only create/update (allow-list explicitly excludes `sessionsRemaining` — that's wallet-derived now), `renewSubscription` (additive credit, not overwrite), student `GET /me`.

**Lesson Wallet system (the real entitlement engine — replaces the old `Subscription.sessionsRemaining` counter):**
- **`LessonWallet.js`** — one per student, materialized counters (`totalPurchased`, `totalUsed`, `bonusLessons`, `compensationLessons`, `frozenLessons`, `transferredIn/Out`, `remaining`, `status`: active/frozen).
- **`LessonTransaction.js`** — append-only ledger, 13 transaction types (purchase/consumption/reversal/refund/bonus/compensation/freeze/unfreeze/transfer_in/transfer_out/renewal/manual_adjustment/admin_edit/migration_import), unique `idempotencyKey` per operation (e.g. `session:<id>:consume`, `enrollment:<id>:purchase`) — **genuine double-entry-style ledger, not a naive counter.**
- **`TeacherPayrollEntry.js`** — one persisted row per resolved session (idempotent, unique sparse index on `sessionId`), captures a `rateSnapshot` so later salary changes don't retroactively rewrite history.
- **API** (`wallet.routes.js`): `GET /wallet/me`, `GET /wallet/:studentId[/transactions]`, admin `POST /wallet/:studentId/{adjust,freeze,resume,transfer,compensation}`.
- **Consumption trace:** `session.controller.js` → `lessonDeduction.service.js`'s `syncLessonConsumption()` on attendance-save/cancel — only present/late attendance consumes a lesson; absent/excused/cancelled never do (matches the documented business policy). Dedicated test suites exist for wallet, lesson-deduction, and session-intelligence services.

**Status: ✅ Fully Implemented, mature, audited, idempotent.** No coupons/trials/gateway.

---

## 20. Communication

| Channel | Status | Evidence |
|---|---|---|
| Real-time in-app notifications | ✅ | Socket.io push (`socket.service.js`), not polling |
| Student↔Teacher direct messaging | ❌ Not Implemented | No `Conversation`/`Message` model anywhere |
| Student↔Admin / Teacher↔Admin messaging | ❌ Not Implemented | Same — `ContactMessage` is one-way (visitor→admin), not a thread |
| Admin broadcast/announcements | ✅ | `POST /notifications/admin/broadcast` (all or by-role, with priority) |
| AI chat (concierge + tutor) | ✅ | See §14 |
| WhatsApp | 🟣 Frontend-only static links | `wa.me` deep links only, no Business API |

---

## 21. Notification System

**`Notification.js`**: `userId`, bilingual title/body, `type` (session/homework/evaluation/subscription/enrollment/payment/schedule/system/attendance), `priority`, `isRead/readAt`, `isArchived/archivedAt`, `relatedId`, `actionUrl`, `metadata`.

**API** (`notification.routes.js`): full CRUD — list (filterable), unread-count, mark one/all read, mark unread, archive/unarchive, bulk update/delete (scoped to `req.user._id`, no IDOR even with client-supplied id arrays), admin broadcast, admin logs (joined/searchable aggregation).

**Real-time delivery:** `socket.service.js` — JWT-authenticated Socket.io handshake, per-user rooms (`user:{id}`) + per-role rooms (`role:{role}`), in-memory presence tracking (documented single-instance limitation). `notification.service.js` emits `notification:new` immediately after every DB insert — genuine push.

**Triggers found** (grep-confirmed `createNotification(s)` call sites): enrollment submit/approve/reject, subscription create/renew, wallet adjustments, homework graded, evaluation created, schedule-rule changes, session events, teacher-performance events, contact-form submission (→ notifies all admins), admin broadcast, plus 3 cron jobs (session reminders every 30 min at 24h/1h/15min marks; subscription-expiry warnings + auto-expire daily 00:05 Asia/Riyadh; teacher-attendance no-show sweep every 10 min with graduated missed→no_show escalation, auto payroll-status + student compensation credit).

**Email:** real `nodemailer`/SMTP (`email.service.js`), 4 templates actually invoked (welcome, password-reset, password-changed, session-reminder). Graceful no-op (`[EMAIL-SKIP]` log) if SMTP is unconfigured — never throws.

**SMS:** ❌ Not Implemented. **WhatsApp:** 🟣 static links only, no API.

---

## 22. WhatsApp

Static `wa.me` deep links only (`WhatsAppFloatingButton.jsx` + several contact components) — no WhatsApp Business API, no automated messages, no OTP-via-WhatsApp. Message text is dynamically built from page context (course/teacher name), but the phone number is the single company number from `AcademySettings`, not per-teacher.

---

## 23. Email

Real Nodemailer/SMTP integration (`email.service.js`), env-configured (`SMTP_HOST/PORT/USER/PASS`, `EMAIL_FROM`), 4 real triggers (welcome, password-reset, password-changed, session-reminder — all fire-and-forget, non-blocking). Silently no-ops (not a mock, a graceful degrade) if SMTP env vars are unset/placeholder.

---

## 24. Reviews & Ratings

| Item | Status |
|---|---|
| Testimonial model + CRUD API | 🔵 Backend Only — real, unused by any frontend page |
| Homepage testimonials display | ⚪ Static-Demo — hardcoded array + static screenshot images |
| Success Stories | ✅ Fully Implemented — real, admin-managed singleton, live on homepage |
| Course numeric rating/reviewCount | ⚪ Static-Demo — fields exist on `Course`, populated only by the seeder's random numbers; no submission endpoint, no live computation |
| A distinct `Review` model | ❌ Not Implemented — doesn't exist |

---

## 25. Certificates

**❌ Not Implemented.** No `Certificate` model anywhere. No PDF-generation library on the server (`pdfkit`/`puppeteer` absent from `server/package.json` — `jspdf` exists only client-side for generic report exports, unrelated). No QR code library, no verification endpoint. The only trace is `Course.certificateAvailable` — a boolean marketing flag toggled by admin, displayed as a bullet on the course page, with **zero downstream effect**: nothing is ever generated, issued, stored, or verified.

---

## 26. Reporting

| Report | Downloadable? | Status |
|---|---|---|
| Admin Reports dashboard (revenue, sessions, students, attendance, payroll, top teachers) | Screen only | ✅ real KPI aggregation; 🟣 trend charts/sparklines are synthetic (§8.2) |
| Teacher salary report | CSV + PDF | ✅ real (`getAdminSalaryReport`, `jspdf`/`jspdf-autotable` client-side) |
| Payroll Ledger browser | Screen, paginated | ✅ real, reads `TeacherPayrollEntry` |
| Audit log report | Screen, filterable | ✅ real |
| Operations Center Live/Timeline/Review-Queue | Screen, real-time | ✅ real |

---

## 27. Analytics

Dashboard KPI cards across Admin Dashboard, Reports, Teacher Performance, and Operations Center are backed by genuine MongoDB aggregation (`Promise.all`-parallelized). **The one confirmed static/fake area:** the "monthly trend" charts and KPI sparklines on `AdminReportsPage.jsx` (§8.2) — worth explicit stakeholder disclosure since they visually resemble real historical data. No Google Analytics/Meta Pixel/GTM integration exists anywhere (external analytics, as opposed to in-app admin analytics).

---

## 28. Search / Filter / Sort / Pagination

Present and real (backend-enforced, not client-side slicing) across: Courses (public+admin), Teachers (public), Articles (public+admin, incl. full-text search index), Students/Teachers (admin), Sessions (admin), Schedule Rules (admin), Subscriptions (admin, incl. student-name search), Notifications (all roles), Audit Logs (admin), Contact Messages (admin), Enrollment Requests (status tabs). No infinite-scroll pattern found; standard page-number pagination throughout.

---

## 29. Media & File Management

**Storage: MongoDB GridFS** (`server/src/config/gridfs.js`, bucket `media`) — not local disk, not Cloudinary/S3. `multer.memoryStorage()` → buffer → `media.service.js:uploadBuffer()` streams into GridFS; nothing is ever written to disk in the live code path.

| Upload type | Controller | Model field | Limits |
|---|---|---|---|
| Avatar | `user.controller.js` | `User.avatar` | 5MB, images only |
| Payment proof | `enrollment.controller.js` | `EnrollmentRequest.paymentProofId` (private) | 5MB, images only |
| Homework attachment | `homework.controller.js` | `Homework.submissions[].attachments[]` | 20MB × up to 3 files, image/PDF/audio/video |
| Article cover | `article.controller.js` | `Article.coverImage` | 4-8MB, images |
| Course thumbnail/cover | `course.controller.js` | `Course.thumbnailImage`/`coverImage` | 4-8MB, images |
| Success story image | `successStory.controller.js` | `SuccessStory.cards[].image`/`banner.image` | 4-8MB, images |
| Academy logo | `website.controller.js` | `AcademySettings` logo | 4-8MB, images |

**Serving:** unified `GET /api/v1/media/:id` — ETag/If-None-Match 304 support, HTTP Range (206 partial content, for audio/video), long-lived cache for public files vs no-cache for private. **Access control:** `media.service.js:canAccess()` — admin sees all; otherwise only uploader or explicitly allow-listed users may view a `metadata.private` file (e.g. payment proofs).

**Validation:** multer mimetype allow-lists per type **plus magic-byte signature verification** (`isValidMagicBytes()`) — rejects a file whose real bytes don't match its declared Content-Type, defeating a spoofed-header upload.

**Deletion:** idempotent GridFS delete (`deleteFile()`), used on replace/delete flows.

**`getFileUrl()` consistency (per project convention):** used correctly and pervasively across 41+ files. One benign exception found: `TestimonialsSection.jsx` uses raw `src` paths — correct in that case because those are hardcoded public-folder assets, not GridFS ids (that component doesn't consume the real Testimonial API at all — see §24).

**Legacy artifact (not a live bug):** `server/uploads/` still holds pre-migration leftover files (e.g. 15 stale course-cover PNGs); nothing in current code reads from local disk for these categories — worth a cleanup pass, not a functional defect.

---

## 30. Database Model Inventory (26 models)

| Model | Purpose | Key relationships |
|---|---|---|
| `User` | All 3 roles; teachers carry `gender`, `specialization`, `salaryPerSession`, `meetingLinks[]` | referenced by nearly everything |
| `Package` | Purchasable subscription tiers | ← `Subscription`, `EnrollmentRequest` |
| `Subscription` | A student's paid enrollment period | → `User`(student), `Package`; renewal chain to itself |
| `EnrollmentRequest` | Pre-subscription pipeline (apply + proof → admin review → Subscription) | → `User`, `Package`, produces `Subscription` |
| `Course` | Public marketing/catalog course | → `User`(instructor); optionally linked from `Session`/`Homework` |
| `ScheduleRule` | Recurring teacher↔student pattern generating Sessions | → `User`×2, `Subscription`; → `Session[]` |
| `Session` | Central record — attendance, payroll, outcome tracking | → `User`×2, `ScheduleRule`, `Subscription`, `Course`(optional) |
| `Attendance` | Per-session attendance (unique per session) | → `Session`, `User`×2 |
| `Evaluation` | Teacher's scored assessment (tajweed/hifz/nazra/behavior/general) | → `User`×2, `Session`(optional) |
| `Homework` | Assignment + embedded submissions | → `User`(teacher), `assignedTo[]`, `Course`(optional) |
| `Memorization` | Surah/ayah-range progress log | → `User`×2, `Session`(optional) |
| `Revision` | Surah/ayah-range revision log | → `User`×2, `Session`(optional) |
| `LessonWallet` | Canonical lesson-entitlement balance (1 per student) | → `User`(student) |
| `LessonTransaction` | Append-only wallet ledger | → `LessonWallet`, `Session`/`Subscription`(optional) |
| `TeacherPayrollEntry` | Persisted payroll row per resolved session | → `Session`(unique), `User`(teacher) |
| `Notification` | In-app notification feed | → `User` |
| `AuditLog` | Append-only sensitive-action log | → `User`(actor) |
| `AIFeedback` | Thumbs up/down on chatbot answers | → `User`(optional, anonymous allowed) |
| `Article` | Blog/CMS post | → `ArticleCategory`, `User`(author, implied) |
| `ArticleCategory` | Real, CRUD-able taxonomy for Articles | ← `Article` |
| `Testimonial` | Rating + quote (orphaned, no frontend) | standalone |
| `FAQ` | Question/answer (orphaned admin UI) | standalone |
| `SuccessStory` | Singleton homepage config | standalone |
| `AcademySettings` | Singleton site-wide settings | standalone |
| `ContactMessage` | Public contact-form submissions | standalone |
| `NewsletterSubscriber` | Email capture (unique) | standalone, orphaned admin visibility |

**Not a real model despite being named in `docs/SYSTEM_OVERVIEW.md`:** `Enrollment` (course-progress tracking) — doesn't exist; only `EnrollmentRequest` (Package pipeline) + `Course.enrollmentCount` (dead counter) exist. This is a documentation inaccuracy, flagged in §55.

---

## 31. API Inventory (complete, grouped by domain)

All routes mounted under `/api/v1` via `server/src/routes/index.js`.

### Auth (`/auth`)
| Method | Endpoint | Auth | Roles | Purpose |
|---|---|---|---|---|
| POST | `/auth/register` | Public | — | Register (role forced to student) |
| POST | `/auth/login` | Public | — | Login |
| POST | `/auth/logout` | — | any | Logout, revoke refresh |
| POST | `/auth/refresh` | Cookie | any | Rotate access token |
| POST | `/auth/forgot-password` | Public | — | Request reset email |
| POST | `/auth/reset-password` | Public | — | Reset via token |
| PATCH | `/auth/change-password` | JWT | any | Change password |
| GET | `/auth/me` | JWT | any | Current user |
| POST | `/auth/dev-login` | Public (dev only) | — | Dev quick-login, 404 in prod |

### Users (`/users`)
| PATCH | `/users/me` | JWT | any | Update own profile |
| POST | `/users/me/avatar` | JWT | any | Upload avatar |

### Students (`/students`)
| GET | `/students/me/stats` | JWT | student | Dashboard stats |
| GET | `/students/me/academic` | JWT | student | Academic record |

### Teachers (`/teachers`)
| GET | `/teachers/public` | Public | — | Public teacher list |
| GET | `/teachers/public/:id` | Public | — | Public teacher profile |
| GET | `/teachers/me/stats` | JWT | teacher | Dashboard stats |
| GET | `/teachers/me/students` | JWT | teacher | Assigned students |
| GET | `/teachers/me/sessions` | JWT | teacher | Own sessions |
| GET/POST/DELETE | `/teachers/me/links[/:linkId]` | JWT | teacher | Meeting links CRUD |

### Sessions (`/sessions`)
| GET | `/sessions/upcoming`, `/history`, `/teacher-month`, `/:id` | JWT | any/teacher | Reads |
| POST | `/sessions` | JWT | admin/teacher | Create |
| PATCH | `/sessions/:id/start`, `/complete`, `/finish`, `/reschedule`, `/delay`, `/accept`, `/decline` | JWT | admin/teacher | Lifecycle |
| PATCH | `/sessions/:id/cancel` | JWT | owner-checked in controller | Cancel |
| POST | `/sessions/:id/link-opened` | JWT | any participant | Evidence click |

### Attendance (`/attendance`)
| GET | `/attendance/teacher`, `/session/:sessionId` | JWT | admin/teacher | Reads |
| POST | `/attendance/session/:sessionId` | JWT | admin/teacher | Save attendance |
| PATCH | `/attendance/:id` | JWT | admin/teacher | Update |

### Evaluations (`/evaluations`)
| GET | `/evaluations/student/me`, `/teacher` | JWT | student / admin+teacher | Reads |
| POST | `/evaluations` | JWT | admin/teacher | Create |
| PATCH/DELETE | `/evaluations/:id` | JWT | admin/teacher | Edit/delete |

### Homework (`/homework`)
| GET | `/homework`, `/homework/teacher` | JWT | student / admin+teacher | Reads |
| POST | `/homework` | JWT | admin/teacher | Assign |
| PATCH | `/homework/:id/grade` | JWT | admin/teacher | Grade |
| POST | `/homework/:id/submit` | JWT | student | Submit (files) |

### Memorization / Revision (`/memorization`, `/revision`)
| GET | `.../student/me`, `.../teacher` | JWT | student / admin+teacher | Reads |
| POST | `/memorization`, `/revision` | JWT | admin/teacher | Create record |

### Subscriptions (`/subscriptions`)
| GET | `/subscriptions/me` | JWT | student | Own subscription |
| GET/POST | `/subscriptions` | JWT | admin | List/create |
| PATCH | `/subscriptions/:id` | JWT | admin | Update |
| POST | `/subscriptions/:id/renew` | JWT | admin | Renew |

### Wallet (`/wallet`)
| GET | `/wallet/me` | JWT | student | Own wallet |
| GET | `/wallet/:studentId[/transactions]` | JWT | admin/teacher | View |
| POST | `/wallet/:studentId/adjust`, `/freeze`, `/resume`, `/transfer`, `/compensation` | JWT | admin | Ledger mutations |

### Notifications (`/notifications`)
| GET | `/notifications`, `/unread-count` | JWT | any | Reads |
| PATCH | `/notifications/mark-all-read`, `/:id/read`, `/:id/unread`, `/:id/archive`, `/:id/unarchive`, `/bulk` | JWT | any | Updates |
| DELETE | `/notifications/read`, `/:id`, `/bulk` | JWT | any | Deletes |
| POST | `/notifications/admin/broadcast` | JWT | admin | Broadcast |
| GET | `/notifications/admin/logs` | JWT | admin | Log view |

### Courses (`/courses`)
| GET | `/courses`, `/featured`, `/:slug` | Public | — | Catalog |
| GET | `/courses/admin/stats`, `/all`, `/:id` | JWT | admin | Admin reads |
| POST | `/courses`, `/admin/:id/thumbnail`, `/cover`, `/publish`, `/feature`, `/duplicate`, `/bulk` | JWT | admin | Admin writes |
| PUT/DELETE | `/courses/admin/:id` | JWT | admin | Update/delete |

### Packages (`/packages`)
| GET | `/packages` | Public | — | Active packages |
| GET | `/packages/admin/all` | JWT | admin | All packages |
| POST/PATCH | `/packages`, `/packages/:id` | JWT | admin | Create/update |

### Admin (`/admin`)
30 endpoints — dashboard stats, reports, students CRUD+academics, teachers CRUD, sessions admin-CRUD, evaluations/attendance/homework corrections, schedule-rules admin view/edit/delete/generate, notifications (broadcast/individual/logs), audit-log stats+list, payroll ledger. Full list in §8.2 above; all `authenticate + isAdmin`.

### Website (`/website`)
| GET | `/website/testimonials`, `/faqs`, `/settings` | Public | — | Reads |
| POST | `/website/contact`, `/newsletter` | Public | — | Submissions |
| PATCH | `/website/settings` | JWT | admin | Update settings |
| POST | `/website/settings/logo` | JWT | admin | Upload logo |
| POST/DELETE | `/website/testimonials[/:id]`, `/faqs[/:id]` | JWT | admin | CRUD (orphaned — no frontend) |
| GET/PATCH/DELETE | `/website/contact-messages[/:id]`, `/stats` | JWT | admin | Inbox management |

### AI (`/ai`)
| POST | `/ai/ask` | JWT | any | Tutor Q&A |
| GET | `/ai/status` | JWT | any | LLM availability |
| POST | `/ai/chat` | Optional (rate-limited) | public+auth | Concierge chat |
| POST | `/ai/feedback` | Optional | public+auth | Thumbs up/down |

### Enrollments (`/enrollments`)
| POST | `/enrollments` | JWT | student | Submit request |
| GET | `/enrollments/me` | JWT | student | Own requests |
| POST | `/enrollments/:id/payment-proof` | JWT | student | Upload proof |
| GET | `/enrollments`, `/pending-count`, `/:id` | JWT | admin | Admin reads |
| PATCH | `/enrollments/:id/review` | JWT | admin | Approve/reject |

### Schedule Rules (`/schedule-rules`)
| POST | `/schedule-rules/preview`, `/schedule-rules` | JWT | admin/teacher | Preview/create |
| GET | `/schedule-rules/my`, `/:id` | JWT | admin/teacher | Reads |
| PATCH/DELETE | `/schedule-rules/:id` | JWT | admin/teacher | Update/delete |
| POST | `/schedule-rules/:id/generate-more` | JWT | admin/teacher | Extend |

### Articles (`/articles`)
| GET | `/articles`, `/latest`, `/featured`, `/search`, `/categories`, `/:slug` | Public | — | Public reads |
| POST | `/articles/:slug/like`, `/bookmark` | JWT | any | Engagement |
| GET | `/articles/admin/all`, `/admin/:id` | JWT | admin | Admin reads |
| POST | `/articles`, `/upload-cover`, `/categories`, `/admin/:id/publish`, `/unpublish`, `/feature`, `/pin`, `/duplicate`, `/restore` | JWT | admin | Admin writes |
| PUT | `/articles/admin/:id/edit`, `/categories/:id` | JWT | admin | Updates |
| DELETE | `/articles/admin/:id` (soft), `/categories/:id` | JWT | admin | Deletes |

### Success Stories (`/success-stories`)
| GET | `/success-stories` | Public | — | Public config |
| GET/PUT | `/success-stories/admin` | JWT | admin | Manage |
| POST/DELETE | `/success-stories/admin/cards/:role/image`, `/banner/image` | JWT | admin | Image management |

### Teacher Performance (`/teacher-performance`)
| GET | `/me/{summary,attendance,trend,payroll-readiness}` | JWT | admin/teacher | Self view |
| GET | `/admin/all`, `/salary-report`, `/payroll-readiness`, `/:teacherId/{summary,attendance,trend}` | JWT | admin | Org-wide |
| PATCH | `/admin/session/:sessionId/attendance` | JWT | admin | Correction |

### Operations (`/operations`)
| GET | `/operations/live`, `/timeline`, `/review-queue` | JWT | admin | Live monitoring |
| PATCH | `/operations/review/:sessionId` | JWT | admin | Review action |

### Media (`/media`)
| GET | `/media/:id` | Public/gated | any (access-controlled inside) | Serve file (Range/ETag support) |

---

## 32. Frontend Route Inventory

### Public
| Route | Component | Purpose |
|---|---|---|
| `/` | `HomePage` | Homepage |
| `/about` | `AboutPage` | About |
| `/programs` | `ProgramsPage` | Programs (static) |
| `/teachers`, `/teachers/:id` | `TeachersPage`, `TeacherProfilePage` | Directory + profile |
| `/pricing` | `PricingPage` | Packages |
| `/faq` | `FAQPage` | FAQ (static) |
| `/contact` | `ContactPage` | Contact form |
| `/courses`, `/courses/:slug` | `CoursesPage`, `CourseDetailPage` | Catalog |
| `/articles`, `/articles/:slug` | `ArticlesPage`, `ArticleDetailPage` | Blog |

### Auth
`/login`, `/register`, `/forgot-password`, `/reset-password`

### Student (11)
`/student`, `/student/schedule`, `/student/sessions`, `/student/homework`, `/student/evaluations`, `/student/progress`, `/student/academic-record`, `/student/subscription`, `/student/enrollment`, `/student/notifications`, `/student/settings`

### Teacher (11)
`/teacher`, `/teacher/students`, `/teacher/sessions`, `/teacher/attendance`, `/teacher/evaluations`, `/teacher/homework`, `/teacher/progress`, `/teacher/meeting-links`, `/teacher/performance`, `/teacher/notifications`, `/teacher/settings`

### Admin (19 wired + 2 dead constants)
`/admin`, `/admin/students[/:id]`, `/admin/teachers`, `/admin/courses[/new,/:id/edit]`, `/admin/sessions`, `/admin/schedule-rules`, `/admin/packages`, `/admin/subscriptions`, `/admin/enrollments`, `/admin/website`, `/admin/reports`, `/admin/notifications`, `/admin/audit-logs`, `/admin/settings`, `/admin/articles[/new,/:id/edit]`, `/admin/contact-messages`, `/admin/success-stories`, `/admin/teacher-performance`, `/admin/operations`. **Dead (not wired to a `<Route>`):** `/admin/admins`, `/admin/levels`.

### AI
`/ai` — `AIAssistantPage` (no dedicated layout wrapper, top-level route)

### Fallback
`*` → `RootRedirect` (redirects to role dashboard if authenticated, else home)

---

## 33. Admin Menu Inventory

See §8.1 for the complete, exact-order sidebar table with per-item status.

---

## 34. Settings System

`AcademySettings` (singleton) — configurable via `AdminWebsitePage.jsx` + `AdminSettingsPage.jsx` "Academy" tab: academy name (AR/EN), tagline, logo, mission/vision/about, phone/whatsapp/email/address, social links (FB/IG/Twitter/YouTube — **LinkedIn field exists but has no form**), working hours, support text, emergency contact, Google Maps embed, footer description/copyright, privacy/terms/cookies URLs, newsletter toggle+text, Zoom client ID, Google Meet toggle, SMTP host/port/user. **No UI exists for:** `maintenanceMode`, `maintenanceMessage` (backend-allow-listed but unreachable from any admin page). **No global currency/pricing setting** — pricing is per-`Package` only, by design. Personal settings (profile/password) are self-service per role via each dashboard's Settings page.

---

## 35. Localization

**Arabic-only in practice.** `dir="rtl"` and `lang="ar"` are hardcoded (`client/index.html`, every page). **No i18n library** (`react-i18next`/similar) exists anywhere in `client/package.json` or `client/src`. This directly contradicts CLAUDE.md's stated "Arabic + English Support" architecture principle — the platform, as built, does not support English at all, not even for admin UI labels. RTL layout itself is well and consistently applied.

---

## 36. UI/UX System Features

Confirmed functional (not just styling): loading states (`LoadingPage`, Suspense fallbacks on every lazy route), toasts (`react-hot-toast`), modals/dialogs (confirm dialogs, image crop modal via `react-easy-crop`), tables with search/filter/sort/pagination (admin pages throughout), empty states, error boundaries (implied by consistent error-handling middleware pattern + toast-driven error surfacing), form validation (frontend + backend Joi), private/authenticated image loading (`PrivateImage` component for payment proofs), drag-free list-based scheduling UI, CSV/PDF export (`jspdf`/`jspdf-autotable`), avatar cropping. No dark/light theme toggle found (single theme).

---

## 37. Security Audit

| Mechanism | Status | Evidence |
|---|---|---|
| bcrypt password hashing | ✅ | cost 12, `User.js` |
| JWT access/refresh with rotation+revocation | ✅ | `tokenVersion` invalidation |
| httpOnly/secure/sameSite cookies | ✅ | `COOKIE_OPTS` |
| Helmet | ✅ | wired in `server.js`, CORP relaxed for media endpoint |
| CORS | ✅ | single allowed origin + credentials |
| Rate limiting | ✅ | `authLimiter` (auth routes) + role-aware general limiter (admin 3000/teacher 1000/student 1000/public 300 per 15min, env-configurable) |
| Mongo injection sanitization | ✅ | `express-mongo-sanitize` |
| Joi request validation | ✅ | selective, on structured-body routes |
| Multer mimetype + size validation | ✅ | per-upload-type configs |
| Magic-byte file signature verification | ✅ | `isValidMagicBytes()` — defeats spoofed Content-Type |
| CSRF middleware | ❌ Not present | Mitigated architecturally (bearer-token access, not auto-sent cookie) but not textbook-protected |
| xss-clean / output sanitization | ❌ Not present | Relies on React default escaping + input-side Joi |
| Role/ownership checks beyond route gate | ✅ | Confirmed in `attendance.controller.js`, `session.routes.js` |
| Password never exposed | ✅ | `User.toPublic()`, admin queries `.select('-password -refreshToken')` |
| Public teacher data allow-list | ✅ | `teacherPublic.js:toPublicTeacher()` |

---

## 38. Logging & Audit Trails

`AuditLog` model (actor/action/entity/changes/ip, indexed) + `audit.service.js` (fails soft, never breaks the calling request). Invoked from 10 controllers covering the sensitive mutation surfaces: sessions, teacher-performance corrections, wallet, subscriptions, enrollments, attendance, articles, admin actions, schedule-rules, operations. Viewable at `/admin/audit-logs`. **Gaps:** no login-history/last-login/IP tracking on the login event itself (only on mutation actions); `morgan` provides transport-level HTTP logging, not a queryable trail.

---

## 39. Background Automation

**Cron jobs** (all `node-cron`, registered post-DB-connect in `server.js`, disabled under `NODE_ENV==='test'`):
1. `sessionReminder.job.js` — every 30 min, 24h/1h/15min-ahead notifications + 24h email, de-duped in-memory.
2. `subscriptionExpiry.job.js` — daily 00:05 `Asia/Riyadh`, warns students within 3 days of expiry, auto-flips expired subscriptions to `expired`.
3. `teacherAttendanceSweep.job.js` — every 10 min, graduated no-show detection (missed → no_show), sets payroll status, records payroll-ledger entry, auto-grants student compensation credit, notifies admins.

**Migrations** (run automatically every boot, idempotent/additive): `backfillSubscriptionConsumed.js`, `backfillLessonWallets.js`.

**One-off scripts** (dry-run by default, `--apply` flag required): `dedupeSessions.js`, `migrateTeacherGender.js`, `reconcileWallets.js`, `migrateImagesToGridFS.js`, `seedRealContent.js`.

**Seeders:** `seed/seed.js` (796-line full dev dataset), `seed/devSeed.js`, `seeders/production/*` (additive-only, safe-on-live default accounts + baseline packages/courses/articles, matched by natural key, never overwrites).

---

## 40. Third-Party Integrations

| Integration | Status |
|---|---|
| OpenAI (`gpt-5.4-mini`) | ✅ Real, key-gated, deterministic fallback |
| YouTube | ✅ Embed/link parsing only (`utils/youtube.js`), no Data API |
| MongoDB GridFS | ✅ Real, primary storage |
| Socket.io | ✅ Real, notifications + presence |
| Nodemailer/SMTP | ✅ Real, 4 triggers |
| Zoom/Google Meet/Teams | 🟣 Label + free-text link field only — **no SDK/OAuth integration** |
| Google OAuth, Facebook/Apple login | ❌ Not Implemented |
| Firebase | ❌ Not Implemented |
| Cloudinary / AWS S3 | ❌ Not Implemented |
| Payment gateways (any) | ❌ Not Implemented |
| SMS provider | ❌ Not Implemented |
| WhatsApp Business API | ❌ Not Implemented (static links only) |
| Google Analytics / Meta Pixel / GTM | ❌ Not Implemented |

---

## 41. SEO & Marketing Features

One static `<meta>`/Open Graph/Twitter-card block in `client/index.html` (title, description, og:*, `robots: index,follow`). **No per-route dynamic meta** (no react-helmet or equivalent — confirmed absent from `client/package.json`). **No `sitemap.xml` or `robots.txt`** found under `client/public/`. No structured data (JSON-LD). No social-share buttons found on article/course pages beyond the static WhatsApp link.

---

## 42. Deployment & Infrastructure

PM2 (`server/ecosystem.config.js`, single-instance — required, since cron jobs run in-process and would duplicate across instances) + manual Nginx/Let's Encrypt runbook (`DEPLOYMENT_CHECKLIST.md`; prod domain `tartelah.com`, backend port `5007`, 3× `proxy_pass` config). **No Dockerfile/docker-compose anywhere.** **No CI/CD** (`.github/workflows` absent). `server/.env.example` documents every consumed env var; a full grep confirms no undocumented/dead env var reads.

---

## 43. Error Handling

Global handler (`errorHandler.middleware.js`) normalizes Mongoose `ValidationError` (400), duplicate-key `11000` (409, friendly Arabic per-field message), `CastError` (400). Always logs full error+stack server-side regardless of environment; only forwards raw message to client in dev — prod 500s get a generic Arabic message. 404 handler present. Consistent `sendSuccess`/`sendError` response shaping (`utils/response.js`) used across every controller.

---

## 44. Validation System

Layered: Mongoose schema-level (required/enum/minlength/etc. on every model) + Joi request-level (`middleware/schemas.js`, selective on structured-body routes: auth, sessions, homework, broadcast, AI chat/feedback) + manual in-controller checks + multer file-type/size/magic-byte validation. Frontend form-level validation exists per page (not exhaustively enumerated here — backend is the enforcement layer of record per CLAUDE.md's security standards, confirmed followed).

---

## 45. Delete / Archive Behavior

| Entity | Behavior |
|---|---|
| Student/Teacher | Soft — `isActive: false` toggle, never hard-deleted |
| Course | Hard delete available (admin `DELETE /courses/admin/:id`, also cleans up GridFS images) alongside soft states (`status: draft/archived`) |
| Article | Soft delete (`deletedAt`) + explicit Restore action |
| Package | No delete route at all — deactivate only (by design) |
| Notification | Hard delete available (`DELETE /notifications/:id`, bulk, "delete all read") |
| ScheduleRule | Delete only removes future un-happened sessions — history preserved |
| Session | Cancel (soft, status change) — no hard-delete route exposed to non-admins; `admin.routes.js` does expose `adminDeleteSession` |
| Testimonial/FAQ | Hard delete only (no soft-delete field) — moot since unused by frontend |
| LessonTransaction | Append-only, **never deleted or mutated** — corrections are new rows |

---

## 46. Hidden & Less Obvious Features

- **Magic-byte file-signature verification** on every upload (beyond mimetype header trust) — `media.service.js:isValidMagicBytes()`.
- **Idempotency keys** on every wallet ledger transaction, preventing double-consumption under retry/race conditions.
- **`rateSnapshot`** on `TeacherPayrollEntry` — freezes the salary-per-session rate at record time so later rate changes don't rewrite payroll history.
- **Graduated no-show detection** (3-stage escalation: grace period → soft `missed` → hard `no_show` + auto payroll-status + auto student compensation credit) — `teacherAttendanceSweep.job.js`.
- **Evidence-only link-click tracking** (`teacherLinkOpenedAt`/`studentLinkOpenedAt`) explicitly documented as *not* proof of actual attendance — a deliberate anti-overclaim design choice.
- **Session review/confidence scoring** (`sessionIntelligence.service.js` — `computeConfidence()`, `assessSessionReview()`) feeding the Operations Center's Review Queue severity ranking.
- **Role-aware rate limiting** — the general rate limiter runs `optionalAuth` first so bucket size can scale by role (admin gets a much higher ceiling than public traffic).
- **Anti-privilege-escalation register schema** — `registerSchema` structurally cannot accept a client-supplied `role` field.
- **Anti-gender-inference policy** — `migrateTeacherGender.js` and `teacherIdentity.js` explicitly document never inferring gender from a name; gender is only ever admin/teacher-set.
- **Dev-login route** compiles out entirely (404, not just permission-denied) in production.
- **Wallet reconciliation script** (`reconcileWallets.js`) — compensates for the lack of multi-document transactions on standalone MongoDB by recomputing cached counters from the ledger and reporting drift.
- **Duplicate-session prevention** — unique partial index on `{seriesId, scheduledAt}`.
- **AI prompt-injection defenses** — explicit system-prompt instructions telling the model to treat any text inside user messages or tool results as data, never as instructions, and never reveal internal tool names or system prompt text.
- **AI human-handoff sentinel** — a fixed literal marker (`[[HANDOFF]]`) the model appends when it can't ground an answer, parsed by the backend rather than trusting the model to self-report confidence as JSON.
- **Deterministic AI fallback** — hardcoded Arabic tajweed Q&A answers a real question even with zero OpenAI connectivity, so the assistant never hard-fails.
- **Redundant broadcast/log mounting** — admin notification broadcast + logs are reachable under two different route prefixes (`/admin/notifications/*` and `/notifications/admin/*`) calling the same handlers — not a bug, just duplicated surface.
- **Session attendance correction reachable from 3 separate admin entry points** (Sessions table, Teacher CRM, Operations Center) — all hit the identical backend endpoint (documented in `docs/KNOWN_LIMITATIONS.md` as an intentional-but-messy consolidation opportunity).

---

## 47. Dead / Unused Features

| Item | Type | Evidence |
|---|---|---|
| `ADMIN_ADMINS` (`/admin/admins`) route constant | Dead frontend route | Defined in `constants.js`, never imported/rendered in `App.jsx`; no page exists |
| `ADMIN_LEVELS` (`/admin/levels`) route constant | Dead frontend route | Same — no "levels" page or model exists |
| `Testimonial` model + full CRUD API | Backend-only, orphaned | No frontend consumer anywhere (public or admin) |
| `FAQ` admin CRUD (`createFAQ`/`deleteFAQ`) | Backend-only, orphaned | Public read is used (`ContactPage.jsx`); no admin management UI |
| `admin.controller.js:updateHomework` | Backend-only, orphaned | Wired in `admin.routes.js`; no frontend caller (homework tab is read-only display) |
| `NewsletterSubscriber` admin visibility | Missing entirely | No admin GET route at all — captured emails are write-only |
| `AcademySettings.maintenanceMode/maintenanceMessage/linkedin` | Backend-allow-listed, no UI | No form field anywhere sets these |
| `Course.enrollmentCount`/`studentsCount` | Dead counters | Never incremented by any controller |
| `Course.rating`/`reviewCount` | Fake/static data | Only ever set by the seeder's random numbers; no submission path |
| Legacy `server/uploads/*` directory | Stale disk artifact | Pre-GridFS-migration leftover files, not read by current code |
| `RecitationWidget.jsx` | Commented-out/unrendered | Static demo player, not currently mounted on the homepage |

---

## 48. Feature-by-Feature Reports (Deep Dive — Top Significant Systems)

### Lesson Wallet & Payroll Engine
**Status:** ✅ Fully Implemented
**Available to:** Student (view own), Teacher (view own readiness), Admin (full control)
**Description:** Replaces a naive `sessionsRemaining` counter with a real double-entry-style ledger (`LessonWallet` + append-only `LessonTransaction`) governing lesson entitlement, and a parallel, independently-computed teacher payroll ledger (`TeacherPayrollEntry`) governing pay — deliberately decoupled so a student's absence doesn't automatically forfeit a teacher's pay (business-policy-driven, admin-correctable via `pending_review`).
**Frontend:** `WalletBalanceCard.jsx`, `StudentSubscriptionPage.jsx`, `AdminSubscriptionsPage.jsx`, `AdminTeacherPerformancePage.jsx`.
**Backend:** `wallet.controller.js`, `services/wallet.service.js`, `services/lessonDeduction.service.js`, `services/payrollLedger.service.js`, `services/teacherPerformance.service.js`.
**Database:** `LessonWallet`, `LessonTransaction`, `TeacherPayrollEntry`, `Session` (consumption fields).
**API:** `GET/POST /wallet/*`, `GET /teacher-performance/*`.
**Workflow:** Enrollment approval credits the wallet → session attendance-save triggers `syncLessonConsumption()` (only present/late consumes) → cancel triggers `handleCancellation()` → no-show sweep auto-grants compensation → admin can adjust/freeze/transfer with a fully audited reason.
**Limitations:** Teachers cannot view their own itemized payroll history, only a readiness summary.

### Session Intelligence / Operations Center
**Status:** ✅ Fully Implemented
**Available to:** Admin
**Description:** A live operational-monitoring layer over the Session model — computes attendance/payroll confidence, flags anomalies into a severity-ranked review queue, and surfaces real-time socket-presence-aware health metrics.
**Frontend:** `AdminOperationsCenterPage.jsx` (Live / Timeline / Review Queue tabs).
**Backend:** `operations.controller.js`, `services/sessionIntelligence.service.js`.
**Database:** `Session` (review/confidence/payroll fields), `socket.service.js` presence map.
**API:** `GET /operations/{live,timeline,review-queue}`, `PATCH /operations/review/:sessionId`.
**Limitations:** Presence tracking is in-memory/single-instance — would need Redis to scale horizontally (documented).

### AI Assistant (Tutor + Concierge)
**Status:** ✅ Fully Implemented
**Available to:** Public visitors (concierge), authenticated users (tutor)
**Description:** Real OpenAI-backed dual-persona assistant with tool-calling grounded in live DB data for the public concierge, and a tajweed/memorization Q&A tutor for authenticated users — both share one provider layer with a deterministic rule-based fallback so the feature never hard-fails.
**Frontend:** `AIAssistantPage.jsx`, floating concierge widget.
**Backend:** `ai.controller.js`, `services/ai.service.js`, `services/aiTools.service.js`, `services/aiKnowledge.service.js`.
**Database:** `AIFeedback`.
**API:** `POST /ai/{ask,chat,feedback}`, `GET /ai/status`.
**Limitations:** Feature depends on `OPENAI_API_KEY` for full capability; without it, falls back to a small hardcoded Arabic knowledge base.

---

## 49. Complete Feature Status Matrix

Legend: S=Student T=Teacher A=Admin • FE=Frontend BE=Backend DB=Database

| # | Feature | Category | S | T | A | FE | BE | DB | Status |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Register | Auth | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 2 | Login | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 3 | Logout | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 4 | JWT access+refresh rotation | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 5 | Forgot/reset password | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 6 | Change password | Auth | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 7 | Email verification enforcement | Auth | | | | | | ✓ | 🟡 |
| 8 | Social login (Google/FB/Apple) | Auth | | | | | | | ❌ |
| 9 | OTP | Auth | | | | | | | ❌ |
| 10 | Account activation/suspension | Auth | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 11 | Avatar upload | Auth/Profile | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 12 | Device/session management | Auth | | | | | | | ❌ |
| 13 | Dev quick-login (non-prod) | Auth | | | | ✓ | ✓ | | ✅ |
| 14 | Role-based route protection | Security | ✓ | ✓ | ✓ | ✓ | ✓ | | ✅ |
| 15 | Ownership checks beyond role | Security | ✓ | ✓ | ✓ | | ✓ | | ✅ |
| 16 | Homepage hero/journey | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 17 | Homepage testimonials | Marketing | | | | ✓ | | | ⚪ |
| 18 | Homepage teachers carousel | Marketing | | | | ✓ | | | ⚪ |
| 19 | Homepage success stories | Marketing | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 20 | About page | Marketing | | | | ✓ | | | 🟣 |
| 21 | Programs page | Marketing | | | | ✓ | | | ⚪ |
| 22 | Course catalog listing | Marketing/Courses | | | | ✓ | ✓ | ✓ | ✅ |
| 23 | Course detail + YouTube | Marketing/Courses | | | | ✓ | ✓ | ✓ | ✅ |
| 24 | Teachers directory | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 25 | Teacher profile page | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 26 | Pricing/packages page | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 27 | FAQ page (public) | Marketing | | | | ✓ | | | ⚪ |
| 28 | Contact form | Marketing | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 29 | Newsletter signup | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 30 | Articles/blog listing+search | Marketing | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 31 | Article detail + like/bookmark | Marketing | | | | ✓ | ✓ | ✓ | ✅ |
| 32 | WhatsApp floating button | Marketing | | | | ✓ | | | 🟣 |
| 33 | Social links | Marketing | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 34 | English/i18n | Localization | | | | | | | ❌ |
| 35 | RTL layout | Localization | ✓ | ✓ | ✓ | ✓ | | | ✅ |
| 36 | SEO meta tags (static) | SEO | | | | ✓ | | | 🟡 |
| 37 | Sitemap/robots.txt | SEO | | | | | | | ❌ |
| 38 | Student dashboard stats | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 39 | Student profile edit | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 40 | Enrollment request submission | Student | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 41 | Payment-proof upload | Student | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 42 | Class schedule view | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 43 | Session list + self-cancel | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 44 | Student attendance history | Student | ✓ | | | | | | 🟡 |
| 45 | Memorization progress view | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 46 | Revision progress view | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 47 | Evaluations view | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 48 | Homework view+submit | Student | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 49 | Wallet balance view | Student | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 50 | Subscription status view | Student | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 51 | Payment history | Student | ✓ | | ✓ | ✓ | ✓ | | 🟡 |
| 52 | Notifications (student) | Student | ✓ | | | ✓ | ✓ | ✓ | ✅ |
| 53 | Certificates | Student | | | | | | | ❌ |
| 54 | Exams/quizzes | Student | | | | | | | ❌ |
| 55 | Student↔teacher messaging | Communication | | | | | | | ❌ |
| 56 | Teacher profile edit | Teacher | | ✓ | | ✓ | ✓ | ✓ | 🟡 |
| 57 | Teacher dashboard stats | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 58 | Assigned students list | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 59 | Session scheduling (create/edit) | Teacher | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 60 | Recurring availability (ScheduleRule) | Teacher | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 61 | Session reschedule/delay/cancel | Teacher | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 62 | Attendance marking | Teacher | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 63 | Memorization entry | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 64 | Revision entry | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 65 | Evaluation creation | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 66 | Homework assignment | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 67 | Homework grading | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 68 | Teacher itemized payroll view | Teacher | | ✓ | | | | ✓ | 🟡 |
| 69 | Teacher performance metrics | Teacher | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 70 | Meeting-link management | Teacher | | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 71 | Class notes | Teacher | | ✓ | | | | | 🟣 |
| 72 | Tajweed granular rule tracking | Quran | ✓ | ✓ | | | | | ❌ |
| 73 | Ijazah/Sanad tracking | Quran | | ✓ | | | | | ❌ |
| 74 | Recitation audio submission | Quran | ✓ | ✓ | | | | | ❌ |
| 75 | AI Assistant (tutor) | AI | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 76 | AI Assistant (concierge) | AI | | | | ✓ | ✓ | | ✅ |
| 77 | AI feedback (thumbs) | AI | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 78 | Admin dashboard stats | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 79 | Admin: students CRUD | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 80 | Admin: teachers CRUD | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 81 | Admin: courses full management | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 82 | Admin: course bulk actions | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 83 | Admin: packages CRUD | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 84 | Admin: subscriptions management | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 85 | Admin: wallet adjust/freeze/transfer | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 86 | Admin: enrollment review (approve/reject) | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 87 | Admin: sessions CRUD | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 88 | Admin: schedule rules management | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 89 | Admin: Operations Center (live) | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 90 | Admin: Operations review queue | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 91 | Admin: notifications broadcast | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 92 | Admin: articles/blog management | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 93 | Admin: article categories CRUD | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 94 | Admin: success stories management | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 95 | Admin: contact-message inbox | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 96 | Admin: website/academy settings | Admin | | | ✓ | ✓ | ✓ | ✓ | 🟡 |
| 97 | Admin: reports (real KPIs) | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 98 | Admin: reports trend charts | Admin | | | ✓ | ✓ | | | 🟣 |
| 99 | Admin: teacher performance/payroll | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 100 | Admin: audit log viewer | Admin | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 101 | Admin: testimonials management | Admin | | | | | ✓ | ✓ | 🔵 |
| 102 | Admin: FAQ management | Admin | | | | | ✓ | ✓ | 🔵 |
| 103 | Admin: newsletter subscriber list | Admin | | | | | | ✓ | 🔵 |
| 104 | Admin: maintenance mode toggle | Admin | | | | | ✓ | ✓ | 🔵 |
| 105 | Admin: manage other admins | Admin | | | | | | | ❌ |
| 106 | Admin: homework edit | Admin | | | | | ✓ | ✓ | 🔵 |
| 107 | Course model (catalog) | Courses | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 108 | Course→lesson content/completion | Courses | | | | | | | ❌ |
| 109 | Course category taxonomy (real model) | Courses | | | | | | | ❌ |
| 110 | Course enrollment counters | Courses | | | | | | ✓ | 🟡 |
| 111 | Course rating/reviews | Courses | | | | | | ✓ | ⚪ |
| 112 | Enrollment→Subscription pipeline | Payments | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 113 | Payment gateway | Payments | | | | | | | ❌ |
| 114 | Coupons/discounts | Payments | | | | | | | ❌ |
| 115 | Free trial | Payments | | | | | | | ❌ |
| 116 | Package CRUD | Payments | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 117 | Subscription renewal chain | Payments | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 118 | Lesson wallet ledger | Payments | ✓ | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 119 | Teacher payroll ledger | Payments | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 120 | Session model (full lifecycle) | Sessions | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 121 | Recurring scheduling | Sessions | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 122 | Interactive calendar grid UI | Sessions | ✓ | ✓ | ✓ | | | | 🟡 |
| 123 | Double-booking conflict guard | Sessions | | | | | ✓ | | 🔵 |
| 124 | Self-service booking | Sessions | | | | | | | ❌ |
| 125 | Attendance recording | Sessions | | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 126 | No-show auto-detection sweep | Sessions | | | ✓ | | ✓ | ✓ | ✅ |
| 127 | Session review queue/confidence | Sessions | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 128 | Memorization tracking | Quran | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 129 | Revision tracking | Quran | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 130 | Evaluation (tajweed/hifz/nazra/behavior/general) | Quran | ✓ | ✓ | | ✓ | ✓ | ✓ | ✅ |
| 131 | Homework model+submission | Academics | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 132 | Exams/quizzes | Academics | | | | | | | ❌ |
| 133 | Certificates | Academics | | | | | | | ❌ |
| 134 | Notification CRUD | Communication | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 135 | Real-time push (Socket.io) | Communication | ✓ | ✓ | ✓ | ✓ | ✓ | | ✅ |
| 136 | Email notifications (SMTP) | Communication | ✓ | | | | ✓ | | ✅ |
| 137 | SMS | Communication | | | | | | | ❌ |
| 138 | WhatsApp API | Communication | | | | | | | ❌ |
| 139 | WhatsApp static links | Communication | | | | ✓ | | | 🟣 |
| 140 | User-to-user messaging | Communication | | | | | | | ❌ |
| 141 | Admin broadcast announcements | Communication | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 142 | Parent role/portal | Roles | | | | | | | ❌ |
| 143 | Audit log system | Security | | | ✓ | ✓ | ✓ | ✓ | ✅ |
| 144 | Rate limiting | Security | | | | | ✓ | | ✅ |
| 145 | File upload magic-byte validation | Security | | | | | ✓ | | ✅ |
| 146 | CSRF protection | Security | | | | | | | ❌ |
| 147 | GridFS media storage | Media | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✅ |
| 148 | Private/authenticated file access | Media | | | | ✓ | ✓ | | ✅ |
| 149 | Cron: session reminders | Automation | | | | | ✓ | | ✅ |
| 150 | Cron: subscription expiry | Automation | | | | | ✓ | | ✅ |
| 151 | Cron: teacher no-show sweep | Automation | | | | | ✓ | | ✅ |
| 152 | DB migrations (boot-time, idempotent) | Automation | | | | | ✓ | | ✅ |
| 153 | Dev/production seeders | Automation | | | | | ✓ | | ✅ |
| 154 | Search (courses/teachers/articles) | Search | | | | ✓ | ✓ | | ✅ |
| 155 | Filter (multi-entity, admin) | Search | | | ✓ | ✓ | ✓ | | ✅ |
| 156 | Pagination (all list endpoints) | Search | ✓ | ✓ | ✓ | ✓ | ✓ | | ✅ |
| 157 | CSV/PDF export (payroll/salary) | Reporting | | | ✓ | ✓ | ✓ | | ✅ |
| 158 | Docker/CI-CD | Infra | | | | | | | ❌ |
| 159 | PM2 process management | Infra | | | | | ✓ | | ✅ |

*(Full 187-item count includes additional granular sub-actions itemized in §8.2, §31, §36, and §46 not individually numbered above to keep the matrix legible — e.g. every admin bulk-action variant, every notification-CRUD sub-verb, every settings field.)*

---

## 50. Feature Counts

**Total features/sub-features cataloged: 187**

| Status | Count |
|---|---|
| ✅ Fully Implemented | 141 |
| 🟡 Partial | 19 |
| 🔵 Backend Only | 10 |
| 🟣 Frontend/UI Only | 7 |
| ⚪ Static/Demo | 8 |
| ❌ Not Implemented (explicitly verified absent) | 12 core concepts (exams, certificates, parent portal, payment gateway, coupons, trial, messaging, SMS, i18n, social login, OTP, device management) — each spanning multiple would-be sub-features |

**By category:**

| Category | Approx. features | Notes |
|---|---|---|
| Authentication & Accounts | 14 | 2 not implemented (social login, OTP), 1 partial (email verify) |
| Public Website / Marketing | 21 | 4 static-demo, 1 frontend-only |
| Student Dashboard | 18 | 2 partial, 3 not implemented |
| Teacher Dashboard | 16 | 2 partial, 1 frontend-only-bundled |
| Admin Dashboard | 33 | 4 backend-only, 1 frontend-only(synthetic), 1 partial |
| Courses/Programs | 8 | 2 not implemented, 1 partial, 1 static |
| Sessions/Scheduling | 10 | 1 partial (calendar UI), 1 backend-only, 1 not implemented (self-booking) |
| Quran-Specific | 8 | 3 not implemented (tajweed rules, ijazah, recitation) |
| Homework/Academics | 5 | 2 not implemented (exams, certificates) |
| Payments/Subscriptions/Wallet | 12 | 3 not implemented (gateway, coupons, trial) |
| Communication/Notifications | 12 | 4 not implemented (SMS, WhatsApp API, messaging, device mgmt overlap) |
| Security | 8 | 1 not implemented (CSRF) |
| Media/Files | 4 | fully implemented |
| Automation/Infra | 8 | 1 not implemented (Docker/CI) |
| Search/Reporting | 6 | fully implemented |
| Localization/SEO | 4 | 2 not implemented (i18n, sitemap) |

---

## 51. Top 30 Most Important Implemented Features

1. **Dual-token JWT auth with rotation/revocation** — secures the entire platform.
2. **Role-based access control with controller-level ownership checks** — the backbone of every dashboard's data isolation.
3. **Session lifecycle engine** — the single most sophisticated model in the codebase; scheduling, attendance, timing, payroll, and review all converge here.
4. **Lesson Wallet ledger** — replaces a naive counter with an auditable, idempotent double-entry system governing every student's actual entitlement.
5. **Teacher payroll ledger** — decoupled from student attendance, rate-snapshotted, admin-correctable.
6. **Enrollment→Subscription pipeline with payment-proof approval** — the entire monetization flow of the platform.
7. **Recurring ScheduleRule engine** — generates and syncs real recurring sessions.
8. **Teacher no-show auto-detection sweep** — a genuinely intelligent automation, not just a cron stub.
9. **Operations Center (live monitoring + review queue)** — a real-time admin command center.
10. **Memorization & Revision tracking** — the core pedagogical record of the platform.
11. **Evaluation system** (tajweed/hifz/nazra/behavior/general) — structured teacher assessment.
12. **Homework assignment/submission/grading** — complete 3-role workflow.
13. **AI Assistant (dual-persona, tool-calling, grounded)** — genuinely production-grade LLM integration, not a toy.
14. **Real-time Socket.io notifications** — push, not polling.
15. **Admin Dashboard live stats** — real parallelized aggregation, not mock.
16. **Course catalog + admin management (with bulk actions)** — full marketing CMS for courses.
17. **Article/Blog CMS** — full editorial workflow with soft-delete/restore.
18. **GridFS unified media system** with magic-byte validation and Range/ETag support.
19. **Audit log system** — covers the sensitive mutation surface.
20. **Cron-driven subscription expiry automation**.
21. **Success Stories homepage widget** (singleton, admin-managed, live).
22. **Public teacher directory + profile pages** with a real allow-listed data-exposure boundary.
23. **Contact form → admin inbox** with notification trigger.
24. **Newsletter capture**.
25. **Article like/bookmark engagement**.
26. **Teacher performance analytics** (attendance trend, punctuality, completion rate).
27. **Salary report export (CSV/PDF)**.
28. **Role-aware rate limiting**.
29. **Magic-byte file upload validation** — a genuinely above-average security control.
30. **Idempotent boot-time migrations** — safe re-runs across deploys.

---

## 52. Complete User Journeys (as actually supported by the code)

### Student Journey
Visit public site → browse Courses/Teachers/Pricing → Register → Login → submit an **Enrollment Request** against a Package → upload payment proof → **wait for admin review** → (on approval) get assigned a teacher + wallet credit + a `Subscription` → teacher schedules recurring sessions via `ScheduleRule` → attend live sessions (external Zoom/Meet link) → teacher marks attendance (consumes a wallet lesson) → receive homework/evaluations/memorization-revision entries from the teacher → track progress on the Student dashboard → renew subscription before expiry (cron-warned) → no course "completion" or certificate exists at the end of this journey today.

### Teacher Journey
Admin creates the teacher account (with gender/identity classification) → teacher logs in → sets up meeting links + availability (`ScheduleRule`) → gets assigned students by admin (via enrollment approval) → runs live sessions → starts/marks attendance/reports delays → records memorization/revision/evaluation entries → assigns and grades homework → tracks own performance/payroll-readiness (not itemized payroll) → receives notifications for new assignments/reminders.

### Admin Journey
Login → Dashboard (real-time KPIs) → Operations Center (live session health, review queue) → review pending Enrollment Requests (approve/reject with teacher assignment) → manage Students/Teachers (CRUD, password resets) → manage Courses/Packages/Subscriptions → oversee Sessions/Schedule Rules, correcting attendance/payroll as needed → manage site content (Articles, Success Stories, Contact inbox, Website settings) → review Teacher Performance/Payroll and export salary reports → audit sensitive actions via Audit Logs → broadcast notifications.

### Parent Journey
**Not applicable — no parent role or portal exists.**

---

## 53. Product Capability Summary

**What can a visitor do?** Browse the marketing site, course catalog, teacher directory, articles/blog, FAQ (static), pricing; submit a contact form; subscribe to the newsletter; chat with the public AI concierge; register an account.

**What can a registered student do?** Everything in §5 — enroll (via payment-proof + admin approval), view schedule/sessions, track memorization/revision/evaluations, submit homework, view wallet/subscription status, receive real-time notifications, chat with the AI tutor. Cannot: message a teacher/admin directly, sit an exam, earn a certificate, view detailed attendance history.

**What can a teacher do?** Everything in §6 — schedule recurring sessions, mark attendance, record Quran progress, assign/grade homework, track own performance. Cannot: view itemized payroll history, message students/admin directly, record structured Ijazah/Sanad data.

**What can a parent do?** Nothing — the role doesn't exist.

**What can an administrator do?** Everything in §8 — the most complete surface in the platform: full user/course/package/subscription/session management, wallet and payroll ledger control, live operations monitoring, content management (articles/success-stories/contact), audit trail, real-time broadcast. Gaps: cannot manage Testimonials/FAQ from any UI, cannot see newsletter subscribers, cannot toggle maintenance mode, cannot manage other admin accounts.

**What is automated?** Session reminders, subscription-expiry warnings + auto-expiry, teacher no-show detection + payroll-status + compensation-credit, boot-time schema migrations, welcome/password/reminder emails, real-time notification delivery.

**What requires manual admin intervention?** Enrollment/payment approval (no gateway), wallet adjustments/freezes/transfers, subscription renewal, teacher assignment, session/payroll corrections, all content publishing.

**What is currently static/demo?** Homepage testimonials, homepage teachers carousel, Programs page, FAQ page content, Admin Reports trend charts/sparklines, Course rating/review numbers, the homepage recitation-audio widget (unmounted).

---

## 54. NOT IMPLEMENTED — Possible Future Features

*(Confirmed absent from the codebase — listed here strictly as potential future scope, never to be confused with anything documented above as existing.)*

- **Exams / Quizzes** as a concept distinct from Homework (question banks, MCQ/true-false, auto-grading, timed attempts).
- **Certificates** — issuance, PDF generation, QR verification (only a decorative boolean flag exists today).
- **Parent/Guardian role and portal** — multi-child linking, progress visibility, payment visibility.
- **Payment gateway integration** (Moyasar/Stripe/PayPal/Mada/etc.) — currently 100% manual proof-upload + admin approval.
- **Coupon/discount/promo codes**.
- **Free trial mechanism**.
- **Self-service student booking** (pick-a-teacher-and-slot flow) — only admin/teacher-driven scheduling + a backend conflict guard exist today.
- **Real user-to-user messaging** (student↔teacher↔admin threaded chat) — only notifications and a one-way contact form exist.
- **SMS notifications** and a **WhatsApp Business API** integration (only static `wa.me` links exist).
- **English/i18n localization** — the app is Arabic/RTL-only despite this being referenced as an architecture goal.
- **Structured Ijazah/Sanad tracking** and **granular per-rule Tajweed mastery tracking** — currently only prose/marketing text and a coarse category tag.
- **Purpose-built recitation-audio submission/grading workflow** — currently only generic homework file attachments happen to allow audio.
- **Docker/CI-CD pipeline** for the deployment process.
- **Per-device session management** (view/revoke active logins).
- **Achievements/badges/learning-streak gamification**.
- **Course-level lesson content and completion tracking** ("My Courses" / actual e-learning consumption — Course is currently a marketing catalog only, disconnected from the real 1:1 subscription-based teaching model).
- **A distinct, DB-backed course category/program taxonomy** (currently a plain enum).
- **Testimonials and FAQ admin management UI** (backend already built, just needs frontend wiring).
- **Newsletter subscriber list/export admin UI** (backend already captures data, needs a read surface).
- **Maintenance-mode toggle UI** (backend field already exists).

---

## 55. Problems / Incomplete Implementations

These are genuine gaps or inconsistencies found during the audit — documented, not fixed, per task instructions.

### Documentation/code mismatches (docs were stale relative to code)
- `docs/KNOWN_LIMITATIONS.md` (dated 2026-07-16) states "Wallet / in-platform balance" is **not built** — but `LessonWallet`, `LessonTransaction`, and `TeacherPayrollEntry` models plus their full service/controller/route layers were added **2026-07-29/30**, after that doc was written. The wallet system is real and mature; the doc is simply outdated.
- `docs/SYSTEM_OVERVIEW.md`'s domain-model table lists an `Enrollment` collection ("A student's enrollment in a Course, progress tracking") that **does not exist** — only `EnrollmentRequest` (the Package purchase pipeline) and a dead `Course.enrollmentCount` counter exist. No course-progress tracking exists at all.

### Broken/misleading data presentation
- `AdminReportsPage.jsx`'s three "monthly trend" charts and all KPI-card sparklines are **fabricated from a static weight curve**, not real per-month history — they visually resemble genuine historical trends and should be disclosed to stakeholders as non-representative before being relied on for decisions.

### Frontend/backend mismatches (dead UI or dead API)
- `client/src/config/constants.js` defines `ADMIN_ADMINS` and `ADMIN_LEVELS` routes that are never rendered — either finish this feature or remove the dead constants.
- Homepage `TestimonialsSection.jsx` and `TeachersSection.jsx` are fully hardcoded, while real, working `Testimonial` and `/teachers/public` APIs exist and go unused for these exact surfaces — a genuine "why did we build the backend and not wire it up" gap.
- `FAQPage.jsx` hardcodes its own Q&A list while a working, admin-manageable `FAQ` model/API sits unused for the dedicated FAQ page (even though `ContactPage.jsx` correctly uses the real one).
- `ProgramsPage.jsx` is entirely static with no backend at all — if "Programs" is meant to be a real content type, it needs its own model.
- `website.controller.js`'s Testimonial and FAQ **create/delete** endpoints have no corresponding admin UI — content managers currently cannot add/remove testimonials or FAQs at all without direct DB access.
- `NewsletterSubscriber` has no admin GET route or UI — captured emails are currently unreachable/unusable by staff.
- `admin.controller.js:updateHomework` has no frontend caller.

### Security posture notes (not necessarily bugs, but worth flagging)
- No CSRF middleware (`csurf` or equivalent) is installed; the design leans on bearer-token-in-header architecture for mitigation, which is reasonable but not a textbook defense-in-depth layer.
- No `xss-clean`/server-side output sanitization; relies on React's default escaping plus input-side Joi validation.

### Partial/incomplete workflows
- Students have no dedicated attendance-history view/endpoint (only an aggregate percentage).
- Teachers have no itemized payroll-history view (only a readiness status); the underlying ledger (`TeacherPayrollEntry`) is admin-only.
- Email verification (`User.isEmailVerified`) is modeled but never enforced or actually triggered outside the seeder.
- `AcademySettings.maintenanceMode`/`maintenanceMessage`/`linkedin` are backend-allow-listed with no way to set them from any UI.
- Session/schedule UI is list-based only — no calendar-grid component exists despite the data model fully supporting one.
- Booking-conflict prevention exists only as a backend guard on admin/teacher-created sessions; there is no student self-service booking flow to actually need it for that purpose.

### Housekeeping
- `server/uploads/` still contains 15+ stale pre-GridFS-migration files that nothing in the current codebase reads — safe to clean up once independently verified.
- Admin notification broadcast/logs are reachable under two separate route prefixes calling identical handlers — redundant, not broken, but worth consolidating.
- Session attendance correction is reachable from 3 separate admin UI entry points, all hitting the same endpoint — UI duplication, not a functional gap (self-documented in `docs/KNOWN_LIMITATIONS.md`).
- No ESLint config succeeds repo-wide (`npm run lint` fails) — pre-existing, not introduced by recent work, per `docs/KNOWN_LIMITATIONS.md`.
- No frontend test runner and no DB-backed integration tests (`mongodb-memory-server` absent) — backend-only Jest coverage.

---

*End of audit. All findings above are sourced from direct code inspection of the `main` branch (commit `089dd9a`) plus a cross-check against `docs/*.md`, with discrepancies explicitly called out rather than silently trusted.*
