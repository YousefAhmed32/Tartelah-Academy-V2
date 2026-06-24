const router = require('express').Router()
const ctrl = require('../controllers/scheduleRule.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdminOrTeacher } = require('../middleware/rbac.middleware')

router.use(authenticate, isAdminOrTeacher)

router.post('/preview', ctrl.previewRule)
router.post('/', ctrl.createRule)
router.get('/my', ctrl.getMyRules)
router.get('/:id', ctrl.getRule)
router.patch('/:id', ctrl.updateRule)
router.post('/:id/generate-more', ctrl.generateMore)

module.exports = router
