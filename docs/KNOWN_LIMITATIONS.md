# Known Limitations

Honest, current gaps — not a criticism of prior work, most of these are deliberate scope decisions documented at the time they were made.

## Not Built (Out of Current Scope)

These do not exist in the schema, `SCOPE_OF_WORK.md`, or anywhere in the codebase. Confirmed during this session's audit before building the comprehensive seeder, rather than guessed at:

- **Wallet / in-platform balance**
- **Payment gateway integration** (Moyasar/Stripe) — payment is currently proof-upload + manual admin verification only
- **Certificates** (issuance/verification) — `Course.certificateAvailable` is a flag with no backing certificate document/model yet
- **Quizzes/Assignments** as a concept distinct from `Homework`
- **Support Tickets** — the closest equivalent is the `ContactMessage` inbox, which is one-way (visitor → admin), not a threaded ticket system
- **Parent role / parent portal** — only `admin`/`teacher`/`student` exist
- **Achievements/badges** system
- **Classrooms** — the platform is 1:1 (or small ad-hoc groups via shared `ScheduleRule`s), not classroom-based

If any of these become real requirements, they need their own scoped design pass (models, controllers, routes, admin UI) — not a seeder task.

## Open Business-Policy Question

**Does student absence affect teacher pay?** This is deliberately left open at the architecture level — the payroll engine surfaces `pending_review` sessions rather than silently deciding either way. An admin/business-owner decision is needed before payroll totals should be trusted for real payment runs. See `ATTENDANCE_SYSTEM.md`.

## Infrastructure

- **File storage is local disk**, not S3/Cloudinary — will not survive a redeploy on most PaaS platforms and does not scale across multiple server instances. See `DEPLOYMENT.md`.
- **No real payment gateway** — enrollment payment is manual proof-upload + admin verification.
- **Meeting links are external** — no Zoom/Meet API integration for auto-generated, platform-managed meeting rooms; teachers paste their own persistent links.
- **Cron jobs run in-process** — fine for a single instance; needs a distributed-scheduler strategy before horizontally scaling the backend.

## Testing

- **No frontend test runner** in this repo — frontend logic is verified via mirrored backend unit tests (where logic is duplicated, e.g. the teacher-identity resolver) plus manual/headless-browser passes, not component tests.
- **No DB-backed integration tests** (no `mongodb-memory-server`) — Mongoose-level guarantees (like the session dedupe unique index) are tested via mocked calls asserting the correct operation shape, not against a real database.
- **ESLint config is missing repo-wide** — `npm run lint` does not currently succeed (pre-existing gap, confirmed still present, not reintroduced).

## UX/Consolidation

- Session attendance correction is reachable from three separate admin UI entry points (Sessions table, Teachers CRM, Operations Center) — all three call the identical backend endpoint, so there's no functional gap, just avoidable UI duplication worth consolidating eventually.
- Bundle size: `index-*.js` and `exportUtils-*.js` chunks exceed 500kB after minification (Vite build warning) — not a correctness issue, but worth a code-splitting pass if initial load time becomes a concern.

## This Session's Verified-Clean Areas

A live headless-browser pass (all sidebar pages, all three roles, against the freshly-seeded dataset) found and fixed one real crash (`AdminSubscriptionsPage` — see `FINAL_REPORT.md`) and no other console/render errors. This does not mean every edge case is covered — it means the primary navigation surface of all three dashboards renders without crashing against realistic data volume, which is a meaningfully stronger guarantee than a code-only review.
