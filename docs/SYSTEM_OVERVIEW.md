# System Overview — Tartelah Online

Tartelah Online is a production Quran-learning academy platform connecting students with teachers for live, 1-on-1 (and small-group) online Quran/Tajweed/memorization instruction, run entirely through admin-managed subscriptions rather than self-service booking.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, TailwindCSS, React Router, TanStack Query, Zustand, Framer Motion |
| Backend | Node.js, Express, MongoDB, Mongoose, JWT |
| Auth | Dual-token JWT — 15-minute access token held in memory, 7-day refresh token in an httpOnly cookie |
| Realtime | Socket.io (notifications) |
| AI Assistant | OpenAI (when `OPENAI_API_KEY` is set) with a deterministic rule-based fallback — never hard-fails if the key is absent |
| File storage | Local disk (`server/uploads/`), served statically — see `KNOWN_LIMITATIONS.md` for the cloud-storage migration note |

## High-Level Architecture

```
client (Vite SPA, :5173)  ──axios──▶  server (Express, :5000)  ──mongoose──▶  MongoDB
        │                                    │
        └── Socket.io client ◀───────────────┘── Socket.io server (notifications)
```

All API routes are mounted under `/api/v1` (see `API_REFERENCE.md`). The frontend never talks to MongoDB directly; every read/write goes through a role-checked Express route.

## Roles

Exactly three roles exist on `User.role`: `admin`, `teacher`, `student`. There is no `parent`, `owner`, or `manager` role, and no separate `Teacher`/`Student` collection — a teacher or student is a `User` document with that role plus profile fields (see `PERMISSIONS.md`).

## Core Domain Model (22 collections)

| Collection | Purpose |
|---|---|
| `User` | All three roles; teachers carry `gender`, `specialization`, `salaryPerSession`, `meetingLinks[]` |
| `Package` | Purchasable subscription tiers (price, sessions/month) |
| `Subscription` | A student's paid enrollment period against a `Package` |
| `EnrollmentRequest` | Pre-subscription pipeline: student applies + uploads payment proof → admin reviews → `Subscription` created |
| `Course` | Public course catalog (marketing + enrollment metadata, distinct from the 1:1 subscription model) |
| `Enrollment` | A student's enrollment in a `Course` (progress tracking) |
| `ScheduleRule` | A recurring teacher↔student weekly/biweekly/monthly pattern that generates `Session`s |
| `Session` | A single scheduled lesson — the central record for attendance, payroll, and outcome tracking |
| `Attendance` | Per-session attendance record (student side) |
| `Evaluation` | Teacher's scored assessment of a student (tajweed/hifz/nazra/behavior/general) |
| `Homework` | Assignment + embedded student submissions |
| `Memorization` / `Revision` | Surah/ayah-range progress logs |
| `Notification` | In-app notification feed, typed + prioritized |
| `Article` / `ArticleCategory` | Blog/knowledge-center CMS |
| `Testimonial` / `FAQ` | Marketing content |
| `SuccessStory` | Singleton homepage "success stories" section config |
| `AcademySettings` | Singleton site-wide settings (contact info, footer, working hours, etc.) |
| `ContactMessage` | Public contact-form submissions |
| `AuditLog` | Append-only log of sensitive admin/teacher actions |

## Where To Go Next

- **New feature or bug?** Start with `WORKFLOW.md` to find the right controller/page.
- **Who can do what?** `PERMISSIONS.md`.
- **How does attendance/payroll actually work?** `ATTENDANCE_SYSTEM.md` (summary) → `docs/INTELLIGENT_ATTENDANCE_SYSTEM.md` (full detail).
- **Need test data?** `SEEDER_GUIDE.md`.
- **Deploying?** `DEPLOYMENT.md`.
- **What's genuinely not built yet?** `KNOWN_LIMITATIONS.md`.
