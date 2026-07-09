const multer = require('multer')
const path = require('path')
const fs = require('fs')

const UPLOAD_BASE = process.env.UPLOAD_PATH || 'uploads/'

// Never trust the client-supplied filename's extension for what gets
// written to disk. `file.mimetype` is client-controlled too, but by the
// time `filename()` runs it has already passed a `fileFilter` allow-list —
// mapping *through* that same allow-list to a fixed extension is safe.
// Using `path.extname(file.originalname)` directly let an attacker upload
// e.g. `x.html` with a spoofed `image/png` mimetype and have it saved (and
// then served back, cross-origin, from the static /uploads route) as HTML.
const MIME_EXTENSIONS = {
  'image/jpeg': '.jpg',
  'image/jpg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
  'audio/mpeg': '.mp3',
  'audio/wav': '.wav',
  'audio/ogg': '.ogg',
  'audio/mp4': '.m4a',
  'video/mp4': '.mp4',
}

function safeExtension(mimetype) {
  return MIME_EXTENSIONS[mimetype] || ''
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

const avatarStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'avatars')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    cb(null, `avatar_${req.user._id}_${Date.now()}${safeExtension(file.mimetype)}`)
  },
})

const paymentProofStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'payment-proofs')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    cb(null, `proof_${req.user._id}_${Date.now()}${safeExtension(file.mimetype)}`)
  },
})

function imageFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('نوع الملف غير مدعوم. يُسمح بـ JPG, PNG, WebP فقط'), false)
  }
}

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024

exports.uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('avatar')

exports.uploadPaymentProof = multer({
  storage: paymentProofStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_SIZE },
}).single('paymentProof')

const homeworkStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'homework')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = safeExtension(file.mimetype)
    const base = path
      .basename(file.originalname, path.extname(file.originalname))
      .replace(/[^a-zA-Z0-9؀-ۿ]/g, '_')
      .slice(0, 40)
    cb(null, `hw_${req.user._id}_${Date.now()}_${base}${ext}`)
  },
})

function homeworkFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('نوع الملف غير مدعوم. يُسمح بـ صور، PDF، صوت، فيديو'), false)
  }
}

const MAX_HW_SIZE = 20 * 1024 * 1024

exports.uploadHomeworkFile = multer({
  storage: homeworkStorage,
  fileFilter: homeworkFileFilter,
  limits: { fileSize: MAX_HW_SIZE, files: 3 },
}).array('files', 3)

const articleCoverStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'articles')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    cb(null, `article_cover_${req.user._id}_${Date.now()}${safeExtension(file.mimetype)}`)
  },
})

exports.uploadArticleCover = multer({
  storage: articleCoverStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single('cover')

const courseImageStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'courses')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    const type = req.path.includes('cover') ? 'cover' : 'thumb'
    cb(null, `course_${type}_${req.params.id || 'new'}_${Date.now()}${safeExtension(file.mimetype)}`)
  },
})

exports.uploadCourseThumbnail = multer({
  storage: courseImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single('thumbnail')

exports.uploadCourseCover = multer({
  storage: courseImageStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single('cover')

const successStoryStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'success-stories')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    const slot = req.params.role || 'banner'
    cb(null, `story_${slot}_${Date.now()}${safeExtension(file.mimetype)}`)
  },
})

exports.uploadSuccessStoryImage = multer({
  storage: successStoryStorage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 8 * 1024 * 1024 },
}).single('image')

exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `حجم الملف يتجاوز الحد المسموح (${MAX_SIZE / 1024 / 1024} MB)` })
    }
    return res.status(400).json({ success: false, message: err.message })
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
  next()
}
