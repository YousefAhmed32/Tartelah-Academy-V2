const router = require('express').Router()
const ctrl = require('../controllers/website.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { requirePermission } = require('../middleware/rbac.middleware')
const { uploadLogo, handleUploadError } = require('../middleware/upload.middleware')

// Public routes
router.get('/testimonials', ctrl.getTestimonials)
router.get('/faqs', ctrl.getFAQs)
router.get('/settings', ctrl.getSettings)
router.post('/contact', ctrl.submitContactForm)
router.post('/newsletter', ctrl.subscribeNewsletter)

// Admin-only routes
router.use(authenticate)

// Site-wide settings — gated by settings.*, distinct from the content.*
// group below (testimonials/FAQ/contact messages), matching the separate
// "الإعدادات" vs "إدارة الموقع" Sidebar entries.
router.patch('/settings', requirePermission('settings.update'), ctrl.updateSettings)
router.post('/settings/logo', requirePermission('settings.update'), uploadLogo, handleUploadError, ctrl.uploadLogo)

router.post('/testimonials', requirePermission('content.create'), ctrl.createTestimonial)
router.delete('/testimonials/:id', requirePermission('content.delete'), ctrl.deleteTestimonial)
router.post('/faqs', requirePermission('content.create'), ctrl.createFAQ)
router.delete('/faqs/:id', requirePermission('content.delete'), ctrl.deleteFAQ)

// Contact messages management (stats before :id to avoid route conflict) —
// grouped under content.* since "رسائل التواصل" lives in the "المحتوى"
// Sidebar group.
router.get('/contact-messages/stats', requirePermission('content.view'), ctrl.getContactStats)
router.get('/contact-messages', requirePermission('content.view'), ctrl.getContactMessages)
router.get('/contact-messages/:id', requirePermission('content.view'), ctrl.getContactMessage)
router.patch('/contact-messages/:id', requirePermission('content.update'), ctrl.updateContactMessage)
router.delete('/contact-messages/:id', requirePermission('content.delete'), ctrl.deleteContactMessage)

module.exports = router
