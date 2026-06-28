const router = require('express').Router()
const ctrl = require('../controllers/evaluation.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/student/me', authorize('student'), ctrl.getStudentEvaluations)
router.get('/teacher', isAdminOrTeacher, ctrl.getTeacherEvaluations)
router.post('/', isAdminOrTeacher, ctrl.create)
router.patch('/:id', isAdminOrTeacher, ctrl.updateEvaluation)
router.delete('/:id', isAdminOrTeacher, ctrl.deleteEvaluation)

module.exports = router
