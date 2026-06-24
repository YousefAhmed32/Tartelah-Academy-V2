const router = require('express').Router()
const ctrl = require('../controllers/attendance.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate, isAdminOrTeacher)
router.get('/teacher', ctrl.getTeacherAttendance)
router.get('/session/:sessionId', ctrl.getSessionAttendance)
router.post('/session/:sessionId', ctrl.saveSessionAttendance)
router.patch('/:id', ctrl.updateAttendance)

module.exports = router
