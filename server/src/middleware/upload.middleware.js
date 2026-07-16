const multer = require('multer')

// Every upload lands in memory as a Buffer (req.file.buffer /
// req.files[i].buffer) and is streamed straight into GridFS by the
// controller via media.service.uploadBuffer() — never written to local
// disk, so there's nothing here tied to a filesystem path, and nothing that
// needs to survive a redeploy on disk.
const storage = multer.memoryStorage()

function imageFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('نوع الملف غير مدعوم. يُسمح بـ JPG, PNG, WebP فقط'), false)
  }
}

function homeworkFileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf', 'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'video/mp4']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new Error('نوع الملف غير مدعوم. يُسمح بـ صور، PDF، صوت، فيديو'), false)
  }
}

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024
const MAX_HW_SIZE = 20 * 1024 * 1024

exports.uploadAvatar = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: MAX_SIZE } }).single('avatar')
exports.uploadPaymentProof = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: MAX_SIZE } }).single('paymentProof')
exports.uploadHomeworkFile = multer({ storage, fileFilter: homeworkFileFilter, limits: { fileSize: MAX_HW_SIZE, files: 3 } }).array('files', 3)
exports.uploadArticleCover = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } }).single('cover')
exports.uploadCourseThumbnail = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } }).single('thumbnail')
exports.uploadCourseCover = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } }).single('cover')
exports.uploadSuccessStoryImage = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 8 * 1024 * 1024 } }).single('image')
exports.uploadLogo = multer({ storage, fileFilter: imageFileFilter, limits: { fileSize: 4 * 1024 * 1024 } }).single('logo')

exports.handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, message: `حجم الملف يتجاوز الحد المسموح` })
    }
    return res.status(400).json({ success: false, message: err.message })
  }
  if (err) {
    return res.status(400).json({ success: false, message: err.message })
  }
  next()
}
