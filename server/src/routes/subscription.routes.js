const router = require('express').Router()
const ctrl = require('../controllers/subscription.controller')
const renewalCtrl = require('../controllers/renewal.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission, authorize } = require('../middleware/rbac.middleware')
const { uploadPaymentProof, handleUploadError } = require('../middleware/upload.middleware')

router.use(authenticate)
router.get('/me', authorize('student'), ctrl.getMySubscription)
router.get('/', requirePermission('subscriptions.view'), ctrl.getAllSubscriptions)
router.post('/', requirePermission('subscriptions.manage'), ctrl.createSubscription)
router.patch('/:id', requirePermission('subscriptions.manage'), ctrl.updateSubscription)
// Direct, instant admin-executed renewal — pre-existing, kept unchanged for
// backward compatibility. The full student-initiated review workflow below
// (Phase 2 §9) is the new, complete "request -> proof -> approve" path.
router.post('/:id/renew', requirePermission('subscriptions.manage'), ctrl.renewSubscription)

// Student-initiated renewal requests (Phase 2 §9) — mirrors /enrollments'
// submit -> proof -> review shape. Admin review lives under
// /admin/subscriptions/renewal-requests (see admin.routes.js).
router.post('/:id/renewal-requests', authorize('student'), renewalCtrl.submitRequest)
router.get('/renewal-requests/me', authorize('student'), renewalCtrl.getMyRequests)
router.post('/renewal-requests/:id/payment-proof', authorize('student'), uploadPaymentProof, handleUploadError, renewalCtrl.uploadPaymentProof)
router.post('/renewal-requests/:id/cancel', authorize('student'), renewalCtrl.cancelMyRequest)

module.exports = router
