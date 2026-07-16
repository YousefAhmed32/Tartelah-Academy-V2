const mongoose = require('mongoose')
const { getBucket } = require('../config/gridfs')
const { findFile, canAccess } = require('../services/media.service')

// Unified media endpoint — every uploaded image/file in the platform
// (avatars, course thumbnails/covers, article covers, success-story images,
// the academy logo, homework attachments, payment proofs, and any future
// upload) is served from here. Public files stream unauthenticated; files
// tagged `metadata.private` require req.user (already populated by the
// global optionalAuth chain in server.js) to be the uploader, an
// admin, or explicitly allow-listed.
exports.getMedia = async (req, res, next) => {
  try {
    const { id } = req.params
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'معرّف ملف غير صالح' })
    }

    const file = await findFile(id)
    if (!file) {
      return res.status(404).json({ success: false, message: 'الملف غير موجود' })
    }

    if (!canAccess(file, req.user)) {
      return res.status(req.user ? 403 : 401).json({ success: false, message: 'غير مصرح بالوصول إلى هذا الملف' })
    }

    const etag = `"${file._id}-${file.length}"`
    res.set('ETag', etag)
    res.set('Accept-Ranges', 'bytes')
    res.set('Content-Type', file.contentType || 'application/octet-stream')

    // GridFS ids are immutable — a "replace" always writes a brand new _id,
    // so any given id's bytes never change. Public files can be cached
    // forever; private ones must always revalidate with the server (never
    // shared/CDN-cached).
    res.set('Cache-Control', file.metadata?.private
      ? 'private, no-cache, must-revalidate'
      : 'public, max-age=31536000, immutable')

    if (req.headers['if-none-match'] === etag) {
      return res.status(304).end()
    }

    const range = req.headers.range
    const bucket = getBucket()

    if (range) {
      const match = /bytes=(\d*)-(\d*)/.exec(range)
      const start = match[1] ? parseInt(match[1], 10) : 0
      const end = match[2] ? parseInt(match[2], 10) : file.length - 1
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || end >= file.length) {
        res.set('Content-Range', `bytes */${file.length}`)
        return res.status(416).end()
      }
      res.status(206)
      res.set('Content-Range', `bytes ${start}-${end}/${file.length}`)
      res.set('Content-Length', end - start + 1)
      return bucket.openDownloadStream(file._id, { start, end: end + 1 })
        .on('error', next)
        .pipe(res)
    }

    res.set('Content-Length', file.length)
    bucket.openDownloadStream(file._id).on('error', next).pipe(res)
  } catch (err) {
    next(err)
  }
}
