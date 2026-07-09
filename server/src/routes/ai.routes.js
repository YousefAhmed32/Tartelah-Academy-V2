const router = require('express').Router()
const rateLimit = require('express-rate-limit')
const ctrl = require('../controllers/ai.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { aiChatSchema, aiFeedbackSchema } = require('../middleware/schemas')

// Public-facing endpoint gets its own tighter limiter — it's reachable by
// anonymous visitors and calls a paid external API per request.
const chatLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: process.env.NODE_ENV !== 'production' ? 200 : 20,
  message: { success: false, message: 'طلبات كثيرة جداً على المساعد الذكي، يرجى الانتظار قليلاً' },
  standardHeaders: true,
  legacyHeaders: false,
})

router.post('/ask', authenticate, ctrl.ask)
router.get('/status', authenticate, ctrl.getStatus)

router.post('/chat', chatLimiter, optionalAuth, validate(aiChatSchema), ctrl.chat)
router.post('/feedback', optionalAuth, validate(aiFeedbackSchema), ctrl.submitFeedback)

module.exports = router
