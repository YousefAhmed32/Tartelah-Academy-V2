const router = require('express').Router()
const ctrl = require('../controllers/subscription.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin, authorize } = require('../middleware/rbac.middleware')

router.use(authenticate)
router.get('/me', authorize('student'), ctrl.getMySubscription)
router.get('/', isAdmin, ctrl.getAllSubscriptions)
router.post('/', isAdmin, ctrl.createSubscription)
router.patch('/:id', isAdmin, ctrl.updateSubscription)

module.exports = router
