const router = require('express').Router()
const ctrl = require('../controllers/teacher.controller')
const sessionCtrl = require('../controllers/session.controller')
const assignmentCtrl = require('../controllers/teacherAssignment.controller')
const payrollCtrl = require('../controllers/payroll.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

// ── Public directory (must stay ahead of the authenticate() gate below) ──────
router.get('/public', ctrl.getPublicTeachers)
router.get('/public/:id', ctrl.getPublicTeacher)

router.use(authenticate, isAdminOrTeacher)
router.get('/me/stats', ctrl.getMyStats)
router.get('/me/students', ctrl.getMyStudents)
router.get('/me/students/:studentId', ctrl.getMyStudentDetail)
router.get('/me/sessions', sessionCtrl.getTeacherSessions)
router.get('/me/links', ctrl.getMyLinks)
router.post('/me/links', ctrl.addLink)
router.delete('/me/links/:linkId', ctrl.removeLink)
router.post('/me/sync-meeting-links', ctrl.syncMeetingLinks)

// "طلبات الطلاب" inbox (Phase 2 Part 2 §10) — assignment requests awaiting
// this teacher's response. Note: this router is also mounted for
// role:'admin' (isAdminOrTeacher above), but an admin has no meaningful
// assignment requests of their own — these routes are teacher-oriented by
// convention, matching every other /me/* route in this file.
router.get('/me/assignment-requests', assignmentCtrl.listMyAssignmentRequests)
router.get('/me/assignment-requests/:id', assignmentCtrl.getMyAssignmentRequest)
// Teacher-owned availability for the "propose alternative time" picker —
// ownership enforced by scoping to this teacher's own request, never the
// general admin availability endpoint. Must stay ahead of nothing in
// particular here (no conflicting :id/:action pattern), but kept next to its
// sibling routes for discoverability.
router.get('/me/assignment-requests/:id/availability', assignmentCtrl.getMyAssignmentRequestAvailability)
router.patch('/me/assignment-requests/:id/respond', assignmentCtrl.respond)

// Self-service hourly payroll (Phase 2 §6) — a teacher may only ever read
// their OWN periods/entries (enforced in payroll.controller.js's
// assertOwnsPeriod), never approve/pay/reopen anything themselves.
router.get('/me/payroll/current', payrollCtrl.getMyCurrentPeriod)
router.get('/me/payroll/periods', payrollCtrl.listTeacherPeriods)
router.get('/me/payroll/periods/:periodId', payrollCtrl.getPeriod)
router.get('/me/payroll/periods/:periodId/entries', payrollCtrl.getPeriodEntries)

module.exports = router
