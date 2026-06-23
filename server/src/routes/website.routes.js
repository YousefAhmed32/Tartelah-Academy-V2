const router = require('express').Router()
const ctrl = require('../controllers/website.controller')
const { authenticate } = require('../middleware/auth.middleware')
const { isAdmin } = require('../middleware/rbac.middleware')

router.get('/testimonials', ctrl.getTestimonials)
router.get('/faqs', ctrl.getFAQs)
router.get('/settings', ctrl.getSettings)
router.use(authenticate, isAdmin)
router.post('/testimonials', ctrl.createTestimonial)
router.delete('/testimonials/:id', ctrl.deleteTestimonial)
router.post('/faqs', ctrl.createFAQ)
router.delete('/faqs/:id', ctrl.deleteFAQ)

module.exports = router
