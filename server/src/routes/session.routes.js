const router = require('express').Router()
const ctrl = require('../controllers/session.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/upcoming', ctrl.getUpcomingSessions)
router.get('/history', ctrl.getSessionHistory)
router.post('/', isAdminOrTeacher, ctrl.createSession)
router.patch('/:id/complete', isAdminOrTeacher, ctrl.completeSession)
router.patch('/:id/cancel', ctrl.cancelSession)

module.exports = router
