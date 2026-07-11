# Features

A capability-level summary. For build history and status tracking, see `FEATURE_TRACKER.md`; for narrative detail on any single feature, see `SESSION_HANDOFF.md` and the topic-specific docs linked below.

## Marketing Website
Home, About, Programs, Courses (catalog + detail), Teachers directory + public profile, Pricing, FAQ, Contact (with backend-stored messages + admin inbox), Articles/blog. All RTL, Arabic-first with English fields throughout, SEO metadata + JSON-LD.

## Authentication
JWT dual-token (15-min access token in memory, 7-day refresh in an httpOnly cookie), role-based redirect after login, dev-only Quick Login panel (`admin`/`teacher`/`teacher_female`/`student`), password reset via email.

## Student Experience
Dashboard, study schedule, sessions (upcoming/history), homework submission, evaluations, memorization/revision progress, academic record, subscription status, enrollment-request flow (browse packages → 3-step form → payment-proof upload → status tracking), real-time notification center, course browsing/enrollment.

## Teacher Experience
Dashboard with "needs attention" signal, student roster, recurring schedule wizard (weekly/biweekly/monthly/custom → auto-generates `Session`s, deduped), attendance + delay reporting with forgiving time windows, evaluations, homework creation + grading, memorization/revision logging, meeting-link management, payroll-readiness view, notification center.

## Admin Control Center
Dashboard KPIs + operations intelligence strip, student/teacher CRM (tabbed info/edit/reset-password), enrollment-request review queue, session CRUD + admin override (create/edit/cancel/reschedule any session), subscription management, package/course CMS, **Operations Center** (live view, timeline, Needs-Review queue), teacher payroll-readiness reporting + attendance correction, articles/testimonials/FAQ/success-stories CMS, contact-message inbox, human-readable audit log, academy-wide settings, broadcast notifications.

## Intelligent Attendance & Payroll
See `ATTENDANCE_SYSTEM.md`. Deterministic, evidence-based (never falsely certain) session-outcome and payroll-status computation, a graduated/forgiving cron sweep instead of a hard cutoff, and an admin Needs-Review queue that surfaces contradictions and unresolved sessions without silently auto-resolving them.

## AI Assistant
`POST /ai/ask` — uses OpenAI when `OPENAI_API_KEY` is configured, with a deterministic rule-based Tajweed/memorization knowledge-base fallback when it isn't (never a hard failure either way). Enriches context from published articles.

## Notifications
Typed (`session`/`homework`/`evaluation`/`subscription`/`enrollment`/`payment`/`schedule`/`system`/`attendance`), prioritized (`low`/`medium`/`high`/`urgent`), Socket.io real-time delivery, mark read/unread, bulk mark-all-read, delete, `actionUrl` deep-linking, `metadata` payload for rich rendering.

## Content Management
Articles (full CMS: rich text, SEO panel, cover image, scheduling, feature/pin, soft delete), Courses (enterprise CMS: curriculum builder, learning outcomes, SEO, bulk actions), Success Stories (two display modes, image crop + client-side compression), Academy Settings (contact/footer/social/technical), Testimonials, FAQ.
