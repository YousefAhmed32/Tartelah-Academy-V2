const router = require('express').Router()
const ctrl = require('../controllers/wallet.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin, isAdminOrTeacher, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)

router.get('/me', authorize('student'), ctrl.getMyWallet)

// Admin, or a teacher assigned to this student (checked in the controller).
router.get('/:studentId', isAdminOrTeacher, ctrl.getStudentWallet)
router.get('/:studentId/transactions', isAdminOrTeacher, ctrl.getStudentTransactions)

router.post('/:studentId/adjust', isAdmin, ctrl.adjustWallet)
router.post('/:studentId/freeze', isAdmin, ctrl.freezeWallet)
router.post('/:studentId/resume', isAdmin, ctrl.resumeWallet)
router.post('/:studentId/transfer', isAdmin, ctrl.transferLessons)
router.post('/:studentId/compensation', isAdmin, ctrl.grantCompensation)

module.exports = router
