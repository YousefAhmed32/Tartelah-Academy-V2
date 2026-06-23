const router = require('express').Router()
const ctrl = require('../controllers/package.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

router.get('/', ctrl.getAll)
router.use(authenticate)
router.post('/', isAdmin, ctrl.create)
router.patch('/:id', isAdmin, ctrl.update)

module.exports = router
