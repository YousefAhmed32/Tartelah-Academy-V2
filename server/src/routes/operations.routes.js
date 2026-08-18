const router = require('express').Router()
const ctrl = require('../controllers/operations.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')

// Admin Operations Center — gated by operations.view for the whole module
// (monitoring dashboard + its one review-triage mutation).
router.use(authenticate, requirePermission('operations.view'))

router.get('/live', ctrl.getLiveSummary)
router.get('/timeline', ctrl.getTimeline)
router.get('/review-queue', ctrl.getReviewQueue)
router.patch('/review/:sessionId', ctrl.actOnReview)

module.exports = router
