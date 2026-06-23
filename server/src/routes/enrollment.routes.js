const router = require('express').Router()
const ctrl = require('../controllers/enrollment.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin, authorize } = require('../middleware/rbac.middleware')
const { uploadPaymentProof, handleUploadError } = require('../middleware/upload.middleware')

// All routes require authentication
router.use(authenticate)

// Student routes
router.post('/', authorize('student'), ctrl.submitRequest)
router.get('/me', authorize('student'), ctrl.getMyRequests)
router.post('/:id/payment-proof', authorize('student'), uploadPaymentProof, handleUploadError, ctrl.uploadPaymentProof)

// Admin routes
router.get('/', isAdmin, ctrl.getAllRequests)
router.get('/pending-count', isAdmin, ctrl.getPendingCount)
router.get('/:id', isAdmin, ctrl.getRequest)
router.patch('/:id/review', isAdmin, ctrl.reviewRequest)

module.exports = router
