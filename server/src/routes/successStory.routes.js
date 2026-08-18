const router = require('express').Router()
const ctrl = require('../controllers/successStory.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')
const { uploadSuccessStoryImage, handleUploadError } = require('../middleware/upload.middleware')

// Public
router.get('/', ctrl.getPublic)

// Admin — folds under content.* (see the "قصص النجاح" Sidebar entry, part
// of the "المحتوى" group).
router.use(authenticate)
router.get('/admin', requirePermission('content.view'), ctrl.getAdmin)
router.put('/admin', requirePermission('content.update'), ctrl.updateConfig)
router.post('/admin/cards/:role/image', requirePermission('content.update'), uploadSuccessStoryImage, handleUploadError, ctrl.uploadCardImage)
router.delete('/admin/cards/:role/image', requirePermission('content.update'), ctrl.removeCardImage)
router.post('/admin/banner/image', requirePermission('content.update'), uploadSuccessStoryImage, handleUploadError, ctrl.uploadBannerImage)
router.delete('/admin/banner/image', requirePermission('content.update'), ctrl.removeBannerImage)

module.exports = router
