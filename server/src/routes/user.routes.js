const router = require('express').Router()
const { updateMe, uploadAvatar } = require('../controllers/user.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { uploadAvatar: multerAvatar, handleUploadError } = require('../middleware/upload.middleware')

router.patch('/me', authenticate, updateMe)
router.post('/me/avatar', authenticate, multerAvatar, handleUploadError, uploadAvatar)

module.exports = router
