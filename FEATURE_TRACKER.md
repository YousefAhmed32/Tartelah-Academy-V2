# Tartelah Online - Feature Tracker

Legend: ✅ Complete | 🔄 In Progress | ⏳ Not Started | ❌ Blocked

## UX Hardening Pass — Session Lifecycle Docs, Teacher Daily Focus, Check-in Window, Wizard Progress, Student Transparency — 2026-09-08 (latest)

Full detail in `SESSION_HANDOFF.md`'s matching entry. Phase 1 of a large 5-work-package UX brief (onboarding wizard, premium schedule builder, teacher/student/admin lesson lifecycle UX, lifecycle audit+docs) — delivered the packages completable end-to-end with real verification; the largest items (full drag-and-drop weekly planner, `ScheduleReservationLock` concurrency hardening, full multi-student onboarding workspace rebuild) are explicitly scoped out with a documented reason, not silently skipped.

| Task | Status | Notes |
|------|--------|-------|
| Canonical lesson lifecycle doc + guide | ✅ | `docs/SESSION_LIFECYCLE_GUIDE_AR.md` traced directly from executable code; new reusable role-aware `SessionLifecycleGuide.jsx` ("كيف تعمل الحصة؟"), wired into teacher/student/admin session pages |
| Cron trigger timezone drift | ✅ fixed | All 5 cron jobs used the legacy `'Asia/Riyadh'` default instead of the academy's actual `Africa/Cairo` setting — fixed to use the canonical `DEFAULT_ACADEMY_TIMEZONE` |
| Teacher "اليوم" daily-focus view | ✅ | New default landing tab: always-expanded hero session with live countdown, grouped agenda (الآن/القادمة/تحتاج استكمالًا/المنتهية), missing-Quran-report queue merged in |
| Backend check-in window enforcement | ✅ fixed | `startSession` had zero window enforcement — any session could be checked into at any time via direct API call. Now rejects (400) a non-admin check-in >60min before scheduled start; frontend shows a genuine "not open yet" readiness state with countdown instead of a misleadingly-enabled button |
| Post-completion finish receipt | ✅ | `FinishReceiptModal.jsx` — real attendance/outcome/wallet-effect/payroll-status/homework/evaluation summary; backend `finishSession` now returns real `walletEffect` |
| Ambiguous slot-time formatting | ✅ fixed | `formatTimeArabic12Strict` — the exact "12:30 ص vs منتصف الليل" bug the brief named, for every slot-instant display |
| Onboarding wizard progress sidebar | ✅ | Wider container + desktop sidebar: data-derived completion %, error-aware vertical stepper, per-stage checklist. Full multi-student workspace rebuild NOT done this pass |
| Student session transparency | ✅ | Session rows show teacher check-in / outcome / wallet effect (existing fields, zero new queries); payroll amounts deliberately excluded |
| Verification | ✅ | Backend `npx jest` 554/554 (+13 new). Frontend `npx vitest run` 82/82 (+6 new). `npm run build` 0 errors. `eslint` 0 errors on every touched file. Live-browser verification against real seeded data (dev-login, all 3 roles) — countdown math, queue merging, guide modal, student history enrichment all confirmed correct |
| Not done this pass | — | Full drag-and-drop weekly planner (Package B); `ScheduleReservationLock` partial-overlap concurrency hardening; full onboarding multi-student workspace rebuild (in-place edit, cross-admin session list UI, accessible confirm dialogs, full blur-validation error summary); live pointer/keyboard interaction QA of the schedule picker and 320-1920px screenshots (browser-automation tooling in this environment could not produce a real wide viewport or reliable coordinate clicks this session — verified via DOM queries + code review instead) |

## Admin UI Quality Pass — Responsive, Typography/Contrast, Unified Profiles, Combobox — 2026-09-05

Full detail in `SESSION_HANDOFF.md`'s matching entry.

| Task | Status | Notes |
|------|--------|-------|
| Typography: missing font weight | ✅ | Tajawal 600 (what `font-semibold` actually requests) was never loaded, forcing browser-synthesized bold everywhere — added to the Google Fonts request |
| Contrast: shared muted-text token | ✅ | `text-[#9b7fd6]` (~3.28:1, fails AA) was the de-facto muted-text color across the whole light-theme app — 44 occurrences/37 files replaced with the already-established `#7c6aaa` (~4.66:1, passes AA) in one shared-token pass |
| Responsive: narrow forms on wide screens | ✅ | `AdminPayrollPage` period detail + `AdminTeacherReplacementPage` (both steps) — hardcoded `max-w-4xl` single columns restructured into responsive multi-column layouts that use the freed width for real content |
| Searchable teacher/student combobox | ✅ | New `PersonCombobox.jsx` (same established pattern as `TeachingSubjectCombobox.jsx`) replaces every native `<select>` fetching up to 500 teachers — `AdminTeacherReplacementPage` (source+target) and `StudentTransferModal` (target teacher) |
| Unified teacher profile | ✅ | Merged the `AdminTeachersPage` drawer (info/performance/hours/edit/reset-password) and the separate, incomplete `AdminTeacherProfilePage` into one tabbed authoritative profile: نظرة عامة/الطلاب/الأداء/الرواتب/الحساب, deep-linkable via `?tab=`. List click now navigates straight there |
| Unified student profile | ✅ | Same merge for `AdminStudentsPage`'s drawer + `AdminStudentDetailPage`: نظرة عامة/الاشتراك والمحفظة (new: real wallet ledger, renewal history)/الأكاديمي (existing sub-tabs unchanged)/النقل (new: real transfer history, previously never surfaced)/الحساب. Fixed a real dead link (`?edit=` never read by the list page) |
| Backend: additive support for the above | ✅ | `User.notes` made writable (existed, wasn't exposed); `renewal.controller.js` gained a validated `studentId` filter; `transfer.service.js#getStudentTransferHistory` now populates teacher names (was returning raw ObjectIds, unused until now); `AdminMonthlyReportsPage`/`AdminQuranReportsPage` read `?teacherId=`/`?studentId=` from the URL |
| Verification | ✅ | Backend `npx jest` 528/528 (no regressions). Frontend `npx vitest run` 76/76. `npm run build` 0 errors. `eslint` 0 errors/0 new warnings on every touched file. Live API verification against the real dev DB (all new/changed endpoints, `notes` round-trip, permission-boundary 403 for a teacher token on admin student routes) |
| Not done this pass | — | No live-browser visual/RTL/keyboard/mobile QA (Chrome extension not connected either time it was checked) — verified structurally + at the API layer only. Other listed pages (Sessions, Operations Center, Subscriptions, Schedule Rules, Settings) got the shared contrast-token fix automatically but were not individually re-audited for layout at each breakpoint. Surveys not added to either unified profile (no studentId/teacherId filter on that endpoint yet) |

## Notification Hub Hardening — Central Registry, Dedup, Legacy-Safe Detail View — 2026-09-05 (latest)

Full detail in `SESSION_HANDOFF.md`'s matching entry. The notification system was already largely built (real-time, click-to-navigate, archive/bulk) from 2026-07-11 and 2026-08-31 — this pass closed the remaining gaps against the fuller "reliable, actionable hub" brief.

| Task | Status | Notes |
|------|--------|-------|
| Centralized destination/validation registry | ✅ | `server/src/config/notificationDestinations.js` — every `actionUrl` validated at write time against a whitelist mirroring the frontend `ROUTES`; unsafe/unknown values dropped + logged, never persisted. Frontend mirror `isSafeInternalPath` guards every `navigate(actionUrl)` call |
| Dead link found + fixed | ✅ | `teacherReplacement.service.js` pointed at `/admin/transfers/batches/:id`, never a real route — fixed to `/admin/teachers/replace/:id`, caught by the new validator |
| Structured entity metadata | ✅ | `Notification.entityType` (additive), auto-filled from `type` via a central default map when a producer doesn't set one |
| Cron/dedup idempotency | ✅ | `metadata.dedupeKey` opt-in check in `notification.service.js` (single + batch). Wired into `teacherAttendanceSweep.job.js`, `subscriptionExpiry.job.js` (replaced a fragile title-regex dedup, added a missing guard on the "expired" branch), `sessionReminder.job.js` (replaced a restart-losing in-memory `Set`) |
| Attendance alerts previously had **no destination at all** | ✅ fixed | The exact "generic, doesn't take you anywhere" complaint from the brief's screenshots — teacher missed/no_show and admin no-show-alert notifications had zero `actionUrl`. Now `/teacher/attendance` and `/admin/operations` |
| Non-actionable notifications show full details | ✅ | New `NotificationDetailModal.jsx`, opened by the bell, the Center, and the dashboard widget whenever there's no safe `actionUrl` — previously a dead click |
| Notification Center: missing type filters | ✅ | `payroll`/`renewal`/`report`/`survey` existed as real, already-linked notification types since 2026-09-01 but had no icon/color config or filter tab — rendered as generic "نظام", unfilterable. Fixed |
| Notification Center: pagination | ✅ | Bounded "load more" (steps of 50) replacing the flat unpaginated 100-item cap, using the backend's existing `page`/`limit` params |
| Verification | ✅ | Backend `npx jest` 528/528 (+9 new). Frontend `npx vitest run` 76/76 (+7 new). `npm run build` 0 errors. Live data-layer verification against the real dev DB via `dev-login` (22/22 checks: actionUrl validation, dedup single+batch, legacy-doc compatibility) + real REST calls (existing legacy rows render safely, `mark-all-read` verified end-to-end) |
| Not done this pass | — | No live-browser/visual/RTL QA (Chrome extension not connected this session — see honest limitation in `SESSION_HANDOFF.md`); no new drawer/panel (dedicated per-role routes already give SPA-fast access from the bell, judged sufficient); no new highlighted-row deep-linking for session/homework/evaluation notifications (consistent with the 2026-08-31 pass's proportionality call) |

## Phase 2 Remaining Scope — Payroll, Adjustments, Renewal, Reports, Survey, Profile Consolidation — 2026-09-01

Full detail in `SESSION_HANDOFF.md`'s matching entry. Delivers the remainder of `PHASE_2_CHANGE_REQUESTS_AR.md` end-to-end.

| Task | Status | Notes |
|------|--------|-------|
| Hourly teacher payroll | ✅ | `TeacherPayrollEntry`/`TeacherPayrollPeriod` — `sessionPay = hourlyRateSnapshot × payableDurationMinutes ÷ 60`, snapshotted at record time, void+supersede chain for corrections after approval/payment, full period lifecycle (open→pending_review→approved→paid). `payroll.view/manage/approve/pay/export` permissions (approve/pay excluded from default admin). `AdminPayrollPage.jsx` + `TeacherPayrollPage.jsx` |
| Bonuses/deductions/settlements | ✅ | `financialAdjustment.service.js` — reversal-based (never void+offset double-cancel). Students via wallet bonus, teachers via payroll ledger adjustment. No employee entity fabricated — schema escape hatch documented instead |
| Subscription renewal | ✅ | `SubscriptionRenewalRequest` + `renewal.service.js` (transfer-first ordering, reuses the existing `transferService`, compensating rollback). Student renewal modal + history on `StudentSubscriptionPage.jsx`; `AdminSubscriptionRenewalsPage.jsx`. Never auto-renews/charges |
| Quran session report lifecycle | ✅ | `QuranSessionReport` (draft→submitted→correction_requested→approved), references Memorization/Revision/Evaluation by `sessionId` rather than duplicating. Teacher/admin/student pages |
| Missing-report + monthly tracking | ✅ | `reportTracking.service.js` — bounded, indexed, academy-timezone-aware daily/monthly completion queries |
| Monthly teacher report | ✅ | `MonthlyTeacherReport` persisted snapshot (never live-recomputed), auto-drafted by `jobs/monthlyReport.job.js` on month close, full review lifecycle |
| Evaluation/renewal survey | ✅ | `Survey` + `jobs/surveyTrigger.job.js`, configurable `surveyLeadDays` lead time, idempotent via unique index, links to the real renewal flow rather than a second parallel one |
| Teacher-facing student detail page | ✅ | Was flagged missing in the 2026-08-31 pass (see "Not done this pass" below) — `GET /teachers/me/students/:studentId` (ownership-checked) + `TeacherStudentDetailPage.jsx`, linked from `TeacherStudentsPage.jsx`. Financial/cross-teacher data excluded by design |
| Admin student/teacher profile consolidation | ✅ | Quran-reports tab + renewal-requests link on student detail; payroll periods + Quran/monthly-report links on teacher profile |
| Notification deep-link audit | ✅ fixed | Found 3 notifications (`monthlyReport`×2, `quranReport`×1) pointing at nonexistent `/admin|teacher/…/:id` detail routes — neither list page supports per-item deep-linking. Retargeted to the real list routes; added 2 previously-missing notifications (survey-due, monthly-report-auto-generated) |
| Permission/audit/pagination cross-check | ✅ | All new permission keys registered + correctly default-granted/excluded; `logAction` coverage matches the existing student-self-service-unlogged / admin-action-logged convention; every new admin list endpoint paginated |
| Verification | ✅ | Backend `npx jest` 519/519 (45 suites). Frontend `npm run build` 0 errors |
| Not done this pass | — | No live-browser QA on the ~10 new screens (backend tests + build only); `generateAllForMonth` has no batching (fine at current scale, needs chunking well before 500+ teachers); cron jobs verified by reading, not observed firing live |

## Phase 2 Change Requests — Reservation Holds, Flexible Alternative Schedules, Notification Deep Links, Admin Profiles — 2026-08-31

Full detail in `SESSION_HANDOFF.md`'s matching entry. Delivered against `PHASE_2_CHANGE_REQUESTS_AR.md` items #1 (reservation completeness), #2 (flexible alternative schedule), and the admin-profile/notification/assignment-UX requests layered on top of the already-complete §17 assignment workflow.

| Task | Status | Notes |
|------|--------|-------|
| Teacher-proposed alternative time now holds a real reservation | ✅ | `time_change_requested` was previously unprotected — a second request could grab the exact slot a teacher had just proposed. `RESERVING_STATUSES`/`RESERVING_SLOT_SOURCE` now cover it; `ScheduleReservationLock` release-then-reacquire mirrors `editAndResend`'s pattern; 3 new availability tests + 3 new assignment-service tests |
| Confirmed vs. temporarily-held distinction surfaced everywhere | ✅ | `checkAvailability`/`getWeeklyAvailability` now tag every busy interval `kind: 'confirmed'\|'reserved'`; `ScheduleSlotPicker`/`StudentScheduleSection` render a 3rd amber "محجوز مؤقتًا — بانتظار الموافقة" state, never merged into a confirmed booking |
| Flexible multi-day alternative-schedule proposal | ✅ | `ProposeAlternativeTimeModal.jsx` rebuilt: pre-fills from the current schedule, add/remove any weekday, per-day real-availability time picker, original-vs-proposed comparison panel with added/changed/removed badges. Backend: `AssignmentRequest.teacherResponse.proposedSchedule.days[]` (array, legacy `proposedTime` kept as a mirror), `respondToAssignment`'s `time_change` branch validates + locks the whole set atomically |
| Admin edit-and-resend pre-fills from the teacher's proposal | ✅ | `EditResendModal` defaults to `proposedSchedule.days` when present, with a visible "تم تعبئة الجدول تلقائيًا من اقتراح المعلم" banner |
| Notification click → mark read + navigate | ✅ | `NotificationBell`/`NotificationCenter` items are real buttons that mark read and `navigate(actionUrl)`; `actionUrl` added to every remaining producer (session/homework/evaluation/wallet/enrollment/schedule-rule/website-contact) that lacked one |
| Admin teacher profile consolidated | ✅ | Clickable student rows → `AdminStudentDetailPage`; new pending-requests card, recent-sessions card (previously-fetched, never-rendered `recentSessions`/`scheduleRules` now shown), workload row, `reports.view`-gated compensation card (`teacher-performance/admin/:id/summary` + a rate×duration reference grid) |
| Admin student profile consolidated | ✅ | Assigned-teacher card (links to their profile), "سجل طلبات الإسناد" link, new "الحصص" tab (completed/upcoming/cancelled/missed) |
| Admin assignment list deep-link filters | ✅ | `AdminAssignmentRequestsPage` reads `?teacherId=`/`?studentId=`; teacher/student names on each row are now real links |
| Teacher "طلابي" page rebuilt richer | ✅ | Expandable per-student cards: lesson-status counts, next/last lesson, wallet balance (teacher-authorized), latest evaluation note, package name — `getMyStudents` backend rewritten to compute all of it in one bounded call |
| Assignment message preview UX | ✅ | Was fully hidden by default, then a giant redundant wall of text when expanded. Now a permanent 2-line preview + explicit "عرض الكل"/"نسخ" — never hidden, never dominates the card |
| Verification | ✅ | Backend `npx jest` 386/386 (30 new). Frontend `npx vitest run` 69/69 (+6 new). `npm run build` 0 errors. Live-browser QA (admin + teacher roles): notification→navigate, EditResendModal prefill, the rebuilt multi-day modal's add/remove/comparison/3-state slot picker, admin teacher/student profile sections, teacher students page — all confirmed against real seeded data |
| Not done this pass | — | No new teacher-facing student full-profile page (names/avatars on `TeacherStudentsPage` have nowhere permitted to link to yet); highlighted-row deep-linking for session/homework/evaluation notifications (they land on the correct list page, not a scrolled-to/highlighted row); full payroll/bonus/deduction ledger UI (§7/§10 of `PHASE_2_CHANGE_REQUESTS_AR.md`, explicitly out of this pass's scope, unaffected) |

## Phase 1 Delivery Readiness Pass — 2026-08-28

Full detail in `PROJECT_STATUS.md`'s matching entry and `PHASE_1_DELIVERY_READINESS_REPORT.md`. The real live-browser QA pass every prior session below had deferred — real Playwright-driven Chromium, real dev backend/MongoDB, not code tracing.

| Task | Status | Notes |
|------|--------|-------|
| Live browser QA across mandatory Phase 1 scenarios | ✅ | Onboarding wizard (admin-defined password), dynamic-curriculum creation mid-wizard, 3-student intelligent scheduling exclusion (verified across save/remove/refresh-resume), finalize + success page + "add more students", new-student approval workflow, teacher forced password change, Arabic assignment message, redesigned alternative-time modal (keyboard-only day selection), admin follow-up queue + edit-and-resend prefill |
| Responsive/overflow audit | ✅ | 360/375/768/1920 checked via `scrollWidth` vs. viewport (not eyeballing) — zero horizontal overflow found; modal internal-scroll + footer-non-overlap verified structurally and with a real non-fullPage screenshot |
| `Input.jsx` label/input association bug | ✅ fixed | Shared component's `<label>` had no `htmlFor`/`id` — every form built on it (`getByLabel` failed in Playwright, and real screen readers) was affected. Fixed via `useId()` + `aria-invalid`/`aria-describedby`; same raw-label pattern fixed in the onboarding wizard's `ActiveStudentCard` and the teacher-profile `AddStudentModal` |
| Missing remove-student confirmation | ✅ fixed | `AdminTeacherOnboardingWizardPage.jsx` fired a real, irreversible delete-account-and-release-reservation on one click with zero confirmation — added `window.confirm()` |
| Duplicate `/auth/refresh` requests on every app load | ✅ fixed | `hooks/useAuth.js`'s bootstrap effect had no `AbortController`; `StrictMode` double-invoked it in dev, firing two real requests (both visibly 401ing on a cold session). Fixed — confirmed 2→1 via direct network capture |
| Subject-badge dynamic-color limitation | ✅ closed | New `utils/subjectBadge.js` — bounded, deterministic (hash-of-key) palette for dynamic subjects, distinct from the 6 canonical colors, never random/generic-gray. Wired into `AdminCoursesPage.jsx` + marketing `CoursesPage.jsx`; 8 new tests |
| Automated regression re-run | ✅ | Backend 380/380 (unchanged), client 63/63 (+8 new), ESLint 0 errors, production build 0 errors |
| QA data cleanup | ✅ | All QA-created records (1 teacher, 3 students, 1 course, 2 test dynamic-subject entries + their sessions/schedule-rules/notifications) deleted from the dev database after evidence capture |

## Phase 2 Part 1 — Operational Foundation (Teacher/Student Onboarding) — 2026-08-25

Full detail in `ARCHITECTURE_PLAN.md`'s "Phase 2 Part 1" section and `PHASE_2_CHANGE_REQUESTS_AR.md`'s "متابعة تنفيذ الجزء الأول" checklist (task-by-task status + change log, kept in sync with reality throughout this pass, not just at the end).

| Task | Status | Notes |
|------|--------|-------|
| Teacher audience categories (`User.audienceCategories`) | ✅ | New separate taxonomy from teaching specialization — `config/studentAudience.js` |
| Teacher teaching specializations, plural (`User.specializations`) | ✅ | Legacy singular `category` auto-mirrored via a `pre('save')` hook — zero breaking changes |
| Admin search/filter by specialization + audience category | ✅ | `GET /admin/teachers?specialization=&audienceCategory=`, `GET /teachers/public?specialization=&audienceCategory=` |
| Student type (`existing`/`new`) | ✅ | Defaults `'existing'` — safe, non-destructive backfill for every legacy student; searchable via `?studentType=` |
| Teacher weekly working hours (`TeacherWorkingHours` model) | ✅ | Full day / unavailable / one-or-more custom periods per day; breaks represented as the gap between periods |
| Working-hours overlap/format validation (front + back) | ✅ | `config/workingHours.js` (backend) + `utils/workingHours.js` (client mirror for inline UX) |
| Academy-wide configurable timezone | ✅ | `AcademySettings.timezone`, default `Africa/Cairo`, admin-editable in `AdminWebsitePage.jsx` |
| Teacher hourly rate protection + audit logging | ✅ | Already existed as a field; this pass added a dedicated `admin.update_teacher_hourly_rate` audit entry on every change, and an explicit backend allow-list (was previously spreading `req.body` directly into `User.create`) |
| "Create a teacher with their students" wizard | ✅ | `POST /admin/onboarding/teacher-with-students` — all-or-nothing, compensating rollback on partial failure, `clientRequestId`-based idempotent replay |
| Package selection + opening lesson balance (used/remaining split) | ✅ | `computeOpeningBalance()` (`config/lessonPolicy.js`) + new `opening_balance` `LessonTransaction` type; reused by both the wizard and the standalone subscription-creation endpoint |
| Duplicate-email rejection (within request + against DB) | ✅ | Pre-checked before any write in the wizard; standalone create-student endpoint checks independently |
| Standalone "create student from admin panel" | ✅ | `POST /admin/students` |
| "Add another student" from teacher's administrative profile | ✅ | `POST /admin/teachers/:id/students` — reuses the same subscription/opening-balance logic as the wizard |
| Administrative teacher profile page | ✅ | New `AdminTeacherProfilePage.jsx` (`/admin/teachers/:id`) — profile, working hours, assigned students + live wallet balances, add-student action |
| Audit logging for all Part 1 sensitive operations | ✅ | Teacher create/update, hourly-rate change, working-hours change, student create, subscription create, wizard create — see `PHASE_2_CHANGE_REQUESTS_AR.md` for the full action-name list |
| Backend test coverage | ✅ | `lessonPolicy`, `workingHours`, `subscription.service`, `onboarding.service`, `adminOnboarding.controller`, updated `admin.teacher.controller` — 243/245 passing (2 pre-existing, unrelated `sessionIntelligence` failures, untouched) |
| Full recurring lesson-schedule generation for new students | ✅ | Delivered in Phase 2 Part 2 — see below |
| Automatic free-slot / availability engine | ✅ | Delivered in Phase 2 Part 2 — see below |
| Teacher acceptance/rejection of a new-student assignment | ✅ | Delivered in Phase 2 Part 2 — see below |

## Phase 2 Part 2b — Compact Student-Scheduling UX Redesign — 2026-08-25

Full detail in `PHASE_2_CHANGE_REQUESTS_AR.md`'s "4. إعادة تصميم واجهة جدولة الطالب المضغوطة" checklist. Replaces the seven-permanently-visible-weekday-rows layout with a compact, progressive builder — backend-compatible (same canonical `{dayOfWeek,time}[]` schedule shape), not a visual-only reskin. `ui-ux-pro-max` consulted before implementation.

| Task | Status | Notes |
|------|--------|-------|
| Compact schedule builder (specialization → duration → recurrence → days → times → dates → review) | ✅ | Replaces the old always-visible 7-day grid; verified live |
| All 4 backend-supported recurrence patterns exposed (daily/weekly/biweekly/monthly) | ✅ | `'daily'` was engine-supported but unexposed — now allowed in `validateSchedulePayload` |
| Weekday chips shown only for weekly/biweekly (daily/monthly need no weekday picker) | ✅ | `FREQUENCIES_WITH_WEEKDAY_PICKER` gates this in the UI and in `deriveScheduleDays()` |
| Accessible weekday chip selector | ✅ | `WeekdayChipSelector.jsx` — real `<button>`s, `aria-pressed`, full-day-name `aria-label`, never color-only selected/conflict state |
| Time row per selected day only, with computed end time, "apply to all", per-row copy, remove | ✅ | Verified live with two different weekdays and two different times |
| Smart slot picker fed by the real availability engine, grouped morning/afternoon/evening | ✅ | `ScheduleSlotPicker.jsx` — reuses the existing `GET /admin/teachers/:id/availability` / `POST /admin/assignments/check-availability` endpoints, no new API |
| Friendly Arabic availability text (never raw `00:00–24:00`) | ✅ | `describeAvailability()` — "متاح طوال اليوم" / "متاح من 10:00 ص إلى 2:00 م" / "لا توجد مواعيد تناسب مدة الحصة" |
| Real availability-derived schedule suggestions | ✅ | `buildSuggestions()` — nearest slot, same time on another day, same days at a different time; one-click apply, still editable after |
| Date-range validation (end date must be after start; explicit "يستمر حتى الإلغاء") | ✅ | `validateScheduleDates()`, mirrored front/back; inline errors block progression to the next step |
| Live weekly-summary card | ✅ | Updates immediately on any schedule change |
| Expandable monthly-preview drawer showing real recurrence-derived occurrences | ✅ | `computeUpcomingOccurrences()` mirrors the backend's `generateDates()` semantics for daily/weekly/biweekly/monthly |
| Compact schedule summary in the collapsed student-card header | ✅ | `scheduleSummaryLabel()`, e.g. "الأحد والثلاثاء • 6:00 م • 30 دقيقة • أسبوعيًا" |
| Assignment-path badge visually separated from the schedule controls | ✅ | Its own bordered card below the schedule builder, not interleaved with it |
| Backend: `'monthly'` recurrence latent bug found and fixed | ✅ fixed | `activateAssignment()` was passing `daysOfWeek` through for monthly rules, making them behave like weekly (found during this pass, not previously caught) |
| First frontend test suite in this repo (`vitest`) | ✅ | 41 pure-logic tests for slot generation, suggestions, date validation, the monthly-preview mirror, and the summary formatter |
| **Bug found & fixed during live QA:** full-day availability collapsed to a zero-length window client-side | ✅ fixed | A new time-formatting helper wrapped 1440 minutes to `'00:00'` instead of `'24:00'` — fixed with a dedicated boundary-safe formatter; regression-covered |
| Responsive/RTL correctness at 320–1440px | ⚠️ code-reviewed, not screenshot-verified | `resize_window` did not change the actual viewport in this environment (verified twice) — recommend one manual pass in a real browser |

## Phase 2 Part 2 — Credential Options, Availability Engine & Assignment Workflow — 2026-08-25

Full detail in `ARCHITECTURE_PLAN.md`'s "Phase 2 Part 2" section and `PHASE_2_CHANGE_REQUESTS_AR.md`'s "متابعة استكمال الجزء الأول وتنفيذ الجداول والإسناد" checklist. **Verified with live manual browser QA against a real running dev server + MongoDB, not unit tests alone** — two real bugs were found and fixed during that pass (noted below).

| Task | Status | Notes |
|------|--------|-------|
| Automatic secure credential generation (preserved) | ✅ | Unchanged existing behavior — `utils/tempPassword.js`, always forces a password change |
| Administrator-defined initial password | ✅ | `config/passwordPolicy.js` + `config/credentialMode.js`; ≥8 chars/letter+digit/confirmation-match enforced server-side regardless of frontend checks; never stored/logged/returned in plaintext |
| Configurable "require password change on next login" | ✅ | Independent of credential mode, default `true`; verified live — a manual password with the default flag correctly triggered the existing `MustChangePasswordGate` and cleared after a real password change |
| Backward compatibility with Part 1's flat `password` field | ✅ | `resolveCredentialInput()` fallback preserves exact prior behavior; full pre-existing onboarding test suite passes unchanged |
| Automatic teacher-availability engine | ✅ | `services/availability.service.js` — working hours minus active schedule rules, real sessions (60-day lookahead), and reserved pending requests; buffer- and full-duration-aware; verified live splitting a real working day around a real existing booking |
| Server-authoritative slot re-validation before every write | ✅ | `checkAvailability()` called again at create/accept/edit-resend — frontend preview is never trusted for the actual save |
| Client-side availability estimate for a not-yet-created teacher | ✅ | `computeLocalFreeWindows()` — used inside the onboarding wizard before the teacher account exists |
| `AssignmentRequest` model + explicit state machine | ✅ | `config/assignmentStatus.js` — 8 statuses, enforced valid transitions only, full response/reassignment history preserved |
| Existing-student direct assignment (no teacher approval) | ✅ | Verified live end-to-end: real `ScheduleRule` + 5 real `Session` documents generated at the correct weekly dates |
| New-student pending-approval request + teacher notification | ✅ | Verified live — "طلبات الطلاب" inbox, real-time notification delivery confirmed |
| Immediate admin override (bypass teacher approval) | ✅ | New `assignments.override` permission, excluded from every default permission set including plain `admin`; mandatory reason, audited; covered by 24 automated tests, not re-run live this session (flagged as a pre-production follow-up) |
| Teacher accept → schedule activation | ✅ | Verified live: accept re-validates availability, activates, generates sessions, request moves to "مكتمل ومفعّل" |
| Teacher reject (reason required) + admin notification | ✅ | Verified live |
| Teacher propose-alternative-time | ✅ | Automated test coverage; not re-run live this session |
| Admin edit & resend (same teacher) | ✅ | Verified live — regenerates the message, re-validates the new slot, returns to pending |
| Admin reassign to another teacher (linked request, history preserved) | ✅ | Automated test coverage; not re-run live this session |
| Admin cancel (with reason, releases reservation) | ✅ | Automated test coverage; not re-run live this session |
| Default Arabic assignment message, editable per request | ✅ | `config/assignmentMessage.js`; gender-aware wording only when `User.gender` is explicitly set, never inferred |
| Assignment notifications (new/accepted/rejected/time-change/resent/reassigned/override/cancelled/activated) | ✅ | New `assignment` notification type; verified live for create/existing-direct/reject/accept |
| Teacher inbox page ("طلبات الطلاب") + sidebar pending-count badge | ✅ | `TeacherAssignmentRequestsPage.jsx` |
| Admin follow-up queue page + sidebar needs-attention badge | ✅ | `AdminAssignmentRequestsPage.jsx` |
| Notification deep-links open the exact request | ✅ | Both pages support a `:id` route reading the specific request even outside the current tab filter |
| **Bug found & fixed during live QA:** assignment message rendered `[object Object]` instead of day names | ✅ fixed | `config/assignmentMessage.js` — regression test added (`assignmentMessage.test.js`) |
| **Bug found & fixed during live QA:** schedule-only students (no subscription yet) invisible on the teacher's admin profile | ✅ fixed | `admin.controller.getTeacher` now merges `ScheduleRule`-linked students; the teacher-**list** page's per-row count is still subscription-only (follow-up, not blocking) |
| Backend test coverage | ✅ | `passwordPolicy`, `credentialMode`, `assignmentStatus`, `assignmentMessage`, `availability.service`, `assignment.service` (24 cases) + extended `onboarding.service`/`adminOnboarding.controller` — 320/322 passing (2 pre-existing, unrelated, untouched) |

## Phase 2 Part 2c — Incremental Onboarding & Concurrency-Safe Scheduling — 2026-08-26

Full detail in `PHASE_2_CHANGE_REQUESTS_AR.md`'s "5. إصلاح معمارية الإعداد التدريجي متعدد الطلاب" checklist. Fixes a real architectural bug: the one-shot wizard deferred ALL persistence to final submit, so a second/third student's availability check never saw an earlier student's already-chosen slot in the same wizard run — root cause of duplicate-suggestion and potential double-booking. **Verified with a full live 3-student browser QA run against a real running dev server + MongoDB**, not unit tests alone.

| Task | Status | Notes |
|------|--------|-------|
| Teacher persisted immediately, before any student | ✅ | New `POST /admin/onboarding/sessions` — teacher created with `onboardingStatus: 'draft'`, idempotent via `clientRequestId`, resumable |
| New resumable `OnboardingSession` model | ✅ | Deliberately separate from `OnboardingRequest` (an immutable idempotency/replay cache for the old one-shot endpoint, left fully intact) |
| Incremental per-student save | ✅ | `POST /admin/onboarding/sessions/:id/students` — creates the student account + subscription/opening balance (if any) + schedule reservation in one call; the very next student's availability check sees it immediately |
| Atomic concurrency protection | ✅ | New `ScheduleReservationLock` model, unique index `{teacherId, dayOfWeek, time}` — two concurrent callers targeting the exact same slot can never both succeed; loser gets 409 |
| Real alternative-slot suggestions on conflict | ✅ | New `suggestAlternativeSlots()` in `availability.service.js` — never a hardcoded "+1 hour" guess; matches the spec's worked examples (30-min booking → next free instant; buffer pushes it out further; full-hour booking → next hour) |
| Reservation release on reject/time-change/cancel/remove | ✅ | Verified live — removing a student re-opens their slot for the next one |
| Student-save failure never touches the teacher or a sibling student | ✅ | Compensating rollback scoped to exactly what that one call created |
| Resumable wizard (refresh/reopen) | ✅ | `localStorage`-backed resume banner + `GET /admin/onboarding/sessions/:id`; verified live — teacher and saved students reloaded with zero duplication |
| Final review loads from the backend, not local state | ✅ | Blocks finalization while any student has an unresolved rejected/time-change-requested schedule |
| Finalization flips teacher `onboardingStatus` to `complete` | ✅ | Draft teachers are hidden from the public directory and blocked from login until finalized — verified live (teacher appeared in `/teachers/public` immediately after finalize) |
| Old one-shot wizard endpoint fully preserved | ✅ | `POST /admin/onboarding/teacher-with-students` untouched — additive, parallel system, not a replacement |
| Backend test coverage | ✅ | 4 new `suggestAlternativeSlots` tests, 7 new `ScheduleReservationLock` integration tests in `assignment.service.test.js`, 15 new tests in `onboardingSession.service.test.js` — 351/353 passing (2 pre-existing, unrelated `sessionIntelligence` failures, untouched) |
| **Live 3-student browser QA** | ✅ | Teacher saved → Student 1 booked Sunday 12:00 (60 min) → Student 2's picker correctly excluded 12:00 (jumped 11:00→13:00), booked 13:00 → Student 3's picker excluded both 12:00 and 13:00 (jumped 11:00→14:00), booked 14:00 → removed Student 2 → confirmed 13:00–14:00 re-opened while the other two stayed booked → full page refresh → resume banner appeared → resumed with teacher + both remaining students intact, zero duplication → finalized → teacher confirmed live in the public directory |

### Follow-up: success-page continuation to "add more students" (2026-08-26)

Small, separate navigation/UX improvement — not a further onboarding-architecture change. Full detail in `PHASE_2_CHANGE_REQUESTS_AR.md`'s "6. تحسين تنقّل مركّز" checklist.

| Task | Status | Notes |
|------|--------|-------|
| Primary success-page action "إضافة المزيد من الطلاب لهذا المعلم" | ✅ | Uses the real `teacher._id` from the finalize result; navigates to `/admin/teachers/:id?action=add` |
| Reuses the existing add-student flow, no duplicate page | ✅ | `AdminTeacherProfilePage.jsx`'s existing `AddStudentModal` auto-opens on `?action=add`, then the flag is stripped from the URL |
| Teacher fixed/locked in the continuation flow | ✅ | No teacher selector existed in `AddStudentModal` to begin with; a new locked context card (name, specializations, working-hours summary, current student count) makes this explicit |
| Success-page action hierarchy reordered | ✅ | Primary (add students) → secondary (view teacher profile) → secondary/outline (teacher list) → de-emphasized tertiary (create another teacher) |
| Teacher-existence/permission check before opening the flow | ✅ | Reuses the profile page's existing backend fetch + `ErrorState` — never opens a blank form if the teacher is missing or inaccessible |
| Refresh-safety fallback | ✅ | Non-sensitive `sessionStorage` banner (teacher id/name only) offers a safe link to the teacher's profile if the success page's state is lost — never auto-resubmits onboarding |
| Backend changes required | ✅ none | Reuses `POST /admin/teachers/:teacherId/students` and its existing subscription/credential/scheduling/assignment/notification/audit services unchanged |
| New tests | ✅ | `buildTeacherAddStudentUrl` (`config/__tests__/constants.test.js`) and `summarizeWorkingHoursDays` (`utils/__tests__/workingHours.test.js`) — 47/47 client tests passing (41 pre-existing + 6 new) |
| Live browser QA | ⚠️ not run this session | Claude-in-Chrome extension did not connect after repeated retries; verified via code review, lint, and build/test runs instead — recommend a manual pass before production use |

### Follow-up: assignment-approval workflow audit, visibility & UX fixes (2026-08-27)

The workflow's backend state machine, locking, and notification logic (Phase 2 Part 2, above) were already sound and fully test-covered. This pass targeted why a new request could go unnoticed/confusing, plus finished several UX requirements the pages hadn't picked up yet.

| Task | Status | Notes |
|------|--------|-------|
| **Root cause: admin monitoring page defaulted to "تحتاج متابعة"** | ✅ fixed | That tab is rejected/time_change_requested only — a freshly created `pending_teacher_approval` request (the common case) was invisible on first load. Default tab changed to `pending_teacher_approval`; page now also polls every 30s |
| Admin tab count badges | ✅ | New bounded `GET /admin/assignments/status-counts` (single aggregate, indexed on `status`) — `assignmentService.getStatusCounts()` |
| **Bug found & fixed: gender pronoun hardcoded feminine** | ✅ fixed | `assignmentMessage.js`'s intro line always rendered "وبياناتها" (her data) regardless of student gender — wrong for every male student. New `studentDataPossessive()` agrees with gender the same way the rest of the message already did; regression test added |
| Teacher dashboard "طلبات طلاب جديدة" section | ✅ | Was entirely missing — new `PendingAssignmentSection` in `TeacherDashboardPage.jsx`, placed right after the greeting; shows up to 3 latest requests with student/age/curriculum/days/duration/teaching-type/request-age, deep-links per card; hidden entirely when nothing is pending; syncs via notification-store watch + 60s polling fallback |
| **Bug found & fixed: shared loading state disabled every card** | ✅ fixed | `TeacherAssignmentRequestsPage.jsx` used one mutation's `isPending` for every card's buttons — responding to one request disabled all of them. Now tracks `submittingId` so only the acted-on card disables |
| Acceptance confirmation modal | ✅ | New `AcceptConfirmModal` summarizes the final schedule (days/times/duration/teaching type/start date) before activation, per spec |
| Rejection inline validation | ✅ | Reason field shows an inline error and the confirm button disables when empty, instead of relying on the backend's 400 alone |
| 44px touch targets + copy-message action | ✅ | Card action buttons bumped to `min-h-[44px]`; new accessible "نسخ الرسالة" button via `navigator.clipboard` |
| Teaching type + request creation time on cards | ✅ | Both were missing from the request card's detail grid |
| Backend test coverage | ✅ | New `studentDataPossessive`/gender-agreement test in `assignmentMessage.test.js`, new `getStatusCounts` test in `assignment.service.test.js` — 355/357 server tests passing (2 pre-existing, unrelated `sessionIntelligence` failures, untouched); 48/48 client tests passing |
| Live browser QA | ⚠️ not run this session | Verified via targeted backend/frontend test suites + full production build instead — recommend a manual responsive/RTL pass (375px + desktop) before production use |

### Follow-up: alternative-time redesign, dynamic curriculum catalog, Phase 1 readiness audit (2026-08-28)

| Task | Status | Notes |
|------|--------|-------|
| **Root cause: teacher's "propose alternative time" never revalidated on the backend** | ✅ fixed | `respondToAssignment`'s `time_change` branch accepted ANY day/time with no availability check — now calls `checkAvailability()` and returns 409 + real alternatives (`suggestAlternativeSlots`) if the slot is no longer free, mirroring the `accept` branch |
| New teacher-owned availability endpoint | ✅ | `GET /teachers/me/assignment-requests/:id/availability` — ownership enforced by scoping to the teacher's own request (never the general admin endpoint); returns real weekly availability + smart suggestions |
| Redesigned picker UI | ✅ | New `ProposeAlternativeTimeModal.jsx`: request summary, smart suggestions (with a plain-Arabic reason for each), single-select day chips with per-day slot counts, `ScheduleSlotPicker` reused for morning/afternoon/evening grouped 12-hour slots, live confirmation sentence, optional note — replaces the old `<select>` + `<input type="time">` (which rendered malformed values and had no real availability behind it) |
| Dynamic teaching-subject/curriculum catalog | ✅ | New `TeachingSubject` model + `teachingSubject.service.js` (cached, seeds the 6 canonical keys with their EXACT legacy string values — zero data migration needed). Hard Mongoose `enum`s removed from `User`/`Course`/`AssignmentRequest`; authoritative validation moved to the service layer (`isValidActiveKey`/`isKnownKey`), reached from every create/update path (teacher profile, course, assignment, onboarding) |
| Duplicate prevention | ✅ | Arabic-diacritic/alef/ya-variant-insensitive (reuses existing `utils/arabicNormalize.js`) + English case/space-insensitive — a repeat "create" call returns the existing subject instead of duplicating |
| New permissions | ✅ | `curricula.view`/`curricula.manage`, added to the plain-admin default set — auto-backfilled onto every existing admin account by the already-existing `rbacModulePermissionsBackfill` migration, no new migration needed |
| Creatable combobox | ✅ | New `TeachingSubjectCombobox.jsx` (search, keyboard nav, Enter/click-to-create only, never per-keystroke) — wired into teacher specializations, student scheduling (and therefore the onboarding wizard + edit-and-resend automatically), and the course category field |
| Live label resolution everywhere | ✅ | Every card/dashboard/profile/filter that showed a curriculum label now reads it from the live catalog (`subjectLabel()` + `useTeachingSubjects()`) instead of a frozen frontend array — a new subject displays correctly everywhere immediately |
| Admin management UI | ✅ | New "المناهج التعليمية" tab in `AdminSettingsPage.jsx` — create/archive/unarchive, gated by `curricula.manage` |
| Assignment-message integration | ✅ | Label resolved via the catalog (`resolveLabel`) before message generation (`curriculumLabelOverride`) — `buildAssignmentMessage` itself stays pure/synchronous; frozen `sentMessage`/`generatedMessage` history already protects against a later rename (existing architecture, confirmed, no new snapshot mechanism needed) |
| **2 previously-"pre-existing" test failures actually fixed, not left as pre-existing** | ✅ fixed | `sessionIntelligence.test.js` had two stale tests written for an old check-in-tolerance/payroll policy — the current code already implements the correct, documented, later-decided business rule (5-min tolerance; teacher paid regardless of student attendance). Tests corrected to match. **Full backend suite is 100% green for the first time** (0 pre-existing failures remaining) |
| Backend test coverage | ✅ | New `teachingSubject.service.test.js` (15), `teacherAssignment.controller.test.js` (3, ownership/ IDOR), +3 tests in `assignment.service.test.js` (time-change revalidation), +2 in `assignmentMessage.test.js` (dynamic label override) — 380/380 server tests passing |
| Frontend test coverage | ✅ | New `teacherProfile.test.js` (7, `subjectLabel` resolution) — 55/55 client tests passing |
| Live browser QA | ✅ done (2026-08-28 follow-up) | Completed by the **Phase 1 Delivery Readiness Pass** (`PROJECT_STATUS.md`, `PHASE_1_DELIVERY_READINESS_REPORT.md`) — real Playwright-driven Chromium against the live dev backend/frontend/MongoDB (Claude-in-Chrome extension still would not connect), exercising the onboarding wizard, 3-student intelligent scheduling exclusion, new-student approval workflow, alternative-time modal, and admin follow-up queue end-to-end |
| Known, deliberate limitation | ✅ closed (2026-08-28 follow-up) | Course-catalog browsing pages (`AdminCoursesPage.jsx`, marketing `CoursesPage.jsx`) now resolve dynamic-subject badge colors via new `utils/subjectBadge.js` — a bounded, deterministic (hash-of-key) palette distinct from the 6 canonical colors, never random, never a generic gray fallback. 8 new tests in `subjectBadge.test.js`. See the Phase 1 Delivery Readiness Pass entry in `PROJECT_STATUS.md` |

## Lesson Wallet Architecture — Subscription/Lesson System Redesign — 2026-07-29

Full detail in `PROJECT_STATUS.md`'s "Lesson Wallet Architecture" entry and `ARCHITECTURE_PLAN.md`'s Lesson Wallet section. **Wallet was previously logged as an out-of-scope entity (line below, 2026-07-11 audit) — this is that deferred work, now formally commissioned and implemented.**

| Task | Status | Notes |
|------|--------|-------|
| `LessonWallet` + `LessonTransaction` (append-only ledger) models | ✅ | One wallet per student; every balance movement is an immutable transaction |
| `wallet.service.js` — idempotent atomic write chokepoint | ✅ | No multi-doc transactions available (standalone mongod, not a replica set) — idempotency keys + atomic `$inc` instead |
| Lesson deduction matrix (`lessonDeduction.service.js`) | ✅ | Attendance-driven consumption (present/late/left_early/absent all deduct now — absent didn't before), cancellation window rule, teacher no-show compensation |
| Student self-cancellation | ✅ | Previously hard-blocked at 403; now real, with before/after-12h-window credit logic |
| Booking conflict prevention (`booking.service.js`) | ✅ | 409 on teacher/student double-booking; previously not implemented at all |
| `ScheduleRule.timezone` actually applied | ✅ | Was stored but silently ignored — slot generation used server-local time; fixed via `date-fns-tz` |
| `TeacherPayrollEntry` persisted payroll ledger | ✅ | Replaces pure live-recompute; existing payroll endpoint response shapes unchanged |
| Subscription renewal endpoint | ✅ | `POST /subscriptions/:id/renew` — additive credit, linked renewal chain, no data loss |
| Wallet freeze/resume (vacation/Ramadan/medical leave) | ✅ | `POST /wallet/:studentId/freeze` \| `/resume` |
| Manual admin lesson adjustment via ledger | ✅ | `POST /wallet/:studentId/adjust` — replaces the old raw `sessionsRemaining` PATCH (removed from the allow-list; every change is now an auditable transaction) |
| Manual compensation grant + lesson transfer between students | ✅ | `POST /wallet/:studentId/compensation` \| `/transfer` |
| `backfillLessonWallets` migration | ✅ | Auto-runs on boot, idempotent, reconstructs wallets from historical Subscription sums |
| `reconcile-wallets` drift-repair script | ✅ | `npm run reconcile-wallets` — dry-run by default |
| Teacher accept/decline endpoints | ✅ (dormant) | `PATCH /sessions/:id/accept\|decline` implemented; `teacherAcceptanceStatus` defaults to `not_required` and nothing currently sets a session to `pending` — no live UI trigger yet |
| Frontend: student wallet balance + transaction history | ✅ | `StudentSubscriptionPage.jsx` |
| Frontend: admin wallet management (adjust/freeze/resume/compensation) | ✅ | `AdminSubscriptionsPage.jsx` adjust modal |
| Frontend: payroll ledger browser | ✅ | `AdminTeacherPerformancePage.jsx` |
| Frontend: student session cancellation UX | ✅ | `StudentSessionsPage.jsx` |
| Frontend: reskin of all other dashboard pages | ⏳ | Deliberately out of scope for this pass — ~20 unrelated pages (schedule, homework, evaluations, articles, courses) work unchanged against the new backend |
| Jest coverage for the new subsystem | ✅ | `wallet.service`, `lessonDeduction.service`, `booking.service`, `backfillLessonWallets` — all passing |

## Operations Center Full Audit & Rebuild — 2026-07-11

Full detail in `docs/OPERATIONS_CENTER_AUDIT.md`.

| Task | Status | Notes |
|------|--------|-------|
| Root-cause "most stats show 0" | ✅ | Seeder never generated day-offset-0 (today) sessions — confirmed against live MongoDB, not a backend/aggregation bug |
| Verify every stat's Mongo query correctness | ✅ | All 10 live-tab metrics + review queue + payroll review manually traced and confirmed correct |
| Fix: 14-scenario "today" seeder generator | ✅ | Live/starting-soon/missing-checkin/missing-link/late/completed/cancelled/no-show/student-absent/payroll-review/critical-contradiction |
| Fix: local-midnight timezone clamp (`pastToday()`) | ✅ | Second bug found while fixing the first — naive offsets could cross local midnight (server is UTC+3); verified by re-seeding at 2:40 AM |
| Densify historical seed spread (3-day → daily) | ✅ | Timeline ±3-day and Review Queue 14-day windows now have real daily coverage |
| New metric: No-Show count | ✅ | Existed as a status value with no dedicated bucket before |
| New metric: Student Absences Today | ✅ | New bounded Attendance aggregation |
| New metric: Attendance Rate Today / Teacher On-Time Rate Today | ✅ | Computed from real today-scoped records |
| New metric: Revenue Today | ✅ | Subscription aggregation bounded to today |
| New metric: Online Now (teachers/students) | ✅ | New in-memory socket presence tracking — only possible after this session's earlier real-time fix |
| Redesigned Live tab (critical banner, health strip, severity-tinted grid, unified attention feed, quick actions) | ✅ | Replaced 6 redundant boxed lists with one deduplicated severity-sorted feed |
| Live verification: every metric vs. direct MongoDB query | ✅ | Exact match confirmed for every stat |
| Live browser verification: all interactions/filters/navigation | ✅ | Zero console errors |
| `npm run build` + `npx jest` | ✅ | Zero errors, 96/96 passing |

### Known limitations
- Online-presence has a ~60s detection window for abrupt disconnects (standard heartbeat behavior) and is per-process (would need Redis for multi-instance deployment).

---

## Notification Center Redesign & UX/Product Audit — 2026-07-11

Full detail in `UX_IMPROVEMENTS.md`.

| Task | Status | Notes |
|------|--------|-------|
| Fixed real-time notifications (were completely non-functional) | ✅ | `socket.service.js` verified against nonexistent `JWT_SECRET` — every handshake silently failed |
| Notification archive (model + endpoints + UI) | ✅ | `isArchived`/`archivedAt` additive fields, archive/unarchive per-item + bulk, dedicated archive view |
| Real bulk notification endpoints | ✅ | `PATCH/DELETE /notifications/bulk` replace N-sequential-request loops |
| Fixed dead "select all" control | ✅ | Function existed but was never wired to any UI element |
| Group-by day/category toggle | ✅ | Previously day-only |
| Priority-aware sort within groups | ✅ | Urgent/high unread surface first |
| Fixed silently-wrong unread badge count | ✅ | Was capped/derived from last-30-fetched list; now from dedicated unbounded count endpoint, polled + socket-reconciled |
| Fixed broken `ConfirmDialog` (prop-name mismatch, never rendered) | ✅ | Found in `AdminArticlesPage.jsx`'s 2 existing usages; fixed + used correctly in all new dialogs |
| Added missing deactivate/delete confirmations | ✅ | Student/teacher deactivation, teacher meeting-link delete, website testimonial/FAQ delete |
| Admin dashboard `PendingTasksCard` | ✅ | Consolidates 2 separate banners + new ungraded-homework signal |
| New `pendingHomeworkGrading` admin stat | ✅ | Bounded aggregation, previously no admin visibility into grading backlog |
| Subscriptions page search | ✅ | Backend `search` param (resolves via User) + frontend search box + shared EmptyState |
| Live verification: 41 pages × 3 roles | ✅ | Zero errors; `npm run build` clean; `npx jest` 96/96 |

### Known limitations / follow-ups
- Notification pagination beyond 100-item fetch still deferred (documented, adequate at current volume).
- No dedicated admin homework-oversight page (count + link to teacher exists; per-item drill-down would be a new page, not a widget fix).
- `AdminEnrollmentsPage` still has no search (lower priority — naturally bounded volume, has status-tab triage).

---

## Full-Platform Seeder, Live Audit & Documentation Pass — 2026-07-11

Full detail in `FINAL_REPORT.md`.

| Task | Status | Notes |
|------|--------|-------|
| Audit seeder request against real schema + SCOPE_OF_WORK.md | ✅ | Found 8 requested entities (Wallet, Payments, Certificates, Quizzes, Support Tickets, Parent role, Achievements, Classrooms) with no backing model — user chose to seed only what's real |
| Comprehensive seeder covering all 22 real models | ✅ | `server/src/seed/seed.js` — 26 users, 8 courses, 18 subscriptions (all statuses), ~100 sessions with full payroll/attendance fields, articles, notifications, audit logs, etc. |
| Run seeder, verify DB population | ✅ | `npm run seed` clean run against real MongoDB |
| Live headless-browser audit, all 3 roles, all sidebar pages | ✅ | Playwright, real client-side navigation (not reloads) to avoid false positives from in-memory-token loss |
| Refresh-token/reload resilience check | ✅ | Confirmed a hard reload while authenticated correctly recovers session via httpOnly cookie |
| Fixed real bug: `AdminSubscriptionsPage` crash | ✅ | Shared React Query cache key unwrapped inconsistently across 5 admin pages — standardized to array shape everywhere |
| `npm run build` verification after fix | ✅ | Zero errors |
| `docs/` folder — 11 new files | ✅ | SYSTEM_OVERVIEW, FEATURES, WORKFLOW, PERMISSIONS, API_REFERENCE, ATTENDANCE_SYSTEM, ADMIN/TEACHER/STUDENT_GUIDE, SEEDER_GUIDE, DEPLOYMENT, KNOWN_LIMITATIONS |
| Arabic client manual | ✅ | `دليل استخدام المنصة.md` — honest about what's built vs. not (no certificates/chat yet) |
| `FINAL_REPORT.md` | ✅ | Full session summary |

### Known limitations carried forward / newly documented
- Out-of-scope entities at the time (Wallet, Payments, Certificates, Quizzes, Support Tickets, Parent role, Achievements, Classrooms) were a business decision, not a gap in this pass. **Wallet was subsequently commissioned and implemented — see the "Lesson Wallet Architecture" entry at the top of this file (2026-07-29).**
- Open business-policy question (does student absence affect teacher pay?) — unchanged, still deliberately open.
- Query-key hygiene is now a documented convention (`API_REFERENCE.md`) to prevent this bug class from recurring.

---

## Teacher Identity System & Teachers Page Refactor — 2026-07-04

Full detail in `docs/TEACHER_IDENTITY_AND_TEACHERS_PAGE_REFACTOR.md`.

| Task | Status | Notes |
|------|--------|-------|
| Trace real teacher data flow (DB → API → admin → public) | ✅ | No `Teacher` model — `User{role:'teacher'}`; no gender field existed anywhere |
| Canonical `User.gender` enum (male/female, not required/defaulted) | ✅ | `server/src/models/User.js` — one source of truth, no competing fields |
| Legacy data safety (no name-inference, unresolved is valid) | ✅ | Nothing to safely backfill from; unresolved teachers surfaced for admin correction |
| Idempotent gender audit/migration script | ✅ | `npm run migrate-teacher-gender` — dry-run default, `--apply` only normalizes invalid→null, never guesses |
| Admin create/edit gender control | ✅ | `GenderSegmentedControl` in `AdminTeachersPage.jsx`, required client-side on create |
| Teacher self-service gender control | ✅ | `TeacherSettingsPage.jsx`, preserved across unrelated saves |
| Unrelated updates never erase gender | ✅ | Verified via curl — `PATCH` with only `specialization` leaves `gender` untouched |
| Centralized identity resolver | ✅ | `server/src/utils/teacherIdentityResolver.js` (tested) + mirrored `client/src/utils/teacherIdentity.js` |
| Gender-aware Arabic honorific (`الأستاذ`/`الأستاذة`) | ✅ | `فضيلة الشيخ` removed repo-wide; unresolved teachers get no honorific |
| Gender-aware default avatars (male/female/neutral SVGs) | ✅ | `client/public/images/avatars/teacher-{male,female,neutral}-default.svg` |
| Custom avatar precedence + removal fallback | ✅ | Unit-tested + verified live in-browser |
| Public teacher directory API, safely projected | ✅ | `GET /teachers/public[/:id]`, fixes the old page hitting the admin-gated `/admin/teachers` (always 401 for real visitors) |
| Removed fake-fallback-on-API-failure behavior | ✅ | `FALLBACK_TEACHERS` deleted entirely; honest loading/error/empty states |
| Teachers page full redesign (hero/discovery sections, robust layout) | ✅ | No more gradient-percentage-dependent card readability |
| `TeacherCard` redesigned from scratch (no 3D flip) | ✅ | Accessible at rest — keyboard/touch/reduced-motion safe |
| Male/female discovery filter | ✅ | Backed by real `?gender=` API param, verified exact counts live |
| Loading/error/empty states | ✅ | Skeleton matches real card geometry; distinct empty copy per filter state |
| Public Teacher Profile page (`/teachers/:id`) | ✅ | Full bio, gender-correct CTA, carries teacher choice into registration |
| Cross-surface avatar/honorific consistency sweep | ✅ | Course instructor display, admin teacher list/CRM/performance — see docs §17 for what was deliberately left alone and why |
| Tests (resolver, public projection, migration audit) | ✅ | 28 new Jest tests, 68/68 total passing |
| Build + live browser verification (Playwright) | ✅ | `npm run build` clean; full click-through of filters, profile page, admin modal, teacher settings against live seeded DB |

### Known limitations (deliberate, documented in the refactor doc §18)
- Migration script can only report/normalize invalid values — it cannot backfill legacy gender since no trustworthy source field ever existed.
- No frontend test runner in this repo — presentation logic verified via the mirrored, unit-tested backend resolver + a live Playwright pass, not component tests.
- Homepage `#teachers` decorative carousel (fake stock names/photos, unrelated to the real teacher model) intentionally left untouched — out of scope for an identity-data refactor.

---

## Admin Operations Center + Needs Review Queue + Recurring-Session Dedupe — 2026-07-04 (continuation)

| Task | Status | Notes |
|------|--------|-------|
| Re-verify prior attendance/payroll implementation against docs | ✅ | One stale docblock comment found + fixed; no behavioral drift |
| Admin Operations Center page (Live / Timeline / Review Queue tabs) | ✅ | `AdminOperationsCenterPage.jsx`, route `/admin/operations`, nav item |
| Operations backend API (`/operations/live`, `/timeline`, `/review-queue`) | ✅ | `operations.controller.js` + `operations.routes.js`, isAdmin-gated |
| Needs Review assessment engine (`assessSessionReview`) | ✅ | `sessionIntelligence.service.js` — critical/high/medium deterministic rules |
| Review lifecycle (open/in_review/resolved/dismissed) | ✅ | New `Session` fields + `PATCH /operations/review/:sessionId`, audit-logged |
| Review action workflow (start review / correct / resolve / dismiss) | ✅ | Reuses existing correction endpoint rather than inventing a new one |
| `computeConfidence()` actually surfaced in UI (was backend-only) | ✅ | Timeline row drill-down + `GET /sessions/:id`; plain-language labels only |
| Recurring-session dedupe (unique `{seriesId,scheduledAt}` index) | ✅ | `models/Session.js` + `schedule.service.js` idempotent bulkWrite upserts |
| Legacy-duplicate cleanup script | ✅ | `server/src/scripts/dedupeSessions.js` (`npm run dedupe-sessions`, dry-run default) |
| Contradictory session-state detection | ✅ | Folded into `assessSessionReview` as critical-severity checks |
| Admin Dashboard intelligence strip | ✅ | `AdminDashboardPage.jsx` `OperationsIntelligenceStrip` |
| Teacher Dashboard "needs attention" count | ✅ | `teacher.controller.js` `getMyStats` + dashboard action item |
| Audit log human-readable UX | ✅ | `AdminAuditLogsPage.jsx` full action-label map + `summarizeChanges()` |
| Payroll review hardening (reasons surfaced, no silent auto-resolution) | ✅ | Open business-policy question deliberately left open, per brief |
| Bounded queries + new indexes for Operations Center | ✅ | All new queries date-bounded + capped; `{reviewState,scheduledAt}` index added |
| Tests: review engine, dedupe (mocked Mongoose), date determinism | ✅ | 21 new tests, 40/40 total passing |
| Build + full test suite verification | ✅ | `npm run build` (client) + `npm test` (server) both clean |
| `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md` updated (§21–§31) | ✅ | Operations Center, review engine, dedupe, self-audit |

### Known limitations carried forward (unchanged from continuation pass's own audit)
- No ESLint config exists anywhere in the repo — still not retrofitted (orthogonal, unbounded-scope cleanup)
- Three separate attendance-correction UI entry points (Teachers page, Sessions page, Operations Center) still exist, unconsolidated — all call the same backend endpoint, no functional gap
- No DB-backed integration tests (no mongodb-memory-server in this repo) — dedupe tested via mocked Mongoose calls asserting the real op shapes; the actual guarantee is the MongoDB unique index itself

---

## Intelligent Attendance / Payroll-Ready Operations System — 2026-07-04

| Task | Status | Notes |
|------|--------|-------|
| Reverse-engineer existing attendance/payroll architecture | ✅ | Full findings in `docs/PLATFORM_FLOW_AND_TEACHER_ATTENDANCE_PLAN.md` |
| Centralized attendance/session time-window policy | ✅ | `server/src/config/attendancePolicy.js` (new) |
| Deterministic payroll-status + confidence-scoring engine | ✅ | `server/src/services/sessionIntelligence.service.js` (new), unit-tested |
| Session model — outcome, delay, evidence, payroll fields | ✅ | Additive schema changes, no destructive migration |
| Attendance model — left_early/technical_issue, arrivalTime, finalize | ✅ | |
| Teacher check-in relaxed to self-resolve missed/no_show | ✅ | `session.controller.js` |
| Delay reporting (distinct from full reschedule) | ✅ | `PATCH /sessions/:id/delay` + `DelayModal` |
| External link-open evidence tracking (not attendance proof) | ✅ | `POST /sessions/:id/link-opened` |
| Session outcome confirmation on completion | ✅ | Fast-path default + optional outcome picker |
| Graduated, forgiving cron sweep (missed → no_show) | ✅ | `teacherAttendanceSweep.job.js` rewritten |
| Payroll-readiness reporting (teacher + org-wide) | ✅ | New endpoints + `PayrollReadinessCard` / admin summary bar |
| Audit trail repair — fixed broken article.controller.js calls | ✅ | 7 call sites had wrong argument shape, always failed silently |
| Audit trail — session/attendance/subscription/enrollment coverage | ✅ | Previously ~0% coverage on payroll-adjacent actions |
| Admin attendance/payroll correction reachable from Sessions page | ✅ | `AdminSessionsPage.jsx` `CorrectionModal` |
| Fixed schedule-rule admin teacher-attribution bug | ✅ | Admin must now explicitly name the teacher |
| Fixed subscription double-decrement + scoping bug | ✅ | `completeSession` now idempotent + scoped to `subscriptionId` |
| Fixed missing ownership check on `PATCH /attendance/:id` | ✅ | |
| `jest` installed (was declared but never actually present) | ✅ | 19/19 tests passing, `npm test` now works end-to-end |
| Build verification | ✅ | `npm run build` zero errors |
| `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md` report | ✅ | Full architecture, diagrams, limitations, file list |

### Known limitations carried forward
- No dedupe guard yet on regenerated recurring sessions (documented, not hardened this pass)
- `computeConfidence()` implemented + tested but not yet surfaced in an admin UI queue
- Repo-wide ESLint config is missing entirely (pre-existing gap, not introduced here — `npm run lint` could not be run)

---

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

## Phase 2 Meeting Addendum (2026-09-01) — Credential Defaults, Subscription Pause/Resume, Student Transfer, Teacher Replacement

Full details, architectural decisions, and real bugs found/fixed during integration verification: `PHASE_2_CHANGE_REQUESTS_AR.md` §22.

| Item | Status | Notes |
|---|---|---|
| Role-specific academy default passwords (encrypted at rest, dedicated key) | ✅ | New `CredentialDefaults` collection, AES-256-GCM, never in AcademySettings (that endpoint is public) |
| Third credential mode `academy_default` wired into every creation flow | ✅ | Single chokepoint (`resolveCredentialInput`) — onboarding wizard, incremental session, standalone student, add-student-to-teacher, standalone teacher |
| `requirePasswordChange` default changed: false for manual/academy_default, true (fixed) for auto | ✅ | Explicit behavior change per this addendum |
| Dedicated `credentials.manage_defaults` permission, not default-granted | ✅ | Same conservative pattern as `admins.create` |
| Admin settings UI to configure/replace/clear defaults (never displays stored value) | ✅ | New tab in `AdminSettingsPage.jsx` |
| Complete subscription pause/resume lifecycle | ✅ | `SubscriptionPause` audit-history model (not overwriting wallet's single freeze slot), wallet balance preserved, schedule rules + future sessions paused/cancelled without financial impact, endDate extended by exact paused duration on resume |
| Pause/resume idempotency + admin UI (AdminSubscriptionsPage) | ✅ | Double-pause/double-resume safe no-ops; preview-before-confirm; history view |
| Single active-student transfer between teachers | ✅ | `transfer.service.js` — real availability re-check, alternative-slot suggestions, history preserved under old teacher, wallet untouched |
| Bulk whole-teacher-replacement batches | ✅ | `teacherReplacement.service.js` reuses the single-transfer primitive per student; classification (ready/conflict/missing_data), bounded+resumable processing, retry/cancel, optional source-teacher deactivation only on full success |
| Dedicated step-based bulk-replacement page (not a modal) | ✅ | `AdminTeacherReplacementPage.jsx` — setup/preview → conflict resolution → run/monitor |
| New permissions `transfers.view`/`transfers.execute`/`subscriptions.pause_resume` | ✅ | Backend-enforced on every new route |
| Automated verification | ✅ | 447 backend tests (mocked-model unit tests, +4 from the live-QA fixes below) + a full real-MongoDB integration rehearsal (credential defaults, pause/resume, transfer, bulk batch) that found and fixed 3 real bugs before sign-off; frontend production build clean |
| Live-browser QA pass (2026-09-01, recovery session) | ✅ | Full walkthrough against the real dev stack — academy defaults, teacher+student creation, pause/resume, single transfer (conflict+alternative), bulk replacement (conflict resolution+run+deactivation). Found & fixed 3 more real bugs: academy-default password silently fell back to auto/forced-change when the admin never opened the "تسجيل الدخول" tab (wizard + add-student modal); a 409 console/network error burst on every subscription pause (stale query invalidation); batch review always showed a partial student id instead of the full name. Also closed the documented multi-conflicting-rule limitation — each conflicting rule now resolves to its own alternative slot instead of one shared slot for all. Details: `SESSION_HANDOFF.md`'s 2026-09-01 recovery entry. |

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
| **Intelligent Attendance / Payroll-Ready Operations** | **19** | **19** | **0** |
| **Admin Operations Center + Review Queue + Dedupe** | **19** | **19** | **0** |
| **Full-Platform Seeder, Live Audit & Documentation Pass** | **10** | **10** | **0** |
| **Notification Center Redesign & UX/Product Audit** | **13** | **13** | **0** |
| **Operations Center Full Audit & Rebuild** | **14** | **14** | **0** |
| **Phase 2 Meeting Addendum (Credentials/Pause-Resume/Transfer)** | **12** | **12** | **0** |
| **TOTAL** | **329** | **329** | **0** |
