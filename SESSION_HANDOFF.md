# Session Handoff — Tartelah Online

## Session Date
2026-06-24

## Status
**EDUCATIONAL OPERATING SYSTEM — Full Scheduling Engine + Session Lifecycle**

Frontend: ✅ Zero errors, 4.87s build  
Backend: ✅ All server files pass syntax check  
Engine: ✅ ScheduleRule model + schedule.service.js + full CRUD

---

## This Session — Educational Operating System Overhaul

### Philosophy
Previous sessions built a working dashboard. This session transformed it into a real educational operating system where:
- Sessions are **generated from rules**, not entered manually
- Attendance is **session-linked and inline**, not a separate page
- Evaluations and homework are **reachable from every session card**
- Teachers get **smart alerts** about unscheduled students
- Admin gets **operational intelligence** about platform health

---

## What Was Built

### New Backend Files

| File | Type | Purpose |
|------|------|---------|
| `server/src/models/ScheduleRule.js` | NEW | Recurring schedule rule entity |
| `server/src/services/schedule.service.js` | NEW | Session generation engine |
| `server/src/controllers/scheduleRule.controller.js` | NEW | CRUD + preview + generate |
| `server/src/routes/scheduleRule.routes.js` | NEW | Routes at `/schedule-rules` |

### Modified Backend Files

| File | Change |
|------|--------|
| `server/src/models/Session.js` | Added: seriesId, isException, isMakeup, rescheduledFrom; statuses: rescheduled, missed |
| `server/src/controllers/session.controller.js` | Added: getSession, getTeacherSessionsByMonth, rescheduleSession; fixed completeSession attendance |
| `server/src/routes/session.routes.js` | Added: GET /:id, GET /teacher-month, PATCH /:id/reschedule |
| `server/src/controllers/attendance.controller.js` | Added: getSessionAttendance, saveSessionAttendance |
| `server/src/routes/attendance.routes.js` | Added: GET/POST /session/:sessionId |
| `server/src/controllers/admin.controller.js` | Added: ScheduleRule import, unscheduledStudents count in stats |
| `server/src/routes/index.js` | Added: /schedule-rules route |

### Modified Frontend Files

| File | Change |
|------|--------|
| `client/src/pages/teacher/TeacherSessionsPage.jsx` | **FULL REDESIGN** — Schedule wizard + month view + expandable cards |
| `client/src/pages/teacher/TeacherDashboardPage.jsx` | Added: schedule rules query, unscheduled alert, action queue item |
| `client/src/pages/admin/AdminDashboardPage.jsx` | Added: unscheduled students alert banner |
| `client/src/config/constants.js` | Added: SESSION_STATUS (expanded), SCHEDULE_FREQUENCY, DAYS_OF_WEEK |

---

## Key API Endpoints

### Schedule Rules (NEW)
```
POST   /api/v1/schedule-rules/preview         → preview dates (no DB)
POST   /api/v1/schedule-rules                 → create rule + generate sessions
GET    /api/v1/schedule-rules/my              → teacher's rules with stats
GET    /api/v1/schedule-rules/:id             → single rule + sessions
PATCH  /api/v1/schedule-rules/:id             → update meeting link / pause
POST   /api/v1/schedule-rules/:id/generate-more → extend + generate more
```

### Sessions (UPDATED)
```
GET    /api/v1/sessions/teacher-month?year=&month=  → monthly view
GET    /api/v1/sessions/:id                          → single session + attendance
PATCH  /api/v1/sessions/:id/reschedule              → reschedule with notification
```

### Attendance (UPDATED)
```
GET    /api/v1/attendance/session/:sessionId  → get session's attendance
POST   /api/v1/attendance/session/:sessionId  → save (upsert) attendance
```

---

## Teacher Sessions Page — Architecture

```
TeacherSessionsPage
├── [Header] + [إنشاء جدول دوري] + [+ حصة واحدة]
├── [Tabs: الشهر الحالي | الجداول الدورية | السجل]
│
├── Tab: month
│   ├── [Month nav: < شهر >]
│   └── Sessions grouped by date
│       └── SessionCard (expandable)
│           ├── [Attendance: حاضر/غائب/متأخر/معذور + notes + save]
│           ├── [Meeting link button]
│           └── [Actions: اكتملت | إعادة جدولة | إلغاء | تقييم | واجب]
│
├── Tab: rules
│   └── ScheduleRulesView — per-student rule cards with stats
│
├── Tab: history
│   └── Past sessions list
│
├── ScheduleWizard (Modal, 4 steps)
│   ├── Step 1: Student select
│   ├── Step 2: Frequency + days + time
│   ├── Step 3: Sessions count + meeting
│   └── Step 4: Preview dates → Confirm
│
├── QuickEvalModal — session-linked evaluation
├── QuickHomeworkModal — student pre-filled homework
└── RescheduleModal — new datetime + notification
```

---

## Schedule Generation Algorithm

```
Input: { frequency, daysOfWeek, timeOfDay, startDate, sessionsTotal/endDate }

Algorithm:
1. Parse timeOfDay "HH:MM" → hours, minutes
2. Iterate day-by-day from startDate
3. For each day:
   - daily: always include
   - weekly: include if dayOfWeek in daysOfWeek
   - biweekly: include if dayOfWeek in daysOfWeek AND week-number is even
   - monthly: include if dayOfWeek in daysOfWeek (or same day-of-month)
4. Skip if date in skipDates
5. Build sessionDate with timeOfDay applied
6. Stop when sessionsTotal reached OR endDate passed
7. Safety: max 600 iterations

Output: Array of Date objects → insertMany into Session collection
```

---

## Data Model Changes

### ScheduleRule (NEW)
```javascript
{
  teacherId, studentId, subscriptionId,
  frequency: 'daily|weekly|biweekly|monthly|custom',
  daysOfWeek: [0-6],          // 0=Sunday
  timeOfDay: 'HH:MM',
  durationMinutes: 60,
  startDate, endDate, sessionsTotal,
  meetingLink, meetingProvider,
  titleTemplate,               // e.g. 'حصة تجويد'
  status: 'active|paused|ended',
  skipDates: [],
  timezone: 'Asia/Riyadh',
}
```

### Session (UPDATED)
```javascript
{
  // ... existing fields
  seriesId: ObjectId,          // ref ScheduleRule
  isException: Boolean,        // manually overridden
  isMakeup: Boolean,
  rescheduledFrom: Date,
  status: '...| rescheduled | missed',  // now 7 statuses
}
```

---

## Intelligent Behaviors

1. **Teacher creates schedule** → sessions auto-generated → student notified
2. **Teacher marks attendance** → saved per-session, not overridden on complete
3. **Teacher completes session** → auto-marks present ONLY if no attendance yet
4. **Teacher reschedules** → original date stored, student notified
5. **Admin sees** → unscheduled count in dashboard
6. **Teacher sees** → unscheduled students in dashboard alert + action queue

---

## Architecture Summary

| Concern | Solution |
|---------|----------|
| Session generation | ScheduleRule → schedule.service.js → Session.insertMany |
| Attendance | Per-session upsert, teacher-only, inline in session card |
| Session lifecycle | 7 statuses: scheduled→completed/cancelled/rescheduled/missed |
| Notifications | Auto-created on: schedule created, session rescheduled, cancelled |
| Admin intelligence | unscheduledStudents count in /admin/stats |

---

## To Start the Application

```bash
# Terminal 1: Backend
cd server && npm run dev      # port 5000

# Terminal 2: Frontend
cd client && npm run dev      # port 5173
```

## Demo Credentials
```
Admin:    admin@tartelah.com    / Admin1234!
Teacher1: teacher1@tartelah.com / Teacher1234!
Student1: student1@tartelah.com / Student1234!
```

---

## Remaining V2 Work

| Item | Priority | Notes |
|------|----------|-------|
| Payment gateway (Stripe/Moyasar) | High | Revenue processing |
| Admin schedule management UI | High | Admin can view/manage all schedule rules |
| Email notifications on enrollment + schedule | Medium | Requires SMTP config |
| Teacher salary management | Medium | Sessions × rate |
| S3/Cloudinary file storage | High | Replace Multer local disk |
| AI tutor (Claude API) | Medium | Tajweed Q&A |
| Homework sessionId linkage | Low | Currently by student only |
| Group session support | Low | Requires attendance model change |
