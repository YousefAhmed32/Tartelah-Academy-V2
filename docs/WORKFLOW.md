# Core Workflows

## Enrollment → Subscription → Scheduling → Session Lifecycle

```
Student browses packages (/enrollment)
  → submits EnrollmentRequest (status: pending) + uploads payment proof
  → status → under_review
  → Admin reviews (/admin/enrollments)
      → approve: creates Subscription (status: active), assigns teacher, notifies both
      → reject: adminNotes explain why, student notified

Teacher logs in → sees "unscheduled students" alert
  → opens Sessions page → "Create recurring schedule" wizard
      1. Select student  2. Frequency + days + time  3. Session count + meeting link  4. Preview dates → Confirm
  → POST /schedule-rules → ScheduleRule created → Sessions auto-generated (deduped by {seriesId, scheduledAt})
  → Student notified

Session day:
  → Teacher checks in (classified on_time/late against attendancePolicy.js)
  → Session runs on the external meeting link
  → Teacher marks student attendance, completes session, optionally records evaluation/homework
  → Attendance finalized → payrollStatus computed → Subscription.sessionsRemaining decremented (once, idempotent)

If nobody touches the session:
  → cron sweep escalates: untouched → missed (4h) → no_show (7h), always admin-correctable

If something looks wrong:
  → assessSessionReview() surfaces it in the admin Needs-Review queue
  → Admin: Start Review → Correct (reuses the existing payroll-correction endpoint) → Resolve/Dismiss
```

## Homework Lifecycle
Teacher creates `Homework` (title, description, due date, assigned students) → students see it on their dashboard → student submits (`content`/`attachments`) → teacher grades (`grade`, `teacherFeedback`) → student sees graded result + notification.

## Notification Lifecycle
Any of the above events (enrollment approval, new homework, new evaluation, upcoming session, etc.) creates a `Notification` server-side and emits it over the user's `role:${role}` Socket.io room in real time. Client shows it in the bell dropdown/notification page, `PATCH /notifications/:id/read` marks read, `PATCH /notifications/mark-all-read` clears the badge.

## Content Publishing (Articles/Courses)
Admin creates in `draft` status → previews → `published` (with optional `scheduledAt` for future auto-publish) → optionally `featured`/`pinned` → publicly visible immediately on publish. `archived` hides from public listings without deleting.

## Where To Look When Extending a Flow

| I want to... | Start here |
|---|---|
| Add a new session field | `server/src/models/Session.js` → additive only, no destructive migration |
| Change attendance timing rules | `server/src/config/attendancePolicy.js` (single source of truth — never hardcode a window elsewhere) |
| Add a new notification type | `Notification` model enum → the controller that triggers it → `TYPE_CONFIG` in the frontend notification pages |
| Add an admin-only report | `operations.controller.js` (if attendance/payroll-related) or `admin.controller.js` (general) — always date-bound the query |
| Change what a role can do | `server/src/middleware/rbac.middleware.js` + the specific route's guard, never a frontend-only check |
