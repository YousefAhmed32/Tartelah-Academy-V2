const router = require('express').Router()
const ctrl = require('../controllers/teachingSubject.controller')

// Public, unauthenticated, active-only — needed by the public teacher
// directory's specialization filter and any pre-login form. Mirrors the
// existing teacher.routes.js convention of a public GET ahead of the
// authenticate() gate elsewhere in the app.
router.get('/', ctrl.listActive)

module.exports = router
