const router = require('express').Router()
const ctrl = require('../controllers/admin.controller')
const sessionCtrl = require('../controllers/session.controller')
const notifCtrl = require('../controllers/notification.controller')
const auditCtrl = require('../controllers/auditLog.controller')
const perfCtrl = require('../controllers/teacherPerformance.controller')
const onboardingCtrl = require('../controllers/adminOnboarding.controller')
const onboardingSessionCtrl = require('../controllers/onboardingSession.controller')
const assignmentCtrl = require('../controllers/adminAssignment.controller')
const subjectCtrl = require('../controllers/teachingSubject.controller')
const credentialDefaultsCtrl = require('../controllers/credentialDefaults.controller')
const payrollCtrl = require('../controllers/payroll.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Dynamic teaching-subject/curriculum catalog management. Must stay ahead of
// GET /assignments/:id-style param routes below — none of these paths
// collide, but kept together and near the top for discoverability.
router.get('/teaching-subjects', requirePermission('curricula.view'), subjectCtrl.listAll)
router.post('/teaching-subjects', requirePermission('curricula.manage'), subjectCtrl.create)
router.patch('/teaching-subjects/reorder', requirePermission('curricula.manage'), subjectCtrl.reorder)
router.patch('/teaching-subjects/:id', requirePermission('curricula.manage'), subjectCtrl.update)
router.patch('/teaching-subjects/:id/archive', requirePermission('curricula.manage'), subjectCtrl.archive)
router.patch('/teaching-subjects/:id/unarchive', requirePermission('curricula.manage'), subjectCtrl.unarchive)

// Dashboard + Reports
router.get('/stats', requirePermission('dashboard.view'), ctrl.getDashboardStats)
router.get('/reports', requirePermission('reports.view'), ctrl.getReports)

// Students
router.get('/students', requirePermission('students.view'), ctrl.getStudents)
router.post('/students', requirePermission('students.manage'), onboardingCtrl.createStudent)
router.get('/students/:id', requirePermission('students.view'), ctrl.getStudent)
router.patch('/students/:id', requirePermission('students.manage'), ctrl.updateStudent)
router.delete('/students/:id', requirePermission('students.manage'), ctrl.deleteStudent)
router.post('/students/:id/reset-password', requirePermission('students.manage'), ctrl.adminResetPassword)

// Academic records per student
router.get('/students/:studentId/academics', requirePermission('students.view'), ctrl.getStudentAcademics)

// Teachers
router.get('/teachers', requirePermission('teachers.view'), ctrl.getTeachers)
router.get('/teachers/:id', requirePermission('teachers.view'), ctrl.getTeacher)
router.post('/teachers', requirePermission('teachers.manage'), ctrl.createTeacher)
router.patch('/teachers/:id', requirePermission('teachers.manage'), ctrl.updateTeacher)
router.post('/teachers/:id/reset-password', requirePermission('teachers.manage'), ctrl.adminResetPassword)
router.post('/teachers/:id/sync-meeting-links', requirePermission('teachers.manage'), ctrl.adminSyncTeacherMeetingLinks)

// Teacher working hours (Phase 2 Part 1 — admin-configured weekly template;
// see config/workingHours.js)
router.get('/teachers/:id/working-hours', requirePermission('teachers.view'), onboardingCtrl.getTeacherWorkingHours)
router.put('/teachers/:id/working-hours', requirePermission('teachers.manage'), onboardingCtrl.updateTeacherWorkingHours)

// Add another student to an existing teacher from their administrative
// profile (Part 1 §7) — creates the student account + optional
// package/opening-balance subscription in one step.
router.post(
  '/teachers/:id/students',
  requirePermission('teachers.manage', 'students.manage'),
  onboardingCtrl.addStudentToTeacher
)

// "Create a teacher with their students" wizard (Part 1 §5) — one
// administrative flow: teacher account + profile + working hours, plus zero
// or more student accounts each with their own package/opening balance.
router.post(
  '/onboarding/teacher-with-students',
  requirePermission('teachers.manage', 'students.manage'),
  onboardingCtrl.createTeacherWithStudentsHandler
)

// Incremental, resumable onboarding session (Phase 2 Part 2c) — fixes the
// multi-student duplicate-suggestion/double-booking bug in the one-shot
// wizard above by persisting the teacher immediately and each student one at
// a time, so every subsequent student's availability check sees every
// already-saved sibling's real reservation. Additive: the one-shot endpoint
// above is untouched and remains fully supported.
const onboardingSessionPermission = requirePermission('teachers.manage', 'students.manage')
router.post('/onboarding/sessions', onboardingSessionPermission, onboardingSessionCtrl.startSession)
router.get('/onboarding/sessions', onboardingSessionPermission, onboardingSessionCtrl.listSessions)
router.get('/onboarding/sessions/:id', onboardingSessionPermission, onboardingSessionCtrl.getSession)
router.post('/onboarding/sessions/:id/students', onboardingSessionPermission, onboardingSessionCtrl.saveStudent)
router.delete('/onboarding/sessions/:id/students/:studentId', onboardingSessionPermission, onboardingSessionCtrl.removeStudent)
router.post('/onboarding/sessions/:id/finalize', onboardingSessionPermission, onboardingSessionCtrl.finalizeSession)
router.post('/onboarding/sessions/:id/cancel', onboardingSessionPermission, onboardingSessionCtrl.cancelSession)

// Teacher availability engine (Phase 2 Part 2 §4)
router.get('/teachers/:id/availability', requirePermission('teachers.view'), assignmentCtrl.getTeacherAvailability)

// Assignment-request workflow (Phase 2 Part 2 §6–§11)
router.post('/assignments/check-availability', requirePermission('assignments.view'), assignmentCtrl.checkAvailability)
router.get('/assignments', requirePermission('assignments.view'), assignmentCtrl.listAssignments)
router.post('/assignments', requirePermission('assignments.manage'), assignmentCtrl.createAssignment)
// Must stay ahead of GET /assignments/:id below — otherwise Express would
// match "status-counts" as the :id param.
router.get('/assignments/status-counts', requirePermission('assignments.view'), assignmentCtrl.getStatusCounts)
router.get('/assignments/:id', requirePermission('assignments.view'), assignmentCtrl.getAssignment)
router.patch('/assignments/:id/edit-resend', requirePermission('assignments.manage'), assignmentCtrl.editAndResend)
router.post('/assignments/:id/reassign', requirePermission('assignments.manage'), assignmentCtrl.reassign)
router.post('/assignments/:id/cancel', requirePermission('assignments.manage'), assignmentCtrl.cancelAssignment)

// Sessions (admin full control)
router.get('/sessions', requirePermission('sessions.view'), ctrl.getAllSessions)
router.post('/sessions', requirePermission('sessions.manage'), sessionCtrl.adminCreateSession)
router.patch('/sessions/:id', requirePermission('sessions.manage'), sessionCtrl.adminUpdateSession)
router.delete('/sessions/:id', requirePermission('sessions.manage'), sessionCtrl.adminDeleteSession)

// Academic overrides
router.patch('/evaluations/:id', requirePermission('sessions.manage'), ctrl.updateEvaluation)
router.delete('/evaluations/:id', requirePermission('sessions.manage'), ctrl.deleteEvaluation)
router.patch('/attendance/:id', requirePermission('sessions.manage'), ctrl.updateAttendanceRecord)
router.patch('/homework/:id', requirePermission('sessions.manage'), ctrl.updateHomework)

// Schedule rules — admin has full authority over any teacher's schedule
router.get('/schedule-rules', requirePermission('scheduleRules.view'), ctrl.getAllScheduleRules)
router.patch('/schedule-rules/:id', requirePermission('scheduleRules.manage'), ctrl.updateScheduleRule)
router.delete('/schedule-rules/:id', requirePermission('scheduleRules.manage'), ctrl.deleteScheduleRule)
router.post('/schedule-rules/:id/generate-more', requirePermission('scheduleRules.manage'), ctrl.generateMoreScheduleRule)

// Notifications
router.get('/notifications', requirePermission('notifications.view'), notifCtrl.getAdminNotificationLogs)
router.post('/notifications/broadcast', requirePermission('notifications.manage'), notifCtrl.broadcastNotification)
router.post('/notifications/individual', requirePermission('notifications.manage'), ctrl.sendIndividualNotification)

// Audit logs (stats before :id-like generic route to avoid conflicts)
router.get('/audit-logs/stats', requirePermission('audit.view'), auditCtrl.getAuditLogStats)
router.get('/audit-logs', requirePermission('audit.view'), auditCtrl.getAuditLogs)

// Payroll ledger browser — the persisted TeacherPayrollEntry artifact (see
// payrollLedger.service.js), not a live recount.
router.get('/payroll/ledger', requirePermission('reports.view'), perfCtrl.getAdminPayrollLedger)

// Hourly teacher payroll & financial adjustments (Phase 2 §6–§7)
router.get('/payroll/periods', requirePermission('payroll.view'), payrollCtrl.listOrgPeriods)
router.get('/payroll/periods/:periodId', requirePermission('payroll.view'), payrollCtrl.getPeriod)
router.get('/payroll/periods/:periodId/entries', requirePermission('payroll.view'), payrollCtrl.getPeriodEntries)
router.get('/payroll/teachers/:teacherId/periods', requirePermission('payroll.view'), payrollCtrl.listTeacherPeriods)
router.post('/payroll/periods/:periodId/submit', requirePermission('payroll.manage'), payrollCtrl.submitPeriod)
router.post('/payroll/periods/:periodId/approve', requirePermission('payroll.approve'), payrollCtrl.approvePeriod)
router.post('/payroll/periods/:periodId/pay', requirePermission('payroll.pay'), payrollCtrl.markPeriodPaid)
router.post('/payroll/periods/:periodId/reopen', requirePermission('payroll.manage'), payrollCtrl.reopenPeriod)
router.get('/payroll/adjustments', requirePermission('payroll.view'), payrollCtrl.listAdjustments)
router.post('/payroll/teachers/:teacherId/adjustments', requirePermission('payroll.manage'), payrollCtrl.createAdjustment)
router.post('/payroll/entries/:entryId/reverse', requirePermission('payroll.manage'), payrollCtrl.reverseAdjustment)

// Academy-wide default student/teacher passwords (Phase 2 meeting addendum §1)
router.get('/credential-defaults', requirePermission('credentials.manage_defaults'), credentialDefaultsCtrl.getStatus)
router.get('/credential-defaults/availability', credentialDefaultsCtrl.getAvailability)
router.put('/credential-defaults/:role', requirePermission('credentials.manage_defaults'), credentialDefaultsCtrl.setDefault)
router.post('/credential-defaults/:role', requirePermission('credentials.manage_defaults'), credentialDefaultsCtrl.setDefault)
router.delete('/credential-defaults/:role', requirePermission('credentials.manage_defaults'), credentialDefaultsCtrl.clearDefault)

module.exports = router
