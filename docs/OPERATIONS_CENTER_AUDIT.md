# Operations Center — Full Audit & Rebuild

**Date:** 2026-07-11

---

## 1. Root Cause (the actual bug)

**Symptom reported:** Most Operations Center statistics showed 0.

**Investigation:** Read `operations.controller.js`'s `getLiveSummary` end-to-end before touching anything. It queries:

```js
Session.find({ scheduledAt: { $gte: dayStart, $lte: dayEnd } })
```

where `dayStart`/`dayEnd` are today's exact local calendar boundaries. This is **correct** — a "Live Now" operations view for an admin should only ever show today's sessions. The aggregation logic, the bucket classification (`liveNow`/`startingSoon`/`missingCheckIn`/etc. via `getSessionWindow()`), and the review/payroll rules in `sessionIntelligence.service.js` were all read line-by-line and are all correct.

**The actual defect was 100% in the seeder**, not the backend, not the frontend, not the aggregation. `server/src/seed/seed.js`'s session-generation loop built:
- past sessions at `daysFromNow(-p * 3)` for `p = 1..8` → 3, 6, 9, …, 24 days ago
- future sessions at `daysFromNow(1), daysFromNow(3), daysFromNow(7)`

**Day-offset 0 (today) was never generated, by construction — not "went stale," never existed even on a freshly-seeded database.** Confirmed directly against MongoDB:

```
total sessions: 106
session dates: 2026-06-17, 2026-06-20, 2026-06-23, 2026-06-26, 2026-06-29,
               2026-07-02, 2026-07-05, 2026-07-08, 2026-07-12, 2026-07-14, 2026-07-18
server "now": 2026-07-10
```

Every "today"-bound stat tile in the Operations Center's Live tab was mathematically guaranteed to read 0, regardless of when the seeder was run, because there was structurally no data to find.

**A second, subtler timing bug was found while fixing the first one:** the backend computes "today" using the server process's **local timezone** (`Date.setHours(0,0,0,0)`), which on this machine is UTC+3. A naive fix using pure `now - X minutes` offsets for the new seed data could still land outside "today" if the seeder happens to run within a few hours of local midnight (confirmed live — offsets of -180/-200/-240 minutes landed in "yesterday" when the seeder was run at 02:40 local time). Fixed with a `pastToday()` clamp that pins any offset crossing local midnight to shortly after it instead, so the seed data is correct at any time of day.

---

## 2. Per-Metric Verification

Every metric below was checked against a live curl to `GET /operations/live` cross-referenced with a direct MongoDB query, after the seeder fix.

| Metric | Query | Verdict |
|---|---|---|
| **Live Sessions** | `status === 'ongoing'` among today's sessions | ✅ Logic correct. Returned 2, matching 2 deliberately-seeded ongoing sessions. |
| **Starting Soon** | `status === 'scheduled'` and `window.phase === 'pre_session'` | ✅ Correct. Returned 2. |
| **Missing Teacher Check-in** | `status === 'scheduled'`, `teacherAttendanceStatus === 'pending'`, phase in `[in_progress, grace_period, extended_completion, overdue]` | ✅ Correct. Returned 1. |
| **Missing Meeting Link** | `!meetingLink`, `status === 'scheduled'`, phase in `[pre_session, in_progress]` | ✅ Correct — and correctly double-counts with Starting Soon when both conditions hold on the same session (real overlap, not a bug). |
| **Late Teachers** | `teacherAttendanceStatus === 'late'` | ✅ Correct. Returned 1. |
| **Attendance Pending** | `status === 'completed' && !attendanceFinalizedAt` | ✅ Correct. Returned 2. |
| **Completed Today** | `status === 'completed'` among today's sessions | ✅ Correct. Returned 5, matching all 5 seeded completed-today scenarios once the midnight-clamp fix was applied. |
| **Cancelled Sessions** | `status in [cancelled, rescheduled]` among today's sessions | ✅ Correct. Returned 2. |
| **Review Queue** | `assessSessionReview()` over sessions in the last 14 days with `reviewState` not resolved/dismissed | ✅ Correct, deterministic, rule-by-rule verified against `sessionIntelligence.service.js`. Two deliberately-contradictory seed sessions (cancelled-but-payable, no_show-status-mismatch) correctly triggered `critical` severity. |
| **Payroll Review** | `countDocuments({ payrollStatus: 'pending_review' })` | ✅ Correct, unbounded by design (a payroll decision pending from 3 weeks ago still needs a decision). |

**No backend logic was wrong.** Every fix in this pass is either (a) the seeder not generating today-dated data, or (b) new metrics that genuinely didn't exist before (see §3).

---

## 3. New Metrics Added (real gaps, not cosmetic)

The brief asked "what should the admin do next / who is late / who's blocked" — auditing the existing bucket list against that question surfaced concrete gaps:

| New metric | Why it was missing | Where it comes from now |
|---|---|---|
| **No-Show count** | Teacher no-shows existed as a `Session.status` value but had no dedicated bucket or stat tile — an admin had no single number for "how many teachers didn't show up today." | `status === 'no_show'` among today's sessions |
| **Student Absences Today** | No metric anywhere counted student-side absences — attendance data existed per-session but was never aggregated. | New bounded `Attendance.find({ sessionId: { $in: todaySessionIds } })` query, counting `status === 'absent'` |
| **Attendance Rate Today** | No "is today going well" summary existed — only individual problem counts. | Computed from the same today-scoped Attendance query: `(present + late) / total` |
| **Teacher On-Time Rate Today** | Same gap on the teacher side. | Computed from today's sessions with a resolved `teacherAttendanceStatus` |
| **Revenue Today** | Explicitly requested ("Today's Revenue if applicable"); genuinely computable from real data (subscriptions purchased today). | `Subscription.aggregate` bounded to today's `createdAt` |
| **Online Now (teachers/students)** | Didn't exist — and *couldn't* have worked before this session, because real-time sockets were completely broken (see `UX_IMPROVEMENTS.md` §1: every socket handshake was silently rejected due to a wrong JWT secret). Now that sockets actually work, this became genuinely buildable. | New in-memory presence map in `socket.service.js`, incremented/decremented on socket connect/disconnect, counted per role |

All of these are computed from real documents with bounded queries — nothing is a fixed/placeholder value.

**Known limitation, documented not hidden:** "Online Now" is per-process, in-memory presence with a ~60s detection window for abrupt disconnects (standard for any heartbeat-based presence system, e.g. a killed process/closed laptop lid isn't detected instantly). Fine for this single-instance deployment; would need a shared store (Redis) if the app is ever horizontally scaled.

---

## 4. Seeder Rewrite

`server/src/seed/seed.js` gained a dedicated **14-scenario "today" generator**, run after the existing historical/upcoming loop, explicitly engineering one session per real operational situation:

1. Live/ongoing (×2, different teachers)
2. Starting soon, fully ready
3. Starting soon **and** missing its meeting link (deliberate overlap — tests dual bucket membership)
4. Missing teacher check-in
5. Late teacher + unfinalized attendance (deliberate triple-hit: late bucket + attendance-pending bucket + two review-queue rules at once)
6. Two "clean" fully-resolved completed sessions (the common case needs to exist too, not just edge cases)
7. Cancelled later today, by the student
8. Teacher no-show (internally consistent, not a contradiction)
9. Student absent, teacher present and paid (proves student absence doesn't silently flip teacher payability — the platform's one deliberately-open policy question, see `ATTENDANCE_SYSTEM.md`)
10. Technical issue reported → payroll `pending_review`
11. Two deliberate **critical data contradictions** (cancelled-but-payable; no_show-status-mismatch) to exercise the review queue's critical-severity path end-to-end

Also densified the existing historical loop from every-3-days to daily offsets, so the Timeline tab's default ±3-day window and the Review Queue's 14-day window both have realistic daily coverage instead of sparse gaps.

**Timezone-safety:** every "earlier today" scenario anchors through a `pastToday()` helper that clamps to shortly-after-local-midnight if the naive offset would otherwise land in "yesterday" — verified by literally re-running the seeder at 02:40 local time and confirming all "completed today" scenarios still counted correctly (5/5, previously 2/5 with the naive approach).

---

## 5. Frontend Redesign

The old Live tab: 8 stat tiles in a flat grid (all visually equal weight, no severity signal beyond a pulsing dot) + 6 separate boxed list sections that mostly repeated the *same* sessions the stat tiles already counted (e.g. a late-teacher-and-unfinalized session appeared as a full card in two different boxes). No health/system-status view, no online presence, no revenue, no quick actions, no critical-alert prioritization.

**Rebuilt as:**
- **Critical Alert Banner** — appears only when a critical (data-contradiction) review item exists; distinct red treatment, one click straight to the filtered review queue. Nothing else on the page competes with it visually.
- **Operational Health strip** — 4 cards: student attendance rate today, teacher on-time rate today, revenue today, online now — the "is the platform healthy" answer, color-graded (green/amber/red) by the actual rate, not a fixed brand color.
- **Stat grid** — now 10 tiles (added No-Show and Student Absences), each tinted by urgency tone (critical/warning/info/positive/neutral) via a subtle border accent, replacing the previous "everything looks equally important" flat grid.
- **Unified "Needs Attention Now" feed** — replaces the 6 redundant boxed lists with one deduplicated, severity-sorted list; a session in multiple buckets (e.g. late + unfinalized) now shows as **one row with multiple reason badges** instead of duplicated across separate boxes.
- **Quick Actions row** — full timeline, full review queue, send broadcast notification — direct answers to "what should I do next."

This is the Notion/Linear/Stripe-style shift the brief asked for: fewer, denser, better-prioritized surfaces instead of a wall of equally-weighted boxes.

---

## 6. Verification Performed

- Every metric cross-checked by hand: live API response vs. a direct MongoDB aggregation, confirming exact match (e.g. `recentlyCompleted: 5` = the 5 explicitly-seeded completed-today scenarios; `criticalReviewCount: 2` = the 2 explicitly-seeded contradictions; `attendanceRateToday: 50%` = 3 attended / 6 total attendance records, hand-verified).
- Re-ran the seeder at an inconvenient local time (02:40 AM) specifically to catch the midnight-boundary bug — caught it, fixed it, re-verified.
- Live headless-browser pass: logged in as admin, opened the Operations Center, confirmed every new UI element renders (critical banner, health strip, online-now, revenue, attention feed, no-show tile, absence tile), clicked the critical banner (correctly jumps to the Review tab), clicked a stat tile (correctly jumps to the filtered Timeline tab) — zero console errors.
- Verified online-presence tracking against a real connected browser session (`onlineNow.admin: 1` while an actual admin tab was open).
- `npm run build` (client) — zero errors. `npx jest` (server) — 96/96 passing, no regressions.
- Full 41-page, 3-role regression pass — zero errors/blank pages/failed requests beyond this session's own rate-limit self-testing (documented, not an app bug).

---

## 7. What Was NOT Wrong

Per the brief's instruction not to assume the frontend was wrong — it wasn't, and neither was the backend aggregation. To be explicit about what was checked and found correct:
- `getSessionWindow()` phase classification (`attendancePolicy.js`) — correct.
- `assessSessionReview()` rule set (`sessionIntelligence.service.js`) — correct, all 8+ rules manually traced against the deliberately-contradictory seed data.
- `computePayrollStatus()` — correct, including the deliberate non-decision on student-absence-vs-teacher-pay.
- Timeline and Review Queue endpoints' date-range clamping (`clampRange()`) — correct.
- Frontend's original stat-tile → timeline-filter wiring — correct, reused as-is.

The lesson here (also true of the query-key bug and the socket bug found in earlier passes this session): **this codebase's logic tends to be well-reasoned; its failures tend to be in the data feeding it or in silent environment mismatches, not in the algorithms themselves.** Investigate data and environment before rewriting logic.
