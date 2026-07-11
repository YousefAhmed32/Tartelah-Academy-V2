# API Reference

Base URL: `http://localhost:5000/api/v1` (dev). All routes below are mounted under this prefix. Auth: `Authorization: Bearer <accessToken>` header (attached automatically by the frontend's axios interceptor); the refresh token travels only via an httpOnly cookie.

Full request/response shapes live in each controller (`server/src/controllers/*.js`) and route file (`server/src/routes/*.js`) — this is a route map, not a full OpenAPI spec.

| Mount | File | Notes |
|---|---|---|
| `/auth` | `auth.routes.js` | register, login, logout, refresh, forgot/reset/change password, `dev-login` (dev-only, double-guarded) |
| `/users` | `user.routes.js` | current-user profile read/update |
| `/students` | `student.routes.js` | student-scoped stats/records |
| `/teachers` | `teacher.routes.js` | teacher-scoped stats/students/links + public directory (`/teachers/public[/:id]`) |
| `/sessions` | `session.routes.js` | CRUD, check-in, complete, cancel, reschedule, delay, link-opened |
| `/attendance` | `attendance.routes.js` | per-session attendance create/update/finalize |
| `/evaluations` | `evaluation.routes.js` | teacher-created student evaluations |
| `/homework` | `homework.routes.js` | assign, list, submit, grade |
| `/memorization` | `memorization.routes.js` | memorization log CRUD |
| `/revision` | `revision.routes.js` | revision log CRUD |
| `/subscriptions` | `subscription.routes.js` | student subscription lifecycle |
| `/notifications` | `notification.routes.js` | list, mark read/unread, delete, mark-all-read |
| `/courses` | `course.routes.js` | public catalog + admin CMS (`/courses/admin/*`) |
| `/packages` | `package.routes.js` | public package listing + admin CRUD |
| `/admin` | `admin.routes.js` | stats, student/teacher management, reports, audit logs, broadcasts |
| `/website` | `website.routes.js` | testimonials, FAQ, academy settings, contact form + admin contact-message inbox |
| `/ai` | `ai.routes.js` | `POST /ai/ask` (chat), rate-limited (200/10min dev, 20/10min prod) |
| `/enrollments` | `enrollment.routes.js` | student enrollment-request pipeline + admin review |
| `/schedule-rules` | `scheduleRule.routes.js` | recurring schedule CRUD, preview, generate-more |
| `/articles` | `article.routes.js` | public blog + admin CMS |
| `/success-stories` | `successStory.routes.js` | public GET + admin singleton config |
| `/teacher-performance` | `teacherPerformance.routes.js` | payroll-readiness, salary reports, attendance history/trend |
| `/operations` | `operations.routes.js` | admin-only: live view, timeline, review queue |

## Rate Limits (dev / prod)

- General API (`/api/v1/*`): 100 requests / 15 min per IP (both environments — see `RATE_LIMIT_MAX` in `.env`)
- Auth (`/api/v1/auth/*`): 500 / 15 min (dev) vs 20 / 15 min (prod)
- AI chat (`/api/v1/ai/*`): 200 / 10 min (dev) vs 20 / 10 min (prod)

Automated testing/scripting against a local dev server can exhaust the general 100/15min limit surprisingly fast (a handful of dashboard page loads, each firing several parallel queries, is enough) — if you see a wave of `429`s during manual QA, wait out the window or restart the dev server to reset the in-memory counter.

## Response Envelope Convention

```json
// Success
{ "success": true, "message": "...", "data": <payload> }

// Paginated (sendPaginated)
{ "success": true, "message": "...", "data": [...], "total": 42, "page": 1, "limit": 20, "totalPages": 3, "hasMore": true }

// Error
{ "success": false, "message": "..." }
```

**Convention pitfall to watch for:** some list endpoints return the array directly under `data`, while a few older call sites in the frontend expected the *whole* paginated envelope under `data` and then read `.data.data`. When two components use the **same TanStack Query key** with different unwrapping (`r.data` vs `r.data.data`), the second component silently receives whatever shape the first one's queryFn produced — this caused a real crash on `AdminSubscriptionsPage` (fixed this session, see `FINAL_REPORT.md`). When adding a new list query, either give it a query key no other component shares, or match the exact unwrapping convention already used by that key.
