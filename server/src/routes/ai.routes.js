const router = require('express').Router()
const { ask } = require('../controllers/ai.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/ask', authenticate, ask)

module.exports = router
