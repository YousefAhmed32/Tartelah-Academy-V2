const router = require('express').Router()
const ctrl = require('../controllers/successStory.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')
const { uploadSuccessStoryImage, handleUploadError } = require('../middleware/upload.middleware')

// Public
router.get('/', ctrl.getPublic)

// Admin
router.use(authenticate, isAdmin)
router.get('/admin', ctrl.getAdmin)
router.put('/admin', ctrl.updateConfig)
router.post('/admin/cards/:role/image', uploadSuccessStoryImage, handleUploadError, ctrl.uploadCardImage)
router.delete('/admin/cards/:role/image', ctrl.removeCardImage)
router.post('/admin/banner/image', uploadSuccessStoryImage, handleUploadError, ctrl.uploadBannerImage)
router.delete('/admin/banner/image', ctrl.removeBannerImage)

module.exports = router
