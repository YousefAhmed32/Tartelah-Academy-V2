const router = require('express').Router()
const ctrl = require('../controllers/student.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { authorize } = require('../middleware/rbac.middleware')
const startFollowup = require('../controllers/studentStartFollowup.controller')

router.use(authenticate)
router.get('/me/stats', authorize('student'), ctrl.getMyStats)
router.get('/me/first-lesson-feedback', authorize('student'), startFollowup.myFeedback)
router.post('/me/first-lesson-feedback', authorize('student'), startFollowup.submitFeedback)
router.get('/me/academic', authorize('student'), ctrl.getMyAcademic)

module.exports = router
