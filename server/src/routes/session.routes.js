const router = require('express').Router()
const ctrl = require('../controllers/session.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/upcoming', ctrl.getUpcomingSessions)
router.get('/history', ctrl.getSessionHistory)
router.get('/teacher-month', isAdminOrTeacher, ctrl.getTeacherSessionsByMonth)
router.get('/:id', ctrl.getSession)
router.post('/', isAdminOrTeacher, ctrl.createSession)
router.patch('/:id/start', isAdminOrTeacher, ctrl.startSession)
router.patch('/:id/complete', isAdminOrTeacher, ctrl.completeSession)
router.patch('/:id/finish', isAdminOrTeacher, ctrl.finishSession)
router.patch('/:id/cancel', ctrl.cancelSession)
router.patch('/:id/reschedule', isAdminOrTeacher, ctrl.rescheduleSession)
router.patch('/:id/delay', isAdminOrTeacher, ctrl.reportDelay)
// Any authenticated participant (teacher or student on their own session) may
// record an "I opened the external meeting link" evidence event.
router.post('/:id/link-opened', ctrl.recordLinkOpened)

module.exports = router
