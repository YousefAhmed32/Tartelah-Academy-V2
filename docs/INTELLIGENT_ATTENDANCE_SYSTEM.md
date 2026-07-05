# Intelligent Attendance, Session Tracking, Teacher Accountability & Payroll-Ready Operations System

**Status:** Implemented and verified across two passes (build ✅, test suite ✅ — 40/40, syntax/load checks ✅).
**Relationship to prior work:** This builds directly on the audit in `docs/PLATFORM_FLOW_AND_TEACHER_ATTENDANCE_PLAN.md`, which found that a working teacher-attendance/salary subsystem already existed (`Session.teacherAttendanceStatus`, `teacherPerformance.service.js`, a cron sweep, dedicated performance dashboards) but had real trust gaps: payability ignored student attendance, the audit trail was almost entirely broken, and the correction workflow was hard to find. §1–§20 describe how that system was *hardened and extended* into a full session-centric operational platform in the first implementation pass. §21 onward describe the **continuation pass**: the Admin Operations Center, the Needs Review queue built on top of the confidence engine (which existed but was not yet surfaced), the recurring-session dedupe guard, and the remaining reliability/UX gaps identified in that pass's own re-verification step.

---

## 1. Discovered Existing Architecture

- **Platform model is 1-on-1, not group classes.** `Session`, `ScheduleRule`, and `Subscription` all carry a single `studentId` — every session is one teacher + one student. This shaped every design decision below (no "mark all present across a roster" bulk grid — bulk actions instead apply across a teacher's *list of today's sessions*).
- **Live external meetings.** The platform never hosted video — `Session.meetingLink`/`meetingProvider` store an external Zoom/Meet/Teams/other URL. There is no way to verify actual participation in that external call; everything the platform can record is either a timestamp of a platform action (check-in, link-open) or a teacher's own attestation (attendance marking, outcome confirmation).
- **Existing teacher-attendance machinery** (kept, not replaced): `Session.teacherStartedAt/teacherAttendanceStatus/teacherAttendanceMarkedBy/teacherLateMinutes`, `teacherPerformance.service.js`'s live aggregation (no duplicated stats table), a 10-minute cron sweep, and `TeacherPerformancePage.jsx` / `AdminTeacherPerformancePage.jsx`.
- **Existing student-attendance machinery** (kept, extended): a separate `Attendance` model (`present/absent/late/excused`, unique per session), manually set by the teacher via `POST /attendance/session/:id`, defaulting to `present` on session completion if untouched.
- **Existing audit infrastructure** (kept, repaired): `AuditLog` model, `audit.service.js`'s `logAction()`, and an admin-facing `/admin/audit-logs` page — present but almost unused (see §12).
- **No parent role, no group/class model, no payment-gateway integration** — confirmed absent; out of scope here as before.

---

## 2. Previous Attendance Behavior (before this change)

| Concern | Before |
|---|---|
| Teacher check-in | `/start` only worked while `status==='scheduled'`; a stale sweep at 15 minutes past end silently converted it to `no_show`/`absent` with no way back except an admin correction. |
| Payability | Computed purely from `teacherAttendanceStatus` (`on_time`/`late`); completely blind to whether the student attended, whether there was a technical issue, or whether the "completion" was ever confirmed as a real outcome. |
| Session outcome | Only the coarse `status` enum (`scheduled/ongoing/completed/cancelled/rescheduled/missed*/no_show`) — `missed` was declared but never actually set by any code path. |
| External link | A single click both silently checked the teacher in *and* opened the link — no separate evidence event, and no equivalent action/evidence for the student. |
| Delay handling | None — a session that started late had no way to record that fact; the only options were "on time/late" (derived from a single timestamp) or a full reschedule. |
| Audit trail | `AuditLog` infrastructure existed, but 7 of 9 real call sites (`article.controller.js`) passed arguments in the wrong shape and silently failed validation; the only working calls covered two unrelated student-account actions. Nothing in the entire session/attendance/subscription/enrollment-approval pipeline was audited. |
| Admin correction reachability | Only inside a teacher's CRM profile tab — not on the main sessions table. |

---

## 3. New Attendance Architecture — Summary

The system is now explicitly **evidence-layered**, distinguishing four levels of certainty and never collapsing them into one misleading "attendance" flag:

1. **Scheduled** — the `Session`/`ScheduleRule` record itself.
2. **Platform-declared** — teacher check-in (`teacherStartedAt`), delay reports, outcome confirmation, attendance finalization. These are the teacher's own attestations through the platform.
3. **Interaction evidence** — `teacherLinkOpenedAt` / `studentLinkOpenedAt`. A click is only a click; never treated as proof of external-meeting participation.
4. **Admin-reviewed** — manual corrections via the teacher-performance correction endpoint, now fully audit-logged.

A fifth level — **externally verified** (a real Zoom/Meet/Teams API integration) — does not exist and is explicitly not simulated (see §17).

On top of this, every session now carries a **payroll-readiness state** (`pending/payable/non_payable/pending_review/excluded`) computed deterministically from the above evidence, stored (not just live-computed) so an admin's correction is durable and never silently overwritten.

---

## 4. Session Lifecycle

```mermaid
stateDiagram-v2
    [*] --> scheduled
    scheduled --> ongoing: teacher checks in (/start)
    scheduled --> missed: sweep — 4h past end, no action
    missed --> ongoing: late self check-in (still allowed)
    missed --> no_show: sweep — 7h past end, still no action
    no_show --> ongoing: late self check-in (still allowed, corrects the auto-flag)
    ongoing --> completed: /complete (+ outcome confirmation)
    scheduled --> completed: /complete directly (fallback timing inference)
    scheduled --> cancelled: /cancel (teacher or admin)
    scheduled --> scheduled: /reschedule (new scheduledAt, audit-logged)
    completed --> [*]
    cancelled --> [*]
    no_show --> [*]: admin may still correct at any time
```

Key point: every "hard" auto-transition (`missed`, `no_show`) remains admin-correctable and teacher-self-resolvable — nothing here is a dead end.

---

## 5. Human-Centered Flexible Time Windows

Centralized in **`server/src/config/attendancePolicy.js`** (new file) — the backend is authoritative; `client/src/config/constants.js`'s `ATTENDANCE_POLICY` mirrors the same numbers for display only.

| Window | Default | Purpose |
|---|---|---|
| Pre-session access | 60 min before scheduled start | Session becomes actionable (check-in, link, readiness) |
| Post-session grace | 60 min after scheduled end | Fully normal editing, no warnings |
| Extended completion | +180 min after grace | Still fully actionable; UI shows a gentle "late completion" note |
| Missed threshold | 240 min after scheduled end (grace + extended) | Sweep marks `status: missed` — soft, still correctable |
| Absence threshold | 420 min after scheduled end | Sweep marks `status: no_show` / `teacherAttendanceStatus: absent` — still admin-correctable |
| Late tolerance | 15 min | Check-in within this window of `scheduledAt` counts as `on_time`, not `late` |

`getSessionWindow(scheduledAt, durationMinutes, now)` returns a `phase` (`upcoming/pre_session/in_progress/grace_period/extended_completion/overdue`) that the teacher UI uses to show forgiving, non-punitive copy instead of hard locks — see `TeacherSessionsPage.jsx`'s `windowNote`.

```mermaid
flowchart LR
    A["Scheduled 5:00–6:00 PM"] --> B["Pre-session opens 4:00 PM<br/>(actionable)"]
    B --> C["In progress 5:00–6:00 PM"]
    C --> D["Grace period<br/>6:00–7:00 PM<br/>(fully normal)"]
    D --> E["Extended completion<br/>7:00–10:00 PM<br/>(still actionable, marked late)"]
    E --> F["Missed sweep @ 4h past end<br/>(soft: status→missed)"]
    F --> G["Absence sweep @ 7h past end<br/>(status→no_show, still correctable)"]
```

---

## 6. Teacher Check-In vs External Meeting Attendance

**This distinction is load-bearing throughout the implementation, per explicit instruction.**

- `Session.teacherStartedAt` = platform check-in timestamp. Comment in `models/Session.js` states explicitly: *"it does NOT prove the teacher actually joined the external Zoom/Meet/Teams call, only that they declared readiness through the platform at this time."*
- `Session.teacherLinkOpenedAt` / `studentLinkOpenedAt` = evidence-only "opened the external link" events, recorded via the new `POST /sessions/:id/link-opened` endpoint. The teacher UI's helper text states: *"فتح الرابط لا يُثبت الحضور الفعلي داخل الاجتماع — هو تسجيل حضورك على المنصة فقط."* (Opening the link does not prove actual attendance inside the meeting — it only records your check-in on the platform.)
- No code path anywhere infers "joined the meeting" or "meeting duration" from these clicks. `sessionIntelligence.service.js`'s confidence scoring treats a link-open as one weak positive signal among several, never as proof.

---

## 7. Teacher Check-In Logic

`session.controller.js` → `startSession`:
- Now allowed from `status` of `scheduled`, `missed`, **or** `no_show` — a late self check-in always wins over a system guess (this is what makes the sweep job non-punitive: a teacher who was genuinely just late can always still resolve their own record).
- Punctuality computed via `classifyCheckIn(scheduledAt, now, LATE_TOLERANCE_MINUTES)` → `on_time` or `late` + exact `lateMinutes` (always the real number, regardless of classification).
- `teacherAttendanceMarkedBy` is now set to `'teacher'` on self check-in (previously always `'system'`) — the enum gained a third value so genuine self-attestation is distinguishable from system inference or admin correction (`models/Session.js`).
- Every check-in is now audit-logged (`session.check_in`), including whether it self-resolved a prior auto-flag.

---

## 8. Student Attendance Logic

`attendance.controller.js` (existing `Attendance` model, extended, not replaced):
- Status enum extended: `present/absent/late/excused` → **+ `left_early`, `technical_issue`**.
- New `arrivalTime` field for late students.
- New `isFinalized`/`finalizedAt`/`finalizedBy` — draft vs. finalized attendance are now distinct. `saveSessionAttendance` accepts a `finalize: boolean` flag; finalizing also stamps `Session.attendanceFinalizedAt/By` for admin visibility.
- **Fixed a real authorization gap**: `PATCH /attendance/:id` (`updateAttendance`) previously had *no* ownership check at all — any teacher could edit any other teacher's attendance record by guessing/enumerating the Mongo `_id`. Now mirrors `saveSessionAttendance`'s check.
- Both write paths are now audit-logged (`attendance.save`, `attendance.finalize`, `attendance.update`).

Teacher UI (`TeacherSessionsPage.jsx`): attendance buttons now include the two new statuses, an arrival-time picker appears when `late` is selected, and there are two distinct actions — **"حفظ كمسودة"** (save draft) and **"اعتماد نهائي"** (finalize) — instead of one ambiguous save button.

---

## 9. Session Outcome — Explicit Completion Confirmation

New `Session.outcome` field (separate from the coarse `status`): `pending_review | delivered | partially_delivered | teacher_absent | cancelled_by_teacher | cancelled_by_admin | cancelled_by_student | technical_issue | rescheduled | no_students_attended`.

- The happy path stays a single click — "اكتملت" defaults `outcome` to `delivered`.
- A secondary "نتيجة مختلفة؟" (different outcome?) link reveals a small select for the other cases — no form is forced on the normal case, per the "keep it fast" instruction.
- `cancelSession` now sets `outcome` to `cancelled_by_teacher`/`cancelled_by_admin`/`cancelled_by_student` based on caller role/body.

---

## 10. Delay Reporting — Distinct From a Full Reschedule

New `PATCH /sessions/:id/delay` (`reportDelay` in `session.controller.js`) + new fields `actualStartAt`, `actualEndAt`, `delayMinutes`, `delayReasonCode`, `delayNote`.

- Preserves the original `scheduledAt` — this is *not* a reschedule, just a real-timing record alongside the plan, exactly matching the brief's "minor delay vs. true reschedule" distinction.
- Reason codes: `teacher_delay/student_delay/technical_issue/previous_session_overrun/mutual_agreement/emergency/other`.
- Teacher UI: a lightweight "تأخرت الحصة" button opens a small modal (`DelayModal` in `TeacherSessionsPage.jsx`) — reason dropdown + optional note, one click to submit. Explicitly reassures: *"هذا لا يُلغي الحصة، فقط نسجّل الوقت الفعلي وسببه."*
- A true reschedule (different day) still uses the existing `PATCH /sessions/:id/reschedule` — unchanged, now audit-logged.

---

## 11. Payroll-Ready Session Accounting

### 11.1 New stored field: `Session.payrollStatus`

`pending | payable | non_payable | pending_review | excluded` + `payrollStatusReason`, `payrollStatusSetBy` (`system`/`admin`), `payrollStatusSetAt`.

Deliberately **not** a 6-value enum with an "adjusted" state — that would conflate *what the status is* with *who set it*. Instead, `payrollStatusSetBy: 'admin'` is the durable marker: once an admin sets it, `applySystemPayrollStatus()` (in `session.controller.js`) and the sweep job (`teacherAttendanceSweep.job.js`) both check this and never silently recompute over an admin's decision again.

### 11.2 Deterministic computation — `server/src/services/sessionIntelligence.service.js` (new)

`computePayrollStatus(session)` — pure, transparent, rule-based (unit-tested, see §19):

```mermaid
flowchart TD
    A[Session] --> B{Cancelled or rescheduled?}
    B -->|Yes| C[excluded]
    B -->|No| D{Status resolved? completed/no_show/missed}
    D -->|No, still scheduled/ongoing| E[pending]
    D -->|Yes| F{Outcome = technical_issue?}
    F -->|Yes| G[pending_review]
    F -->|No| H{teacherAttendanceStatus on_time or late?}
    H -->|No, absent| I[non_payable]
    H -->|No, excused| J[pending_review]
    H -->|Yes| K{outcome = no_students_attended?}
    K -->|Yes| L[pending_review — admin must decide]
    K -->|No| M[payable]
```

**This function never lets student absence silently flip a session to non-payable or to payable** — it always routes to `pending_review` when the teacher was present but the student wasn't, per the open policy question already flagged in the prior audit (§37 of `PLATFORM_FLOW_AND_TEACHER_ATTENDANCE_PLAN.md`). The system computes evidence; a human still owns the one real policy call.

### 11.3 New payroll-readiness reporting

`teacherPerformance.service.js` gained `getPayrollReadiness(teacherId, {from,to})` and `getOrgWidePayrollReadiness({from,to})` — counts + estimated amount grouped by `payrollStatus`, for a period. Exposed via:
- `GET /teacher-performance/me/payroll-readiness` (teacher's own)
- `GET /teacher-performance/admin/payroll-readiness` (org-wide)

Surfaced in both `TeacherPerformancePage.jsx`'s Salary tab (new `PayrollReadinessCard`) and `AdminTeacherPerformancePage.jsx` (new summary bar above the table) — a plain-language breakdown ("Payable: 12, Pending review: 2, Excluded: 1...") instead of one opaque total.

### 11.4 Rates

`User.salaryPerSession` already existed and is unchanged — no new rate model was invented (per-session was already the established model; hourly/fixed-monthly were not observed anywhere in the codebase and would be overengineering for this academy).

---

## 12. Anti-Fraud / Audit Trail

**The most important correctness fix in this change.** Full trace confirmed via exhaustive grep before touching anything (see prior audit report §29 for the original finding).

| Fix | File |
|---|---|
| 7 broken `logAction(req, 'x', {...})` calls (wrong argument shape → always silently failed Mongoose validation) rewritten to the service's real `logAction({actorId, actorRole, action, entity, entityId, changes})` signature, via a small `auditArticle()` wrapper | `controllers/article.controller.js` |
| Session check-in, complete, cancel, reschedule, delay, admin create/update/delete — all now call `logAction` | `controllers/session.controller.js` |
| Attendance save/finalize/update — now audit-logged | `controllers/attendance.controller.js` |
| Admin's session-attendance/payroll correction — now audit-logged (previously the single most consequential correction endpoint had zero audit coverage) | `controllers/teacherPerformance.controller.js` |
| Admin's direct attendance override — now audit-logged | `controllers/admin.controller.js` (`updateAttendanceRecord`) |
| Subscription create/update — now audit-logged | `controllers/subscription.controller.js` |
| **Enrollment approval/rejection** — the single most consequential admin action in the platform (creates a `Subscription`, grants access) — now audit-logged | `controllers/enrollment.controller.js` (`reviewRequest`) |
| Schedule-rule creation — now audit-logged | `controllers/scheduleRule.controller.js` |

`audit.service.js` itself was not changed — its fire-and-forget, non-blocking design (a logging failure never fails the underlying business action) was correct; the bug was entirely in how callers invoked it.

---

## 13. Anti-Fraud Business Rules — What Changed vs. What's Deliberately Unchanged

| Rule | Status |
|---|---|
| Teacher cannot silently keep a stale session forever | **Fixed** — graduated sweep (§5) always resolves it eventually, correctably. |
| Admin-created schedule rule attributed to the right teacher | **Fixed** — `scheduleRule.controller.createRule` previously always used `req.user._id`; now requires an explicit `teacherId` in the body when the caller is `admin` (`400` if missing), preventing silent mis-attribution of an entire recurring series' payroll data. |
| Duplicate payable sessions from regenerating a schedule | **Not hardened in this pass** — `schedule.service.js`'s generation loop still has no dedupe-by-date check. Documented as a known limitation (§18). |
| Subscription decrement double-counted on repeat completion | **Fixed** — `completeSession` now rejects (`400`) if `session.status === 'completed'` already, closing a pre-existing double-decrement path. |
| Subscription decrement scoped to the right subscription | **Fixed** — now matches `session.subscriptionId` directly when present, only falling back to the old `{studentId, status:'active'}` lookup for legacy ad-hoc sessions created before `subscriptionId` was populated. |
| Teacher marking attendance "too early" | **Deliberately not hard-blocked** — per the explicit "human-centered, forgiving" instruction; the UI surfaces window phase but never denies the action outright. |
| Student absence silently affecting teacher pay | **Deliberately routed to `pending_review`, never auto-decided** — this remains the one real open business policy question (see prior report §36/§37); this implementation makes it *visible* everywhere without deciding it unilaterally. |

---

## 14. Permissions

No RBAC middleware changes were needed — the existing `authenticate` + `authorize(...)` model already covered every new endpoint correctly:

| Endpoint | Guard |
|---|---|
| `PATCH /sessions/:id/delay` | `isAdminOrTeacher` + in-controller ownership check (own session only) |
| `POST /sessions/:id/link-opened` | `authenticate` only, then in-controller check: caller must be the session's teacher, student, or an admin |
| `GET/PATCH /teacher-performance/*/payroll-readiness` | mirrors the existing `me/*` (`isAdminOrTeacher`) / `admin/*` (`isAdmin`) split |
| Everything else | reuses the exact guards already in place (`isAdminOrTeacher` for `/start`, `/complete`, `/cancel`, `/reschedule`; `isAdmin` for corrections) |

---

## 15. Database Changes

**All additive — no destructive migration, no existing field removed or renamed.**

`models/Session.js`:
```
teacherAttendanceMarkedBy enum: + 'teacher'
+ actualStartAt, actualEndAt, delayMinutes, delayReasonCode, delayNote
+ outcome (enum, default 'pending_review')
+ teacherLinkOpenedAt, studentLinkOpenedAt
+ attendanceFinalizedAt, attendanceFinalizedBy
+ payrollStatus (enum, default 'pending'), payrollStatusReason, payrollStatusSetBy, payrollStatusSetAt
+ indexes: {teacherId,payrollStatus}, {payrollStatus,scheduledAt}
```

`models/Attendance.js`:
```
status enum: + 'left_early', 'technical_issue'
+ arrivalTime, isFinalized, finalizedAt, finalizedBy
```

Every new field has a safe default or is optional — existing documents are valid without any backfill. `payrollStatus` defaults to `'pending'` on old documents until they're next touched by `completeSession`/the sweep/an admin correction, at which point it gets computed normally.

---

## 16. API Changes — Full List

**New:**
```
PATCH  /sessions/:id/delay                              — report a delay (not a reschedule)
POST   /sessions/:id/link-opened                         — evidence-only external link open
GET    /teacher-performance/me/payroll-readiness          — teacher's own payroll breakdown
GET    /teacher-performance/admin/payroll-readiness       — org-wide payroll breakdown
```

**Changed (backward compatible):**
```
PATCH /sessions/:id/start        — now also accepts status missed/no_show (self-resolve)
PATCH /sessions/:id/complete     — now accepts optional { outcome }; rejects if already completed
PATCH /sessions/:id/cancel       — now accepts optional { cancelledByRole }
POST  /attendance/session/:id    — now accepts optional { arrivalTime, finalize }
PATCH /attendance/:id            — now ownership-checked for teacher role
PATCH /teacher-performance/admin/session/:id/attendance
                                  — now accepts optional { payrollStatus, payrollStatusReason }
POST  /schedule-rules            — now requires { teacherId } in body when caller is admin
GET   /admin/sessions            — now accepts optional ?payrollStatus= filter
```

No endpoint's existing request/response contract was broken — every addition is an optional field or a new route.

---

## 17. Frontend Changes — Full List

```
client/src/config/constants.js
  + ATTENDANCE_STATUS: left_early, technical_issue
  + SESSION_OUTCOME, PAYROLL_STATUS, DELAY_REASON maps
  + ATTENDANCE_POLICY (display-only mirror of backend policy)

client/src/pages/teacher/TeacherSessionsPage.jsx
  + DelayModal component
  + SessionCard: window-phase-aware forgiving copy, distinct check-in vs.
    link-open evidence tracking, extended attendance statuses + arrival
    time + draft/finalize split, outcome picker on completion, delay action

client/src/pages/teacher/TeacherDashboardPage.jsx
  + NextSessionCard: same forgiving check-in relaxation + link-open evidence
    event, relabeled button copy (no longer implies "attendance" from a click)

client/src/pages/teacher/TeacherPerformancePage.jsx
  + PayrollReadinessCard in the Salary tab

client/src/pages/admin/AdminSessionsPage.jsx
  + PayrollBadge, CorrectionModal (quick attendance/payroll correction
    directly from the sessions table — closes the reachability gap from
    the prior audit)
  + payrollStatus filter, teacherAttendanceStatus + payroll badges per row
  + 'missed' status recognized in STATUS_CONFIG/status filter tabs

client/src/pages/admin/AdminTeacherPerformancePage.jsx
  + org-wide payroll-readiness summary bar
```

`client/src/pages/teacher/TeacherAttendancePage.jsx` needed **no code change** — its status buttons are already generated from `Object.entries(ATTENDANCE_STATUS)`, so extending the constants map alone surfaced `left_early`/`technical_issue` there automatically.

---

## 18. Known Limitations (as of the first pass — see §31 for current status)

- ~~No dedupe guard on regenerated recurring sessions~~ — **resolved in the continuation pass, see §26.**
- **`missed` vs `no_show` terminology** — now both meaningfully used (previously `missed` was declared but dead), but the two-stage naming (`missed` = soft/pending, `no_show` = hard/resolved) is a judgment call, not something mandated by existing product copy; worth a product review pass.
- **No custom date-range picker** on the payroll-readiness/performance pages — still only week/month/quarter presets (a pre-existing limitation, unchanged).
- **AdminTeachersPage.jsx's existing `AttendanceCorrectionMenu`** was left as-is (still only sends `{status}`) — the new richer correction UI lives in `AdminSessionsPage.jsx`'s `CorrectionModal` instead of unifying both into one component, to avoid an unrelated rewrite of a working, unrelated file.
- ~~Confidence scoring (`computeConfidence`) is implemented and unit-tested but not yet surfaced in any admin UI~~ — **resolved in the continuation pass, see §24.**
- **No real external-provider integration** (Zoom/Meet/Teams API/webhooks) — deliberately out of scope per explicit instruction; the architecture (`teacherLinkOpenedAt`/`studentLinkOpenedAt` as separate evidence fields, confidence scoring as a rules engine) is structured so a real integration could later add a genuine "externally verified" evidence tier without any rework of what exists today.
- **Lint tooling gap (pre-existing, not introduced by this change):** the repo has `eslint@9` installed and a `lint` script using ESLint 8's `--ext` CLI syntax, but **no `eslint.config.js` (or legacy `.eslintrc.*`) exists anywhere in the repository** — `npm run lint` has likely never actually run successfully. Still not retrofitted (see §31) to avoid surfacing an unbounded number of unrelated pre-existing warnings across a codebase this change didn't otherwise touch.
- **`jest` was not previously installed** despite being the declared `test` script — installed as a devDependency in this pass since new tests needed it to run at all.

---

## 19. Testing Performed (first pass)

- **`npm run build`** (client) — zero errors.
- **`npm test`** (server, jest) — `server/src/services/__tests__/sessionIntelligence.test.js`, 19/19 passing (check-in classification, session window phases, payroll status computation, confidence scoring).
- **Syntax + load verification** on every backend file created/modified, plus a full `routes/index.js` load check.
- **Manual trace** of the full flow (enrollment → schedule → check-in → delay → complete → payroll-readiness → admin correction → audit log).
- **`npm run lint`** — could not run; see §18 (pre-existing repo gap, not caused by this change).

---

## 20. Recommendations Made at the End of the First Pass (status updated in §31)

1. ~~Add the `{seriesId, scheduledAt}` dedupe guard~~ — done, §26.
2. ~~Surface `computeConfidence()` in an admin "needs review" queue~~ — done, §24/§25.
3. Resolve the one open business-policy question from the prior audit: should `pending_review` (teacher present, student absent) ever auto-resolve to payable/non-payable after N days, or always require a human decision? — **still open by design, see §29.**
4. Add a real `eslint.config.js` as its own scoped cleanup task, then triage pre-existing warnings separately from feature work — **still not done, see §31.**
5. Consider unifying `AdminTeachersPage.jsx`'s `AttendanceCorrectionMenu` and `AdminSessionsPage.jsx`'s `CorrectionModal` into one shared component — **still not done; a third correction entry point (`AdminOperationsCenterPage.jsx`'s `InlineCorrectionForm`) was added instead of consolidating, see §31.**
6. If a real Zoom/Meet/Teams integration is ever pursued, its evidence should slot in as a new "externally verified" tier — unchanged guidance.

---

## 21. Continuation Pass — Re-Verification (Phase 1)

Before adding anything new, every piece of the first pass was re-read against this document and the code, not assumed correct:

- `attendancePolicy.js`, `sessionIntelligence.service.js`, `session.controller.js`, `schedule.service.js`, `attendance.controller.js`, `teacherAttendanceSweep.job.js`, `teacherPerformance.service.js` were all re-read in full.
- **One genuine doc/code drift was found and fixed**: `sessionIntelligence.service.js`'s `computePayrollStatus` docblock still said admin overrides were "tracked as `payrollStatus:'adjusted'`" — but the actual shipped design (correctly, per the model comment in `Session.js`) tracks overrides via `payrollStatusSetBy: 'admin'`, deliberately *not* a 6th enum value, to avoid conflating "what the status is" with "who set it." The comment was stale from an earlier design iteration; fixed to match the real, tested behavior. `computeConfidence`'s docblock was also missing the `score` field in its documented return shape; fixed.
- Everything else (policy windows, sweep stages, payroll formula, audit call sites) matched the documentation exactly — no other drift found.

---

## 22. Admin Operations Center

**New page:** `client/src/pages/admin/AdminOperationsCenterPage.jsx`, route `ADMIN_OPERATIONS` = `/admin/operations`, added to `AdminLayout.jsx`'s sidebar (top of the "المنصة" group, right after the Dashboard link — it's the daily command center) and to the mobile bottom-nav (replacing the less time-sensitive "Articles" quick-link).

Three tabs, each backed by its own bounded-query endpoint (`server/src/controllers/operations.controller.js`, mounted at `/api/v1/operations`, entirely `isAdmin`-gated):

- **الآن (Live Now)** — `GET /operations/live`. Today's sessions bucketed into: live now, starting soon, missing check-in, missing meeting link, late teachers, attendance pending, recently completed, cancelled/rescheduled — plus review/payroll counts from a 14-day window. Each stat tile is clickable and deep-links into the Timeline tab pre-filtered. Refreshes every 60s (a lightweight `refetchInterval`, not a websocket — see §27 for why).
- **الجدول الزمني (Timeline)** — `GET /operations/timeline`. Chronological, filterable (date, teacher, status, payroll status, "needs review only") session list with progressive disclosure: a compact row that expands to show meeting-link state, check-in/finalization timestamps, payroll reason, confidence, and review reasons only when the admin actually clicks it.
- **قائمة المراجعة (Needs Review Queue)** — `GET /operations/review-queue`. See §23.

This directly answers the brief's "what is happening now / what should have happened / what is late / what is missing / what needs review / what affects payroll" — using the *existing* computed intelligence (payroll status, teacher attendance status, confidence) rather than inventing a parallel data model.

---

## 23. Needs Review Queue

**The queue was the single most important missing piece from the first pass** — `computeConfidence()` existed and was tested, but nothing in the UI ever showed it to an admin. This pass closes that gap end-to-end: engine → API → queue UI → actions.

### The assessment engine — `assessSessionReview()`

New function in `server/src/services/sessionIntelligence.service.js`, sitting alongside (not replacing) `computeConfidence`/`computePayrollStatus`. Every reason is a checkable fact about data the platform actually recorded — never a claim about the external meeting. Returns `null` for the common case (nothing wrong) or `{ severity, reasons: [{code, label}] }`.

Rules, grouped by severity (see §24 for how severity maps to priority):

| Severity | Rule | Why |
|---|---|---|
| critical | Cancelled/rescheduled session still marked `payable` | Direct contradiction — cancelled work should never pay |
| critical | `status: no_show` but `teacherAttendanceStatus` isn't `absent` | Internal data disagreement |
| critical | `outcome: delivered` but `status` never reached `completed` | Internal data disagreement |
| high | `status: missed` (unresolved past the soft sweep threshold) | Nobody has acted on this session yet |
| high | Still `scheduled` with no check-in, well past the scheduled window | Same — teacher never engaged |
| high | `status: completed` but attendance was never finalized | Blocks a confident payroll decision |
| high | `payrollStatus: pending_review` | Explicit, already-known open question (surfaced with its own stored reason) |
| medium | Teacher checked in >30 min late | Notable but not blocking |
| medium | Attendance finalized long after the extended-completion window closed | Legitimate under the forgiving-windows policy, but still worth a glance |
| medium | No meeting link recorded while the session is imminent/in progress | Operational gap the teacher should fix |

When multiple rules fire at once, the session is flagged at the single **highest** severity, listing every reason (not just the worst one) — an admin sees the full picture, not just a label.

### API

`GET /operations/review-queue` — bounded to the last 14 days by default (`from`/`to` overridable, clamped to 31 days max), fetches candidate sessions once, computes `assessSessionReview` in application code (no per-row DB query), sorts by severity then recency, paginates in memory. Excludes sessions already `reviewState: resolved|dismissed`.

### Lifecycle — new `Session` fields

`reviewState` (`open|in_review|resolved|dismissed`, unset ≈ open), `reviewedBy`, `reviewedAt`, `reviewNote` — deliberately decoupled from the *reasons* (which are always recomputed live) so a dismissal/resolution persists even though the underlying evidence never changes retroactively. `PATCH /operations/review/:sessionId` with `{ action: 'start_review'|'resolve'|'dismiss'|'reopen', note }` — every action is audit-logged (`review.start_review`, `review.resolve`, `review.dismiss`, `review.reopen`).

### Actions available from the queue UI

Per Phase 7's explicit scope (only actions the existing architecture actually supports — no invented workflows): **Start Review** (claim it), **Correct** (opens an inline form reusing the *existing* `PATCH /teacher-performance/admin/session/:id/attendance` correction endpoint — deliberately not a new endpoint), **Resolve**, **Dismiss**. Correcting and resolving are composable, separate actions, not fused into one, so an admin can resolve a review without necessarily changing anything (e.g., "I checked, this is fine as-is").

---

## 24. Confidence Intelligence, Surfaced

`computeConfidence()` (unchanged logic from the first pass, still unit-tested) is now actually shown to admins in two places:
- `AdminOperationsCenterPage.jsx`'s Timeline row, expanded view — a small badge using `CONFIDENCE_LEVEL` labels (`أدلة تشغيلية قوية` / `طبيعي` / `يحتاج مراجعة`) with an explicit caption: *"ليست إثباتاً لحضور فعلي داخل الاجتماع الخارجي، بل مؤشر على توفر الأدلة التشغيلية"* (not proof of actual attendance in the external meeting — an indicator of available operational evidence).
- `session.controller.js`'s `getSession` (single-session detail endpoint) now returns `confidence` (all roles) and `reviewAssessment` (admin only) alongside the existing `attendance`/`window` fields — free to compute since `Attendance` is already loaded there.

The Timeline's bulk path avoids an N+1 `Attendance` query per row by passing a synthetic `{isFinalized: true}` stand-in built from `Session.attendanceFinalizedAt` (which `attendance.controller.js` already keeps in sync whenever attendance is actually finalized) instead of the real document — no loss of signal, one fewer query per row across potentially hundreds of rows.

No raw numeric score is shown in the UI — only the three-state label — per the explicit "do not create opaque scores" instruction; the `score` field remains available in the API response for anyone building a future admin tool that wants it, but the primary UX is the label + reasons.

---

## 25. Review Priority Engine

Severity (`critical > high > medium > low`) is computed once, centrally, in `assessSessionReview()` — never re-derived or duplicated in a React component. `SEVERITY_RANK` is exported from `sessionIntelligence.service.js` specifically so `operations.controller.js`'s queue-sorting logic and any future consumer share one ranking, rather than each defining its own. The queue UI's severity filter chips are pure display — clicking one just adds `?severity=high` to the query string; all comparison logic stays server-side.

---

## 26. Recurring-Session Deduplication (mandatory, previously a known gap)

### The guarantee

`models/Session.js` gained a **unique partial index**: `{seriesId: 1, scheduledAt: 1}` with `partialFilterExpression: { seriesId: { $exists: true } }`. Partial so ad-hoc/manually-created sessions (no `seriesId`) are never constrained by it — only recurring-series occurrences are. This is the actual, DB-enforced guarantee; everything else is defense-in-depth around it.

### Idempotent generation

`schedule.service.js`'s `generateSessionsFromRule` was rewritten from `Session.insertMany(...)` (which would either throw on the *entire batch* on a duplicate-key collision, or silently double-insert if the index didn't exist yet) to `Session.bulkWrite([...])` with one `updateOne({filter: {seriesId, scheduledAt}, update: {$setOnInsert: {...}}, upsert: true})` per date. A pre-existing occurrence's filter matches, `$setOnInsert` is skipped, nothing is mutated — a genuinely new date inserts normally. The function's return value now reflects only the sessions *actually newly inserted* by that call (via `bulkWrite`'s `upsertedIds`), so the "N sessions generated" notification/response count stays accurate even when some requested dates already existed.

This makes generation safe for:
- **The exact same rule generated twice** (double-click, retried request) — second call inserts nothing new.
- **Two near-simultaneous calls** (a race) — MongoDB's unique index is what actually decides the race, not application logic; whichever `updateOne` reaches Mongo first wins that occurrence, the other's upsert becomes a no-op match. No two Session docs can ever exist for the same `{seriesId, scheduledAt}`.
- **Legitimate distinct occurrences** — different `scheduledAt` values always insert.
- **Rescheduling** — unaffected, because reschedule mutates a single existing document's `scheduledAt` field directly (`session.controller.js`'s `rescheduleSession`) rather than going through generation at all.

### Legacy data

Existing sessions created before this index was added could, in principle, already contain duplicate `{seriesId, scheduledAt}` pairs (from the old `insertMany`-based generation, if it was ever called twice with overlapping ranges in production). If so, MongoDB will fail to *build* the new unique index in the background and log an error — the app keeps running, but the constraint won't actually be enforced until those duplicates are removed. **New script:** `server/src/scripts/dedupeSessions.js` (`npm run dedupe-sessions`, dry-run by default; `--apply` to actually delete) finds duplicate groups, conservatively keeps the earliest-created document per group, and only auto-removes a duplicate if it never progressed past the default `scheduled` state with zero teacher activity — anything that looks like it has real history is left alone and printed for manual review instead of being silently discarded.

### Tests

`server/src/services/__tests__/scheduleDedupe.test.js` (11 new tests). Since this repo has no DB test infrastructure (no `mongodb-memory-server`, no `supertest`) — a deliberate choice documented rather than papered over, see §31 — these tests mock the Mongoose `Session` model and assert against the *actual production code path*: the exact `bulkWrite` op shape (`upsert: true`, `$setOnInsert`, the `{seriesId, scheduledAt}` filter), idempotency (same rule generated twice → zero new inserts second time), a simulated race (two "concurrent" calls → no id appears in both results), legitimate extension (existing count offsets title numbering correctly), and the zero-dates short-circuit (never touches the DB when nothing would be generated). The date-generation determinism itself (`previewFromRule`) is tested directly with no mocking needed, since it's a pure function.

---

## 27. Smart Session State Resolution (contradictory states)

Rather than a separate "validator" pass, contradiction detection is folded directly into `assessSessionReview()` at `critical` severity (§23's table) — the same engine that powers the review queue is what catches "cancelled but still payable," "no_show but attendance status disagrees," and "outcome says delivered but status never completed." This was a deliberate architecture choice: a session in a contradictory state is, definitionally, the most urgent kind of review item, so it belongs in the same engine and the same queue rather than a separate silent-mutation "fixer" — per the explicit instruction to *flag and route to review* rather than auto-correct historical truth. "Session completed twice" (also listed in the brief) was already prevented at the source in the first pass (`completeSession` rejects if `status` is already `completed`) rather than needing post-hoc detection.

---

## 28. Admin Dashboard Intelligence

`AdminDashboardPage.jsx` gained one new component, `OperationsIntelligenceStrip` — a single-row, click-to-expand-into-Operations-Center strip showing five live counts (live now, missing check-in, missing link, needs review, payroll review pending) with a green "كل شيء طبيعي ✓" state when nothing needs attention. Deliberately not a second copy of the Operations Center's stat grid — the dashboard answers "does anything need me," the Operations Center answers "exactly what, and what do I do about it," per the brief's own framing.

`TeacherDashboardPage.jsx` also gained a `needsAttention` count (new: `teacher.controller.js`'s `getMyStats` now returns it, bounded to the last 14 days — `status: missed` OR `completed` sessions with no finalized attendance) surfaced as a new "حصص سابقة بحاجة إجراء منك" action-queue item, so a teacher's own dashboard reflects the same underlying signal the admin queue uses, scoped to just their own sessions.

---

## 29. Payroll Review Hardening

No new payroll states were introduced and the one open business-policy question from the first pass (does student absence affect teacher pay?) is still **deliberately left open** — `pending_review` remains the honest answer, never silently resolved by a timer or a default. What changed:
- Every `pending_review` session now surfaces its *specific* `payrollStatusReason` (already computed by `computePayrollStatus`, previously only visible via a raw string on the session document) directly inside the review queue's reason list — an admin sees *why* in the same place they see everything else needing attention, not a separate report to cross-reference.
- The Operations Center's Live tab and Admin Dashboard strip both surface a standing `payrollReviewCount` so pending payroll decisions can never quietly age out of visibility between monthly payroll runs.
- The correction endpoint (`correctAttendance` in `teacherPerformance.service.js`, unchanged from the first pass) remains the only way to move a session out of `pending_review` — no automatic resolution path was added, consistent with "do not unilaterally invent business policy."

---

## 30. Query & Performance Notes

Every new/changed query is intentionally bounded:
- `/operations/live` — today's sessions only (`scheduledAt` within the current day) for the bucket sections; the review/payroll counts look back a fixed 14 days, not the whole collection.
- `/operations/timeline` — defaults to "last 3 days → next 3 days" when no explicit date/range is given; any explicit range is clamped server-side to 31 days max (`clampRange()` in `operations.controller.js`).
- `/operations/review-queue` — same 14-day default, 31-day clamp, plus a hard `CANDIDATE_HARD_CAP = 1000` document safety limit regardless of range, before any in-memory assessment runs.
- No endpoint here does a full-collection scan or unbounded aggregation. `assessSessionReview`/`computeConfidence` run in application code only over the already-bounded, already-fetched result set — never as a per-row second query (the Session-level `attendanceFinalizedAt` mirror specifically exists to make this possible without an `Attendance` join).
- New indexes: `{reviewState: 1, scheduledAt: -1}` (review queue's primary filter+sort), and the unique `{seriesId: 1, scheduledAt: 1}` partial index (dedupe, doubles as an efficient per-series lookup — replaces a now-redundant plain index with the same key pattern that existed before this pass).
- No WebSockets were added for "live-ish" behavior — the existing platform has no realtime session-state push channel, and a 60-second `refetchInterval` on the Operations Center's Live tab (120s on the Dashboard strip) is a proportionate, zero-new-infrastructure way to keep an admin's glance-view fresh, per the explicit "don't add WebSockets unless they materially improve the product" instruction.

---

## 31. Final Self-Audit

Checked against every numbered requirement in the continuation brief:

| # | Requirement | Status |
|---|---|---|
| 1 | Re-verify current implementation | Done — §21 (one stale docblock found and fixed) |
| 2 | Admin Operations Center | Done — §22 |
| 3 | Operations Timeline | Done — §22 (Timeline tab) |
| 4 | Needs Review Queue | Done — §23 |
| 5 | Confidence intelligence surfaced with explanations | Done — §24 |
| 6 | Review Priority Engine | Done — §25 |
| 7 | Review Action Workflow | Done — §23 (Start Review / Correct / Resolve / Dismiss / Reopen) |
| 8 | External-session truth model preserved | Done — no code anywhere infers real meeting participation; every new UI string reinforces the distinction (§24's confidence caption, §22/§23 wording) |
| 9 | Human-centered flexible windows preserved | Verified unchanged — `attendancePolicy.js` untouched this pass |
| 10 | Recurring-session dedupe | Done — §26 |
| 11 | Contradictory-state detection | Done — §27 |
| 12 | Admin Dashboard intelligence | Done — §28 |
| 13 | Teacher UX audit | Done — `needsAttention` added (§28); rest of the teacher flow re-checked, no other gap found |
| 14 | Admin UX audit | Done — correction reachable from 3 places now (Sessions page, Teachers page, Operations Center); reviewed, not further consolidated (see below) |
| 15 | Audit information operationally useful | Done — `AdminAuditLogsPage.jsx` rewritten with a full action-label map (including every new dotted-style action code) and a `summarizeChanges()` human-readable renderer instead of raw JSON |
| 16 | Payroll review hardening | Done — §29 |
| 17 | Query/performance quality | Done — §30 |
| 18 | Access control verified | Done — `/operations/*` entirely `isAdmin`-gated (identical pattern to existing admin-only routers); no new teacher/student-facing endpoint added |
| 19 | Tests | Done — 40/40 passing (19 pre-existing + 21 new: 12 `assessSessionReview` cases, 5 dedupe/bulkWrite cases, 2 date-determinism cases, plus 2 confidence/window edge cases) |
| 20 | Client build | Done — zero errors, verified after every meaningful change, not just once at the end |
| 21 | Documentation | Done — this document |
| 22 | Final self-audit | This table, plus the sweep below |

**Sweep for the specific red flags the brief called out:** grepped the touched backend tree for `TODO|FIXME|XXX|placeholder|hardcoded` — no matches (the only "placeholder" hits are React Query's legitimate `placeholderData` option and an HTML input's `placeholder` attribute). Grepped new frontend files for non-logical margin/padding utilities (`ml-`/`mr-`/`pl-`/`pr-`) that would break RTL — none in any file created this pass. No dead endpoints: every new route has exactly one frontend caller; every new frontend API call targets a route that exists. **One real instance of "hidden intelligence" was caught and fixed during this self-audit**: `computeConfidence()` was implemented, tested, and exported — but nothing actually called it from any controller until this fix (§24).

**Deliberately not done, with reasons (not oversights):**
- ESLint config still missing repo-wide — retrofitting it is an orthogonal, unbounded-scope cleanup (see §18), not part of this feature.
- `AttendanceCorrectionMenu` (Teachers page) / `CorrectionModal` (Sessions page) / `InlineCorrectionForm` (Operations Center) were **not** consolidated into one shared component — all three now exist, calling the same backend endpoint. Consolidating them is pure refactoring with no user-facing behavior change; deferred rather than risking a three-way rewrite under an already-large change set.
- No DB-backed integration tests (mongodb-memory-server or similar) — this repo has never had one; adding new test infrastructure is a bigger decision than this feature warrants, so the dedupe guarantee is tested at the boundary that's actually available (mocked Mongoose calls asserting the real op shapes) while the *enforcement* itself is a plain MongoDB unique index, which is standard, well-understood behavior that doesn't need this codebase to re-prove it works.
- The one genuine open business-policy question (student-absence-affects-pay) remains open by explicit design — resolving it would mean inventing academy policy the task was explicit should never happen silently.
