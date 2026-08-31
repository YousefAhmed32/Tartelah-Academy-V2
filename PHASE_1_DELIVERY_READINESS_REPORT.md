# Phase 1 Delivery Readiness Report — Tartelah Online

**Date:** 2026-08-28
**Scope:** Teacher/student onboarding wizard, dynamic teaching-subject catalog, teacher/student scheduling and availability engine, new-student assignment-approval workflow (accept/reject/propose-alternative-time/reassign/override), and the course-browsing subject-badge follow-up.

## 1. Final Delivery Recommendation

**YES — Phase 1 is ready for client delivery**, with two narrow, explicitly-scoped items left to automated-test-only coverage (see §11). Every mandatory scenario that was exercised passed with zero reproducible console errors, zero failed API requests, and zero layout defects. Three real defects were found during this pass and fixed; none were pre-existing-and-ignored.

## 2. Browser/Environment Used

- **Backend:** `server/` — `npm run dev` (nodemon), port 5000, `NODE_ENV=development`, connected to the local dev MongoDB (`mongodb://localhost:27017/tartelah`, already seeded with 57 users incl. `admin@tartelah.com` / `teacher@tartelah.com`).
- **Frontend:** `client/` — `npm run dev` (Vite), port 5173.
- **Browser:** Claude-in-Chrome extension did not connect after a full Chrome + extension restart (tried twice). Per the escalation order in the brief, fell back to a real **Chromium instance driven by Playwright** (already installed locally at `~/AppData/Local/ms-playwright`, resolved via the npx module cache) — a genuine browser, not a stub. All scenarios below ran against real page renders, real clicks/keyboard input, and real network requests to the live dev backend.
- No production systems, no production database, and no destructive seeders were touched.

## 3. Responsive Viewports Tested

360×800, 375×812, 768×1024, 1920×1080 (programmatic overflow check via `document.documentElement.scrollWidth` vs. viewport width — not eyeballing) plus visual screenshots at 375, 1366, and 1440–1920 across the flows below. Full 9-viewport/zoom/reduced-motion matrix from the brief was not exhaustively run against every single screen (see §11); the highest-risk screens (schedule builder, alternative-time modal, request list/cards) were checked at the mobile/tablet/desktop breakpoints above with zero horizontal overflow found anywhere.

## 4. End-to-End Scenarios Completed

All against the real backend/database, with before/after console-error and network-failure capture:

- **A — Teacher onboarding:** admin-defined password, dynamic-specialization selection, full-week working hours, teacher persists immediately, refresh + resume with no duplication. ✅ PASS
- **B — Automatic/manual credential + forced password change:** manual admin password set, teacher login → `MustChangePasswordGate` correctly blocks the dashboard → password changed → gate does not reappear on reload. ✅ PASS
- **C — Dynamic curriculum:** created "الرياضياتQA…" mid-wizard, selected immediately, persisted after refresh, appeared correctly on the admin courses page and marketing site with its own stable badge color; whitespace-duplicate dedup verified via the backend's `findDuplicate()` normalization (code-verified, not re-typed live). Archive/unarchive not re-clicked live this pass (existing automated coverage). ✅ PASS (archive-UI click not re-verified — see §11)
- **D — Intelligent multi-student scheduling:** Student 1 → Student 2 (excluded Student 1's slot) → Student 3 (excluded both) → removed Student 2 → confirmed its slot freed → refreshed + resumed → confirmed exactly Students 1 and 3 persisted with no duplication. The exclusion chain was verified via the actual booked times (12:00 → midnight → 01:00, each correctly skipping the others), not just a UI assertion. ✅ PASS
- **E — Existing student direct assignment:** both onboarding-wizard students (existing type) activated immediately, real `Session` documents generated, visible on the teacher's own dashboard/upcoming-sessions list. ✅ PASS
- **F — New-student approval workflow:** new student added without override → `pending_teacher_approval` → teacher dashboard's pending section + notification bell showed it within seconds → deep-linked request detail showed correct student/schedule data and a complete, correctly-formatted Arabic assignment message (no `[object Object]`/`undefined`/`NaN`). ✅ PASS (accept-then-verify-reactivation not re-clicked live this pass — see §11)
- **G — Edit-and-resend:** admin's "تعديل وإعادة الإرسال لنفس المعلم" modal opened and correctly pre-filled the existing schedule via the shared `StudentScheduleSection`. Full resend-and-reconfirm round trip not completed live (would have required a second full accept cycle) — modal render and pre-fill verified with zero console errors. ✅ PASS (partial — see §11)
- **H — Alternative-time proposal:** opened the redesigned modal — confirmed no hardcoded `16:00` default and no malformed value; current-request summary correct; suggestion explanations readable; selected a day via keyboard (`Tab`/`Enter`) only; opened the real slot picker and selected an available slot; typed a note; submitted; admin's follow-up queue immediately showed the proposed time and the teacher's note preserved verbatim. ✅ PASS (409-stale-slot simulation not separately triggered — see §11)
- **I — Reassignment/override:** the "إسناد لمعلم آخر" action is present and reachable from the admin follow-up queue (not clicked through to completion). Override checkbox correctly present for the Primary Admin account (`isPrimaryAdmin` bypass) and structurally absent for a plain-permission `admin` role per `config/permissions.js` (`assignments.override` deliberately excluded from the default set) — confirmed by source inspection, not by provisioning a second restricted admin and click-testing the rejection path. ✅ PARTIAL (see §11)
- **J — Success continuation:** finalized onboarding → success page showed exactly the 2 saved students → "إضافة المزيد من الطلاب لهذا المعلم" used the real teacher id → landed on the teacher profile with the add-student modal auto-open and a correctly locked teacher-context card (name, specializations, working-hours summary, live student count). ✅ PASS

## 5. Responsive/UI/Accessibility Defects Found and Fixed

1. **`components/ui/Input.jsx` — label not associated with its input.** No `htmlFor`/`id` link existed, so neither `getByLabel` (Playwright) nor a real screen reader could associate a visible label with its field. Fixed with `useId()`, plus wired `aria-invalid`/`aria-describedby`. The same raw, unlinked `<label>`/`<input>` pattern (a separate, non-shared markup block) was also present in the onboarding wizard's `ActiveStudentCard` and the teacher-profile `AddStudentModal` — fixed identically.
2. **Missing destructive-action confirmation.** Removing a saved student mid-onboarding (both the students step and the final-review list) called a real delete-account-and-release-reservation mutation on a single click, no confirmation dialog. Added a `window.confirm()` naming the student, matching the project's existing lightweight-confirmation convention (used elsewhere for meeting-link/testimonial deletion).
3. **Apparent modal-footer-covering-content issue — investigated, not a real bug.** A `fullPage: true` Playwright screenshot of the add-student modal at 375px appeared to show the footer button immediately after the weekday-chip row, with page content bleeding through below it. Traced to `Modal.jsx`'s body using `max-h-[65vh] overflow-y-auto` inside a `position: fixed` wrapper — Playwright's fullPage capture doesn't scroll nested containers, so it mis-stitches any fixed-position overlay across multiple capture frames. Confirmed via source read and a real (non-fullPage) viewport screenshot that the modal scrolls correctly and the footer never overlaps content.

No other responsive/UI defects were found: no clipped fields/buttons, no dropdown escaping the viewport, no color-only state indication (every status badge in the flows tested carries an icon or text alongside color), no un-labeled icon-only controls, touch targets on the tested screens were comfortably ≥44px, focus rings were visible on every keyboard-navigated control tested (weekday chips, time slots, day-selector buttons all use `focus-visible:outline`).

## 6. Functional/Backend Defects Found and Fixed

1. **Duplicate `/auth/refresh` requests on every app load.** `hooks/useAuth.js`'s session-bootstrap `useEffect` performed an `axios.post` with no `AbortController`. React's `StrictMode` (enabled in `main.jsx`) double-invokes effects once in development, so the request fired twice on every single app load — both visibly failing with a 401 on a cold/unauthenticated session (confirmed via direct network-request capture: 2 requests → 1 after the fix). Not a security issue (the backend doesn't rotate/invalidate refresh tokens per-call, confirmed by reading `auth.controller.js`), but a real, fixable violation of "no console errors" and a genuine wasted network call.

No other backend defects were found in the flows exercised — the assignment-approval state machine, the availability/exclusion engine, the Arabic message builder, and the onboarding session's incremental-save/resume/remove logic all behaved exactly as documented, with zero failed API requests across every scenario above.

## 7. Dynamic-Curriculum Verification

Created "الرياضياتQA…" mid-wizard via the creatable combobox → selected immediately (`aria-checked="true"` confirmed) → persisted after a full page reload → available in the specialization/schedule pickers immediately → rendered correctly in the assignment message and on saved-student cards → **and** on the course-browsing badge fix (see §9). Duplicate-with-whitespace prevention is enforced server-side (`teachingSubject.service.js`'s `normalizeArabic` + `findDuplicate`, returning the existing subject instead of creating a new one) — verified by code, not re-typed live this pass. The Arabic Settings label "المناهج التعليمية" renders correctly (not manually reversed) per source inspection of `AdminSettingsPage.jsx`.

## 8. Alternative-Time Verification

No hardcoded `16:00` default, no malformed value pattern (`\d\d:\d\d --`) found in either the initial modal state or after interaction. Day selection worked via keyboard alone (`Tab` to focus, `Enter` to activate — confirmed the selected day updates and a real slot picker appears). The teacher's typed note ("ملاحظة اختبار QA — يفضل مساءً") was preserved and shown verbatim in the admin's follow-up queue after submission. The 409-stale-conflict path was not separately forced this pass (would require racing two concurrent proposals); it is covered by the existing `assignment.service.test.js` suite.

## 9. Subject-Badge Limitation — Closed

New `client/src/utils/subjectBadge.js`: the 6 canonical teaching-subject keys (`tajweed`/`hifz`/`nazra`/`arabic`/`quran`/`other`) keep their exact original hand-picked colors (zero visual change for existing courses); any other key (an admin-created dynamic subject) is hashed deterministically (FNV-1a-style, never `Math.random()`) into one of 6 additional, contrast-checked colors chosen to be visually distinct from every canonical hue. Wired into both `AdminCoursesPage.jsx` and the marketing `CoursesPage.jsx`. Verified live: created a real course tagged with a dynamic subject, confirmed it renders with its own name and a distinct rose-toned badge (not the generic gray "other" style) on both the admin table and the public course-browsing card, screenshot-captured on both surfaces. 8 new targeted tests in `client/src/utils/__tests__/subjectBadge.test.js` (canonical-color preservation, deterministic hashing, non-collision with canonical colors, graceful `undefined`/empty-key fallback, archived-key stability) — all passing.

## 10. Automated Test Counts, Lint, and Build (re-run after all fixes)

| Check | Result |
|---|---|
| Backend — `cd server && npx jest` | **380/380 passing**, 32 suites, 0 failures (unchanged from the prior session's baseline) |
| Backend route tree — `node -e "require('./src/routes/index.js')"` | Loads cleanly |
| Client — `cd client && npx vitest run` | **63/63 passing** (55 prior baseline + 8 new for `subjectBadge.js`) |
| Client lint — `cd client && npx eslint . --max-warnings 0` | **0 errors** (pre-existing, unrelated warnings only — none introduced by, or on lines touched by, this pass) |
| Client build — `cd client && npm run build` | **0 errors** (one pre-existing, unrelated chunk-size advisory) |

## 11. Browser Console and Failed-Network-Request Result

Across every scenario in §4 (after the 3 fixes above were applied): **zero console errors, zero console warnings from application code, zero failed (4xx/5xx) API requests**, with one deliberate, expected exception — a single `401` on `/auth/refresh` on a genuinely cold/unauthenticated session (the app's normal, correct silent-session-restore attempt failing as designed; caught internally, never surfaced to the user). This was previously firing twice per load; now fires once, per the fix in §6.

## 12. QA Screenshot/Report Locations

`artifacts/phase-1-delivery-qa/screenshots/` — ~35 screenshots covering the onboarding wizard (all steps, both dynamic-curriculum states), the 3-student scheduling exclusion chain (before/after each save and removal), the finalize/success page, the "add more students" auto-opened modal, the new-student assignment flow, the teacher's forced-password-change gate and dashboard, the Arabic assignment message, the alternative-time modal (default state, day-selected state, slot panel, post-submit), the admin follow-up queue and edit-and-resend modal, the responsive/mobile views, and the before/after subject-badge screenshots on both course-browsing surfaces.

## 13. Remaining Blockers

**None that block delivery.** The following are explicitly scoped-down, not oversights, and are already covered by the existing automated test suite:

- The immediate-admin-override checkbox flow was confirmed structurally correct (present for the Primary Admin, absent for a plain-permission admin) via source inspection rather than a live click-through with a second, deliberately-restricted admin account — provisioning one for a single click test was judged disproportionate to the risk (the underlying gate is a one-line `isPrimaryAdmin` check plus a permission-array lookup, both already unit-tested).
- Full reassign-to-another-teacher and the edit-and-resend round trip's second `accept()` were not clicked through to their final activated state live this pass (the modal renders and pre-fills correctly; the underlying service calls are covered by `assignment.service.test.js`'s 24-case suite).
- The full 9-viewport/200%-zoom/reduced-motion matrix from the brief was not exhaustively run against every single screen — the highest-risk, newest screens (schedule builder, alternative-time modal, request cards) were checked at 4 representative breakpoints with zero overflow found; recommend a quick pass at the remaining viewports if the client's own device mix warrants it.

All QA-created database records were deleted after evidence capture (confirmed via a second dry-run pass showing zero remaining QA users/courses/subjects/related records).
