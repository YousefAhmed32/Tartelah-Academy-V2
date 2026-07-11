# Permissions & Roles

## Roles

The platform has exactly three roles, stored on `User.role`: `admin`, `teacher`, `student`. There is no database-backed roles/permissions table — authorization is enforced entirely in Express middleware (`server/src/middleware/rbac.middleware.js`), never on the frontend alone.

```js
authorize(...roles)   // generic — 401 if unauthenticated, 403 if role not in the allow-list
isAdmin                // authorize('admin')
isTeacher               // authorize('admin', 'teacher')   ⚠️ name is historical — actually admin-or-teacher
isStudent               // authorize('student')
isAdminOrTeacher         // authorize('admin', 'teacher')
```

Every protected route pairs `authenticate` (validates the JWT access token, attaches `req.user`) with one of the role gates above. Public routes (marketing pages, `GET /teachers/public`, `GET /courses`, `GET /articles`, `GET /success-stories`) intentionally skip both.

## What Each Role Can Do

### Admin
- Full CRUD on students, teachers, courses, packages, subscriptions, sessions, schedule rules
- Reviews and approves/rejects `EnrollmentRequest`s, which provisions a `Subscription`
- Overrides any session's attendance/payroll status (audit-logged)
- Manages site content: articles, testimonials, FAQs, success stories, academy settings
- Views the Operations Center (live sessions, timeline, Needs-Review queue)
- Views audit logs, contact messages, platform-wide reports
- Resets any user's password, activates/deactivates accounts

### Teacher
- Views only their own assigned students, sessions, homework, evaluations
- Checks in / marks attendance / finalizes attendance for their own sessions only (ownership-checked on every write — a teacher cannot edit another teacher's session or attendance record by guessing an ID)
- Creates evaluations, homework, memorization/revision records for their own students
- Manages their own meeting links and profile (including `gender`, self-service)
- Sees their own payroll-readiness breakdown (`teacher-performance/me/*`), never another teacher's

### Student
- Views only their own sessions, subscription, homework, evaluations, progress
- Submits homework, browses/enrolls in courses, submits enrollment requests
- Cannot set their own `gender` field (that's teacher-identity-specific; blocked by role check) and cannot see any other student's data

## Data Exposure Rules

- Public teacher listings (`GET /teachers/public`) go through `server/src/utils/teacherPublic.js`'s `toPublicTeacher()` allow-list — salary, email, phone, and other internal fields are never serialized to anonymous visitors.
- Admin-facing user list/detail endpoints always `.select('-password -refreshToken')` (see `admin.controller.js`).
- `User.toPublic()` strips `password`, `refreshToken`, `passwordResetToken/Expires` before any user object is sent to a client, regardless of role.

## Auditing

Sensitive actions are written to `AuditLog` via `logAction({actorId, actorRole, action, entity, entityId, changes})`: enrollment approval/rejection, subscription create/update, session check-in/complete/cancel/reschedule/delay, attendance save/finalize, admin payroll corrections, password resets. Viewable at `/admin/audit-logs`, human-readable via `AdminAuditLogsPage.jsx`'s action-label map.
