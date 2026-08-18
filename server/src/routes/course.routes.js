const router = require('express').Router()
const ctrl = require('../controllers/course.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')
const { uploadCourseThumbnail, uploadCourseCover, handleUploadError } = require('../middleware/upload.middleware')

const viewCourses = [authenticate, requirePermission('courses.view')]
const manageCourses = [authenticate, requirePermission('courses.manage')]

// ── Specific admin routes before parameterized /:slug ─────────────────────────

router.get('/admin/stats',    ...viewCourses, ctrl.getAdminStats)
router.get('/admin/all',      ...viewCourses, ctrl.adminList)
router.get('/admin/:id',      ...viewCourses, ctrl.getById)

// Admin actions
router.post('/admin/:id/thumbnail',  ...manageCourses, uploadCourseThumbnail, handleUploadError, ctrl.uploadThumbnail)
router.post('/admin/:id/cover',      ...manageCourses, uploadCourseCover,    handleUploadError, ctrl.uploadCover)
router.post('/admin/:id/publish',    ...manageCourses, ctrl.togglePublish)
router.post('/admin/:id/feature',    ...manageCourses, ctrl.toggleFeature)
router.post('/admin/:id/duplicate',  ...manageCourses, ctrl.duplicate)
router.delete('/admin/:id',          ...manageCourses, ctrl.remove)
router.put('/admin/:id',             ...manageCourses, ctrl.update)

// Bulk actions
router.post('/bulk',    ...manageCourses, ctrl.bulkAction)

// Create
router.post('/',        ...manageCourses, ctrl.create)

// ── Public routes ─────────────────────────────────────────────────────────────

router.get('/featured', ctrl.getFeatured)
router.get('/',         ctrl.listPublished)
router.get('/:slug',    ctrl.getBySlug)

module.exports = router
