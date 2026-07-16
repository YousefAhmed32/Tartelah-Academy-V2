// Single source of truth for turning a GridFS file _id into the public URL
// path the frontend consumes. Deliberately returns a server-root-relative
// path (not an absolute URL) — the client's getFileUrl() prepends whatever
// BACKEND_URL it's currently configured with, so nothing here ever bakes in
// a domain, and changing domains later requires no DB migration (the DB only
// ever stores the bare ObjectId).
function mediaUrl(id) {
  if (!id) return null
  return `/api/v1/media/${id}`
}

// Accepts either a bare ObjectId/hex string or a previously-computed
// "/api/v1/media/<id>" path and returns just the hex id, or null. Lets
// write-endpoints that used to accept a raw uploaded-file URL keep accepting
// the same shape without every frontend call site needing to change.
const OBJECT_ID_RE = /^[a-f0-9]{24}$/i

function extractMediaId(value) {
  if (!value) return null
  if (typeof value !== 'string') return value // already an ObjectId instance
  const match = value.match(/\/media\/([a-f0-9]{24})(?:[/?#]|$)/i)
  if (match) return match[1]
  return OBJECT_ID_RE.test(value) ? value : null
}

module.exports = { mediaUrl, extractMediaId }
