# Tartelah Online - Architecture Plan

---

## Tech Stack

### Frontend
- React 18 + Vite
- TailwindCSS (custom design tokens)
- React Router v6
- React Query (TanStack Query v5)
- Zustand (global state)
- Framer Motion (animations)
- Axios (HTTP client)

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT (access + refresh tokens)
- bcrypt (password hashing)
- express-validator (input validation)
- node-cron (scheduled jobs)
- multer (file uploads)
- nodemailer (emails)

---

## Design System Tokens (Extracted from Reference Files)

### Colors
```
Background Dark:    #0f0226 / #150232 / #160734 / #120526
Background Medium:  #1d0a3f / #160730 / #22103f / #241342
Background Light:   #f6f4fb / #ece9f9 / #F6F4FB

Gold Primary:       #E8C76A
Gold Dark:          #D4AF37

Purple Primary:     #7c3aed
Purple Dark:        #5b21b6
Purple Deeper:      #6d28d9
Purple Light:       #8b5cf6

Text White:         #ffffff / #E7E0F5
Text Muted:         #b3a4d0 / #a78fd6 / #cdbef0 / #b1a0d6
Text Body (light):  #1f1147 / #1A0447

Card Dark:          #241342 / #1d0e3a
Card Light:         #ffffff
Border Dark:        rgba(150,120,220,0.14) / rgba(150,120,220,0.1)
Border Gold:        rgba(212,175,55,0.45) / rgba(212,175,55,0.6)
```

### Typography
```
Heading Font:   Cairo (weights: 400, 500, 600, 700, 800, 900)
Body Font:      Tajawal (weights: 300, 400, 500, 700, 800)
Quran Font:     Amiri (weight: 700)

Direction:      RTL (default), LTR (for layout flex containers)
```

### Animations
```
fadeUp:       opacity 0→1, translateY(22px→0), 0.7-0.8s cubic-bezier(.2,.7,.2,1)
floaty:       translateY 0→-14px→0, 5s ease-in-out infinite
glowpulse:    opacity 0.55→1→0.55, infinite
shimmer:      background-position sweep, infinite
spinslow:     rotate 360deg, infinite
```

### Component Patterns
```
.navi (sidebar nav):
  padding: 12-13px 16px
  border-radius: 14px
  color (inactive): #b9a9dd / #b1a0d6
  color (active): #fff
  background (active): linear-gradient(135deg, #7c3aed, #5b21b6)
  box-shadow (active): 0 10-12px 24-26px rgba(124,58,237,.4)

.card:
  border-radius: 20-22px
  box-shadow: 0 12px 34px rgba(31,17,71,.06) [light] / none [dark]
  border: 1px solid #f0ecf8 [light] / rgba(150,120,220,.14) [dark]

.lift hover:
  transform: translateY(-5px to -8px)
  box-shadow: enhanced
  transition: 0.3s cubic-bezier(.2,.7,.2,1)

.gbtn (gold button):
  background: linear-gradient(135deg, #E8C76A, #D4AF37)
  color: #2a1500
  border-radius: 30-38px
  box-shadow: 0 10-14px 26-34px rgba(212,175,55,.4)

.obtn (outlined button):
  border: 1.5px solid rgba(232,199,106,.45)
  border-radius: 30px
  color: #Eadfff / #fff

.pill / .badge:
  border-radius: 30px
  padding: 5-6px 12-14px
  font-weight: 700
```

### Dashboard Patterns
```
Student Dashboard:
  wrapper direction: ltr (flex)
  sidebar: left, 230px wide
  sidebar bg: linear-gradient(185deg, #1d0a3f, #160730)
  content bg: #f6f4fb (light)
  card bg: #ffffff

Teacher Dashboard:
  wrapper direction: rtl (flex)
  sidebar: right (inline-start), 262px wide
  sidebar bg: linear-gradient(195deg, #22103f, #180a32)
  content bg: linear-gradient(165deg, #1d0c3a, #150729, #10061f) (dark)
  card bg: #241342

Admin Dashboard:
  wrapper direction: ltr (flex)
  sidebar: left, 248px wide
  sidebar bg: linear-gradient(190deg, #1c0d39, #140628)
  content bg: linear-gradient(160deg, #1a0a36, #120526, #0c0419) (dark)
  card bg: #1d0e3a

AI Assistant:
  wrapper direction: rtl
  bg: radial-gradient(120% 80% at 15% 20%, #f3effc, #e7e2f7, #ddd6f2) (light lavender)
  chat panel: #fdfcff, border-radius: 28px
```

---

## Database Schema Design

### User (auth + profile base)
```
_id: ObjectId
email: String (unique, indexed, lowercase)
password: String (bcrypt hashed, select: false)
role: Enum ['admin', 'teacher', 'student']
firstName: String
lastName: String
firstNameAr: String
lastNameAr: String
phone: String
avatar: String (URL)
isActive: Boolean (default: true)
isVerified: Boolean (default: false)
lastLoginAt: Date
resetPasswordToken: String (select: false)
resetPasswordExpires: Date (select: false)
createdAt: Date
updatedAt: Date

Indexes: email (unique), role, isActive
```

### StudentProfile
```
_id: ObjectId
userId: ObjectId (ref: User, unique, indexed)
teacherId: ObjectId (ref: User, indexed)
subscriptionId: ObjectId (ref: Subscription)
currentLevel: String
notes: String
joinedAt: Date
createdAt: Date
updatedAt: Date

Virtual: memorization stats, attendance rate
```

### TeacherProfile
```
_id: ObjectId
userId: ObjectId (ref: User, unique, indexed)
specializations: [String]  // tajweed, hifz, nazra, arabic
bio: String
bioAr: String
experience: Number (years)
rating: Number (0-5, default: 0)
reviewCount: Number (default: 0)
isVerified: Boolean (default: false)
joinedAt: Date

Indexes: userId (unique)
```

### Course
```
_id: ObjectId
name: String
nameAr: String
description: String
descriptionAr: String
category: Enum ['tajweed', 'hifz', 'nazra', 'arabic', 'other']
icon: String
order: Number (display order)
isActive: Boolean (default: true)
createdBy: ObjectId (ref: User)
createdAt: Date
updatedAt: Date

Indexes: category, isActive
```

### Level
```
_id: ObjectId
courseId: ObjectId (ref: Course, indexed)
name: String
nameAr: String
description: String
descriptionAr: String
order: Number
objectives: [String]
objectivesAr: [String]
isActive: Boolean (default: true)

Indexes: courseId, order
```

### ClassSession
```
_id: ObjectId
title: String
titleAr: String
teacherId: ObjectId (ref: User, indexed)
studentIds: [ObjectId] (ref: User)
courseId: ObjectId (ref: Course)
levelId: ObjectId (ref: Level)
scheduledAt: Date (indexed)
durationMinutes: Number (default: 60)
meetingLink: String
meetingProvider: Enum ['zoom', 'meet', 'teams', 'custom']
status: Enum ['scheduled', 'ongoing', 'completed', 'cancelled'] (indexed)
notes: String
notesAr: String
cancelReason: String
createdBy: ObjectId (ref: User)
createdAt: Date
updatedAt: Date

Indexes: teacherId, scheduledAt, status, studentIds
Compound: {teacherId, scheduledAt}, {status, scheduledAt}
```

### Attendance
```
_id: ObjectId
sessionId: ObjectId (ref: ClassSession, indexed)
studentId: ObjectId (ref: User, indexed)
status: Enum ['present', 'absent', 'late', 'excused']
notes: String
recordedBy: ObjectId (ref: User)
createdAt: Date
updatedAt: Date

Indexes: sessionId, studentId
Compound: {sessionId, studentId} (unique)
```

### Homework
```
_id: ObjectId
title: String
titleAr: String
description: String
descriptionAr: String
sessionId: ObjectId (ref: ClassSession)
teacherId: ObjectId (ref: User, indexed)
studentIds: [ObjectId] (ref: User)
dueDate: Date
attachments: [{name, url, type}]
status: Enum ['active', 'completed', 'overdue'] (indexed)
createdAt: Date
updatedAt: Date

Indexes: teacherId, studentIds, dueDate, status
```

### HomeworkSubmission
```
_id: ObjectId
homeworkId: ObjectId (ref: Homework, indexed)
studentId: ObjectId (ref: User, indexed)
content: String
attachments: [{name, url, type}]
submittedAt: Date
status: Enum ['submitted', 'graded', 'late']
grade: Number (0-10)
feedback: String
gradedBy: ObjectId (ref: User)
gradedAt: Date

Compound index: {homeworkId, studentId} (unique)
```

### Evaluation
```
_id: ObjectId
studentId: ObjectId (ref: User, indexed)
teacherId: ObjectId (ref: User, indexed)
sessionId: ObjectId (ref: ClassSession)
type: Enum ['tajweed', 'hifz', 'nazra', 'behavior', 'general']
score: Number (1-10)
notes: String
notesAr: String
strengths: [String]
improvements: [String]
createdAt: Date

Indexes: studentId, teacherId, type, createdAt
```

### MemorizationRecord
```
_id: ObjectId
studentId: ObjectId (ref: User, indexed)
teacherId: ObjectId (ref: User)
sessionId: ObjectId (ref: ClassSession)
surahNumber: Number (1-114)
fromAyah: Number
toAyah: Number
totalAyah: Number (virtual)
quality: Enum ['excellent', 'good', 'fair', 'weak']
notes: String
recordedAt: Date (indexed)

Indexes: studentId, recordedAt
```

### RevisionRecord
```
_id: ObjectId
studentId: ObjectId (ref: User, indexed)
teacherId: ObjectId (ref: User)
sessionId: ObjectId (ref: ClassSession)
surahNumber: Number
fromAyah: Number
toAyah: Number
quality: Enum ['excellent', 'good', 'fair', 'weak']
notes: String
recordedAt: Date (indexed)

Indexes: studentId, recordedAt
```

### Package
```
_id: ObjectId
name: String
nameAr: String
description: String
descriptionAr: String
sessionsPerMonth: Number
sessionDurationMinutes: Number
price: Number
currency: String (default: 'USD')
features: [String]
featuresAr: [String]
isActive: Boolean (default: true)
isPopular: Boolean (default: false)
order: Number
createdAt: Date
updatedAt: Date

Indexes: isActive, order
```

### EnrollmentRequest (NEW — 2026-06-22)
```
_id: ObjectId
studentId: ObjectId (ref: User, indexed)
packageId: ObjectId (ref: Package)
status: Enum ['pending', 'under_review', 'approved', 'rejected'] (indexed)
paymentMethod: Enum ['bank_transfer', 'cash', 'card', 'other']
paymentReference: String
paymentProofId: ObjectId (GridFS file id, private — see docs/MEDIA_SYSTEM.md)
amount: Number
studentNotes: String (max 500)
adminNotes: String (max 500)
teacherId: ObjectId (ref: User) — set during approval
levelId: String — set during approval
groupName: String — set during approval
reviewedBy: ObjectId (ref: User)
reviewedAt: Date
subscriptionId: ObjectId (ref: Subscription) — auto-created on approval

Indexes: {studentId, status}, {status, createdAt desc}
Business Rule: max 1 active (pending|under_review) request per student
```

### Subscription
```
_id: ObjectId
studentId: ObjectId (ref: User, indexed)
packageId: ObjectId (ref: Package)
status: Enum ['pending', 'active', 'expired', 'cancelled', 'paused'] (indexed)
startDate: Date
endDate: Date (indexed)
sessionsRemaining: Number   -- DEPRECATED, see "Lesson Wallet Architecture" below
totalSessions: Number       -- DEPRECATED, see "Lesson Wallet Architecture" below
paymentStatus: Enum ['paid', 'pending', 'failed']
paymentReference: String
notes: String
createdBy: ObjectId (ref: User)
createdAt: Date
updatedAt: Date

Indexes: studentId, status, endDate
```

> **Note (2026-07-29):** `Subscription` is now a billing-cycle/purchase record only — it does not own lesson entitlement. `sessionsRemaining`/`totalSessions` are a read-only mirror maintained by `wallet.service.js`, kept for backward compatibility. See "Lesson Wallet Architecture" immediately below.

---

## Lesson Wallet Architecture (2026-07-29)

**Why:** The original model tied a student's right to book/attend lessons to `Subscription.sessionsRemaining` and a calendar `endDate` — a full code audit established that booking was never actually gated by either, there was no renewal/refund/compensation/freeze system, and teacher payroll was recomputed live on every request with no persisted artifact. This section documents the replacement: lesson ownership lives in a durable, auditable **Lesson Wallet** per student; `Subscription` (above) is demoted to billing/purchase bookkeeping only.

### LessonWallet
```
_id: ObjectId
studentId: ObjectId (ref: User, unique, indexed)
totalPurchased: Number (default 0)      -- lifetime lessons bought
totalUsed: Number (default 0)           -- lifetime lessons consumed
bonusLessons: Number (default 0)
compensationLessons: Number (default 0)
frozenLessons: Number (default 0)
transferredIn: Number (default 0)
transferredOut: Number (default 0)
remaining: Number (default 0)           -- live bookable balance; NOT clamped at 0 (see note)
status: Enum ['active', 'frozen']
freezeReason, frozenAt, frozenBy, resumeAt
lastTransactionAt: Date
```
`remaining` is a materialized cache — always reconstructable as the sum of every `LessonTransaction.amount` for this wallet. It is deliberately **not clamped at zero**: unlike the old `Subscription.sessionsRemaining` (which silently floored at 0), an over-consumed wallet goes negative and stays visible as a real, auditable signal instead of being silently absorbed.

### LessonTransaction (append-only ledger)
```
_id: ObjectId
walletId: ObjectId (ref: LessonWallet, indexed)
studentId: ObjectId (ref: User, indexed)
type: Enum ['purchase', 'consumption', 'reversal', 'refund', 'bonus', 'compensation',
            'freeze', 'unfreeze', 'transfer_in', 'transfer_out', 'renewal',
            'manual_adjustment', 'admin_edit', 'migration_import']
amount: Number            -- signed: +credit / -debit
balanceAfter: Number      -- wallet.remaining snapshot after this entry
relatedSessionId, relatedSubscriptionId, relatedStudentId
reason: String
performedByRole: Enum ['system', 'admin', 'teacher', 'student']
performedBy: ObjectId (ref: User)
idempotencyKey: String (unique sparse)  -- e.g. "session:<id>:consume:1"
correctsTransactionId: ObjectId (ref: LessonTransaction)
metadata: Mixed
createdAt, updatedAt
```
Never updated or deleted — a correction is a new transaction (`type:'admin_edit'`) referencing the one it corrects.

### TeacherPayrollEntry (persisted payroll ledger)
```
_id: ObjectId
teacherId: ObjectId (ref: User, indexed)
sessionId: ObjectId (ref: Session, unique sparse)   -- one entry per resolved session
type: Enum ['session_payable', 'session_non_payable', 'session_pending_review',
            'bonus', 'penalty', 'manual_adjustment']
amount: Number             -- signed currency amount, snapshot-priced
rateSnapshot: Number       -- salaryPerSession at the time this entry was recorded
status: Enum ['pending', 'approved', 'paid']
reason, createdBy, notes
```
Replaces on-the-fly `count × salaryPerSession` recomputation — a payroll figure is now a query over real, auditable rows.

### Write pattern — no multi-document transactions

This deployment's MongoDB runs as a **standalone `mongod`** (`mongodb://localhost:27017/tartelah`), not a replica set — `mongoose.startSession()`/`withTransaction()` are not available. `wallet.service.js`'s `applyTransaction()` is the single chokepoint for every balance change: it writes the `LessonTransaction` first (guarded by a unique `idempotencyKey`, so a duplicate/retried call is a guaranteed no-op via the unique-index 11000 error), then atomically `$inc`s the `LessonWallet` counters. `server/src/scripts/reconcileWallets.js` (`npm run reconcile-wallets`, dry-run by default) recomputes wallet counters from the ledger and reports/fixes drift — the intended recovery path for the one edge case this pattern can't fully close (a crash between the two writes).

### Lesson deduction matrix (`lessonDeduction.service.js`, `config/lessonPolicy.js`)

| Event | Deducts? | Compensation? |
|---|---|---|
| Completed (present/late/left_early) | Yes | No |
| Student no-show (absent, teacher held it) | Yes | No — teacher still paid (independent rule, unchanged) |
| Excused absence / technical issue | No | No (admin-correctable either way) |
| Teacher cancelled (any time) | No | Yes, auto-granted |
| Teacher no-show (sweep-detected) | No | Yes, auto-granted |
| Student cancels ≥12h before scheduled time | No (credit returned) | No |
| Student cancels <12h before scheduled time | Yes | No |

Student self-cancellation is a new capability (previously hard-blocked at 403 in `session.controller.js`). `CANCELLATION_WINDOW_HOURS` lives in `config/lessonPolicy.js`.

### Booking conflict prevention (`booking.service.js`)

`assertNoConflict()` rejects (409) any teacher/student double-booking via an interval-overlap query, called from `createSession`, `adminCreateSession`, `rescheduleSession`, and schedule-rule generation. Previously not implemented at all — only same-series-same-timestamp dedupe existed.

### Not yet wired into the booking flow

`Session.teacherAcceptanceStatus` (`not_required` default, `pending`/`accepted`/`declined`) and its `PATCH /sessions/:id/accept|decline` endpoints exist and are fully functional, but nothing in the current booking flow ever sets a session to `pending` — this is a dormant capability for a future "require teacher acceptance" toggle, not yet activated for any package/course.

---

### Notification
```
_id: ObjectId
recipientId: ObjectId (ref: User, indexed)
type: Enum ['session_reminder', 'homework_assigned', 'homework_graded',
            'evaluation_added', 'subscription_expiring', 'system', 'announcement']
title: String
titleAr: String
message: String
messageAr: String
isRead: Boolean (default: false, indexed)
readAt: Date
metadata: Mixed (sessionId, homeworkId, etc.)
scheduledFor: Date
sentAt: Date
createdAt: Date

Indexes: recipientId, isRead, createdAt
Compound: {recipientId, isRead}
```

### AIConversation
```
_id: ObjectId
userId: ObjectId (ref: User, indexed)
title: String
messages: [{
  role: Enum ['user', 'assistant'],
  content: String,
  language: Enum ['ar', 'en'],
  timestamp: Date
}]
language: Enum ['ar', 'en', 'mixed'] (default: 'ar')
createdAt: Date
updatedAt: Date

Indexes: userId, createdAt
```

### WebsiteContent
```
_id: ObjectId
section: Enum ['hero', 'about', 'programs', 'teachers', 'pricing', 'faq', 'contact', 'footer', 'stats']
key: String (indexed)
value: Mixed
valueAr: Mixed
type: Enum ['text', 'image', 'list', 'json', 'number']
order: Number
isActive: Boolean (default: true)
updatedBy: ObjectId (ref: User)
updatedAt: Date

Compound index: {section, key} (unique)
```

### SiteSettings
```
_id: ObjectId
key: String (unique, indexed)
value: Mixed
description: String
updatedBy: ObjectId (ref: User)
updatedAt: Date
```

---

## Phase 2 Part 1 — Operational Foundation Architecture (2026-08-25)

**Why:** Before the academy can onboard teachers/students at scale, four structural gaps had to close: teacher taxonomy conflated "who they teach" with "what they teach" into one field; no working-hours storage existed at all; a new subscription always credited the full package (no way to record a partially-consumed legacy package as an opening balance); and creating a teacher + their students was N separate manual steps with no atomicity or duplicate-safety. This section documents the additive schema/service layer that closes them — see `PHASE_2_CHANGE_REQUESTS_AR.md`'s "متابعة تنفيذ الجزء الأول" for the task-by-task tracking.

### User — additive teacher/student taxonomy fields
```
specializations: [String] enum TEACHING_CATEGORIES (default [])  -- plural; teacher may hold >1
audienceCategories: [String] enum ['children','teenagers','adults','men','women','all'] (default [])
studentType: Enum ['existing', 'new'] (default 'existing')        -- role: 'student' only
```
`category` (legacy singular, pre-existing) is kept and auto-mirrored to/from `specializations[0]` by a `pre('save')` hook on `User`, so every existing consumer of the singular field keeps working unchanged — `specializations` is the new source of truth going forward. Audience categories are a deliberately **separate** taxonomy from teaching specialization (own config file, `config/studentAudience.js`) — never merged into one list, per the Phase 2 brief's explicit requirement. `studentType` defaults to `'existing'` so every pre-existing student is classified without a migration script or any change in behavior (the Part 2 teacher-acceptance workflow keys off `studentType: 'new'`, not built yet).

### TeacherWorkingHours (new collection, one doc per teacher)
```
_id: ObjectId
teacherId: ObjectId (ref: User, unique, indexed)
timezone: String | null           -- null = inherit AcademySettings.timezone
days: [{
  dayOfWeek: Number (0=Sunday..6=Saturday, matches ScheduleRule.daysOfWeek)
  mode: Enum ['full_day', 'unavailable', 'custom']
  periods: [{ start: String 'HH:mm', end: String 'HH:mm' }]   -- only when mode:'custom'
}]
updatedBy: ObjectId (ref: User)
```
Storage + validation only for Part 1 (`config/workingHours.js`'s `validateWorkingHoursDays` — format/overlap/ordering checks, shared verbatim in spirit by a client-side mirror for inline UX feedback). A "break" between two lessons is deliberately represented as the **implicit gap** between consecutive `periods` on a `custom` day, not a separate stored concept — one array does both jobs. The automatic free-slot computation against booked sessions (the "availability engine") is explicitly Part 2 — this only gives that future engine a well-formed weekly template to read.

### AcademySettings.timezone (new field)
```
timezone: String (default 'Africa/Cairo')
```
The first academy-wide timezone setting (previously only `ScheduleRule.timezone`, a **per-rule** field defaulting `'Asia/Riyadh'`, existed — left untouched, different concern). Resolved through one function, `services/academySettings.service.js#getAcademyTimezone()` — every future time-of-day feature must read it from there, never a hardcoded string. Admin-editable from `AdminWebsitePage.jsx`'s settings tab.

### LessonTransaction — new `opening_balance` type
Added to the existing append-only ledger's `type` enum (see the Lesson Wallet section above). Behaves identically to `'purchase'` in `wallet.service.js`'s increment table (`{remaining: amount, totalPurchased: amount}`) but is reported separately so "credited via a new subscription's documented opening balance" is distinguishable from an ad hoc top-up. `metadata` on this transaction type records `{ packageTotal, lessonsUsedAtOpening, lessonsRemainingAtOpening }`.

### computeOpeningBalance (config/lessonPolicy.js)
Pure function: given a package's total lesson count plus **at most one** of `{lessonsUsed, lessonsRemaining}`, derives the other and validates both are within `[0, packageTotal]`. Omitting both defaults to `{used: 0, remaining: packageTotal}` — the platform's pre-existing behavior, so every caller that doesn't pass either field is 100% backward compatible. Shared by both the standalone `POST /subscriptions` endpoint and the onboarding wizard via `services/subscription.service.js#createSubscriptionWithOpeningBalance()` — one function, not two parallel implementations.

### OnboardingRequest (new collection — idempotency + audit record)
```
_id: ObjectId
clientRequestId: String (unique)
actorId: ObjectId (ref: User)
teacherId: ObjectId (ref: User)
studentIds: [ObjectId] (ref: User)
resultSummary: Mixed          -- cached response, replayed verbatim on a repeat call
```
Written **only on a fully-successful** `createTeacherWithStudents()` run (`services/onboarding.service.js`). A repeat call with the same `clientRequestId` short-circuits to the cached `resultSummary` instead of re-creating anything — the wizard's protection against a network-retry or accidental double-submit re-running the whole flow. A failed run writes nothing here (by design — see the rollback pattern below), so retrying the same `clientRequestId` after a failure is free to try again from scratch.

### "Create a teacher with their students" wizard — write pattern (no multi-document transactions)
Same constraint as the Lesson Wallet section above: this MongoDB deployment is a standalone `mongod`, so there is no `mongoose.startSession()` to wrap "create teacher + working hours + N students + N subscriptions" as one atomic unit. The wizard instead: **(1)** validates every input up front — emails (including in-request duplicates), package existence/active status, working-hours structure, opening-balance math — before writing anything, so the overwhelming majority of bad requests never touch the database at all; **(2)** performs the writes, tracking every document id it creates; **(3)** on any failure at any point, runs an explicit compensating rollback (`onboarding.service.js#rollback()`) that deletes exactly the teacher/working-hours/students/subscriptions/wallet-transactions *this call* created — never touching pre-existing data — then rethrows, so the caller never receives a success response for a partially-completed operation. This is the same documented pattern `wallet.service.js` established for the Lesson Wallet redesign, extended here to a multi-entity flow.

### Endpoints added
```
POST   /admin/students                          -- standalone student creation (no teacher/subscription yet)
POST   /admin/teachers/:id/students              -- add a student to an existing teacher (+ optional package/opening balance)
POST   /admin/onboarding/teacher-with-students   -- the full wizard
GET    /admin/teachers/:id/working-hours
PUT    /admin/teachers/:id/working-hours
```
All gated by the existing `teachers.manage`/`students.manage` permissions (no new permission strings needed — see `config/permissions.js`, unchanged). `GET /admin/teachers/:id` (existing route) was extended to also return `workingHours` and each assigned student's live `LessonWallet` balance (previously returned only the raw `Subscription` list) — this route was not yet consumed by any frontend page before this change, so the response-shape change is not a breaking one.

---

## Phase 2 Part 2 — Credential Options, Availability Engine & Assignment Workflow (2026-08-25)

**Why:** Part 1 deliberately deferred three structural pieces: an administrator could not choose *how* a student's password was set (only the existing auto-generation path existed, plus an undocumented flat `password` override with no strength policy); there was no way to compute a teacher's real free time against actual bookings (`TeacherWorkingHours` was write-only groundwork); and `User.studentType:'new'` was a classification field with no actual request/accept/reject cycle behind it. This section closes all three, verified live against a real running instance (not just unit-tested) — see `PHASE_2_CHANGE_REQUESTS_AR.md`'s "متابعة استكمال الجزء الأول وتنفيذ الجداول والإسناد" for task-by-task tracking.

### Credential resolution (`config/passwordPolicy.js` + `config/credentialMode.js`)
Two modes only, by explicit scope decision — no academy-wide/shared password exists anywhere in this design:
```
resolveCredentialInput(input, fieldPrefix) -> { passwordToStore, mustChangePassword, mode, temporaryPasswordToReturn? }
```
`input.credential = { mode: 'auto'|'manual', password?, passwordConfirm?, requirePasswordChange? }`. `'auto'` is unchanged from Part 1 (`utils/tempPassword.js`, always forces a change). `'manual'` validates via `passwordPolicy.js` (≥8 chars, letter+digit, confirmation match — re-checked here regardless of what the frontend already validated) and respects `requirePasswordChange` independently (default `true`). A **backward-compatible fallback** (`resolveCredentialInput` with no `credential` key, only a flat `password`) preserves Part 1's exact prior behavior (`mustChangePassword: false`) for any caller that hasn't migrated to the new shape — verified by the full pre-existing onboarding test suite passing unchanged. Never returns a manual password past the point of `User.create()`; only the auto-generated one is ever echoed back, once, for the admin's one-time copy action.

### AcademySettings.lessonBufferMinutes (new field)
```
lessonBufferMinutes: Number (default 0, max 120)
```
The optional gap the availability engine keeps free immediately before/after every booked lesson. `services/academySettings.service.js#getAcademySchedulingSettings()` reads timezone + buffer together in one query.

### Availability engine (`services/availability.service.js`)
```
getWeeklyAvailability({ teacherId, durationMinutes, timezone?, excludeAssignmentRequestId? })
  -> { timezone, bufferMinutes, durationMinutes, days: [{ dayOfWeek, mode, freeWindows: [{start,end}] }] }
checkAvailability({ teacherId, studentId, days: [{dayOfWeek,time}], durationMinutes, timezone?, excludeAssignmentRequestId? })
  -> { valid, conflicts: [{dayOfWeek,time,reason,source?}], timezone }
```
Busy intervals are assembled per day-of-week from three sources, each one bounded/indexed query (never an unbounded scan): active `ScheduleRule`s (matched structurally by `daysOfWeek`/`timeOfDay`, not by walking calendar dates — correct regardless of frequency), real `Session` documents within a capped 60-day lookahead (`EXCEPTION_LOOKAHEAD_DAYS`, converted to the target timezone via `date-fns-tz` before deriving day/time — the same library/pattern `schedule.service.js` already used), and currently-`pending_teacher_approval` `AssignmentRequest`s (a soft reservation, released the moment a request leaves that status — see `config/assignmentStatus.js#RESERVING_STATUSES`). A candidate slot is only valid if the **entire duration** fits inside one working period after subtracting buffer-padded busy intervals — never checked at the start instant alone. `checkAvailability()` is called a second time, authoritatively, immediately before every write (`createAssignmentRequest`, `respondToAssignment`'s accept, `editAndResend`) — this narrows but (per the standalone-`mongod`, no-multi-document-transactions constraint already documented for `wallet.service.js`) does not eliminate a race window; the unique `{seriesId,scheduledAt}` `Session` index remains the hard backstop against an actual duplicate. For a teacher that does not exist yet (mid-wizard), the client computes an equivalent estimate purely from the just-entered working hours (`client/src/utils/assignmentSchedule.js#computeLocalFreeWindows`) since there are no bookings yet to conflict with by construction.

### AssignmentRequest (new collection) + state machine (`config/assignmentStatus.js`)
```
_id, studentId, teacherId, studentType: 'existing'|'new'
ageCategory, studentAge, specialization: TEACHING_CATEGORIES, lessonDurationMinutes: 30|45|60|90
schedule: { days: [{dayOfWeek,time}], startDate, endDate?, frequency: 'daily'|'weekly'|'biweekly'|'monthly', timezone? }
teachingType: 'individual'|'group', adminNotes
generatedMessage, editedMessage?, sentMessage?    -- canonical data kept separate from editable message text
status: 'draft'|'pending_teacher_approval'|'accepted'|'rejected'|'time_change_requested'|'reassigned'|'completed'|'cancelled'
teacherResponse: { type: 'accept'|'reject'|'time_change', reason?, proposedTime?, note?, respondedAt }
responseHistory: [{ action, actorId, actorRole, note, at, snapshot }]   -- full audit trail, every action appends, nothing is overwritten
previousRequestId / replacementRequestId   -- reassignment linkage, both directions
immediateOverride: { enabled, reason, actorId, at }
activationResult: { scheduleRuleIds[], sessionIds[], activatedAt }
correlationId (unique, sparse)   -- idempotent replay, same pattern as OnboardingRequest.clientRequestId
```
Transitions (`assertTransition(from,to)`, enforced in `services/assignment.service.js`, never a raw `.status =` write elsewhere):
```
draft → pending_teacher_approval | accepted | cancelled
pending_teacher_approval → accepted | rejected | time_change_requested | cancelled
accepted → completed                                  -- transitional; only forward, retried on activation failure
rejected | time_change_requested → pending_teacher_approval (edit & resend) | reassigned | cancelled
reassigned | completed | cancelled → (terminal)
```
`studentType:'existing'` OR an authorized `immediateOverride` (requires the new `assignments.override` permission + a mandatory reason, always audited — deliberately **excluded** from every role's default permission set, including plain `'admin'`, per the brief's "disabled by default" requirement; `isPrimaryAdmin` bypasses as usual) skip straight to `accepted` and activate synchronously in the same call. `activateAssignment()` groups the request's `schedule.days` by shared time-of-day (one real `ScheduleRule` per distinct time, supporting different start times per day within one request) and calls the pre-existing `schedule.service.js#generateSessionsFromRule()` unchanged — the exact same bounded generation Part 1 already used elsewhere, not a second implementation. A failed activation rolls back only what that activation attempt created (`ScheduleRule`s + `Session`s), and a failed *creation* (the immediate path) deletes the just-created `AssignmentRequest` itself rather than leaving a stuck row.

**`'daily'` and `'monthly'` frequency handling (added during the compact-scheduling-UX redesign pass):** `'daily'` was already fully supported by `schedule.service.js`'s `generateDates()` (it ignores `daysOfWeek` entirely and repeats every calendar day) but had no UI and was excluded from `validateSchedulePayload`'s allow-list — now allowed, and the frontend derives all 7 weekday entries at the same time so `checkAvailability` still validates the time against every real weekday's working hours. `'monthly'` had a **latent correctness gap**: `generateDates()`'s monthly branch only honors "same day-of-month as `startDate`" when `daysOfWeek` is **empty** — a non-empty `daysOfWeek` makes it behave identically to `'weekly'`. `activateAssignment()` now explicitly passes `daysOfWeek: []` to `ScheduleRule.create()` whenever `schedule.frequency === 'monthly'`, regardless of what `schedule.days` contains (which still needs exactly one `{dayOfWeek,time}` entry to satisfy the schema and give the availability engine a representative weekday to conflict-check against).

### Assignment message (`config/assignmentMessage.js`)
Pure, deterministic Arabic template matching the brief's structure verbatim. Gender-aware wording (`طالب جديد`/`طالبة جديدة`/neutral `طالب/طالبة جديد/جديدة`) is derived from `User.gender` **only when explicitly set** — never inferred from a name, matching the existing teacher-identity policy (`config/teacherIdentity.js`) extended here to also cover students optionally. Rendered as plain text only (never `dangerouslySetInnerHTML`) on the frontend, which is the actual XSS boundary — the backend does not HTML-escape the string because it is never interpreted as markup.

### Endpoints added
```
GET    /admin/teachers/:id/availability?durationMinutes=&timezone=
POST   /admin/assignments/check-availability
GET    /admin/assignments                        -- list (status/teacherId/studentId filters, paginated)
POST   /admin/assignments                        -- create (existing-student direct, new-student pending, or override)
GET    /admin/assignments/:id
PATCH  /admin/assignments/:id/edit-resend
POST   /admin/assignments/:id/reassign
POST   /admin/assignments/:id/cancel
GET    /teachers/me/assignment-requests          -- "طلبات الطلاب" inbox
GET    /teachers/me/assignment-requests/:id      -- ownership-scoped (teacherId must match)
PATCH  /teachers/me/assignment-requests/:id/respond   -- accept | reject | time_change
```
New permissions: `assignments.view`, `assignments.manage` (both in the default `'admin'` set), `assignments.override` (never in any default set). Teacher-side ownership is enforced in the service layer (`respondToAssignment` / `getMyAssignmentRequest`'s query scoping), not just the route — closes an IDOR class of bug by construction rather than by convention.

### `admin.controller.getTeacher` — schedule-only students (bug found during live QA, fixed)
The "assigned students" list this endpoint returns was built exclusively from `Subscription` records. A student scheduled via the new assignment workflow with no package yet — an explicitly supported case in this design — was invisible on the teacher's own admin profile. Fixed by merging in students reachable via an active `ScheduleRule` not already present from a subscription, tagged `status:'schedule_only'`, deduped by student id. The admin **teacher-list** page's per-row count was left as subscription-based only (lower-traffic surface, flagged as a follow-up, not a blocking gap).

---

## Phase 2 Change Requests — Reservation Completeness & Flexible Alternative Schedules (2026-08-31)

**The gap:** a teacher's proposed alternative time (`time_change_requested`) revalidated availability but held no reservation on it — `RESERVING_STATUSES` only covered `pending_teacher_approval`. A second, unrelated request could be created for the exact slot a teacher had just proposed while it sat awaiting an admin decision.

### `config/assignmentStatus.js` additions
```
RESERVING_STATUSES = ['pending_teacher_approval', 'time_change_requested']
RESERVING_SLOT_SOURCE = { pending_teacher_approval: 'schedule', time_change_requested: 'proposedSchedule' }
```
`availability.service.js#loadBusyByDay` looks up `RESERVING_SLOT_SOURCE[status]` per reserving `AssignmentRequest` row to decide which field actually holds the slot: `schedule.days` (the originally requested one) or `teacherResponse.proposedSchedule.days` (the teacher's own alternative). `respondToAssignment`'s `time_change` branch now releases the original `ScheduleReservationLock` and atomically re-acquires one for the proposed set (same release-then-reacquire pattern `editAndResend` already used) — the lock rows always match whichever slot the availability engine currently treats as busy for that status, never an orphaned stale set.

### Confirmed vs. reserved — a genuine third UI state
Every busy interval `checkAvailability()`/`getWeeklyAvailability()` produces is now tagged `kind: 'confirmed'` (an active `ScheduleRule`/`Session`) or `'reserved'` (only a pending hold — `reserved_request`/`reserved_proposed_time` sources). `blockedIntervalsForPeriods()` merges intervals only within the same `kind`, so a confirmed booking can never blend into (and hide) an adjacent temporary hold. Additive to the wire format — `busyWindows`/`conflicts` entries gained a `kind` field, existing consumers reading only `start`/`end` are unaffected. `ScheduleSlotPicker`/`StudentScheduleSection` render the amber third state with the exact Arabic phrase the brief specified: "محجوز مؤقتًا — بانتظار الموافقة".

### `AssignmentRequest.teacherResponse.proposedSchedule` — flexible multi-day proposals
```
teacherResponse: { type, reason?, proposedTime?, proposedSchedule?: { days: [{dayOfWeek,time}] }, note?, respondedAt }
```
`proposedTime` (singular) is kept only as a backward-compatible mirror of `proposedSchedule.days[0]` for any pre-existing row or consumer that still reads it — every new `time_change` response populates both. `respondToAssignment` validates the whole proposed array (`validateProposedDays` — day/time shape + no duplicate weekdays), revalidates availability across every proposed day, and locks the whole set atomically (same all-or-nothing rollback pattern as `createAssignmentRequest`'s `acquireLocks`). `ProposeAlternativeTimeModal.jsx` was rebuilt around this: pre-fills from the request's current `schedule.days`, lets the teacher add/remove any weekday with its own real-availability time picker, and shows an original-vs-proposed comparison panel. The admin's `EditResendModal` pre-fills from `proposedSchedule.days` when present (the common case: reviewing a `time_change_requested` row) instead of the now-superseded original schedule.

---

## Phase 2 Part 2c — Incremental Onboarding & Concurrency-Safe Scheduling (2026-08-26)

**Why:** the Part 2b wizard, despite its UX redesign, still deferred every write to a single all-or-nothing submit at the end. A second or third student's schedule was checked against `checkAvailability()` while every earlier student in the same wizard run still existed only in React state — the availability engine had no way to see them, so it would suggest an already-chosen slot again, and a genuine race toward a real double-booking existed at final submit. This section is a structural fix, not a UI patch: persistence itself becomes incremental.

### `OnboardingSession` (new collection)
```
_id, clientRequestId (unique)         -- idempotent "start session" replay
teacherId, createdBy
status: 'draft'|'teacher_saved'|'adding_students'|'ready_for_review'|'finalizing'|'completed'|'cancelled'|'expired'
currentStep: 'teacher'|'specialization'|'workingHours'|'students'|'review'
studentIds: [User]                    -- resumability index only; every id here is already a real, persisted student
cancelReason, cancelledBy, cancelledAt, completedAt
```
Deliberately **not** an extension of `OnboardingRequest` — that model is a write-once idempotency/replay cache for the legacy one-shot endpoint (never mutated, no notion of "in progress"), while this one is a genuinely mutable, long-lived draft. Both coexist; `OnboardingRequest` and `POST /admin/onboarding/teacher-with-students` are untouched.

### `ScheduleReservationLock` (new collection) — atomic concurrency primitive
```
_id, teacherId, dayOfWeek, time        -- unique index on {teacherId, dayOfWeek, time}
assignmentRequestId, onboardingSessionId?, createdBy
```
Not a second source of truth for "what is booked" — `ScheduleRule`/`Session` (once activated) and `AssignmentRequest.status` (while pending) remain canonical, and `availability.service.js` keeps reading from those. Its only job: make the *write* that creates a new reservation for one `(teacher, dayOfWeek, time)` atomic. MongoDB enforces the unique index on each insert, so two near-simultaneous attempts to reserve the exact same slot can never both succeed — the loser's insert fails with a duplicate-key error, which `assignment.service.js` turns into an HTTP 409 with `lockConflict: true` and real alternatives (`suggestAlternativeSlots()`, below). Acquired the moment a reservation is first requested (`createAssignmentRequest`, `editAndResend`); released the moment the reservation becomes durable (`activateAssignment` succeeds) or the request leaves every reserving status (`reject`/`time_change`/`cancel`, all in `respondToAssignment`/`cancelAssignment`). Deliberately does **not** model arbitrary partial-interval overlap (12:00–13:00 vs 12:30–13:30) — same documented residual gap as `wallet.service.js`'s "no multi-document transactions on a standalone `mongod`" constraint; `checkAvailability()`'s authoritative re-check immediately before lock acquisition narrows this as far as possible without real ACID transactions.

### `suggestAlternativeSlots()` (new, `availability.service.js`)
```
suggestAlternativeSlots({ teacherId, days, durationMinutes, timezone?, excludeAssignmentRequestId?, maxResults=3 })
  -> [{ dayOfWeek, time }]
```
Reuses `getWeeklyAvailability()`'s real free windows — never a hardcoded "+1 hour" guess. Preference order per requested day: same day at-or-after the requested time (nearest first), then same day before it, then other days nearest to the requested time. Powers both the lock-conflict 409 response and the wizard's implicit "next slot" behavior (the next student's picker simply reflects real, already-updated availability).

### `User.onboardingStatus` (new field) + `onboardingSaveKey` (new field)
```
onboardingStatus: 'draft'|'complete' (default 'complete')   -- 'draft' only while mid-incremental-onboarding
onboardingSaveKey: String (unique, sparse)                   -- idempotency key for a schedule-less student save
```
Every pre-existing account and every account created through any other path defaults to `'complete'` — zero behavior change for existing data. A `'draft'` teacher is excluded from `GET /teachers/public` and `GET /teachers/public/:id` (`onboardingStatus: { $ne: 'draft' }` — matches `undefined` too, so legacy rows are unaffected) and blocked at login with a distinct message (`auth.controller.js`), not the "suspended" one. `finalizeOnboardingSession()` flips it to `'complete'`.

### `services/onboardingSession.service.js` (new)
```
startOnboardingSession({ clientRequestId, teacher, workingHours, actorId })
  -> persists the teacher (draft) + TeacherWorkingHours + the OnboardingSession row, all-or-nothing, idempotent on clientRequestId
getOnboardingSession({ sessionId }) -> { session, teacher, workingHours, students[] }   -- always backend-authoritative; used for resume AND final review
saveStudentToSession({ sessionId, clientRequestId, student, actorId, overrideAllowed })
  -> creates the student + subscription/opening-balance (if any) + AssignmentRequest/reservation (if a schedule is given) in ONE call;
     idempotent (correlationId for schedule-bearing saves, onboardingSaveKey otherwise);
     on any failure, rolls back ONLY what this call created — the teacher and every previously-saved sibling are untouched
removeStudentFromSession({ sessionId, studentId, actorId, reason })
  -> releases the reservation (cancels while pending, tears down ScheduleRule/Session directly if already activated), then deletes the student's own records
finalizeOnboardingSession({ sessionId, actorId }) -> idempotent; reloads every student fresh from the backend and blocks if any has an unresolved rejected/time_change_requested schedule; flips teacher onboardingStatus to 'complete'
cancelOnboardingSession({ sessionId, actorId, reason }) -> reason required; removes every student this session created, then the teacher
listOnboardingSessions({ status, page, limit }) -> bounded/paginated, ready to back a future "resume any admin's session" screen
```
Reuses `onboarding.service.js`'s existing validation helpers (`validateTeacherPayload`, `validateStudentsPayload`, `assertPackagesValid`, `pickAllowed`, `normalizeEmail` — all exported for this purpose) so per-field rules never diverge between the one-shot and incremental wizards.

### Endpoints added
```
POST   /admin/onboarding/sessions                              -- start (idempotent)
GET    /admin/onboarding/sessions                              -- bounded list
GET    /admin/onboarding/sessions/:id                          -- resume / review, backend-authoritative
POST   /admin/onboarding/sessions/:id/students                 -- incremental save (idempotent)
DELETE /admin/onboarding/sessions/:id/students/:studentId       -- remove, releases reservation
POST   /admin/onboarding/sessions/:id/finalize                 -- idempotent
POST   /admin/onboarding/sessions/:id/cancel                   -- reason required
```
Same `teachers.manage`+`students.manage` permission gate as the legacy `teacher-with-students` endpoint, which remains mounted and fully functional alongside these.

### Frontend
`AdminTeacherOnboardingWizardPage.jsx` reworked: the teacher-info/specialization/working-hours steps stay local until "Next" leaves working-hours, which calls `startOnboardingSession()` and persists the teacher immediately (idempotent on repeated clicks via a stable `clientRequestId` ref). The students step then shows every already-saved student as a compact `SavedStudentCard` (Edit/Remove) plus exactly one active, editable `ActiveStudentCard` — never more than one large form expanded at once. Because the active form's `teacherId` is now always real, `StudentScheduleSection`'s existing backend-availability query naturally reflects every sibling already saved — no separate `siblingDaysList` estimation is needed for saved students anymore. A `localStorage`-backed banner offers to resume an incomplete session on reload; the final review step always re-fetches from `GET /admin/onboarding/sessions/:id` rather than trusting local state.

### Verified live (3-student scenario)
Teacher persisted immediately → Student 1 booked Sunday 12:00 (60 min) → Student 2's real-time picker excluded 12:00–13:00 entirely (jumped 11:00 ص → 1:00 م) → booked 13:00 → Student 3's picker excluded both 12:00–13:00 and 13:00–14:00 (jumped to 2:00 م) → booked 14:00 → removed Student 2 → 13:00–14:00 confirmed available again while the other two stayed booked → full page reload → resume banner appeared → resumed with teacher + both remaining students intact, zero duplication → finalized → teacher confirmed live in `/teachers/public`.

---

## API Architecture

### Base URL: `/api/v1`

### Standard Response Format
```json
{
  "success": true,
  "message": "...",
  "data": {},
  "pagination": { "page": 1, "limit": 20, "total": 100, "pages": 5 }
}
```

### Error Response Format
```json
{
  "success": false,
  "message": "...",
  "errors": [{ "field": "email", "message": "..." }]
}
```

### Auth Routes
```
POST   /api/v1/auth/register          public
POST   /api/v1/auth/login             public
POST   /api/v1/auth/logout            authenticated
POST   /api/v1/auth/forgot-password   public
POST   /api/v1/auth/reset-password    public (with token)
GET    /api/v1/auth/me                authenticated
PUT    /api/v1/auth/change-password   authenticated
POST   /api/v1/auth/refresh-token     public (with refresh token)
```

### Users Routes
```
GET    /api/v1/users                  admin
GET    /api/v1/users/:id              admin | self
PUT    /api/v1/users/:id              admin | self
DELETE /api/v1/users/:id              admin
PUT    /api/v1/users/me/avatar        authenticated
```

### Students Routes
```
GET    /api/v1/students               admin | teacher
POST   /api/v1/students               admin (create student account)
GET    /api/v1/students/:id           admin | teacher(assigned) | self
PUT    /api/v1/students/:id           admin
GET    /api/v1/students/:id/progress  admin | teacher(assigned) | self
GET    /api/v1/students/:id/stats     admin | teacher(assigned) | self
```

### Teachers Routes
```
GET    /api/v1/teachers               public | admin
POST   /api/v1/teachers               admin
GET    /api/v1/teachers/:id           public
PUT    /api/v1/teachers/:id           admin | self
GET    /api/v1/teachers/:id/students  admin | self
GET    /api/v1/teachers/:id/stats     admin | self
```

### Courses Routes
```
GET    /api/v1/courses                public
POST   /api/v1/courses                admin
GET    /api/v1/courses/:id            public
PUT    /api/v1/courses/:id            admin
DELETE /api/v1/courses/:id            admin
GET    /api/v1/courses/:id/levels     public
```

### Levels Routes
```
GET    /api/v1/levels                 public (query: courseId)
POST   /api/v1/levels                 admin
GET    /api/v1/levels/:id             public
PUT    /api/v1/levels/:id             admin
DELETE /api/v1/levels/:id             admin
```

### Sessions Routes
```
GET    /api/v1/sessions               admin | teacher(own) | student(assigned)
POST   /api/v1/sessions               teacher | admin
GET    /api/v1/sessions/upcoming      authenticated (role-filtered)
GET    /api/v1/sessions/history       authenticated (role-filtered)
GET    /api/v1/sessions/:id           admin | teacher(own) | student(assigned)
PUT    /api/v1/sessions/:id           teacher(own) | admin
DELETE /api/v1/sessions/:id           teacher(own) | admin
PUT    /api/v1/sessions/:id/link      teacher(own) | admin
PUT    /api/v1/sessions/:id/cancel    teacher(own) | admin
PUT    /api/v1/sessions/:id/complete  teacher(own) | admin
```

### Attendance Routes
```
GET    /api/v1/attendance             admin | teacher(own sessions)
POST   /api/v1/attendance             teacher | admin
GET    /api/v1/attendance/session/:id teacher(own) | admin
GET    /api/v1/attendance/student/:id admin | teacher(assigned) | self
PUT    /api/v1/attendance/:id         teacher(own session) | admin
```

### Homework Routes
```
GET    /api/v1/homework               teacher(own) | student(assigned) | admin
POST   /api/v1/homework               teacher | admin
GET    /api/v1/homework/:id           teacher(own) | student(assigned) | admin
PUT    /api/v1/homework/:id           teacher(own) | admin
DELETE /api/v1/homework/:id           teacher(own) | admin
GET    /api/v1/homework/:id/submissions  teacher(own) | admin
POST   /api/v1/homework/:id/submit    student (assigned)
PUT    /api/v1/homework/:id/grade/:subId  teacher(own) | admin
```

### Evaluations Routes
```
GET    /api/v1/evaluations            admin | teacher(own)
POST   /api/v1/evaluations            teacher | admin
GET    /api/v1/evaluations/student/:id  admin | teacher(assigned) | self
GET    /api/v1/evaluations/:id        admin | teacher(own) | student(own)
PUT    /api/v1/evaluations/:id        teacher(own) | admin
DELETE /api/v1/evaluations/:id        teacher(own) | admin
```

### Memorization Routes
```
GET    /api/v1/memorization/student/:id  admin | teacher(assigned) | self
POST   /api/v1/memorization           teacher | admin
PUT    /api/v1/memorization/:id       teacher(own) | admin
DELETE /api/v1/memorization/:id       teacher(own) | admin
```

### Revision Routes
```
GET    /api/v1/revision/student/:id   admin | teacher(assigned) | self
POST   /api/v1/revision               teacher | admin
PUT    /api/v1/revision/:id           teacher(own) | admin
DELETE /api/v1/revision/:id           teacher(own) | admin
```

### Packages Routes
```
GET    /api/v1/packages               public
POST   /api/v1/packages               admin
GET    /api/v1/packages/:id           public
PUT    /api/v1/packages/:id           admin
DELETE /api/v1/packages/:id           admin
```

### Enrollments Routes (NEW — 2026-06-22)
```
POST   /api/v1/enrollments                    student (submit request)
GET    /api/v1/enrollments/me                 student (own requests + status)
POST   /api/v1/enrollments/:id/payment-proof  student (upload proof image)
GET    /api/v1/enrollments                    admin (all requests, ?status=filter)
GET    /api/v1/enrollments/pending-count      admin (badge count)
GET    /api/v1/enrollments/:id                admin (single request)
PATCH  /api/v1/enrollments/:id/review         admin (approve/reject)
```

### Subscriptions Routes
```
GET    /api/v1/subscriptions          admin
POST   /api/v1/subscriptions          admin
GET    /api/v1/subscriptions/me       student
GET    /api/v1/subscriptions/:id      admin | student(own)
PUT    /api/v1/subscriptions/:id      admin
PUT    /api/v1/subscriptions/:id/cancel  admin
```

### Notifications Routes
```
GET    /api/v1/notifications/me       authenticated
GET    /api/v1/notifications/me/unread-count  authenticated
PUT    /api/v1/notifications/:id/read authenticated (own)
PUT    /api/v1/notifications/read-all authenticated
POST   /api/v1/notifications          admin (broadcast)
DELETE /api/v1/notifications/:id      admin | self
```

### AI Routes
```
GET    /api/v1/ai/conversations       authenticated
POST   /api/v1/ai/conversations       authenticated
GET    /api/v1/ai/conversations/:id   authenticated (own)
POST   /api/v1/ai/conversations/:id/messages  authenticated (own)
DELETE /api/v1/ai/conversations/:id   authenticated (own)
```

### Website Content Routes
```
GET    /api/v1/website/content        public (all sections)
GET    /api/v1/website/content/:section  public
PUT    /api/v1/website/content        admin
POST   /api/v1/website/content        admin
DELETE /api/v1/website/content/:id    admin
```

### Reports Routes
```
GET    /api/v1/reports/overview       admin
GET    /api/v1/reports/attendance     admin | teacher(own)
GET    /api/v1/reports/students       admin
GET    /api/v1/reports/revenue        admin
GET    /api/v1/reports/sessions       admin | teacher(own)
```

### Settings Routes
```
GET    /api/v1/settings               admin
PUT    /api/v1/settings               admin
```

---

## RBAC Architecture

### Roles
| Role    | Description              |
|---------|--------------------------|
| admin   | Full system access       |
| teacher | Own students & sessions  |
| student | Own data, read-only most |

### Middleware Chain
```
Request
  → rateLimiter
  → cors
  → bodyParser
  → authenticate (verify JWT, attach req.user)
  → requireRole(...roles)       [if route needs specific role]
  → requireOwnership(fn)        [if route needs ownership check]
  → validate (express-validator)
  → controller
  → errorHandler
```

### Permission Matrix
| Resource          | Admin | Teacher              | Student              |
|-------------------|-------|----------------------|----------------------|
| Users             | CRUD  | R (own profile)      | R (own profile)      |
| Students          | CRUD  | R (assigned only)    | R (own)              |
| Teachers          | CRUD  | R+U (own profile)    | R (public)           |
| Courses           | CRUD  | R                    | R                    |
| Levels            | CRUD  | R                    | R                    |
| Sessions          | CRUD  | CRUD (own)           | R (assigned)         |
| Attendance        | CRUD  | CRUD (own sessions)  | R (own)              |
| Homework          | CRUD  | CRUD (own)           | R+Submit (assigned)  |
| Evaluations       | CRUD  | CRUD (own)           | R (own)              |
| Memorization      | CRUD  | CRUD (own)           | R (own)              |
| Revision          | CRUD  | CRUD (own)           | R (own)              |
| Packages          | CRUD  | R                    | R                    |
| Subscriptions     | CRUD  | R                    | R (own)              |
| Notifications     | CRUD  | R (own)              | R (own)              |
| WebsiteContent    | CRUD  | —                    | —                    |
| AI Conversations  | CRUD  | CRUD (own)           | CRUD (own)           |
| Reports           | Full  | Own data only        | —                    |
| Settings          | CRUD  | —                    | —                    |

### JWT Strategy
```
Access Token:  15 minutes expiry, stored in memory (Zustand)
Refresh Token: 7 days expiry, stored in httpOnly cookie
Token Payload: { id, role, email }
```

---

## Folder Structure

### Frontend
```
client/
├── public/
│   ├── logo.jpeg
│   ├── logo-png.png
│   └── favicon.ico
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── index.css
│   │
│   ├── assets/
│   │   ├── images/         (hero_bg, footer_bg, etc.)
│   │   └── fonts/
│   │
│   ├── config/
│   │   ├── constants.js    (API_URL, APP_NAME, etc.)
│   │   └── queryClient.js  (React Query config)
│   │
│   ├── utils/
│   │   ├── api.js          (axios instance + interceptors)
│   │   ├── auth.js         (token helpers)
│   │   ├── date.js         (date formatting, Arabic)
│   │   ├── format.js       (number, currency formatting)
│   │   └── validators.js   (client-side validation helpers)
│   │
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── usePermission.js
│   │   ├── useRTL.js
│   │   └── useDebounce.js
│   │
│   ├── store/
│   │   ├── authStore.js        (user, token, login/logout)
│   │   ├── uiStore.js          (sidebar, modals, language)
│   │   └── notificationStore.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── students.service.js
│   │   ├── teachers.service.js
│   │   ├── sessions.service.js
│   │   ├── attendance.service.js
│   │   ├── homework.service.js
│   │   ├── evaluations.service.js
│   │   ├── memorization.service.js
│   │   ├── revision.service.js
│   │   ├── packages.service.js
│   │   ├── subscriptions.service.js
│   │   ├── notifications.service.js
│   │   ├── ai.service.js
│   │   ├── website.service.js
│   │   └── queryKeys.js
│   │
│   ├── components/
│   │   ├── ui/
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── Card.jsx
│   │   │   ├── Badge.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Spinner.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── Tooltip.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Pagination.jsx
│   │   │   └── Toast.jsx
│   │   ├── forms/
│   │   │   ├── FormField.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   └── FileUpload.jsx
│   │   └── shared/
│   │       ├── PageHeader.jsx
│   │       ├── StatCard.jsx
│   │       ├── EmptyState.jsx
│   │       ├── LoadingPage.jsx
│   │       └── ConfirmDialog.jsx
│   │
│   ├── layouts/
│   │   ├── PublicLayout.jsx       (marketing: navbar + footer)
│   │   ├── AuthLayout.jsx         (login/register: centered)
│   │   ├── StudentLayout.jsx      (sidebar left, light bg)
│   │   ├── TeacherLayout.jsx      (sidebar right, dark bg)
│   │   └── AdminLayout.jsx        (sidebar left, dark bg)
│   │
│   ├── features/
│   │   ├── marketing/
│   │   │   ├── components/
│   │   │   │   ├── Navbar.jsx
│   │   │   │   ├── Hero.jsx
│   │   │   │   ├── JourneySteps.jsx
│   │   │   │   ├── TeachersSection.jsx
│   │   │   │   ├── PricingSection.jsx
│   │   │   │   ├── FAQSection.jsx
│   │   │   │   ├── StatsSection.jsx
│   │   │   │   ├── Testimonials.jsx
│   │   │   │   ├── ContactForm.jsx
│   │   │   │   └── Footer.jsx
│   │   │   └── hooks/
│   │   │       └── useWebsiteContent.js
│   │   │
│   │   ├── auth/
│   │   │   ├── components/
│   │   │   │   ├── LoginForm.jsx
│   │   │   │   ├── RegisterForm.jsx
│   │   │   │   ├── ForgotPasswordForm.jsx
│   │   │   │   └── ResetPasswordForm.jsx
│   │   │   └── hooks/
│   │   │       └── useAuth.js
│   │   │
│   │   ├── student/
│   │   │   ├── components/
│   │   │   │   ├── UpcomingClasses.jsx
│   │   │   │   ├── StudySchedule.jsx
│   │   │   │   ├── AttendanceChart.jsx
│   │   │   │   ├── ProgressCard.jsx
│   │   │   │   ├── HomeworkList.jsx
│   │   │   │   ├── EvaluationHistory.jsx
│   │   │   │   ├── MemorizationTracker.jsx
│   │   │   │   └── RevisionTracker.jsx
│   │   │   └── hooks/
│   │   │       └── useStudentData.js
│   │   │
│   │   ├── teacher/
│   │   │   ├── components/
│   │   │   │   ├── StudentCard.jsx
│   │   │   │   ├── SessionForm.jsx
│   │   │   │   ├── AttendanceSheet.jsx
│   │   │   │   ├── EvaluationForm.jsx
│   │   │   │   ├── HomeworkForm.jsx
│   │   │   │   ├── ProgressReporter.jsx
│   │   │   │   └── MeetingLinkForm.jsx
│   │   │   └── hooks/
│   │   │       └── useTeacherData.js
│   │   │
│   │   ├── admin/
│   │   │   ├── components/
│   │   │   │   ├── UserTable.jsx
│   │   │   │   ├── CourseForm.jsx
│   │   │   │   ├── PackageForm.jsx
│   │   │   │   ├── ContentEditor.jsx
│   │   │   │   ├── AnalyticsCards.jsx
│   │   │   │   └── ReportChart.jsx
│   │   │   └── hooks/
│   │   │       └── useAdminData.js
│   │   │
│   │   ├── sessions/
│   │   │   ├── components/
│   │   │   │   ├── SessionCard.jsx
│   │   │   │   ├── SessionForm.jsx
│   │   │   │   └── MeetingJoinButton.jsx
│   │   │   └── hooks/
│   │   │       └── useSessions.js
│   │   │
│   │   ├── notifications/
│   │   │   ├── components/
│   │   │   │   ├── NotificationList.jsx
│   │   │   │   └── NotificationBell.jsx
│   │   │   └── hooks/
│   │   │       └── useNotifications.js
│   │   │
│   │   └── ai/
│   │       ├── components/
│   │       │   ├── ChatInterface.jsx
│   │       │   ├── MessageBubble.jsx
│   │       │   ├── SuggestedQuestions.jsx
│   │       │   └── ConversationSidebar.jsx
│   │       └── hooks/
│   │           └── useAIChat.js
│   │
│   └── pages/
│       ├── marketing/
│       │   ├── HomePage.jsx
│       │   ├── AboutPage.jsx
│       │   ├── ProgramsPage.jsx
│       │   ├── TeachersPage.jsx
│       │   ├── PricingPage.jsx
│       │   ├── FAQPage.jsx
│       │   └── ContactPage.jsx
│       ├── auth/
│       │   ├── LoginPage.jsx
│       │   ├── RegisterPage.jsx
│       │   ├── ForgotPasswordPage.jsx
│       │   └── ResetPasswordPage.jsx
│       ├── student/
│       │   ├── StudentDashboardPage.jsx
│       │   ├── StudentSchedulePage.jsx
│       │   ├── StudentSessionsPage.jsx
│       │   ├── StudentHomeworkPage.jsx
│       │   ├── StudentEvaluationsPage.jsx
│       │   ├── StudentProgressPage.jsx
│       │   ├── StudentAcademicRecordPage.jsx
│       │   ├── StudentSubscriptionPage.jsx
│       │   ├── StudentNotificationsPage.jsx
│       │   └── StudentSettingsPage.jsx
│       ├── teacher/
│       │   ├── TeacherDashboardPage.jsx
│       │   ├── TeacherStudentsPage.jsx
│       │   ├── TeacherSessionsPage.jsx
│       │   ├── TeacherAttendancePage.jsx
│       │   ├── TeacherEvaluationsPage.jsx
│       │   ├── TeacherHomeworkPage.jsx
│       │   ├── TeacherProgressPage.jsx
│       │   ├── TeacherMeetingLinksPage.jsx
│       │   ├── TeacherNotificationsPage.jsx
│       │   └── TeacherSettingsPage.jsx
│       ├── admin/
│       │   ├── AdminDashboardPage.jsx
│       │   ├── AdminStudentsPage.jsx
│       │   ├── AdminTeachersPage.jsx
│       │   ├── AdminAdminsPage.jsx
│       │   ├── AdminCoursesPage.jsx
│       │   ├── AdminLevelsPage.jsx
│       │   ├── AdminSessionsPage.jsx
│       │   ├── AdminPackagesPage.jsx
│       │   ├── AdminSubscriptionsPage.jsx
│       │   ├── AdminWebsitePage.jsx
│       │   ├── AdminReportsPage.jsx
│       │   ├── AdminNotificationsPage.jsx
│       │   └── AdminSettingsPage.jsx
│       └── ai/
│           └── AIAssistantPage.jsx
```

### Backend
```
server/
├── package.json
├── .env
├── .env.example
├── server.js
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── jwt.js
│   │   └── email.js
│   │
│   ├── models/
│   │   ├── User.model.js
│   │   ├── StudentProfile.model.js
│   │   ├── TeacherProfile.model.js
│   │   ├── Course.model.js
│   │   ├── Level.model.js
│   │   ├── ClassSession.model.js
│   │   ├── Attendance.model.js
│   │   ├── Homework.model.js
│   │   ├── HomeworkSubmission.model.js
│   │   ├── Evaluation.model.js
│   │   ├── MemorizationRecord.model.js
│   │   ├── RevisionRecord.model.js
│   │   ├── Package.model.js
│   │   ├── Subscription.model.js
│   │   ├── Notification.model.js
│   │   ├── AIConversation.model.js
│   │   ├── WebsiteContent.model.js
│   │   └── SiteSettings.model.js
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── users.controller.js
│   │   ├── students.controller.js
│   │   ├── teachers.controller.js
│   │   ├── courses.controller.js
│   │   ├── levels.controller.js
│   │   ├── sessions.controller.js
│   │   ├── attendance.controller.js
│   │   ├── homework.controller.js
│   │   ├── evaluations.controller.js
│   │   ├── memorization.controller.js
│   │   ├── revision.controller.js
│   │   ├── packages.controller.js
│   │   ├── subscriptions.controller.js
│   │   ├── notifications.controller.js
│   │   ├── ai.controller.js
│   │   ├── website.controller.js
│   │   └── reports.controller.js
│   │
│   ├── routes/
│   │   ├── index.js
│   │   ├── auth.routes.js
│   │   ├── users.routes.js
│   │   ├── students.routes.js
│   │   ├── teachers.routes.js
│   │   ├── courses.routes.js
│   │   ├── levels.routes.js
│   │   ├── sessions.routes.js
│   │   ├── attendance.routes.js
│   │   ├── homework.routes.js
│   │   ├── evaluations.routes.js
│   │   ├── memorization.routes.js
│   │   ├── revision.routes.js
│   │   ├── packages.routes.js
│   │   ├── subscriptions.routes.js
│   │   ├── notifications.routes.js
│   │   ├── ai.routes.js
│   │   ├── website.routes.js
│   │   └── reports.routes.js
│   │
│   ├── middlewares/
│   │   ├── auth.middleware.js       (verifyToken)
│   │   ├── rbac.middleware.js       (requireRole, requireOwnership)
│   │   ├── validate.middleware.js   (runValidation)
│   │   ├── upload.middleware.js     (multer config)
│   │   ├── rateLimiter.middleware.js
│   │   └── errorHandler.middleware.js
│   │
│   ├── validators/
│   │   ├── auth.validator.js
│   │   ├── user.validator.js
│   │   ├── session.validator.js
│   │   ├── homework.validator.js
│   │   ├── evaluation.validator.js
│   │   └── subscription.validator.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── email.service.js
│   │   ├── notification.service.js
│   │   ├── ai.service.js           (rule-based V1 engine)
│   │   ├── upload.service.js
│   │   └── scheduler.service.js    (cron jobs)
│   │
│   ├── utils/
│   │   ├── response.util.js        (success/error helpers)
│   │   ├── pagination.util.js
│   │   ├── filter.util.js
│   │   ├── tokenGenerator.util.js
│   │   └── dateHelpers.util.js
│   │
│   └── jobs/
│       ├── sessionReminder.job.js  (24h, 1h, 15min)
│       └── subscriptionExpiry.job.js
```

---

## Implementation Roadmap

### Phase 1 — Architecture & Project Setup
- [x] Analyze design references
- [x] Define design system tokens
- [x] Create database schema
- [x] Define API architecture
- [x] Define RBAC
- [x] Define folder structure
- [ ] Setup frontend (Vite + React + Tailwind)
- [ ] Setup backend (Node + Express + MongoDB)
- [ ] Configure Tailwind design tokens
- [ ] Configure React Router skeleton
- [ ] Configure React Query + Zustand
- [ ] Setup backend middlewares + error handler
- [ ] Configure MongoDB connection

### Phase 2 — Design System & Shared Components
- [ ] Base UI components (Button, Input, Card, Modal, Badge, Spinner, Avatar)
- [ ] Form components (FormField, Select, DatePicker)
- [ ] Shared components (StatCard, PageHeader, EmptyState, Pagination)
- [ ] All layout components (Public, Auth, Student, Teacher, Admin)
- [ ] Sidebar components per role
- [ ] Toast notification system

### Phase 3 — Authentication System
- [ ] Backend: User model + auth controller + JWT
- [ ] Backend: Auth routes + validation
- [ ] Backend: RBAC middleware
- [ ] Backend: Forgot/Reset password (email service)
- [ ] Frontend: Login page (matching Student Login.dc.html exactly)
- [ ] Frontend: Register page
- [ ] Frontend: Forgot/Reset password pages
- [ ] Frontend: Protected routes + role-based redirect
- [ ] Frontend: Auth Zustand store

### Phase 4 — Marketing Website
- [ ] Navbar (RTL, responsive, sticky)
- [ ] Hero section (matching Quran Academy.dc.html)
- [ ] Journey steps section
- [ ] Teachers section
- [ ] Pricing section
- [ ] Stats section
- [ ] FAQ section
- [ ] Contact form
- [ ] Footer
- [ ] Additional pages: About, Programs, Teachers, FAQ, Contact
- [ ] Website content API + seeded data

### Phase 5 — Student Dashboard
- [ ] Student layout + sidebar (light theme)
- [ ] Dashboard home (stats, upcoming classes)
- [ ] Schedule page
- [ ] Sessions/classes page
- [ ] Homework page (view + submit)
- [ ] Evaluations page
- [ ] Progress tracking (memorization + revision)
- [ ] Academic record page
- [ ] Subscription page
- [ ] Notifications page
- [ ] Settings page

### Phase 6 — Teacher Dashboard
- [ ] Teacher layout + sidebar (dark theme)
- [ ] Dashboard home
- [ ] Students management
- [ ] Sessions management + forms
- [ ] Attendance management
- [ ] Evaluations & notes forms
- [ ] Homework management
- [ ] Progress reports
- [ ] Meeting links management
- [ ] Notifications & settings

### Phase 7 — Admin Dashboard
- [ ] Admin layout + sidebar (dark theme)
- [ ] Dashboard overview + analytics
- [ ] User management (students, teachers, admins)
- [ ] Course & level management
- [ ] Sessions management
- [ ] Package & subscription management
- [ ] Website content editor
- [ ] Reports & analytics charts
- [ ] Notifications center
- [ ] Platform settings

### Phase 8 — Academic Management System
- [ ] Complete attendance CRUD (backend + frontend)
- [ ] Evaluation system (backend + frontend)
- [ ] Memorization tracking (backend + frontend)
- [ ] Revision tracking (backend + frontend)
- [ ] Academic records views
- [ ] Progress reports generation

### Phase 9 — Meetings & Scheduling
- [ ] ClassSession model + API
- [ ] Session creation form (teacher/admin)
- [ ] Meeting link management
- [ ] Session status management
- [ ] Notification scheduler (24h, 1h, 15min before session)
- [ ] Student join button
- [ ] Upcoming/History session views

### Phase 10 — AI Assistant
- [ ] AIConversation model + API
- [ ] Rule-based AI service (V1 knowledge base)
- [ ] Knowledge base: FAQs, packages, courses, navigation
- [ ] Chat interface (matching AI Assistant.dc.html)
- [ ] Arabic/English language support
- [ ] Conversation history
- [ ] Suggested questions chips

### Phase 11 — Testing & Optimization
- [ ] Backend unit tests (services, validators)
- [ ] API integration tests
- [ ] Frontend component tests
- [ ] Critical flow E2E tests
- [ ] Performance optimization (lazy loading, code splitting)
- [ ] SEO setup (meta tags, OpenGraph)
- [ ] Security hardening (rate limiting, helmet, CORS)
- [ ] Final documentation update

---

## Environment Variables

### Frontend (.env)
```
VITE_API_URL=http://localhost:5000/api/v1
VITE_APP_NAME=ترتيلة أونلاين
VITE_APP_URL=http://localhost:5173
```

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://localhost:27017/tartelah
JWT_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRE=15m
JWT_REFRESH_EXPIRE=7d
EMAIL_HOST=
EMAIL_PORT=587
EMAIL_USER=
EMAIL_PASS=
CLIENT_URL=http://localhost:5173
MAX_FILE_SIZE=5242880
```

---

## Key Architectural Decisions

1. **Separate StudentProfile/TeacherProfile from User** — Keeps auth concerns clean, allows role-specific fields without polluting the User model.

2. **ClassSession stores studentIds array** — For V1 scale (thousands of students), this is acceptable. For 100K+ sessions, revisit with a StudentSession junction collection.

3. **JWT dual-token strategy** — Short-lived access tokens in memory, refresh tokens in httpOnly cookies prevents XSS token theft.

4. **Feature-based frontend folder structure** — Each feature owns its components + hooks. Pages are thin orchestrators that compose features. Scales cleanly as features grow.

5. **V1 AI is rule-based** — No external AI API dependency for V1. Knowledge base is a structured JSON config. OpenAI integration is a Phase 10+ enhancement.

6. **Notification scheduling via node-cron** — Sufficient for V1. Migrate to Bull/BullMQ for V2 if notification volume grows.

7. **MongoDB indexes documented at model level** — Prevents N+1 performance issues early. Key compound indexes on (teacherId, scheduledAt) and (studentId, isRead) for dashboard queries.

8. **API versioning at /api/v1** — Future API changes create /v2 without breaking clients.
