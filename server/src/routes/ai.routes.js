const router = require('express').Router()
const ctrl = require('../controllers/ai.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/ask', authenticate, ctrl.ask)
router.get('/status', authenticate, ctrl.getStatus)

module.exports = router
