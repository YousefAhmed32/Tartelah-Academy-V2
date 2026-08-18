const router = require('express').Router()
const ctrl = require('../controllers/article.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')
const { uploadArticleCover, handleUploadError } = require('../middleware/upload.middleware')

const viewContent = [authenticate, requirePermission('content.view')]

// ── Specific routes BEFORE parameterized /:slug ────────────────────────────────

router.get('/latest',          ctrl.getLatest)
router.get('/featured',        ctrl.getFeatured)
router.get('/search',          ctrl.searchArticles)
router.get('/categories',      ctrl.listCategories)

// Admin list (must be before /:slug)
router.get('/admin/all',       ...viewContent, ctrl.adminListAll)
router.get('/admin/:id',       ...viewContent, ctrl.adminGetById)

// Cover image upload
router.post('/upload-cover',   authenticate, requirePermission('content.create'), uploadArticleCover, handleUploadError, ctrl.uploadCoverImage)

// Category management
router.post('/categories',     authenticate, requirePermission('content.create'), ctrl.createCategory)
router.put('/categories/:id',  authenticate, requirePermission('content.update'), ctrl.updateCategory)
router.delete('/categories/:id', authenticate, requirePermission('content.delete'), ctrl.deleteCategory)

// Admin article operations (use /admin/:id prefix for clarity)
router.post('/admin/:id/publish',    authenticate, requirePermission('content.publish'), ctrl.publishArticle)
router.post('/admin/:id/unpublish',  authenticate, requirePermission('content.publish'), ctrl.unpublishArticle)
router.post('/admin/:id/feature',    authenticate, requirePermission('content.update'), ctrl.toggleFeature)
router.post('/admin/:id/pin',        authenticate, requirePermission('content.update'), ctrl.togglePin)
router.post('/admin/:id/duplicate',  authenticate, requirePermission('content.create'), ctrl.duplicateArticle)
router.delete('/admin/:id',          authenticate, requirePermission('content.delete'), ctrl.softDeleteArticle)
router.post('/admin/:id/restore',    authenticate, requirePermission('content.delete'), ctrl.restoreArticle)

// Admin CRUD
router.post('/',               authenticate, requirePermission('content.create'), ctrl.createArticle)
router.put('/admin/:id/edit',  authenticate, requirePermission('content.update'), ctrl.updateArticle)

// ── Public (parameterized last) ────────────────────────────────────────────────
router.get('/',                ctrl.listPublished)
router.get('/:slug',           optionalAuth, ctrl.getBySlug)
router.post('/:slug/like',     authenticate, ctrl.toggleLike)
router.post('/:slug/bookmark', authenticate, ctrl.toggleBookmark)

module.exports = router
