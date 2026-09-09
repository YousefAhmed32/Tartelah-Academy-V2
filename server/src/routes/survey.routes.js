const router = require('express').Router()
const ctrl = require('../controllers/survey.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { authorize, requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Student self-service.
router.get('/me/pending', authorize('student'), ctrl.getMyPending)
router.post('/me/:id/submit', authorize('student'), ctrl.submitMyResponse)
router.post('/me/:id/skip', authorize('student'), ctrl.skipMy)

// Admin — never a teacher-facing raw-response route (see models/Survey.js's privacy doc-comment).
router.get('/admin/all', requirePermission('surveys.view'), ctrl.getAll)
router.get('/admin/aggregate', requirePermission('surveys.view'), ctrl.getAggregate)
router.post('/admin/:id/followed-up', requirePermission('surveys.manage'), ctrl.markFollowedUp)

module.exports = router
