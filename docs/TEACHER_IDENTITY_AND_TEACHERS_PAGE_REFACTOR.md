# Teacher Identity System & Teachers Page Refactor

**Date:** 2026-07-04
**Scope:** Cross-stack — canonical teacher gender identity (DB → API → admin → self-service → public presentation) and a full redesign of the public Teachers page/card.

---

## 1. Old architecture (what was actually there)

Traced the real runtime path before changing anything:

- **No `Teacher` model exists.** A teacher is `User` with `role: 'teacher'` (`server/src/models/User.js`). No gender/identity field of any kind existed anywhere in the schema.
- **Public Teachers page called an admin-only endpoint.** `client/src/pages/marketing/TeachersPage.jsx` queried `GET /admin/teachers` — a route mounted behind `authenticate, isAdmin` (`server/src/routes/admin.routes.js`). For any real, logged-out visitor this **always returned 401**.
- **`.catch(() => FALLBACK_TEACHERS)`** on that failing request meant the 401 was silently swallowed and 4 hardcoded fake teachers (`FALLBACK_TEACHERS`) were shown instead — indistinguishable from real data, in production, every single time, since the request could never succeed for a public visitor.
- **`TeacherCard`** was a 3D `rotateY(180deg)` hover-flip card: hardcoded `فضيلة الشيخ {name}` honorific for literally every teacher (male or female), a generic book/Quran SVG icon shown for any teacher without an avatar, a fixed `h-[400px]`, `line-clamp-6` hiding most of the bio behind a hover-only back face, and a CTA that always linked straight to `/register` regardless of which teacher was clicked.
- **Page background** was `bg-gradient-to-b from-[#11052c] via-[#1a0b3e] via-30% to-white to-60%` — cards were expected to land in the white region purely by tuning gradient stop percentages, which breaks the moment content height changes (more/fewer teachers, mobile wrap, loading state).
- **Admin create/edit teacher forms** (`AdminTeachersPage.jsx`) had no gender field, no avatar upload, and no way to express identity beyond name/specialization.
- **Seed data** (`server/src/seed/seed.js`) baked the honorific directly into the name string itself — `firstNameAr: 'الشيخ محمد'` / `firstNameAr: 'الشيخة فاطمة'` — i.e. gender was encoded as literal Arabic text glued onto a name field, not a queryable/validatable value.

## 2. Confirmed problems (Phase 2 audit)

All of the following were verified present in the real code (not assumed) and fixed:

| # | Problem | Confirmed? | Fix |
|---|---|---|---|
| 1 | `FALLBACK_TEACHERS` has no gender | Yes | Removed entirely (see §11) |
| 2 | Female teachers rendered as "فضيلة الشيخ" | Yes | Gender-aware honorific resolver (§8) |
| 3 | All teachers treated as male in copy | Yes | Same as above |
| 4 | Missing avatar → generic book icon | Yes | Gender-aware default avatars (§9) |
| 5 | Public page hits `/admin/teachers` | Yes — always 401 for real visitors | New `/teachers/public` endpoints (§6) |
| 6 | API failure silently shown as fake success | Yes | Honest loading/error/empty states, no fallback masking (§11) |
| 7 | 3D hover flip: inaccessible/touch-hostile | Yes | Replaced with a stable, keyboard/touch/reduced-motion-safe card (§12) |
| 8 | Fixed `h-[400px]` | Yes | Removed; `flex` + `h-full` on a stretch grid |
| 9 | `line-clamp-6` hiding bio behind hover | Yes | 3-line clamp + full bio on a real profile page |
| 10 | Fake fallback teachers as prod content | Yes | Removed (§11) |
| 11 | CTA always → generic `/register` | Yes | Card → Teacher Profile → Register (carries identity) (§13) |
| 12 | Identity duplicated/hardcoded across components | Yes | Centralized resolver (§8) |

## 3. Canonical identity model

**`User.gender`** (`server/src/models/User.js`): `{ type: String, enum: ['male', 'female'] }` — no `default`, not `required`. This is the **one** source of truth; no competing `teacherGender`/`sex`/`type` field was introduced.

- Not required/defaulted deliberately: legacy teachers (and any teacher created without it) are **unresolved**, not silently male.
- Enum-validated at the schema level; every write path (admin create/update, teacher self-update) also validates explicitly via `isValidGender()` before hitting the DB, returning a clear Arabic 400 error on an invalid value.
- Canonical values/copy centralized in **`server/src/config/teacherIdentity.js`**: `GENDER`, `GENDER_VALUES`, `HONORIFIC_AR` (`الأستاذ` / `الأستاذة`), `ROLE_LABEL_AR` (`معلم` / `معلمة`), `isValidGender()`.
- **Honorific choice:** `الأستاذ` / `الأستاذة` rather than `الشيخ`/`الشيخة` or `فضيلة الشيخ`. Chosen to match the platform's existing tone (the old subtitle already said "نخبة من الأساتذة") and because it's symmetric and equally respectful for both genders — `الشيخة` in particular can read as awkward/uncommon depending on dialect, and mirroring `الشيخ` with `الشيخة` would have been a literal-gender-mirror the brief explicitly warned against.

## 4. Legacy data safety

No trustworthy structured field existed to normalize gender from, so there was nothing to safely infer — and names were never used as a source (`محمد`, `فاطمة`, etc. are explicitly excluded per the brief). Every existing teacher record is simply **unresolved** (`gender` absent) until corrected by an admin or the teacher.

Unresolved presentation (frontend resolver, §8):
- Avatar → neutral default (a distinct third illustration — muted gray, no headwear — never the male or female default).
- Name shown with **no honorific** (never a guessed `الأستاذ`/`الأستاذة`).
- A small "معلم قرآن كريم" neutral label instead.
- Admin UI surfaces an explicit "التصنيف غير محدد" (classification not set) badge on both the teacher grid card and the CRM panel header.

## 5. Migration / audit script

**`server/src/scripts/migrateTeacherGender.js`** — `npm run migrate-teacher-gender` (dry-run by default, `--apply` to write).

Since there is no legacy field to normalize *from*, this script does not (and cannot) safely backfill `male`/`female` — doing so would be exactly the "guess from context" behavior the brief prohibits. What it actually does, idempotently:

1. Scans all `role: 'teacher'` users and buckets each into `male` / `female` / `unresolved` / `invalid`.
2. Prints a full summary count + the concrete list of unresolved teacher IDs (for admin follow-up) and any `invalid` stored values (would only occur from a raw DB write bypassing Mongoose validation).
3. In `--apply` mode, the **only** write it ever performs is normalizing an `invalid` value to `null` (unresolved) — never to a guessed `male`/`female`. Running it twice produces identical output (verified idempotent in tests).

The pure classification logic (`classifyTeacherGender`, `auditTeacherGender`) is exported separately from the DB-connecting `run()` (guarded by `require.main === module`) specifically so it's unit-testable without a database — see `server/src/scripts/__tests__/migrateTeacherGender.test.js`.

Verified live against the seeded dev DB:
```
[migrateTeacherGender] Scanned 5 teacher(s).
  already valid male:   2
  already valid female: 2
  unresolved (no value): 1
  invalid stored value:  0
1 teacher(s) remain unresolved and need admin correction: ...
```

## 6. Public API

New, unauthenticated routes added to `server/src/routes/teacher.routes.js` (added *before* the file's blanket `router.use(authenticate, isAdminOrTeacher)`, so they're reachable without a token):

- `GET /api/v1/teachers/public?gender=male|female&limit=&page=` — list, `role:'teacher', isActive:true` only, optional gender filter (invalid value → `400`).
- `GET /api/v1/teachers/public/:id` — single teacher detail.

Both go through **`server/src/utils/teacherPublic.js`** → `toPublicTeacher()`, a single allow-list projection (`_id, firstNameAr, lastNameAr, gender, avatar, specialization, bioAr, createdAt`) instead of a route-specific exclusion `.select('-password ...')` that could accidentally leak a newly-added sensitive field later. Verified via curl that salary, email, phone, and internal account fields never appear in the response, and unit-tested in `teacherPublic.test.js`.

The old `TeachersPage.jsx` query was switched from `/admin/teachers` to `/teachers/public` — this alone fixes problem #5, since the admin endpoint could never succeed for a real anonymous visitor.

## 7. Admin / self-service flows

- **`admin.controller.js`** `createTeacher`/`updateTeacher` — validate `gender` via `isValidGender()` when provided (400 with a clear Arabic message if invalid); `gender` added to `updateTeacher`'s explicit allow-list so unrelated edits (specialization, salary, etc.) can never erase it. Verified via curl: unrelated `PATCH` with only `specialization` leaves `gender` untouched.
- **`user.controller.js`** `updateMe` — `gender` added to the allow-list **only when `req.user.role === 'teacher'`** (a student can never set it; verified via curl — the field is silently dropped, not stored). A teacher is the most authoritative source for their own identity, so self-edit is allowed by the same "only ever a valid enum, never silently defaulted" rule as the admin path.
- **Frontend:** new shared **`GenderSegmentedControl`** (`client/src/components/ui/GenderSegmentedControl.jsx`) — a two-option radio-card group (`معلم` / `معلمة`), never a free-text field, never pre-selected. Used in:
  - `AdminTeachersPage.jsx` — create modal (submission blocked client-side with a toast until chosen) and the CRM panel's edit tab.
  - `TeacherSettingsPage.jsx` — teacher's own settings, preserved across unrelated profile saves.
- Admin **create is not backend-required** to have a gender (an admin could still create via raw API without one) — deliberately consistent with "unresolved is a valid state, never coerce to male" — but the **UI** requires the choice before allowing submission, which is the actual product requirement ("the admin must explicitly choose").

## 8. Centralized identity resolver

One resolution algorithm, mirrored in two places since there's no shared package between the two deployables:

- **`server/src/utils/teacherIdentityResolver.js`** — `resolveTeacherIdentity(teacher)`, pure, unit-tested (`__tests__/teacherIdentityResolver.test.js`, 13 cases). Returns an `avatarKind` (`custom | male-default | female-default | neutral-default`) rather than a concrete asset path, since asset paths are a frontend concern.
- **`client/src/utils/teacherIdentity.js`** — same algorithm, plus the frontend-specific bits: maps `avatarKind` to the actual SVG asset, and calls `getFileUrl()` for a custom avatar. Returns `{ gender, isResolved, hasCustomAvatar, roleLabelAr, honorificAr, displayAvatar, defaultAvatar }`.

Every surface that shows a teacher's identity calls this — no component ever writes `teacher.gender === 'female'` inline.

Avatar precedence (verified in both the unit tests and live in-browser): custom avatar always wins when present, regardless of gender or resolution state; removing it (`avatar: null/''`) falls back to the correct gender default; an unresolved teacher with a real uploaded photo still shows that photo (never forced to the neutral placeholder).

## 9. Default avatar assets

Three lightweight inline-gradient SVGs in `client/public/images/avatars/`:
- `teacher-male-default.svg` — dark purple circular badge, lavender bust silhouette, small gold-trimmed taqiyah cap.
- `teacher-female-default.svg` — same badge/palette, lavender hijab-draped silhouette (distinct construction, not a recolor).
- `teacher-neutral-default.svg` — desaturated gray badge, plain bust silhouette, no headwear — used only for unresolved identity.

Same art direction/line weight/palette for both gendered avatars (no stereotyped "lesser" female variant, no pink-coding) — verified visually in the browser screenshots (§14).

## 10. Arabic titles

`فضيلة الشيخ` is gone from the codebase entirely (repo-wide grep confirmed zero remaining hits outside a test assertion that explicitly checks it's absent). Replaced with the gender-aware `HONORIFIC_AR` (`الأستاذ` / `الأستاذة`, see §3). An unresolved teacher gets **no honorific at all**, not a guessed one.

## 11. Fake fallback removal

`FALLBACK_TEACHERS` was **deleted entirely**, not merely gated behind `import.meta.env.DEV`. Reasoning: the repo already has a working `npm run seed` that creates real, properly-gendered demo teachers — a second, parallel hardcoded fake-data source added no value and is exactly the kind of "avoid placeholders/temporary implementations" the project's own quality standards ask to avoid. `TeachersPage.jsx` now has three honest states instead: loading (skeleton grid), error (`ErrorState` + retry, reusing the existing shared component), and empty (`EmptyState`, message varies by whether a filter is active).

## 12. Teachers page & TeacherCard redesign

- **Hero** — solid `bg-page-dark` (brand dark-purple gradient token), fixed height (not gradient-percentage dependent), eyebrow / heading / gold divider / short subtitle. Header/Navbar (`PublicLayout.jsx`) untouched.
- **Discovery section** — its own solid light surface (`#FAF7F2`); a toolbar card (`count text` + filter) sits above the grid, reusing the existing `card-light` convention instead of a new one-off style.
- **Filter** — `الكل / معلمون / معلمات` segmented control (`role="group"`, `aria-pressed`), backed by the real `?gender=` query param on `/teachers/public` — verified in-browser: switching filters updates both the grid and the count text correctly (male filter → 2 results, female filter → 2 results, in a 5-teacher seeded set including one unresolved).
- **Card** (`client/src/components/marketing/TeacherCard.jsx`) — no 3D flip. Stable at rest: avatar (gender-resolved), honorific+name, specialization pill, 3-line-clamped bio, single "عرض الملف الشخصي" CTA. `h-full` + `flex-col` + `mt-auto` on the CTA instead of a fixed height, so cards stay aligned in a stretch grid regardless of content length.
- **Grid breakpoints** — `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4` (not `lg:grid-cols-4`), specifically to avoid a cramped 4-up row at laptop widths (1024–1279px) — 4 columns only kick in at `2xl` (≥1536px).
- **Loading** — `TeacherCardSkeleton` matches the real card's geometry (avatar circle, name/pill/bio/button placeholders) instead of a generic gray rectangle.
- **Empty states** — distinct copy for "no teachers at all" vs. "no teachers in this filter" (the latter includes a one-click "عرض جميع المعلمين" reset).
- **Accessibility** — no hover-only content, avatar images are `aria-hidden`/empty-`alt` (decorative, since the name text already conveys identity), all interactive elements are real `<button>`/`<a>` elements with visible focus (native browser default, no custom-suppressed outlines were added), filter buttons expose `aria-pressed`.

## 13. Teacher profile & CTA destination

New **`client/src/pages/marketing/TeacherProfilePage.jsx`** at `ROUTES.TEACHER_PROFILE = '/teachers/:id'`. TeacherCard's CTA now goes here instead of straight to `/register`. The profile page shows the full (non-clamped) bio and a "سجّل الآن مع {honorific} {name}" CTA that carries the chosen teacher forward as `?teacherId=&teacherName=` into `/register`.

To avoid inventing a marketplace/booking system that doesn't otherwise exist in this codebase, the "preserve identity into the next action" requirement was implemented with the **smallest** coherent change:
- `RegisterPage.jsx` reads the query params, shows a small "ستبدأ رحلتك مع {name}" confirmation banner, and on successful registration stores `preferredTeacherId`/`preferredTeacherName` in `localStorage`.
- `StudentEnrollmentPage.jsx` — which already has an unused `studentNotes` field on `EnrollmentRequest` (the model already supports an optional `teacherId`, but it's only ever set by the *admin* on approval, not by the student at request time) — prefills that note with "أرغب بالتسجيل مع {name} إن أمكن." and clears the stored preference once the request is submitted.

This uses only fields/flows that already existed; no new schema field, no new booking subsystem.

## 14. Verification performed

- **Backend:** `npx jest` → **68/68 passing** (40 pre-existing + 28 new, covering the resolver, public projection, migration classification, and identity config — see file list below).
- **Frontend build:** `npm run build` → zero errors (pre-existing chunk-size warning only, unrelated).
- **Live, in-browser (Playwright/Chromium, headless), against the real seeded dev DB:**
  - `/teachers` — all/male/female filters each returned the correct, exact set; unresolved teacher rendered with the neutral avatar + no honorific + generic label; every other teacher showed the correct gendered avatar illustration and honorific.
  - `/teachers/:id` — profile page rendered full identity + working "سجّل الآن مع ..." CTA with the correct gender-matched honorific.
  - `/admin/teachers` create modal — segmented `معلم`/`معلمة` control present, "مطلوب — لم يتم تحديد التصنيف بعد" warning shown until one is picked.
  - `/teacher/settings` — control pre-selected to the logged-in teacher's actual stored gender; changed it, saved, reloaded the page, and the change persisted (confirmed against the DB, not just local state); reverted afterward.
  - Backend smoke-tested directly via curl: public list/detail/filter/invalid-filter, admin create (missing/invalid/valid gender), unrelated-update-preserves-gender, teacher self-update, student blocked from setting gender, and `/admin/teachers` still correctly 401s without a token (proving the old bug was real).
- Dev servers stopped and the seeded DB reset to a clean state afterward; no test artifacts left behind.

## 15. Files created

**Backend:** `server/src/config/teacherIdentity.js`, `server/src/utils/teacherPublic.js`, `server/src/utils/teacherIdentityResolver.js`, `server/src/scripts/migrateTeacherGender.js`, `server/src/config/__tests__/teacherIdentity.test.js`, `server/src/utils/__tests__/teacherPublic.test.js`, `server/src/utils/__tests__/teacherIdentityResolver.test.js`, `server/src/scripts/__tests__/migrateTeacherGender.test.js`.

**Frontend:** `client/src/utils/teacherIdentity.js`, `client/src/components/ui/GenderSegmentedControl.jsx`, `client/src/components/marketing/TeacherCard.jsx`, `client/src/pages/marketing/TeacherProfilePage.jsx`, `client/public/images/avatars/teacher-{male,female,neutral}-default.svg`.

## 16. Files modified

`server/src/models/User.js` (`gender` field), `server/src/controllers/{teacher,admin,user,course}.controller.js`, `server/src/routes/teacher.routes.js`, `server/src/services/teacherPerformance.service.js` (added `gender` to the org-wide performance projection), `server/src/seed/seed.js` (real `gender` values + removed the honorific baked into `firstNameAr`), `server/package.json` (new `migrate-teacher-gender` script).

`client/src/config/constants.js` (`TEACHER_PROFILE` route), `client/src/App.jsx` (route registration), `client/src/pages/marketing/TeachersPage.jsx` (full rewrite), `client/src/pages/marketing/CourseDetailPage.jsx` (instructor avatar/honorific via resolver), `client/src/pages/admin/AdminTeachersPage.jsx` (gender control + unresolved badges + resolver-based avatars), `client/src/pages/admin/AdminTeacherPerformancePage.jsx` (resolver-based avatar), `client/src/pages/teacher/TeacherSettingsPage.jsx` (gender control + resolver-based avatar), `client/src/pages/auth/RegisterPage.jsx` (preferred-teacher carry-through), `client/src/pages/student/StudentEnrollmentPage.jsx` (note prefill).

## 17. Cross-surface consistency — what was and wasn't changed, and why

Updated to the centralized resolver: public Teachers page/card, Teacher Profile page, course instructor display (both the 64px and 40px instances on `CourseDetailPage.jsx`), admin teacher list + CRM panel avatar, admin teacher-performance list avatar, teacher's own settings avatar.

**Deliberately left alone** (documented, not overlooked):
- The tiny 24px instructor avatar on the public `CoursesPage.jsx` course-card grid keeps its plain first-letter fallback — at that size a detailed illustration loses all legibility and a single initial is both already gender-neutral (never wrong) and more legible.
- Internal admin/ops avatars (`AdminSessionsPage.jsx`, `AdminOperationsCenterPage.jsx`, `AdminScheduleRulesPage.jsx`) keep the existing neutral-initials `Avatar` fallback. These are internal CRM tooling (see [[feedback_admin_design]] — light CRM style, not decorative), and initials are already correct (never wrong-gender) — there was no actual bug to fix there, only a stylistic choice not to force the illustrated public-facing avatars into dense internal tables.
- The homepage's `#teachers` carousel section (`HomePage.jsx`) is fully decorative marketing content — hardcoded fake names/photos/ratings unrelated to the real teacher data model (doesn't use `teacher.avatar`, `getFileUrl`, or any backend field). It's out of scope for a teacher *identity* system since there's no real identity data flowing through it at all; rewriting it would mean sourcing new photography for a different, unrelated task. Flagged here as a known pre-existing issue, not fixed.
- `AdminDashboardPage.jsx`'s recent-registrations `<Avatar name={...}>` uses a prop (`name`) that doesn't exist on the `Avatar` component (which takes `firstName`/`lastName`), so it always falls back to `؟` regardless of role. Pre-existing, affects students and teachers equally, unrelated to gender — left alone to avoid scope creep into an unrelated bug.

## 18. Known limitations

- No ESLint config exists in this repo (pre-existing, unrelated gap — confirmed still true, not retrofitted here).
- The migration script cannot *backfill* gender for legacy teachers (there's nothing trustworthy to backfill from) — it can only report and let an admin/teacher correct it through the validated UI. This is a deliberate safety property, not a gap.
- No frontend test runner exists in this repo, so the resolver's presentation logic is verified via (a) the mirrored, unit-tested backend implementation and (b) the live Playwright browser pass in §14 — not via component tests.
