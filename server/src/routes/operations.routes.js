const router = require('express').Router()
const ctrl = require('../controllers/operations.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

// Admin Operations Center — entirely admin-only, mirrors the guard already
// used for every other admin-only surface (admin.routes.js, the
// teacher-performance admin.* routes).
router.use(authenticate, isAdmin)

router.get('/live', ctrl.getLiveSummary)
router.get('/timeline', ctrl.getTimeline)
router.get('/review-queue', ctrl.getReviewQueue)
router.patch('/review/:sessionId', ctrl.actOnReview)

module.exports = router
