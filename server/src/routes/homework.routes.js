const router = require('express').Router()
const ctrl = require('../controllers/homework.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, authorize } = require('../middleware/rbac.middleware')
const { validate } = require('../middleware/validate.middleware')
const { createHomeworkSchema } = require('../middleware/schemas')
const { uploadHomeworkFile, handleUploadError } = require('../middleware/upload.middleware')

router.use(authenticate)
router.get('/', authorize('student'), ctrl.getStudentHomework)
router.get('/teacher', isAdminOrTeacher, ctrl.getTeacherHomework)
router.post('/', isAdminOrTeacher, validate(createHomeworkSchema), ctrl.create)
router.patch('/:id/grade', isAdminOrTeacher, ctrl.gradeSubmission)
router.post('/:id/submit', authorize('student'), uploadHomeworkFile, handleUploadError, ctrl.submit)

module.exports = router
