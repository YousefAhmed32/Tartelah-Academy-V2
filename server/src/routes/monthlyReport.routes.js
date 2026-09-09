const router = require('express').Router()
const ctrl = require('../controllers/monthlyReport.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher, requirePermission } = require('../middleware/rbac.middleware')

router.use(authenticate)

// Teacher self-service (ownership enforced in the controller/service layer).
router.get('/me', isAdminOrTeacher, ctrl.getMyReports)
router.get('/me/:id', isAdminOrTeacher, ctrl.getMyReport)
router.post('/me/:id/submit', isAdminOrTeacher, ctrl.submitMyReport)

// Admin.
router.get('/admin/all', requirePermission('monthlyReports.view'), ctrl.getAllReports)
router.get('/admin/:id', requirePermission('monthlyReports.view'), ctrl.getReport)
router.post('/admin/generate', requirePermission('monthlyReports.manage'), ctrl.generateOne)
router.post('/admin/generate-all', requirePermission('monthlyReports.manage'), ctrl.generateAll)
router.post('/admin/:id/request-completion', requirePermission('monthlyReports.manage'), ctrl.requestCompletion)
router.post('/admin/:id/reviewed', requirePermission('monthlyReports.manage'), ctrl.markReviewed)
router.post('/admin/:id/approve', requirePermission('monthlyReports.manage'), ctrl.approveReport)

module.exports = router
