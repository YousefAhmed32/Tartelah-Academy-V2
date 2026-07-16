const router = require('express').Router()
const ctrl = require('../controllers/media.controller')

// No route-level auth middleware here on purpose: public files (avatars,
// course/article images, logo, success stories) must be fetchable by plain
// <img> tags with zero auth overhead. Private files (payment proofs,
// homework attachments) are gated inside the controller via req.user, which
// server.js's global `optionalAuth` already populates when a valid token is
// present — no separate `authenticate` middleware needed on this route.
router.get('/:id', ctrl.getMedia)

module.exports = router
