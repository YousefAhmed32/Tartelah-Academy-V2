const router = require('express').Router()
const ctrl = require('../controllers/article.controller')
const { authenticate, optionalAuth } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')
const { uploadArticleCover, handleUploadError } = require('../middleware/upload.middleware')

// ── Specific routes BEFORE parameterized /:slug ────────────────────────────────

router.get('/latest',          ctrl.getLatest)
router.get('/featured',        ctrl.getFeatured)
router.get('/search',          ctrl.searchArticles)
router.get('/categories',      ctrl.listCategories)

// Admin list (must be before /:slug)
router.get('/admin/all',       authenticate, isAdmin, ctrl.adminListAll)
router.get('/admin/:id',       authenticate, isAdmin, ctrl.adminGetById)

// Cover image upload
router.post('/upload-cover',   authenticate, isAdmin, uploadArticleCover, handleUploadError, ctrl.uploadCoverImage)

// Category management
router.post('/categories',     authenticate, isAdmin, ctrl.createCategory)
router.put('/categories/:id',  authenticate, isAdmin, ctrl.updateCategory)
router.delete('/categories/:id', authenticate, isAdmin, ctrl.deleteCategory)

// Admin article operations (use /admin/:id prefix for clarity)
router.post('/admin/:id/publish',    authenticate, isAdmin, ctrl.publishArticle)
router.post('/admin/:id/unpublish',  authenticate, isAdmin, ctrl.unpublishArticle)
router.post('/admin/:id/feature',    authenticate, isAdmin, ctrl.toggleFeature)
router.post('/admin/:id/pin',        authenticate, isAdmin, ctrl.togglePin)
router.post('/admin/:id/duplicate',  authenticate, isAdmin, ctrl.duplicateArticle)
router.delete('/admin/:id',          authenticate, isAdmin, ctrl.softDeleteArticle)
router.post('/admin/:id/restore',    authenticate, isAdmin, ctrl.restoreArticle)

// Admin CRUD
router.post('/',               authenticate, isAdmin, ctrl.createArticle)
router.put('/admin/:id/edit',  authenticate, isAdmin, ctrl.updateArticle)

// ── Public (parameterized last) ────────────────────────────────────────────────
router.get('/',                ctrl.listPublished)
router.get('/:slug',           optionalAuth, ctrl.getBySlug)
router.post('/:slug/like',     authenticate, ctrl.toggleLike)
router.post('/:slug/bookmark', authenticate, ctrl.toggleBookmark)

module.exports = router
