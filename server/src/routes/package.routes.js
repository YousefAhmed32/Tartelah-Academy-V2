const router = require('express').Router()
const ctrl = require('../controllers/package.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')

router.get('/', ctrl.getAll)
router.use(authenticate)
router.get('/admin/all', requirePermission('packages.view'), ctrl.getAllAdmin)
router.post('/', requirePermission('packages.manage'), ctrl.create)
router.patch('/:id', requirePermission('packages.manage'), ctrl.update)
router.delete('/:id', requirePermission('packages.manage'), ctrl.deletePackage)

module.exports = router
