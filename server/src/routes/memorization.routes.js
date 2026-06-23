const router = require('express').Router()
const ctrl = require('../controllers/memorization.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/student/me', authorize('student'), ctrl.getStudentMemorization)
router.get('/teacher', isAdminOrTeacher, ctrl.getTeacherMemorization)
router.post('/', isAdminOrTeacher, ctrl.createMemorization)

module.exports = router
