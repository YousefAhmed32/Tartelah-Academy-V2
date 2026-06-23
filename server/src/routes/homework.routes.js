const router = require('express').Router()
const ctrl = require('../controllers/homework.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/', authorize('student'), ctrl.getStudentHomework)
router.get('/teacher', isAdminOrTeacher, ctrl.getTeacherHomework)
router.post('/', isAdminOrTeacher, ctrl.create)
router.post('/:id/submit', authorize('student'), ctrl.submit)

module.exports = router
