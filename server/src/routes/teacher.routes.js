const router = require('express').Router()
const ctrl = require('../controllers/teacher.controller')
const sessionCtrl = require('../controllers/session.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate, isAdminOrTeacher)
router.get('/me/stats', ctrl.getMyStats)
router.get('/me/students', ctrl.getMyStudents)
router.get('/me/sessions', sessionCtrl.getTeacherSessions)
router.get('/me/links', ctrl.getMyLinks)
router.post('/me/links', ctrl.addLink)
router.delete('/me/links/:linkId', ctrl.removeLink)

module.exports = router
