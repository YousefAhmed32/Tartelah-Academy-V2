const router = require('express').Router()
const ctrl = require('../controllers/website.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

// Public routes
router.get('/testimonials', ctrl.getTestimonials)
router.get('/faqs', ctrl.getFAQs)
router.get('/settings', ctrl.getSettings)
router.post('/contact', ctrl.submitContactForm)

// Admin-only routes
router.use(authenticate, isAdmin)
router.patch('/settings', ctrl.updateSettings)
router.post('/testimonials', ctrl.createTestimonial)
router.delete('/testimonials/:id', ctrl.deleteTestimonial)
router.post('/faqs', ctrl.createFAQ)
router.delete('/faqs/:id', ctrl.deleteFAQ)

// Contact messages management (stats before :id to avoid route conflict)
router.get('/contact-messages/stats', ctrl.getContactStats)
router.get('/contact-messages', ctrl.getContactMessages)
router.get('/contact-messages/:id', ctrl.getContactMessage)
router.patch('/contact-messages/:id', ctrl.updateContactMessage)
router.delete('/contact-messages/:id', ctrl.deleteContactMessage)

module.exports = router
