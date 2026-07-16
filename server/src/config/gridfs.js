const mongoose = require('mongoose')

// Single shared GridFSBucket for the whole app. Lazily created (not at
// require-time) because it needs an open connection's underlying `db`
// handle, and this module can be required before connectDB() resolves.
// Every image/file the platform stores — avatars, course thumbnails/covers,
// article covers, success-story images, the academy logo, homework
// attachments, payment proofs — lives in this one bucket (backing
// collections: `media.files` / `media.chunks`), never on local disk.
let bucket = null

function getBucket() {
  if (bucket) return bucket
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    throw new Error('GridFS bucket requested before MongoDB connection is ready')
  }
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' })
  return bucket
}

// Tests/scripts that reconnect to a different db need a fresh bucket bound
// to the new connection rather than a stale cached one.
function resetBucket() {
  bucket = null
}

module.exports = { getBucket, resetBucket }
