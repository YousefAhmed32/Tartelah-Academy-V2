const router = require('express').Router()
const auth = require('../controllers/auth.controller')
const { authenticate } = require('../middleware/auth.middleware')

router.post('/register', auth.register)
router.post('/login', auth.login)
router.post('/logout', auth.logout)
router.post('/refresh', auth.refresh)
router.post('/forgot-password', auth.forgotPassword)
router.post('/reset-password', auth.resetPassword)
router.patch('/change-password', authenticate, auth.changePassword)
router.get('/me', authenticate, auth.me)

// Development only — automatically disabled in production
if (process.env.NODE_ENV !== 'production') {
  router.post('/dev-login', auth.devLogin)
}

module.exports = router
