const router = require('express').Router()
const auth = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { validate } = require('../middleware/validate.middleware')
const { registerSchema, loginSchema, forgotPasswordSchema, resetPasswordSchema, changePasswordSchema } = require('../middleware/schemas')

router.post('/register', validate(registerSchema), auth.register)
router.post('/login', validate(loginSchema), auth.login)
router.post('/logout', auth.logout)
router.post('/refresh', auth.refresh)
router.post('/forgot-password', validate(forgotPasswordSchema), auth.forgotPassword)
router.post('/reset-password', validate(resetPasswordSchema), auth.resetPassword)
router.patch('/change-password', authenticate, validate(changePasswordSchema), auth.changePassword)
router.get('/me', authenticate, auth.me)

// Development only — automatically disabled in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', auth.devLogin)
}

module.exports = router
