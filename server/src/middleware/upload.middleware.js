const multer = require('multer')
const path = require('path')
const fs = require('fs')

const UPLOAD_BASE = process.env.UPLOAD_PATH || 'uploads/'

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
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `avatar_${req.user._id}_${Date.now()}${ext}`)
  },
})

const paymentProofStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dir = path.join(UPLOAD_BASE, 'payment-proofs')
    ensureDir(dir)
    cb(null, dir)
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `proof_${req.user._id}_${Date.now()}${ext}`)
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
