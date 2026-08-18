const router = require('express').Router()
const ctrl = require('../controllers/subscription.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/me', authorize('student'), ctrl.getMySubscription)
router.get('/', requirePermission('subscriptions.view'), ctrl.getAllSubscriptions)
router.post('/', requirePermission('subscriptions.manage'), ctrl.createSubscription)
router.patch('/:id', requirePermission('subscriptions.manage'), ctrl.updateSubscription)
router.post('/:id/renew', requirePermission('subscriptions.manage'), ctrl.renewSubscription)

module.exports = router
