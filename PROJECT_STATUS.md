# Project Status — Tartelah Online

**Last Updated:** 2026-09-17 (Inline admin session editing/postponement from the dashboard drawer, academy-time-safe changes, and teacher + student notifications)
**Current Phase:** PRODUCTION READY — Full Educational Operating System + **UX Hardening Pass (canonical `docs/SESSION_LIFECYCLE_GUIDE_AR.md` + reusable role-aware "كيف تعمل الحصة؟" guide component; teacher "اليوم" daily-focus view with a live-countdown hero session, grouped agenda, and a missing-Quran-report queue; backend-enforced session check-in window — closes a real gap where a teacher could check in to an arbitrary future session; post-completion finish receipt with real wallet/payroll/report state; onboarding wizard desktop sidebar with data-derived completion % and a per-stage checklist; student session rows now show teacher check-in/outcome/wallet-effect; fixed a real cron-trigger timezone drift across all 5 scheduled jobs; fixed an ambiguous slot-time formatting bug)** + **Phase 2 Remaining Scope (hourly payroll ledger with correction/void chain, teacher & student financial adjustments, full subscription renewal flow, Quran session report lifecycle, missing-report tracking, persisted monthly teacher reports with auto-draft cron, evaluation/renewal survey with configurable lead time, teacher-facing single-student detail page)** + **Phase 1 Readiness Audit (full backend suite 100% green, 0 pre-existing failures remaining)** + **Redesigned "propose alternative time" (real availability engine, teacher-owned endpoint, authoritative backend revalidation)** + **Dynamic teaching-subject/curriculum catalog (admin-manageable, replaces the hardcoded 6-value enum, zero data migration)** + **Phase 2 Part 2c (Incremental, Resumable Onboarding with Atomic Reservation Locking)** + **Phase 2 Part 2 (Student Credential Options, Automatic Availability Engine, Recurring-Schedule Activation, Assignment-Request Workflow)** + **Phase 2 Part 1 Operational Foundation (Teacher/Student Onboarding Wizard)** + **Lesson Wallet & Ledger Architecture** + Articles CMS + Courses Management System + Success Stories Homepage Section + Teacher Dashboard Light-Theme Redesign + Intelligent Attendance / Payroll-Ready Operations System + Admin Operations Center + Teacher Identity System & Teachers Page Refactor + Full-Platform Seeder, Live Audit & Documentation Pass
**Overall Progress:** 100% (Core) + **Incremental per-student onboarding persistence with atomic ScheduleReservationLock concurrency protection and resumable sessions** + **Automatic teacher-availability engine + assignment-request state machine (existing-student direct assignment, new-student teacher-approval flow, immediate admin override, teacher accept/reject/propose-time, edit & resend, reassignment) + administrator-defined/auto-generated student credentials with configurable forced password change** + Teacher/Student Onboarding Wizard + Teacher Working Hours + Audience/Specialization Taxonomy + Student Type + Opening Lesson Balance + Lesson Wallet/Ledger + Persisted Teacher Payroll Ledger + Booking Conflict Prevention + Timezone-Correct Scheduling + Scheduling Engine + Articles CMS + Enterprise Courses Module + Success Stories CMS + Session-Centric Attendance Intelligence + Needs-Review Queue + Recurring-Session Dedupe + Canonical Teacher Gender Identity + Redesigned Public Teachers Page + Comprehensive Seeder Covering All 22 Models + Complete `docs/` Set + Arabic Client Manual
**Frontend Build:** ✅ Zero errors
**Backend:** ✅ All endpoints verified + `/teachers/me/assignment-requests/:id/availability` (new — teacher-owned availability + smart suggestions for the redesigned alternative-time picker) + `/teaching-subjects` (new — public active-subjects list) + `/admin/teaching-subjects*` (new — list/create/update/archive/unarchive) + `/admin/onboarding/sessions*` (start/get/list/save-student/remove-student/finalize/cancel — incremental onboarding flow) + `/admin/assignments*` (create/list/get/edit-resend/reassign/cancel/check-availability/status-counts) + `/admin/teachers/:id/availability` + `/teachers/me/assignment-requests*` (list/get/respond) + `/admin/onboarding/teacher-with-students` (legacy one-shot wizard, fully preserved) + `/admin/students` + `/admin/teachers/:id/students` + `/admin/teachers/:id/working-hours` + `/wallet/*` + `/admin/payroll/ledger` + `/sessions/:id/accept|decline` + `/subscriptions/:id/renew` + scheduling engine + articles API + courses enterprise API + success-stories API + teacher-performance payroll-readiness API + operations (live/timeline/review-queue) API + public teacher directory API (`/teachers/public`, now excludes draft-onboarding teachers)
**Database:** ✅ MongoDB with **TeachingSubject (new — dynamic teaching-subject/curriculum catalog; the 6 legacy keys seeded with their exact original string values, zero data migration)** + **OnboardingSession (resumable incremental-onboarding draft tracker)** + **ScheduleReservationLock (unique `{teacherId,dayOfWeek,time}` index for atomic slot-reservation concurrency safety)** + **AssignmentRequest (assignment-request state machine, see `ARCHITECTURE_PLAN.md`; `specialization` is now a plain validated string, not a hard enum)** + TeacherWorkingHours + OnboardingRequest (idempotency, legacy one-shot flow) + LessonWallet + LessonTransaction (append-only ledger, incl. `opening_balance` type) + TeacherPayrollEntry (persisted payroll ledger) + ScheduleRule + Session Series + Article + ArticleCategory + Course (expanded; `category` is now a plain validated string, not a hard enum) + SuccessStory (singleton) + Session/Attendance extended with payroll-readiness, outcome, delay, evidence, teacher-acceptance, and compensation fields + review lifecycle fields + unique {seriesId, scheduledAt} dedupe index + `User.gender`/`specializations`/`audienceCategories`/`studentType`/`onboardingStatus`/`onboardingSaveKey` canonical fields (`category`/`specializations` are now plain validated strings, not a hard enum) + `AcademySettings.lessonBufferMinutes`
**Tests:** ✅ `npm test` (server, jest) — **590/590 passing, 53 suites**; `npm test` (client, vitest) — **90/90 passing, 7 files**. Scheduling coverage includes academy wall-time parsing/formatting, day/month boundaries, recurring-session generation/synchronization/deduplication, report tracking, admin dual-party schedule-change notifications, and finish/reschedule controller workflows.

---

## Phase 2 Remaining Scope — Payroll, Adjustments, Renewal, Reports, Survey, Profile Consolidation (2026-09-01, latest)

Full detail in `SESSION_HANDOFF.md`'s matching entry and `FEATURE_TRACKER.md`. Delivers the remainder of `PHASE_2_CHANGE_REQUESTS_AR.md` end-to-end: hourly teacher payroll (snapshot-based, correction/void chain, period lifecycle), teacher/student financial adjustments (reversal-based, no employee entity fabricated), a complete subscription renewal flow (reuses the existing transfer service, transfer-first ordering with compensating rollback), the Quran session report lifecycle (thin wrapper over existing Memorization/Revision/Evaluation models, never duplicating them), missing-report/monthly follow-up tracking, a persisted monthly teacher report snapshot with an auto-draft cron job, an evaluation/renewal survey with a configurable lead time that links to the real renewal flow rather than creating a second one, and the previously-flagged-missing teacher-facing single-student detail page. A dedicated cross-cutting pass found and fixed 3 dead notification deep-links (pointing at nonexistent admin/teacher detail routes) and one missing `require` that would have crashed the monthly-report cron on its first real run.

### Verification
`cd server && npx jest` — 519/519 (45 suites, up from 386). `cd client && npm run build` — 0 errors. **Not done:** no live-browser QA pass on the ~10 new screens this session (backend tests + frontend build only) — recommend a visual/RTL/mobile pass before production sign-off.

---

## Phase 2 Change Requests — Reservation Completeness, Flexible Alternative Schedules, Notification Deep Links, Admin/Teacher Profile Consolidation (2026-08-31)

Full detail in `SESSION_HANDOFF.md`'s matching entry and `FEATURE_TRACKER.md`. Closes a real reservation-hold gap in the already-complete assignment workflow (a teacher's proposed alternative time held no lock, so a second request could grab it while awaiting an admin decision), rebuilds the teacher's alternative-schedule proposal into a real multi-day editor, wires notification click-to-navigate (the `actionUrl` field existed but nothing navigated on click), and consolidates the admin teacher/student profiles per the brief's "don't maintain two competing experiences" instruction — evolving the existing profile pages rather than adding new ones. `checkAvailability`/`getWeeklyAvailability` now tag every busy interval `confirmed` vs. `reserved` (a genuine third UI state, never blended into a confirmed booking), and `AssignmentRequest.teacherResponse.proposedSchedule` replaces the old single-slot `proposedTime` (kept as a backward-compatible mirror) for full multi-day proposals.

### Verification
`cd server && npx jest` — 386/386 (30 new/updated). `cd client && npx vitest run` — 69/69 (+6 new). `cd client && npm run build` — 0 errors. Live-browser QA (Claude-in-Chrome, admin + teacher roles) against the real dev stack and seeded data — notification→navigate, `EditResendModal` proposal prefill, the rebuilt multi-day modal's add/remove/comparison/3-state availability, and every new admin/teacher profile section all confirmed rendering and behaving correctly.

---

## Phase 1 Delivery Readiness Pass (2026-08-28)

Full detail in `PHASE_1_DELIVERY_READINESS_REPORT.md`. This is the genuine live-browser QA pass explicitly deferred by every prior session below ("no browser tooling was available") — the Claude-in-Chrome extension still did not connect after a full restart, so a Playwright-driven real Chromium instance was used instead against the already-running dev backend/frontend/MongoDB.

**Real defects found and fixed (not found by any prior code-review pass):**
1. `components/ui/Input.jsx`'s `<label>` had no `htmlFor`/`id` link to its `<input>` — every form built on the shared `Input` component (teacher/student onboarding, credentials, etc.) had visually-adjacent-but-programmatically-unassociated labels, a real screen-reader/`getByLabel` accessibility gap. Fixed via `useId()`; also wired `aria-invalid`/`aria-describedby` to the error/hint text. Same raw `<label>`/`<input>` pairs (no shared component) in the onboarding wizard's `ActiveStudentCard` and the teacher-profile `AddStudentModal` fixed the same way.
2. Removing a saved student mid-onboarding (`AdminTeacherOnboardingWizardPage.jsx`, both the students-step and final-review list) fired a real, irreversible delete-account-and-release-reservation call with **zero confirmation** — one misclick permanently deleted a student. Added a `window.confirm()` guard naming the student, matching the project's existing lightweight-confirmation convention.
3. `hooks/useAuth.js`'s session-bootstrap effect fired an uncancellable `axios.post('/auth/refresh')` with no `AbortController`; React's `StrictMode` double-invokes the effect in development, so every app load fired two real duplicate requests against the backend (both visibly failing with a console 401 on a cold session). Fixed with a proper abort signal — confirmed via direct network-request capture (2 requests → 1).

**Closed the previously-documented "static 3-color subject badge" limitation** (see the entry immediately below): new `utils/subjectBadge.js` gives the six canonical teaching-subject keys their exact original colors and gives any admin-created dynamic subject a deterministic (hash-of-key, never random) color from a small bounded palette distinct in hue from every canonical color — so a dynamic subject's badge is stable across reloads and never collapses into the generic gray "other" style. Wired into both `AdminCoursesPage.jsx` and the marketing `CoursesPage.jsx`; verified live with a real dynamically-created subject's course rendering a distinct, correctly-labeled badge on both pages. 8 new targeted tests in `utils/__tests__/subjectBadge.test.js`.

**Scenarios exercised live, real backend + real MongoDB, with zero remaining reproducible console errors or failed API requests:** full teacher onboarding (admin-defined password, dynamic-curriculum creation mid-wizard, full-week working hours) → 3-student intelligent scheduling (each new student's auto-picked slot correctly excluded every prior reservation, verified across save → save → save → remove → refresh/resume with exactly the right 2 students surviving, no duplication) → finalize → success page → "add more students to this teacher" (real teacher id, locked-context modal) → new-student assignment request → teacher forced password change → teacher dashboard pending-request section/notification bell → real Arabic assignment message (no `[object Object]`/`undefined`/`NaN` regression) → teacher's redesigned alternative-time modal (no hardcoded default, keyboard-only day selection, real slot picker, note preserved) → admin follow-up queue → edit-and-resend modal pre-fill. Responsive/overflow-checked (via `document.documentElement.scrollWidth` vs. viewport, not just eyeballing) at 360/375/768/1920 with zero horizontal overflow found anywhere tested.

**Not independently re-exercised live this pass (documented, not silently skipped):** the immediate-admin-override checkbox path (present correctly for the Primary Admin, absent for a plain-permission admin — confirmed structurally via `permissions.js`/`rbac.middleware.js`, not click-tested, since granting a second QA account the override permission for a one-off test was judged disproportionate) and full reassign-to-another-teacher (both remain covered by the existing automated `assignment.service.test.js` suite).

### Verification
`cd server && npx jest` — 380/380 passing, unchanged. `cd client && npx vitest run` — 63/63 passing (+8 new). `cd client && npx eslint . --max-warnings 0` — 0 errors (only pre-existing, unrelated warnings, none in a newly-touched line). `cd client && npm run build` — 0 errors. `node -e "require('./src/routes/index.js')"` — clean. All QA-created records (1 teacher, 3 students, 1 course, 2 dynamic-subject test entries, their sessions/schedule-rules/assignment-requests/notifications) deleted from the dev database after evidence capture — confirmed zero remaining via a second dry-run pass.

---

## Alternative-Time Redesign, Dynamic Curriculum Catalog & Phase 1 Readiness Audit (2026-08-28, previous)

Full detail in `PHASE_2_CHANGE_REQUESTS_AR.md`'s "7. إعادة تصميم 'اقتراح موعد بديل' + كتالوج المناهج الديناميكي + تدقيق جاهزية الجزء الأول" and `FEATURE_TRACKER.md`'s matching follow-up table.

**Alternative-time redesign:** The old teacher "propose alternative time" UI was a plain day `<select>` + native `<input type="time">` with no connection to the real availability engine — and, more seriously, the **backend never revalidated the proposed slot at all**, so a stale or already-conflicting proposal was silently accepted. Fixed on both ends: `respondToAssignment`'s `time_change` branch now calls `checkAvailability()` before accepting a proposal, returning 409 + real alternatives (`suggestAlternativeSlots()`) if the slot is no longer free — the same authoritative-revalidation principle already used by the `accept` branch. A new teacher-owned endpoint (`GET /teachers/me/assignment-requests/:id/availability`, ownership enforced by scoping to the teacher's own request) feeds a new picker (`ProposeAlternativeTimeModal.jsx`) built from real availability: smart suggestions with plain-Arabic reasons, single-select day chips with per-day slot counts, and the existing `ScheduleSlotPicker.jsx` (morning/afternoon/evening, 12-hour Arabic, never a hardcoded default) for time selection, ending in a live confirmation sentence before submit.

**Dynamic curriculum catalog:** The 6-value `TEACHING_CATEGORIES` allow-list (`tajweed`/`hifz`/`nazra`/`arabic`/`quran`/`other`) is replaced by a new `TeachingSubject` model + cached service layer as the authoritative source. The 6 legacy keys are seeded with their **exact original string values**, so every already-persisted `User.category/specializations`, `Course.category`, and `AssignmentRequest.specialization` value keeps matching with zero data rewrite. Hard Mongoose `enum`s were removed from all three models — a synchronous schema constraint can never know about an admin-created subject at runtime — and replaced with async, catalog-backed checks (`isValidActiveKey`/`isKnownKey`) at every create/update path. Duplicate creation is prevented via Arabic-diacritic/alef-variant-insensitive and English case/space-insensitive normalization (reusing the existing `utils/arabicNormalize.js`); a repeat "create" returns the existing subject rather than duplicating it. New `curricula.view`/`curricula.manage` permissions were added to the plain-admin default set and auto-backfilled onto every existing admin account by the already-existing `rbacModulePermissionsBackfill` migration — no new migration was needed for that part. A reusable creatable combobox (`TeachingSubjectCombobox.jsx` — search, keyboard nav, create only on explicit Enter/click) now backs teacher specializations, student scheduling (and therefore the onboarding wizard and edit-and-resend automatically), and the course category field; every label-rendering surface across the app now reads from the live catalog instead of a frozen frontend array.

**Phase 1 readiness audit:** Re-ran the full backend and frontend automated suites end-to-end. Investigated the two tests that had been carried as "pre-existing, unrelated failures" since 2026-07-16 rather than continuing to wave them off — both turned out to be genuinely stale (written against an older check-in-tolerance and teacher-payroll policy that a later, documented decision had already superseded); corrected the test expectations to match the current, intentional business rules. **The backend suite is now 100% green — 380/380, zero failures** — the first time this has been true since that entry was first logged.

### Verification
`cd server && npx jest` → **380/380 passing** (32 suites, 0 failures). `cd client && npx vitest run` → **55/55 passing**. `cd client && npx eslint src` → 0 errors (only pre-existing, unrelated warnings). `cd client && npm run build` → 0 errors. `node -e "require('./server.js')"` → full route tree (including the two new route files) loads with no errors.

### Not done / follow-ups (deliberate scope decisions, not oversights)
- No live manual browser QA this session — no browser automation tooling was available in this environment. Verified via code-level tracing and the automated suites above instead. **Resolved by the Phase 1 Delivery Readiness Pass entry immediately above.**
- `AdminCoursesPage.jsx` and the marketing `CoursesPage.jsx` course-browsing filters still use their own static 3-color category badge map (separate from the teacher/assignment surfaces this pass targeted) — filtering by a new dynamic subject already works correctly, but its badge may render with a generic fallback style rather than a dedicated color/icon until a small follow-up extends that map to the live catalog too. **Closed by the Phase 1 Delivery Readiness Pass entry immediately above.**

---

## Phase 2 Part 2c — Incremental Onboarding & Concurrency-Safe Scheduling (2026-08-26)

Fixes a real architectural bug in the Phase 2 Part 2b wizard: because every student lived only in frontend state until the final one-shot submit, a second or third student's availability check never saw an earlier student's already-chosen slot in the same wizard run — the engine would suggest the exact same slot again, and a genuine double-booking was possible at final submit. See `PHASE_2_CHANGE_REQUESTS_AR.md`'s "5. إصلاح معمارية الإعداد التدريجي متعدد الطلاب" for the full checklist.

**Architecture:** The teacher is now persisted immediately (marked `onboardingStatus: 'draft'` — hidden from the public directory and blocked from login until finalized) via a new idempotent, resumable `OnboardingSession` model, deliberately kept separate from the legacy `OnboardingRequest` (an immutable replay cache for the untouched one-shot endpoint). Each student is then saved — account + subscription/opening balance + schedule reservation — in its **own** request/response cycle via a new `saveStudentToSession()` incremental endpoint, reusing `assignmentService.createAssignmentRequest()` exactly as before. Because that reservation is real and durable (or `pending_teacher_approval`) in the database the instant the call returns, the very next student's `checkAvailability()`/`getWeeklyAvailability()` call sees it like any other booking — root cause closed structurally, not patched around in the UI.

**Concurrency safety:** A new lightweight `ScheduleReservationLock` model (unique index on `{teacherId, dayOfWeek, time}`) makes "claim this exact slot" atomic at the database level, closing the residual check-then-write race between two concurrent callers (two admins, or two tabs of the same wizard). A lock conflict returns HTTP 409 with `lockConflict: true` and real, availability-derived `alternativeSlots` (new `suggestAlternativeSlots()` in `availability.service.js` — never a hardcoded "+1 hour" guess). Locks are acquired on every reservation-holding transition and released the moment the reservation becomes durable (an active `ScheduleRule`) or the request leaves every reserving status (rejected/time-changed/cancelled).

**Rollback semantics changed:** unlike the old all-or-nothing wizard, a failed student save now rolls back only that student's own newly-created records — the teacher and every previously-saved sibling student are untouched. Removing a student from an in-progress session releases its reservation (cancels while pending, tears down the ScheduleRule/Session directly if already activated) before deleting the account.

**Frontend:** `AdminTeacherOnboardingWizardPage.jsx` reworked so only one student form is ever expanded (every earlier one renders as a compact, backend-driven summary card with Edit/Remove), with "حفظ الطالب وإضافة طالب آخر"/"حفظ الطالب والمتابعة للمراجعة" as the primary actions, a `localStorage`-backed resume banner, and a final review step that reloads from the backend rather than trusting local state.

### Verification
`cd server && npx jest` — 351/353 passing (2 pre-existing, unrelated `sessionIntelligence` failures, untouched); new coverage: 4 `suggestAlternativeSlots` tests matching the spec's worked examples verbatim, 7 `ScheduleReservationLock` integration tests in `assignment.service.test.js`, 15 new tests in `onboardingSession.service.test.js`. `cd client && npx eslint` — clean (no errors). **Full live 3-student manual browser QA** against the same session's real running dev backend/frontend/MongoDB: teacher saved immediately → Student 1 booked Sunday 12:00 (60 min, direct activation) → Student 2's slot picker correctly excluded 12:00–13:00 (the afternoon list jumped straight from 11:00 ص to 1:00 م) → booked Student 2 at 13:00 → Student 3's picker excluded both 12:00–13:00 and 13:00–14:00 (jumped to 2:00 م) → booked Student 3 at 14:00 → removed Student 2 from the session → confirmed the 13:00–14:00 window re-opened while the other two stayed booked → full page refresh → resume banner appeared exactly as specified → resumed the session → teacher and both remaining students reloaded from the backend with zero duplication → finalized the session → confirmed the teacher then appeared live in the public teacher directory. Test data cleaned up from the dev database afterward.

### Not done / follow-ups (deliberate scope decisions, not oversights)
- `ScheduleReservationLock` protects exact-key collisions (same teacher, same day, same start time) only — not arbitrary partial-interval overlap (e.g. 12:00–13:00 vs 12:30–13:30). Same documented limitation as `wallet.service.js`: no multi-document transactions on this standalone `mongod`. `checkAvailability()` still runs authoritatively immediately before every write to narrow this as far as possible.
- No dedicated admin screen yet lists all in-progress onboarding sessions across every admin — resume today is per-browser (`localStorage`) plus a direct session-id lookup; the backend `listOnboardingSessions()` is already built and ready to back such a screen later without further architectural change.
- "تعديل الطالب المحفوظ" (edit a saved student) is implemented as remove-then-reopen-prefilled rather than a true in-place update endpoint — proportional to scope; a dedicated PATCH could replace it later if the remove/re-add flow proves inconvenient in practice.

---

## Phase 2 Part 2b — Compact Student-Scheduling UX Redesign (2026-08-25)

Full redesign (backend-compatible, not visual-only) of the onboarding wizard's per-student schedule builder, replacing the seven-permanently-visible-weekday-rows layout with a compact, progressive builder — see `PHASE_2_CHANGE_REQUESTS_AR.md`'s "4. إعادة تصميم واجهة جدولة الطالب المضغوطة" for the full checklist. The `ui-ux-pro-max` skill was consulted before implementation; the existing teacher recurring-schedule modal was used as an interaction reference, not copied.

**What changed:** specialization → duration → recurrence pattern (يوميًا/أسبوعيًا/كل أسبوعين/شهريًا, all four genuinely backend-supported) → weekday chips (only for weekly/biweekly) → a time row **per selected day only** (no rows for unselected days) → date range with an explicit "يستمر حتى الإلغاء" toggle → a live weekly-summary card and an expandable monthly-preview drawer. New reusable components `WeekdayChipSelector.jsx` (accessible chips — real buttons, `aria-pressed`, full-name `aria-label`, never a color-only selected/conflict state) and `ScheduleSlotPicker.jsx` (loads real slots from the same availability engine, grouped morning/afternoon/evening, with a loading skeleton and a friendly-Arabic empty/unavailable state — never the raw `00:00–24:00` form). A new pure-logic layer in `utils/assignmentSchedule.js` (`deriveScheduleDays`/`hydrateScheduleSelection` round-trip the compact UI selection to/from the same canonical `{dayOfWeek,time}[]` the backend has always expected — no second, competing schedule representation) also generates real availability-derived suggestions (`buildSuggestions` — nearest slot, same time on another day, same days at a different time) and a client-side recurrence-mirror for the monthly preview.

**Backend additions (justified, not visual-only):** `'daily'` recurrence — already fully supported by `schedule.service.js`'s session generator but excluded from `assignment.service.js`'s validation allow-list — is now accepted; the frontend derives all 7 weekdays at the chosen time so the availability check still validates against every real day. A genuine **latent bug in `'monthly'` recurrence** was found and fixed: `activateAssignment()` was passing the request's `daysOfWeek` straight through, which makes the backend's `generateDates()` treat `'monthly'` identically to `'weekly'` — now `daysOfWeek` is explicitly cleared for monthly rules so they correctly recur on the same day-of-month instead.

**Bug found and fixed during live manual QA (not caught by any prior automated test):** a full working day (`00:00–24:00`) computed client-side for a not-yet-created teacher was silently collapsing to a **zero-length window**, because a new generic time-formatting helper wrapped 1440 minutes back to `'00:00'` instead of preserving the `'24:00'` end-of-day sentinel — every slot on a fully-available day was showing as unavailable/conflicting. Fixed with a dedicated boundary-safe formatter (`minutesToBoundaryTimeStr`), kept separate from the wraparound arithmetic `addMinutesToTime` genuinely needs; locked in with `describeAvailability`/`generateTimeSlots` test coverage.

### Verification
`cd server && npx jest` — 325/327 passing (+5 new cases for `'daily'`/`'monthly'` support). `cd client && npx vitest run` — 41/41 passing (all-new pure-logic suite). `cd client && npm run build` — zero errors. **Live manual browser QA**, continuing the same session's already-running dev backend/frontend/MongoDB: built a real weekly two-day schedule end-to-end (segmented recurrence control, weekday chips, per-day slot pickers, "apply to all"/"copy" actions, live conflict banner, suggestions, weekly-summary card, monthly-preview drawer showing 9 real upcoming occurrences), switched between all four recurrence patterns confirming each renders its correct UI shape, verified inline date-validation blocks progression, and completed a full wizard submission through to real activation (`ScheduleRule` + `Session` documents created) with the new compact builder's payload — zero console errors throughout.

### Not done / follow-ups
- Pixel-accurate device-viewport screenshots (320/768/1024/1440) could not be captured in this environment — `resize_window` did not change the actual rendering viewport (`window.innerWidth` stayed fixed across two independent attempts). Responsive correctness was verified via a Tailwind-breakpoint code audit (mobile-first defaults, `sm:` upgrades, `flex-wrap`) and a computed-style check confirming `flex-wrap: wrap` on the weekday chip row, not a live narrow-viewport visual pass — recommend one manual check in a real resized browser before shipping.
- Immediate-override and reassign-to-another-teacher were not re-exercised in this session's live QA (only unit-tested) — same open follow-up already noted in the Part 2 entry below.
- "Monthly preview" occurrences are all labeled "مخطط جديد" (newly planned) rather than distinguishing existing/conflicting/pending per-occurrence — every selectable slot is already availability-gated before it can be chosen, so a genuine per-date conflict is structurally unlikely; a bespoke per-calendar-date lookup to label it explicitly was judged disproportionate to this pass's scope.

---

## Phase 2 Part 2 — Credentials, Availability Engine & Assignment Workflow (2026-08-25)

Full implementation (backend + frontend, verified live in a running dev environment against real MongoDB data — not a plan) of the Part 2 scope deferred at the end of Part 1: student initial-credential options, the automatic teacher-availability engine, recurring-schedule activation from the wizard, and the complete new-student assignment-request workflow (teacher accept/reject/propose-time, admin edit-resend/reassign/cancel/immediate-override). See `PHASE_2_CHANGE_REQUESTS_AR.md`'s "متابعة استكمال الجزء الأول وتنفيذ الجداول والإسناد" section for the task-by-task checklist and `ARCHITECTURE_PLAN.md`'s "Phase 2 Part 2" section for the full schema/service design. Summary here.

**Student/teacher credentials:** exactly two modes (no academy-wide/shared password) — `config/credentialMode.js#resolveCredentialInput()` resolves either the existing automatic secure-generation path or an administrator-typed password validated by the new `config/passwordPolicy.js` (min 8 chars, letter + digit, confirmation match — all re-checked server-side regardless of frontend validation). `requirePasswordChange` (default `true`) is independent of the mode and drives `User.mustChangePassword`, enforced by the pre-existing `MustChangePasswordGate` — verified live: a manually-set password with the default force-change flag correctly blocked the dashboard until changed. Plaintext is never stored, logged, or returned outside the one-time auto-generated-credential response.

**Availability engine (`services/availability.service.js`):** computes real free weekly windows from `TeacherWorkingHours` minus active `ScheduleRule` occurrences, real `Session` documents (60-day exception lookahead), and currently-reserved `AssignmentRequest`s — bounded, indexed queries only, buffer-aware, duration-aware (a window narrower than the requested lesson is excluded, not just checked at the start instant). `checkAvailability()` is the single authoritative re-check called again immediately before every write (create/accept/edit-resend) — the frontend's own preview (`GET /admin/teachers/:id/availability`, `POST /admin/assignments/check-availability`) is never trusted for the actual save decision. For a teacher who does not exist yet (mid-wizard), the wizard instead estimates free windows purely from the just-entered working hours client-side (`computeLocalFreeWindows`) — verified live to compute the identical result the server would once persisted.

**Assignment-request state machine (`models/AssignmentRequest.js` + `config/assignmentStatus.js` + `services/assignment.service.js`):** `draft → pending_teacher_approval → accepted → completed`, with `rejected`/`time_change_requested` looping back to `pending_teacher_approval` (edit & resend) or forward to `reassigned` (a new linked request, `previousRequestId`/`replacementRequestId`), or terminating at `cancelled`. An existing student (`studentType:'existing'`) or an authorized immediate-override (`assignments.override` permission, mandatory reason, audited) skips the approval step and activates synchronously in the same request — creates the real `ScheduleRule`(s) (grouped by shared time-of-day) and generates the existing bounded `generateSessionsFromRule()` sessions. A new student without override is left pending and the teacher is notified. The default Arabic assignment message (`config/assignmentMessage.js`) is generated from canonical data, editable before sending, and stored for history; gender-aware wording is used only when `User.gender` is explicitly set (never inferred), falling back to neutral phrasing — **a live-QA-caught bug where the days line rendered `[object Object]` was found and fixed** (now covered by a dedicated regression test).

**Wizard/UI integration:** the onboarding wizard's per-student card gained substep tabs (بيانات / تسجيل الدخول / الجدول) to avoid an overly long card, each with a collapse-to-summary state; the "add student" flow (teacher profile) gained the identical credential + schedule tabs. New teacher inbox `TeacherAssignmentRequestsPage.jsx` ("طلبات الطلاب", with a sidebar pending-count badge) and admin follow-up queue `AdminAssignmentRequestsPage.jsx` ("متابعة طلبات إسناد الطلاب", with a rejected/needs-change-count badge) — both deep-link from notifications straight to the specific request. New shared components: `PasswordCredentialSection.jsx`, `StudentScheduleSection.jsx` (day/time picker + live availability + monthly-occurrence preview + conflict banner).

**Bug found and fixed while verifying live (not by code review alone):** `admin.controller.getTeacher`'s "assigned students" list and the teacher-list student count were built only from `Subscription` records — a student scheduled via the new assignment workflow with no package yet (an explicitly supported case) was invisible on the teacher's own admin profile. Fixed by merging in schedule-only students (deduped against the subscription-based list) tagged `status: 'schedule_only'`; the admin teacher **list** page's per-row count still reflects subscriptions only (lower-traffic, noted as a follow-up, not blocking).

### Verification
`cd server && npx jest` — 320/322 passing (2 pre-existing, unrelated `sessionIntelligence.test.js` failures, confirmed untouched, documented since 2026-07-16). `node -e "require('./src/routes/index.js')"` — full route/controller/model tree loads with zero errors. `cd client && npm run build` — zero errors. **Live manual browser QA performed this session** (a dev MongoDB + backend + frontend were already running in this environment) using the real admin/teacher accounts and UI, not curl-only: full wizard happy path (teacher created with a manually-set password + forced change, one existing-student with a schedule → direct activation, real `ScheduleRule` + 5 real `Session` documents generated at the correct weekly dates), a new-student pending request → teacher rejection with reason → admin edit-and-resend → teacher acceptance → activation, the automatic-availability engine both in local (no-teacher-yet) and server-authoritative modes (correctly splitting a working day around an existing booking), the `mustChangePassword` gate blocking and clearing correctly, and real-time notification delivery for every event above — zero console errors throughout. This pass is what caught and fixed the two bugs listed above.

### Not done / follow-ups (deliberate scope decisions, not oversights)
- Immediate-override and reassignment were verified via the automated test suite (`assignment.service.test.js`) but not re-confirmed in the live browser pass this session (accept/reject/edit-resend were, end-to-end) — recommend a quick manual pass before the very first real production use of the override.
- The "monthly preview" in the schedule UI is a lightweight client-side estimate of upcoming occurrences (a list of dates), not a full calendar-grid visualization — the backend's real bounded session generation is the authoritative artifact.
- The admin teacher-**list** page's per-row "students" count is still subscription-based only (the individual teacher profile page was fixed this session); a schedule-only student is invisible there until a package is added. Low-traffic surface, flagged for a follow-up pass.
- No dedicated standalone "create assignment" admin form outside the wizard/add-student flows — existing-student direct assignment and new-student requests are created through those two surfaces; the admin page's own scope is the follow-up queue (edit-resend/reassign/cancel), matching where the brief's §11 concern actually lives.
- Teacher-side alternative-time proposals are not automatically soft-reserved (an explicit open business question in `PHASE_2_CHANGE_REQUESTS_AR.md` §19, left unanswered) — only the original requested slot is held while `pending_teacher_approval`.

---

## Phase 2 Part 1 — Operational Foundation: Teacher/Student Onboarding (2026-08-25)

Full implementation (not a plan/audit) of Phase 2 Part 1 per `PHASE_2_CHANGE_REQUESTS_AR.md`'s operational-foundation scope — see that file's "متابعة تنفيذ الجزء الأول" section for the task-by-task checklist and `ARCHITECTURE_PLAN.md`'s "Phase 2 Part 1" section for the full schema/service design. Summary here.

**Teacher/student taxonomy:** `User.specializations` (plural teaching specializations) and `User.audienceCategories` (children/teenagers/adults/men/women/all — a deliberately separate taxonomy) added additively; the legacy singular `category` field is auto-mirrored via a `pre('save')` hook so nothing that reads it breaks. `User.studentType` (`existing`/`new`, default `'existing'`) added the same way — every pre-existing student is safely classified with zero behavior change. Admin teacher list/search and the public teacher directory both gained specialization/audience-category filters.

**Teacher working hours:** new `TeacherWorkingHours` model — per-day full-day/unavailable/custom-periods, with overlap/format validation shared (in spirit) between backend (`config/workingHours.js`) and a client-side mirror for inline UX. A "break" is just the gap between two custom periods, not a separate stored concept. This is storage + validation only — the automatic free-slot computation against booked sessions is explicitly Part 2. A new `AcademySettings.timezone` (default `Africa/Cairo`) is the first academy-wide timezone setting, resolved through one function rather than scattered hardcoded strings.

**Opening lesson balance:** a new subscription can now record that some of the package's lessons were already used before entering the system — enter either the used or remaining count, the other is derived and validated (`computeOpeningBalance()`), and only the *remaining* portion is credited to the student's `LessonWallet` as a new, distinctly-typed `opening_balance` ledger transaction. Shared by both the standalone subscription-creation endpoint and the new onboarding wizard, so the logic exists in exactly one place.

**"Create a teacher with their students" wizard:** `POST /admin/onboarding/teacher-with-students` creates a teacher (profile/specializations/audience/hourly rate/working hours) plus zero or more students (each with an optional package + opening balance) as one logical operation. Since this MongoDB deployment has no multi-document transactions (standalone `mongod`, same constraint the Lesson Wallet redesign documented), the wizard validates everything up front, then performs the writes with full id-tracking, and runs an explicit compensating rollback — deleting exactly what that call created — on any failure partway through, so a partial failure is never reported as a success. A `clientRequestId` gives idempotent replay protection against a network retry or accidental double-submit. New standalone `POST /admin/students` (create a student alone) and `POST /admin/teachers/:id/students` (add a student to an existing teacher later, from their profile) reuse the identical subscription/opening-balance logic.

**Admin teacher profile:** new `AdminTeacherProfilePage.jsx` (`/admin/teachers/:id`) shows the full administrative picture — profile/specializations/audience/hourly rate, working hours (view + inline edit), and every assigned student with their type, package, and **live** `LessonWallet` balance (not a stale mirror) — plus an "add student" action. `AdminTeachersPage.jsx` gained a wizard entry point, multi-select specialization/audience editors (replacing the old single-category dropdown), and a working-hours tab in the existing teacher CRM panel. `AdminStudentsPage.jsx` gained student-type filtering, a studentType badge/column, and a standalone "create student" action.

**Security/audit hardening found and fixed while implementing this (in-scope per the brief's explicit audit requirements):** `admin.controller.createTeacher` was spreading `req.body` directly into `User.create()` with no allow-list (a real mass-assignment gap, now fixed with an explicit `TEACHER_WRITABLE_FIELDS` list); neither `createTeacher` nor `updateTeacher` emitted any audit log before this pass despite being explicitly listed as a sensitive operation requiring one — both now do, with a dedicated `admin.update_teacher_hourly_rate` entry whenever the protected hourly-rate field changes.

### Verification
`cd server && npx jest` — 243/245 passing (new: `lessonPolicy`, `workingHours`, `subscription.service`, `onboarding.service`, `adminOnboarding.controller`, updated `admin.teacher.controller`, updated `teacherPublic`; the 2 failures are the same pre-existing, unrelated `sessionIntelligence.test.js` cases documented since 2026-07-16 — confirmed untouched). `node -e "require('./src/routes/index.js')"` — full route/controller/model tree loads with zero errors. `cd client && npm run build` — zero errors, verified twice (main implementation + a responsiveness fix to `WorkingHoursEditor`'s period-input row for narrow viewports). No live-browser QA pass this session (no running dev DB/servers in this environment) — recommend one focused on: the full wizard happy path (teacher + 2+ students, at least one with a used/remaining split), the rollback path (submit with a duplicate email partway through), and the working-hours editor's overlap validation, before relying on this in production.

### Not done / follow-ups (explicitly out of Part 1 scope, per the brief)
- Automatic free-slot/availability engine (computing bookable times from working hours + existing bookings) — Part 2.
- Full recurring lesson-schedule generation when a student is added — Part 2.
- Teacher accept/reject of a new-student assignment request (`studentType:'new'` is the structural groundwork only) — Part 2.
- Teacher self-service editing of their own working hours — the brief only specified "authorized administrators" for Part 1; left as an open decision for Part 2 (see `PHASE_2_CHANGE_REQUESTS_AR.md` §19).

---

## Lesson Wallet Architecture — Subscription/Lesson System Redesign (2026-07-29, latest)

Full redesign of lesson entitlement, requested explicitly after the earlier decision to defer "Wallet" as out-of-scope (see the 2026-07-11 seeder audit entry below — this session is that deferred work, now formally commissioned). The prior model tied a student's right to book/attend lessons to `Subscription.sessionsRemaining` and a calendar `endDate`; a full code audit (this session) established that booking was never actually gated by either, renewals had no dedicated flow, there was no refund/compensation/freeze system, and teacher payroll was computed live on every request with no persisted artifact.

**New canonical model:** `LessonWallet` (one per student — `remaining`/`totalPurchased`/`totalUsed`/`bonusLessons`/`compensationLessons`/`frozenLessons`/`transferredIn`/`transferredOut`) backed by an append-only `LessonTransaction` ledger (every balance movement — purchase, consumption, reversal, refund, bonus, compensation, freeze/unfreeze, transfer, renewal, manual adjustment — is one immutable, auditable row). `Subscription` is demoted to a billing-cycle/purchase record (`sessionsRemaining`/`totalSessions` are now a deprecated, wallet-maintained mirror kept for backward compatibility, never written directly). Single write chokepoint (`wallet.service.js`) uses deterministic idempotency keys + atomic `$inc` rather than MongoDB multi-document transactions — this deployment's MongoDB runs as a standalone `mongod`, not a replica set, so cross-collection ACID transactions aren't available; a `reconcile-wallets` script (`npm run reconcile-wallets`) recomputes wallet counters from the ledger and reports/fixes any drift.

**New business rules implemented** (`lessonDeduction.service.js`, `config/lessonPolicy.js`): student no-show now deducts a lesson (teacher still paid — that rule was already correct and is preserved); teacher cancellation/no-show never deducts and auto-grants a compensation lesson; student cancellation returns the credit if ≥12h before the scheduled time, deducts it otherwise; student self-cancellation is newly implemented (previously hard-blocked at 403). Booking-conflict prevention (`booking.service.js`) now rejects overlapping teacher/student bookings with 409, and `ScheduleRule.timezone` — previously stored but silently ignored (slot generation used server-local time) — is now correctly applied via `date-fns-tz`. Teacher payroll is now recorded as a persisted `TeacherPayrollEntry` per resolved session instead of purely live-computed; existing payroll endpoints keep their exact response shape, now sourced from that ledger. A new opt-in `teacherAcceptanceStatus` field/endpoints (`/sessions/:id/accept|decline`) exist but nothing currently sets a session to `pending`, so this is a dormant capability, not yet wired into the booking flow.

**Migration:** `backfillLessonWallets.js` (auto-runs on boot, same pattern as the existing `backfillSubscriptionConsumed.js`) reconstructs a wallet + one `migration_import` transaction per student from their historical `Subscription.totalSessions`/`sessionsRemaining` sums — no manual re-entry, no data loss.

**Frontend:** new shared components (`WalletBalanceCard`, `LessonTransactionTable`, `ProgressRing`, `LessonTimeline`); `StudentSubscriptionPage` now shows the wallet balance breakdown + transaction history; `AdminSubscriptionsPage`'s adjust modal replaced its raw `sessionsRemaining` field with real wallet actions (adjust/freeze/resume/grant-compensation, each producing an auditable transaction); `AdminTeacherPerformancePage` gained a payroll-ledger browser section; students can now cancel their own sessions with window-aware credit/deduction feedback. Full backend rewired end-to-end (`session.controller.js`, `attendance.controller.js`, `teacherAttendanceSweep.job.js`, `teacherPerformance.service.js`, `enrollment.controller.js`, `subscription.controller.js`); remaining ~20 unrelated dashboard pages (schedule, homework, evaluations, articles, courses, etc.) were intentionally left untouched. See `ARCHITECTURE_PLAN.md`'s Lesson Wallet section for the full design and `FEATURE_TRACKER.md` for the item-by-item status.

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
