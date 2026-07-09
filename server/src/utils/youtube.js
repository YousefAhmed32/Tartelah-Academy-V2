// Single source of truth for YouTube URL parsing/validation on the server.
// Mirrors client/src/utils/youtube.js so both layers agree on what counts
// as a valid intro-video URL — this file validates before persistence, the
// client copy parses for rendering. Real YouTube video IDs are always
// exactly 11 chars of [A-Za-z0-9_-]; anything else is rejected outright so
// a malformed/garbage value never reaches the database.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

const URL_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([^&\n?#]+)/,
  /youtube\.com\/embed\/([^&\n?#]+)/,
  /youtube\.com\/v\/([^&\n?#]+)/,
  /youtube\.com\/shorts\/([^&\n?#]+)/,
  /youtu\.be\/([^&\n?#]+)/,
]

function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  for (const pattern of URL_PATTERNS) {
    const match = url.match(pattern)
    if (match && YOUTUBE_ID_RE.test(match[1])) return match[1]
  }
  return null
}

// Empty/absent is valid (the field is optional) — only a non-empty value
// that fails to resolve to a real video ID is invalid.
function isValidYouTubeUrl(url) {
  if (!url) return true
  return !!extractYouTubeId(url)
}

module.exports = { extractYouTubeId, isValidYouTubeUrl }
