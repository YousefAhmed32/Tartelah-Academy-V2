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
