const router = require('express').Router()
const ctrl = require('../controllers/wallet.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, requirePermission, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)

router.get('/me', authorize('student'), ctrl.getMyWallet)

// Admin, or a teacher assigned to this student (checked in the controller).
router.get('/:studentId', isAdminOrTeacher, ctrl.getStudentWallet)
router.get('/:studentId/transactions', isAdminOrTeacher, ctrl.getStudentTransactions)

router.post('/:studentId/adjust', requirePermission('subscriptions.manage'), ctrl.adjustWallet)
router.post('/:studentId/freeze', requirePermission('subscriptions.manage'), ctrl.freezeWallet)
router.post('/:studentId/resume', requirePermission('subscriptions.manage'), ctrl.resumeWallet)
router.post('/:studentId/transfer', requirePermission('subscriptions.manage'), ctrl.transferLessons)
router.post('/:studentId/compensation', requirePermission('subscriptions.manage'), ctrl.grantCompensation)
router.post('/:studentId/bonus', requirePermission('subscriptions.manage'), ctrl.grantBonus)

module.exports = router
