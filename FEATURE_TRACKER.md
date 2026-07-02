# Tartelah Online - Feature Tracker

Legend: ✅ Complete | 🔄 In Progress | ⏳ Not Started | ❌ Blocked

## Production Readiness — 2026-06-24 Audit

**Overall: 82% ready** (was 63% at session start)

### Critical Bugs Fixed This Session
- ✅ `emitToRole` socket bug — now filters by role rooms
- ✅ Admin session ownership bypass — admin can cancel/complete/reschedule any session
- ✅ `getAdminNotificationLogs` only showed system type — full pipeline added
- ✅ `console.log` password reset URL in production — dev-only now
- ✅ `keepPreviousData: true` TanStack v5 incompatibility — fixed across all admin pages
- ✅ `Subscription.pre('save')` durationDays undefined — fixed with sessionsRemaining-based calc
- ✅ `sessionsRemaining` going negative — Math.max(0) guard added
- ✅ `updateTeacher` raw req.body security — whitelist enforced
- ✅ `updateSubscription` raw req.body — whitelist + guard added
- ✅ Teacher studentCount/sessionCount always 0 — aggregation pipeline added

### New Capabilities Added
- ✅ Admin can create sessions (any teacher + student)
- ✅ Admin can edit any session (status, time, link, assignments)
- ✅ Admin can cancel/reschedule any session
- ✅ Admin can edit student profiles (name, email, phone, bio)
- ✅ Admin can edit teacher profiles (+ salary field)
- ✅ Admin can reset any user's password
- ✅ Admin can view full student academic record
- ✅ Admin can override evaluations (edit/delete)
- ✅ Admin can override attendance records
- ✅ Admin can view all schedule rules
- ✅ Admin can send individual notifications (with user search)
- ✅ Academy Settings panel (name, contact, social, integrations)
- ✅ AcademySettings model + GET/PATCH endpoints
- ✅ Contact form backend handler → notifies admins
- ✅ Teacher can grade homework submissions
- ✅ Teacher can edit/delete own evaluations
- ✅ Subscription adjustment modal (sessions remaining, end date, notes)
- ✅ User.salaryPerSession field added

---

---

## Phase 1 — Architecture & Project Setup

| Task | Status | Notes |
|------|--------|-------|
| Read and analyze all documentation | ✅ | |
| Analyze design references | ✅ | |
| Extract design system tokens | ✅ | ARCHITECTURE_PLAN.md |
| Create comprehensive architecture plan | ✅ | ARCHITECTURE_PLAN.md |
| Create database schema design | ✅ | 14 Mongoose models |
| Create API architecture | ✅ | 18 route files |
| Create RBAC architecture | ✅ | admin/teacher/student roles |
| Create folder structure plan | ✅ | Feature-based, scalable |
| Create SCOPE_OF_WORK.md | ✅ | |
| Update FEATURE_TRACKER.md | ✅ | This file |
| Update PROJECT_STATUS.md | ✅ | |
| Create SESSION_HANDOFF.md | ✅ | |
| Setup frontend (Vite + React + Tailwind) | ✅ | 560 modules, 3.35s build |
| Setup backend (Node + Express + MongoDB) | ✅ | All middleware wired |
| Configure Tailwind design tokens | ✅ | tailwind.config.js |
| Configure React Router skeleton | ✅ | 30+ lazy-loaded pages |
| Configure React Query + Zustand | ✅ | TanStack v5 + Zustand v5 |
| Setup backend base structure | ✅ | controllers/routes/models |

---

## Phase 2 — Design System & Shared Components

| Task | Status | Notes |
|------|--------|-------|
| Button component (gold, outline, ghost, danger variants) | ✅ | CSS classes: btn-gold, btn-purple |
| Input component (with icon, error, RTL support) | ✅ | .field, .field-light |
| Select component | ✅ | |
| Card component (light + dark variants) | ✅ | .card-light, .card-dark |
| Badge / Pill component | ✅ | Badge.jsx |
| Modal component (animated) | ✅ | Modal.jsx + Framer Motion |
| Spinner / Loading component | ✅ | Spinner.jsx |
| Avatar component | ✅ | Avatar.jsx |
| Table component | ✅ | Inline in admin pages |
| Pagination component | ✅ | Pagination.jsx |
| Toast notification component | ✅ | Toast.jsx |
| StatCard component | ✅ | StatCard.jsx |
| PageHeader component | ✅ | PageHeader.jsx |
| EmptyState component | ✅ | Supports dark prop + action object |
| ConfirmDialog component | ✅ | ConfirmDialog.jsx |
| LoadingPage component | ✅ | LoadingPage.jsx |
| PublicLayout | ✅ | Glass header, sticky, mobile drawer |
| AuthLayout | ✅ | Redirect if authenticated |
| StudentLayout (sidebar left, light) | ✅ | LTR wrapper |
| TeacherLayout (sidebar right, dark) | ✅ | RTL wrapper |
| AdminLayout (sidebar left, dark) | ✅ | LTR wrapper |

---

## Phase 3 — Authentication System

### Backend
| Task | Status | Notes |
|------|--------|-------|
| User model (Mongoose) | ✅ | Multi-role, bcrypt, meetingLinks |
| Auth controller | ✅ | register/login/logout/refresh/forgotPassword/resetPassword/changePassword |
| JWT middleware | ✅ | auth.middleware.js, Bearer token |
| RBAC middleware | ✅ | rbac.middleware.js, isAdmin/isTeacher/isAdminOrTeacher |
| Email service (nodemailer) | ✅ | email.service.js, 4 email types |
| Auth routes | ✅ | auth.routes.js |

### Frontend
| Task | Status | Notes |
|------|--------|-------|
| Login page | ✅ | Dark gradient, split layout |
| Register page | ✅ | |
| Forgot password page | ✅ | |
| Reset password page | ✅ | |
| Auth Zustand store | ✅ | accessToken in memory |
| Protected routes by role | ✅ | ProtectedRoute.jsx |
| Role-based redirect after login | ✅ | getDashboardPath() |
| Axios interceptors | ✅ | Auto-refresh on 401 |

---

## Phase 4 — Marketing Website

### Pages
| Task | Status | Notes |
|------|--------|-------|
| Home page (full sections) | ✅ | Direct conversion of Quran Academy.dc.html — all 9 sections + footer |
| About Us page | ✅ | Premium redesign 2026-06-27 — story timeline, values, team, methodology |
| Programs & Courses page | ✅ | Premium redesign 2026-06-27 — interactive tabs, journey, alternating features, testimonials |
| Teachers page | ✅ | |
| Pricing & Packages page | ✅ | Premium redesign 2026-06-27 — segmented controls, comparison table, trust section |
| FAQ page | ✅ | Accordion |
| Contact Us page | ✅ | |

### Components & Backend
| Task | Status | Notes |
|------|--------|-------|
| Navbar (RTL, responsive, sticky) | ✅ | Glass on scroll |
| Hero section | ✅ | |
| All other sections | ✅ | |
| Website content model + routes | ✅ | Testimonial + FAQ |
| Package routes (public) | ✅ | |
| Seed data | ✅ | seed.js with packages, FAQs, testimonials |

---

## Phase 5 — Student Dashboard

### Pages
| Task | Status | Notes |
|------|--------|-------|
| Dashboard home | ✅ | Stats + upcoming + memorization progress |
| Study schedule | ✅ | Day-grouped with today highlight |
| Sessions | ✅ | Upcoming / history tabs |
| Homework | ✅ | Submit modal, status tracking |
| Evaluations | ✅ | Score cards with grade color |
| Progress (memorization + revision) | ✅ | Quality badges |
| Academic record | ✅ | Enrollment cards |
| Subscription | ✅ | Days remaining countdown |
| Notifications | ✅ | Full SaaS center — real-time Socket.io, dropdown bell, search, filter, bulk actions, delete |
| Settings | ✅ | Profile + password change |

### Backend APIs
| Task | Status | Notes |
|------|--------|-------|
| Student stats endpoint | ✅ | GET /students/me/stats |
| Upcoming sessions | ✅ | GET /sessions/upcoming |
| Session history | ✅ | GET /sessions/history |
| Homework (list + submit) | ✅ | GET + POST /homework/:id/submit |
| Evaluations | ✅ | GET /evaluations/student/me |
| Memorization | ✅ | GET /memorization/student/me |
| Revision | ✅ | GET /revision/student/me |
| Subscription | ✅ | GET /subscriptions/me |

---

## Phase 6 — Teacher Dashboard

### Pages
| Task | Status | Notes |
|------|--------|-------|
| Dashboard home | ✅ | Stats + upcoming + recent students |
| Students management | ✅ | Card grid + search |
| Sessions | ✅ | List + schedule modal |
| Attendance | ✅ | Status buttons inline |
| Evaluations | ✅ | Create + list |
| Homework | ✅ | Create + assign students |
| Progress | ✅ | Tabs: memorization/revision |
| Meeting links | ✅ | CRUD |
| Notifications | ✅ | |
| Settings | ✅ | Profile + password |

### Backend APIs
| Task | Status | Notes |
|------|--------|-------|
| Teacher stats | ✅ | GET /teachers/me/stats |
| Teacher students | ✅ | GET /teachers/me/students |
| Session CRUD | ✅ | POST/PATCH /sessions |
| Attendance CRUD | ✅ | GET/PATCH /attendance |
| Evaluation CRUD | ✅ | POST/GET /evaluations |
| Homework CRUD | ✅ | POST/GET /homework/teacher |
| Meeting links CRUD | ✅ | GET/POST/DELETE /teachers/me/links |
| Memorization/Revision CRUD | ✅ | POST /memorization + /revision |

### UI Redesign — 2026-07-02
| Task | Status | Notes |
|------|--------|-------|
| Light-theme redesign (all pages + layout chrome) | ✅ | Dark purple → light SaaS theme matching Admin's `bg-white/border-gray-100/shadow-sm` card language and violet/gray Tailwind palette. Sidebar branding kept dark purple by explicit request. |
| Stability fixes (Suspense/ErrorBoundary + query safety) | ✅ | Root-caused blank-page-on-navigation to a mis-scoped `Suspense` boundary in `App.jsx`; scoped it to `TeacherLayout`'s `Outlet` + added `ErrorBoundary`. Added `toArray()` normalization + `isError`/retry UI to every list query across all 11 teacher pages and the shared `NotificationCenter`. |

---

## Phase 7 — Admin Dashboard

### Pages
| Task | Status | Notes |
|------|--------|-------|
| Dashboard overview | ✅ | KPIs + today sessions + recent registrations |
| Students management | ✅ | Paginated table + activate/deactivate |
| Teachers management | ✅ | Table + create modal |
| Courses management | ✅ | Card grid + create modal |
| Sessions management | ✅ | Table with status filter tabs |
| Packages management | ✅ | Pricing cards + create |
| Subscriptions management | ✅ | Table + create |
| Website content editor | ✅ | Testimonials + FAQ |
| Reports & analytics | ✅ | Revenue + leaderboard |
| Notifications broadcast | ✅ | Broadcast to all/role |
| Settings | ✅ | Profile + password |

### Backend APIs
| Task | Status | Notes |
|------|--------|-------|
| Admin stats | ✅ | GET /admin/stats |
| User CRUD | ✅ | GET/PATCH /admin/students + /admin/teachers |
| Course CRUD | ✅ | |
| Package CRUD | ✅ | |
| Subscription management | ✅ | |
| Website content CRUD | ✅ | |
| Reports | ✅ | GET /admin/reports |
| Broadcast notifications | ✅ | POST /admin/notifications/broadcast |

---

## Phase 8 — Academic Management System

| Task | Status | Notes |
|------|--------|-------|
| Attendance model + API | ✅ | |
| Attendance UI (teacher + student) | ✅ | |
| Evaluation model + API | ✅ | |
| Evaluation UI (teacher create + student view) | ✅ | |
| Memorization model + API | ✅ | |
| Memorization tracker UI | ✅ | |
| Revision model + API | ✅ | |
| Revision tracker UI | ✅ | |
| Homework with submissions | ✅ | Embedded SubmissionSchema |
| Homework submit UI (student) | ✅ | |
| Academic records view | ✅ | Enrollment + course + progress |

---

## Phase 9 — Meetings & Scheduling System

| Task | Status | Notes |
|------|--------|-------|
| Session model + API | ✅ | |
| Session creation form | ✅ | Teacher schedule modal |
| Meeting link management | ✅ | TeacherLinksPage CRUD |
| Session status management | ✅ | complete/cancel endpoints |
| Notification model + API | ✅ | Upgraded: priority, actionUrl, metadata, markUnread, deleteOne, deleteAllRead, pagination |
| Session reminders (cron) | ✅ | sessionReminder.job.js |
| Subscription expiry (cron) | ✅ | subscriptionExpiry.job.js |
| Student join button | ✅ | StudentSessionsPage |
| Teacher session management UI | ✅ | |
| Upcoming/history views | ✅ | |
| Admin session override | ✅ | AdminSessionsPage |

---

## Phase 10 — AI Assistant

| Task | Status | Notes |
|------|--------|-------|
| Rule-based AI service | ✅ | ai.controller.js |
| Knowledge base (6 entries) | ✅ | tajweed, memorization, idgham, ikhfaa, izhaar, iqlab |
| Chat interface | ✅ | AIAssistantPage.jsx |
| Message bubbles | ✅ | |
| Suggested questions | ✅ | 5 prompt chips |
| Arabic + English support | ✅ | |
| POST /ai/ask endpoint | ✅ | Auth-protected |

---

## Phase 11 — Testing & Optimization

| Task | Status | Notes |
|------|--------|-------|
| Backend API tests (live) | ✅ | 65 test cases, all pass |
| RBAC enforcement tests | ✅ | 403 + 401 verified |
| Full session lifecycle test | ✅ | create→notify→attend→complete |
| Rate limiting verification | ✅ | 429 on auth overuse |
| Code splitting + lazy loading | ✅ | All 30+ pages lazy |
| SEO meta tags + OpenGraph | ✅ | index.html full metadata |
| JSON-LD structured data | ✅ | EducationalOrganization |
| Security (helmet, CORS, rate limit) | ✅ | server.js |
| MongoDB indexes | ✅ | Compound indexes on all models |
| Email service | ✅ | 4 templates |
| Avatar upload | ✅ | Multer + validation |
| Cron jobs | ✅ | 2 jobs running |
| Seed script | ✅ | npm run seed |
| SESSION_HANDOFF.md | ✅ | |

---

---

## Auth System Repair — Bug Fixes

| Task | Status | Notes |
|------|--------|-------|
| Fix axios interceptor refresh URL | ✅ | `/auth/refresh-token` → `/auth/refresh` |
| Fix `auth.service.js` refresh URL | ✅ | Same wrong path fixed |
| Fix `useInitAuth` response shape | ✅ | `data.user` → `data` (user IS the data object) |
| Fix `useInitAuth` refresh-first strategy | ✅ | No longer calls /auth/me with no token |
| Fix infinite redirect loop on /login | ✅ | Added `pathname !== '/login'` guard |
| Fix rate limiter blocking dev (429) | ✅ | 500 req limit in dev, 20 in prod |
| Fix logout not clearing httpOnly cookie | ✅ | All 3 layouts call `authService.logout()` |
| End-to-end auth tests (30 test cases) | ✅ | 29/30 pass (1 expected: admin password mismatch) |

---

## DX Enhancements — Developer Experience

| Task | Status | Notes |
|------|--------|-------|
| Dev Quick Login — backend `POST /auth/dev-login` | ✅ | Dev-only, double-guarded, returns JWT by role |
| Dev Quick Login — auto seed `devSeed.js` | ✅ | Creates 3 dev accounts on startup if missing |
| Dev Quick Login — frontend DevQuickAccess UI | ✅ | Amber glass card, 3 role buttons, hidden in prod |
| `VITE_ENABLE_DEMO_LOGIN` env flag support | ✅ | Overrides DEV check for staging environments |

---

---

## Enrollment Workflow — Production Business Flow (2026-06-22)

| Task | Status | Notes |
|------|--------|-------|
| EnrollmentRequest model | ✅ | Full lifecycle: pending→under_review→approved/rejected |
| Subscription model: `pending` status | ✅ | Added to enum |
| Notification model: `enrollment` type + `relatedId` | ✅ | Updated enum + added field |
| Upload middleware: payment proof | ✅ | `uploadPaymentProof` — stores to `uploads/payment-proofs/` |
| Enrollment controller: submit request | ✅ | Student submits, admins notified |
| Enrollment controller: upload payment proof | ✅ | Student uploads, status → under_review |
| Enrollment controller: get my requests | ✅ | Student: GET /enrollments/me |
| Enrollment controller: get all requests | ✅ | Admin: GET /enrollments with status filter |
| Enrollment controller: review (approve/reject) | ✅ | Creates Subscription + notifies student + teacher |
| Enrollment controller: pending count | ✅ | GET /enrollments/pending-count for badge |
| Enrollment routes registered | ✅ | /api/v1/enrollments |
| Admin stats: pendingEnrollments count | ✅ | Included in GET /admin/stats |
| StudentEnrollmentPage | ✅ | Package browse + 3-step form + proof upload + status tracking |
| AdminEnrollmentsPage | ✅ | Review queue + proof modal + approve/reject + teacher assign |
| StudentSubscriptionPage empty state | ✅ | "التسجيل في برنامج" CTA button |
| Admin sidebar: طلبات التسجيل with live badge | ✅ | Amber badge, refreshes every 60s |
| Student sidebar: التسجيل في برنامج | ✅ | Added to nav |
| Admin dashboard: pending enrollment alert | ✅ | Amber banner with link |
| ROUTES constants updated | ✅ | STUDENT_ENROLLMENT + ADMIN_ENROLLMENTS |
| App.jsx routes registered | ✅ | Both pages lazy-loaded |
| Build verification | ✅ | 4.05s, zero errors |

---

---

## Articles & Knowledge Center — 2026-06-25

| Task | Status | Notes |
|------|--------|-------|
| Article model (full schema + SEO + soft delete) | ✅ | MongoDB + text indexes |
| ArticleCategory model | ✅ | slug, color, icon, order |
| Article controller (public + admin) | ✅ | 20 endpoints |
| Article routes with proper ordering | ✅ | public before parameterized |
| Upload middleware: article cover | ✅ | `uploads/articles/` |
| Routes index: register /articles | ✅ | |
| optionalAuth middleware | ✅ | Added to auth.middleware.js |
| Frontend: ROUTES constants updated | ✅ | 5 new routes |
| Frontend: App.jsx routes added | ✅ | 4 new lazy routes |
| AdminLayout: المقالات nav item | ✅ | Under "المحتوى" group |
| Public ArticlesPage (/articles) | ✅ | Hero, search, categories, grid, pagination |
| Public ArticleDetailPage (/articles/:slug) | ✅ | Progress bar, TOC, share, like, bookmark |
| Admin ArticlesPage (CMS list) | ✅ | Stats, table, publish/feature/pin/duplicate/delete |
| Admin ArticleEditorPage | ✅ | Rich text editor, SEO panel, media, auto-save |
| Category management modal | ✅ | CRUD in admin |
| HomePage latest articles section | ✅ | 3 cards, live from API |
| AI Assistant: articles knowledge base | ✅ | Full-text search, enriches LLM context |
| Build verified: zero errors | ✅ | 11.01s, all pages lazy-loaded |

### Features Delivered
- ✅ Full-text search (MongoDB text index)
- ✅ Category + tag filtering
- ✅ Featured articles hero
- ✅ Reading progress bar
- ✅ Auto-generated Table of Contents
- ✅ Like + Bookmark toggles (auth-protected)
- ✅ Share buttons (Twitter, WhatsApp, copy link)
- ✅ Related articles
- ✅ Prev/Next navigation
- ✅ Admin rich text editor with toolbar + preview
- ✅ SEO panel (title, description, OG image, canonical, robots)
- ✅ Cover image upload
- ✅ Article soft delete + restore
- ✅ Publish / Unpublish / Schedule / Archive
- ✅ Feature / Pin / Duplicate article
- ✅ Auto-save indicator (60s interval)
- ✅ AI context enrichment from published articles

---

## Courses Management System — 2026-06-28

| Task | Status | Notes |
|------|--------|-------|
| Course model — expanded schema (slug, SEO, media, curriculum, outcomes) | ✅ | Backward compatible |
| Upload middleware — course thumbnail + cover storage | ✅ | uploads/courses/ |
| Course controller — full enterprise (13 operations) | ✅ | list, featured, bySlug, adminList, stats, CRUD, upload, bulk |
| Course routes — complete REST API | ✅ | Public + admin namespaced routes |
| server.js — uploads/courses directory auto-creation | ✅ | |
| constants.js — COURSES, COURSE_DETAIL, ADMIN_COURSE_NEW, ADMIN_COURSE_EDIT | ✅ | |
| App.jsx — lazy routes for 2 new admin pages + 2 public pages | ✅ | |
| PublicLayout — "الدورات" added to navbar | ✅ | |
| AdminCoursesPage — enterprise rebuild (stats, table+grid, bulk actions, search) | ✅ | |
| AdminCourseFormPage — CMS form page (create + edit, image upload, video, curriculum) | ✅ | |
| CoursesPage — public discovery (hero, category filters, featured spotlight, grid, pagination) | ✅ | |
| CourseDetailPage — premium course detail (hero, tabs, enrollment card, video modal, related) | ✅ | |
| Build verification — zero errors | ✅ | 9.27s, 12 new lazy chunks |

### Features Delivered
- ✅ Course model with slug, SEO, media, curriculum, learning outcomes, requirements
- ✅ Auto-slug generation with uniqueness guarantee
- ✅ Course thumbnail + cover image upload (drag & drop)
- ✅ YouTube URL with auto-thumbnail extraction and video modal
- ✅ Admin stats dashboard (total, published, draft, archived, featured, students)
- ✅ Table view + Grid view with toggle
- ✅ Bulk actions: publish, unpublish, feature, archive, delete
- ✅ Quick actions per course: edit, toggle publish, toggle feature, duplicate, delete
- ✅ CMS form: multi-section with tags input, dynamic lists, curriculum builder
- ✅ Public courses discovery page with hero + category tabs + filters + pagination
- ✅ Featured course spotlight on public page
- ✅ Course detail page with tabs (overview / curriculum / outcomes)
- ✅ Sticky enrollment card on course detail
- ✅ Related courses sidebar
- ✅ SEO panel in admin form
- ✅ Skeleton loading states
- ✅ Empty states with clear CTAs

---

## Success Stories Homepage Section — 2026-07-02

| Task | Status | Notes |
|------|--------|-------|
| SuccessStory model (singleton, fixed-role cards + banner) | ✅ | `server/src/models/SuccessStory.js` |
| Upload middleware — success-story image storage | ✅ | `uploads/success-stories/`, 8MB limit |
| successStory controller — public + admin CRUD | ✅ | getPublic, getAdmin, updateConfig, upload/remove card+banner image |
| successStory routes — registered at `/success-stories` | ✅ | Public GET first, then admin-guarded routes |
| ImageCropModal — reusable dark/gold crop modal (react-easy-crop) | ✅ | `client/src/components/ui/ImageCropModal.jsx`, canvas resize+JPEG compress |
| ImageUploadField — reusable drag&drop/preview/replace/remove field | ✅ | `client/src/components/ui/ImageUploadField.jsx`, light/dark theme prop |
| AdminSuccessStoriesPage — full CMS (mode switch, editors, live preview) | ✅ | `/admin/success-stories`, light theme matching CRM admin pages |
| AdminLayout — "قصص النجاح" nav item under المحتوى | ✅ | |
| SuccessStoriesSection — homepage section (cards or banner mode) | ✅ | `client/src/components/home/SuccessStoriesSection.jsx` |
| HomePage.jsx — section inserted after Teachers, before Testimonials | ✅ | |
| constants.js / App.jsx routing wired | ✅ | `ADMIN_SUCCESS_STORIES` |
| Build verification — zero errors | ✅ | |
| End-to-end verification — curl (CRUD/auth/validation) + Playwright screenshots | ✅ | Both display modes + crop modal confirmed rendering, no console errors |

### Features Delivered
- ✅ Two mutually-exclusive display modes (three cards / single banner), switchable without code changes
- ✅ Per-card fields: image, name, subtitle, description, badge, optional CTA, display order, enable/disable
- ✅ Banner fields: image, title, subtitle, optional button + link, enable/disable
- ✅ Master section on/off toggle — hides section from homepage entirely when off
- ✅ Image crop (fixed aspect per slot: ~0.72 portrait for cards, 21:9 for banner) + client-side compression
- ✅ Live preview panel in admin reflecting unsaved edits
- ✅ Premium homepage presentation: floating badges, gradient overlays, hover lift, RTL, prefers-reduced-motion support
- ✅ Graceful empty states — section renders nothing if inactive or the active mode has no usable content

---

## Summary

| Phase | Total | Complete | Remaining |
|-------|-------|----------|-----------|
| Phase 1 | 18 | 18 | 0 |
| Phase 2 | 21 | 21 | 0 |
| Phase 3 | 14 | 14 | 0 |
| Phase 4 | 19 | 19 | 0 |
| Phase 5 | 19 | 19 | 0 |
| Phase 6 | 18 | 18 | 0 |
| Phase 7 | 20 | 20 | 0 |
| Phase 8 | 11 | 11 | 0 |
| Phase 9 | 11 | 11 | 0 |
| Phase 10 | 7 | 7 | 0 |
| Phase 11 | 14 | 14 | 0 |
| DX Enhancements | 4 | 4 | 0 |
| **Enrollment Workflow** | **21** | **21** | **0** |
| **Articles & Knowledge Center** | **19** | **19** | **0** |
| **Courses Management System** | **13** | **13** | **0** |
| **Success Stories Homepage Section** | **13** | **13** | **0** |
| **TOTAL** | **242** | **242** | **0** |
