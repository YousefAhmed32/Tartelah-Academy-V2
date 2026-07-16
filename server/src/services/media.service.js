const { Readable } = require('stream')
const mongoose = require('mongoose')
const { getBucket } = require('../config/gridfs')

// ── Magic-byte signatures ─────────────────────────────────────────────────────
// multer's fileFilter only ever sees the client-supplied `Content-Type`
// header, which is fully attacker-controlled. This checks the actual first
// bytes of the buffer against the mimetype it claims to be, so a renamed/
// relabeled malicious file is rejected before it ever reaches GridFS.
const SIGNATURES = {
  'image/jpeg': [[0xff, 0xd8, 0xff]],
  'image/jpg': [[0xff, 0xd8, 0xff]],
  'image/png': [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF' — WEBP marker checked separately at offset 8
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // '%PDF'
  'audio/mpeg': [[0x49, 0x44, 0x33], [0xff, 0xfb], [0xff, 0xf3], [0xff, 0xf2]],
  'audio/wav': [[0x52, 0x49, 0x46, 0x46]], // 'RIFF' — WAVE marker checked separately at offset 8
  'audio/ogg': [[0x4f, 0x67, 0x67, 0x53]], // 'OggS'
  'audio/mp4': [[0x66, 0x74, 0x79, 0x70]], // 'ftyp' at offset 4, checked separately
  'video/mp4': [[0x66, 0x74, 0x79, 0x70]], // 'ftyp' at offset 4, checked separately
}

function matchesSignature(buffer, sig) {
  if (buffer.length < sig.length) return false
  return sig.every((byte, i) => buffer[i] === byte)
}

function isValidMagicBytes(buffer, mimetype) {
  const sigs = SIGNATURES[mimetype]
  if (!sigs) return true // unknown mimetype (shouldn't happen — fileFilter already allow-listed it) — don't block
  const basicMatch = sigs.some((sig) => matchesSignature(buffer, sig))
  if (!basicMatch) return false

  // A few containers share the same leading bytes (RIFF, ftyp) and need a
  // second check further into the buffer to disambiguate.
  if (mimetype === 'image/webp') {
    return buffer.slice(8, 12).toString('ascii') === 'WEBP'
  }
  if (mimetype === 'audio/wav') {
    return buffer.slice(8, 12).toString('ascii') === 'WAVE'
  }
  if (mimetype === 'audio/mp4' || mimetype === 'video/mp4') {
    return buffer.slice(4, 8).toString('ascii') === 'ftyp'
  }
  return true
}

class InvalidFileError extends Error {
  constructor(message) {
    super(message)
    this.name = 'InvalidFileError'
    this.statusCode = 400
  }
}

// ── Upload ────────────────────────────────────────────────────────────────────
// metadata: { category, uploadedBy, private, allowedUserIds }
function uploadBuffer({ buffer, filename, mimetype, metadata = {} }) {
  return new Promise((resolve, reject) => {
    if (!isValidMagicBytes(buffer, mimetype)) {
      return reject(new InvalidFileError('محتوى الملف لا يطابق نوعه المعلن — تم رفض الرفع'))
    }
    const bucket = getBucket()
    const uploadStream = bucket.openUploadStream(filename, {
      contentType: mimetype,
      metadata: { ...metadata, size: buffer.length },
    })
    Readable.from(buffer)
      .pipe(uploadStream)
      .on('error', reject)
      .on('finish', () => resolve(uploadStream.id))
  })
}

// ── Delete ────────────────────────────────────────────────────────────────────
// Idempotent — deleting an id that's missing/already-gone/invalid is treated
// as success (this is what makes "replace image" and orphan-cleanup jobs safe
// to call without a pre-existence check).
async function deleteFile(id) {
  if (!id) return
  let oid
  try {
    oid = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  } catch {
    return
  }
  try {
    await getBucket().delete(oid)
  } catch (err) {
    if (!/file not found/i.test(err.message || '')) throw err
  }
}

// ── Lookup ────────────────────────────────────────────────────────────────────
async function findFile(id) {
  let oid
  try {
    oid = typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
  } catch {
    return null
  }
  const docs = await getBucket().find({ _id: oid }).toArray()
  return docs[0] || null
}

// ── Access control for private files ─────────────────────────────────────────
// admin sees everything; otherwise only the uploader or an explicitly
// allow-listed user (e.g. the homework's teacher) may view it.
function canAccess(file, user) {
  if (!file.metadata?.private) return true
  if (!user) return false
  if (user.role === 'admin') return true
  const uid = user._id.toString()
  if (file.metadata.uploadedBy && file.metadata.uploadedBy.toString() === uid) return true
  return (file.metadata.allowedUserIds || []).some((id) => id.toString() === uid)
}

module.exports = { uploadBuffer, deleteFile, findFile, canAccess, InvalidFileError, isValidMagicBytes }
