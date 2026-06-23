const router = require('express').Router()
const ctrl = require('../controllers/student.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/me/stats', authorize('student'), ctrl.getMyStats)
router.get('/me/academic', authorize('student'), ctrl.getMyAcademic)

module.exports = router
