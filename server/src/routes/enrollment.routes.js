const router = require('express').Router()
const ctrl = require('../controllers/enrollment.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission, authorize } = require('../middleware/rbac.middleware')
const { uploadPaymentProof, handleUploadError } = require('../middleware/upload.middleware')

// All routes require authentication
router.use(authenticate)

// Student routes
router.post('/', authorize('student'), ctrl.submitRequest)
router.get('/me', authorize('student'), ctrl.getMyRequests)
router.post('/:id/payment-proof', authorize('student'), uploadPaymentProof, handleUploadError, ctrl.uploadPaymentProof)

// Admin routes
router.get('/', requirePermission('enrollments.view'), ctrl.getAllRequests)
router.get('/pending-count', requirePermission('enrollments.view'), ctrl.getPendingCount)
router.get('/:id', requirePermission('enrollments.view'), ctrl.getRequest)
router.patch('/:id/review', requirePermission('enrollments.manage'), ctrl.reviewRequest)

module.exports = router
