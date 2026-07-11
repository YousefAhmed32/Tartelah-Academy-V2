# Attendance System — Summary

> Full architecture, diagrams, and rationale: `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md`. This file is a condensed operational summary.

## Why It's Built This Way

The academy delivers lessons over external tools (Zoom/Meet/Teams) the platform cannot directly observe. The system therefore never claims certainty it doesn't have — every signal (a check-in click, a link-open event) is evidence, not proof, and every session moves through graduated, always admin-correctable states rather than being irreversibly marked absent by a rigid timer.

## Time Windows (`server/src/config/attendancePolicy.js`)

| Window | Default | Meaning |
|---|---|---|
| Pre-session access | 60 min before start | Session becomes actionable (check-in, link) |
| Post-session grace | 60 min after end | Normal, no-warning window to finalize attendance |
| Extended completion | +180 min | Still allowed, but stamped "late completion" |
| Late tolerance | 15 min | Check-in within this window = `on_time`, not `late` |
| Missed threshold | 240 min after end | Sweep job marks untouched sessions `missed` (soft, not final) |
| Absence threshold | 420 min after end | Sweep job escalates to `no_show` (still admin-correctable) |

## How Attendance Is Recorded

1. **Teacher check-in** — a platform-side timestamp (`Session.teacherStartedAt`), classified `on_time`/`late` against `LATE_TOLERANCE_MINUTES`. This proves the teacher declared readiness through the platform, not that they joined the external call.
2. **Student attendance** — recorded per-session on `Attendance` (`present`/`absent`/`late`/`excused`/`left_early`/`technical_issue`), draft until `isFinalized`.
3. **Outcome** — the explicit "what actually happened" field on `Session.outcome` (`delivered`, `teacher_absent`, `cancelled_by_student`, etc.), distinct from the coarse lifecycle `status`.
4. **Automatic sweep** (`teacherAttendanceSweep.job.js`, cron) — graduated 3-stage escalation for sessions nobody touched: untouched → `missed` (4h) → `no_show` (7h). A teacher's own late self-check-in always overrides the automated flag.

## Absence & Percentage Calculation

Attendance percentage for a student/teacher is computed live by aggregating their `Attendance`/`Session` records over a date range (see `teacherPerformance.service.js` for the teacher-payroll side) — it is never a stored, driftable counter. No stored field should be trusted over a fresh aggregation for reporting.

## Payroll Readiness

`sessionIntelligence.service.js`'s `computePayrollStatus()` classifies each session as `payable`/`non_payable`/`pending_review`/`excluded`, always visible (never silently decided) via `Session.payrollStatus` + `payrollStatusReason`. Admin can override (`payrollStatusSetBy: 'admin'`), after which the system never silently recomputes that session again. `pending_review` exists specifically because **whether student absence should affect teacher pay is an open business-policy question, deliberately left open** — the system makes it visible everywhere rather than deciding it unilaterally. This is the single most important unresolved policy decision on the platform; an admin should make this call explicitly before relying on payroll totals for real payments.

## Reports & Review

- **Operations Center** (`/admin/operations`) — Live view, filterable Timeline, and the **Needs-Review queue** (`assessSessionReview()` — deterministic critical/high/medium severity rules covering missing check-ins, unfinalized attendance, lateness, missing links, and internal state contradictions).
- **Teacher/Admin payroll-readiness pages** — org-wide and per-teacher breakdowns of payable/non-payable/pending sessions.
