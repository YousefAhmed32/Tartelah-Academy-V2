const router = require('express').Router()
const ctrl = require('../controllers/course.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')
const { uploadCourseThumbnail, uploadCourseCover, handleUploadError } = require('../middleware/upload.middleware')

// ── Specific admin routes before parameterized /:slug ─────────────────────────

router.get('/admin/stats',    authenticate, isAdmin, ctrl.getAdminStats)
router.get('/admin/all',      authenticate, isAdmin, ctrl.adminList)
router.get('/admin/:id',      authenticate, isAdmin, ctrl.getById)

// Admin actions
router.post('/admin/:id/thumbnail',  authenticate, isAdmin, uploadCourseThumbnail, handleUploadError, ctrl.uploadThumbnail)
router.post('/admin/:id/cover',      authenticate, isAdmin, uploadCourseCover,    handleUploadError, ctrl.uploadCover)
router.post('/admin/:id/publish',    authenticate, isAdmin, ctrl.togglePublish)
router.post('/admin/:id/feature',    authenticate, isAdmin, ctrl.toggleFeature)
router.post('/admin/:id/duplicate',  authenticate, isAdmin, ctrl.duplicate)
router.delete('/admin/:id',          authenticate, isAdmin, ctrl.remove)
router.put('/admin/:id',             authenticate, isAdmin, ctrl.update)

// Bulk actions
router.post('/bulk',    authenticate, isAdmin, ctrl.bulkAction)

// Create
router.post('/',        authenticate, isAdmin, ctrl.create)

// ── Public routes ─────────────────────────────────────────────────────────────

router.get('/featured', ctrl.getFeatured)
router.get('/',         ctrl.listPublished)
router.get('/:slug',    ctrl.getBySlug)

module.exports = router
