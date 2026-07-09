// Single source of truth for YouTube URL parsing on the client — both the
// admin course form and the public/student course detail page need to
// derive a video ID, a thumbnail, and a safe embed URL from the same
// admin-provided string, and previously duplicated this regex independently
// in both places. Mirrors server/src/utils/youtube.js so client-side
// validation and server-side persistence never disagree about what counts
// as a valid URL. Real YouTube video IDs are always exactly 11 chars of
// [A-Za-z0-9_-]; anything else is rejected so an untrusted string never
// reaches an <iframe src>.
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/

const URL_PATTERNS = [
  /youtube\.com\/watch\?(?:.*&)?v=([^&\n?#]+)/,
  /youtube\.com\/embed\/([^&\n?#]+)/,
  /youtube\.com\/v\/([^&\n?#]+)/,
  /youtube\.com\/shorts\/([^&\n?#]+)/,
  /youtu\.be\/([^&\n?#]+)/,
]

export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null
  for (const pattern of URL_PATTERNS) {
    const match = url.match(pattern)
    if (match && YOUTUBE_ID_RE.test(match[1])) return match[1]
  }
  return null
}

// Empty/absent is valid (the field is optional) — only a non-empty value
// that fails to resolve to a real video ID is invalid.
export function isValidYouTubeUrl(url) {
  if (!url) return true
  return !!extractYouTubeId(url)
}

export function youtubeThumbnail(url, quality = 'hqdefault') {
  const id = extractYouTubeId(url)
  return id ? `https://img.youtube.com/vi/${id}/${quality}.jpg` : null
}

// The always-available fallback thumbnail size — every uploaded YouTube
// video has this one, unlike maxresdefault which only exists for videos
// uploaded in HD. Used as an <img onError> fallback, not just a constant.
export function youtubeFallbackThumbnail(url) {
  return youtubeThumbnail(url, 'hqdefault')
}

// Never interpolate a raw admin-provided URL into an iframe src — this
// derives the embed URL only from a validated 11-char video ID.
export function youtubeEmbedUrl(url, { autoplay = false } = {}) {
  return youtubeEmbedUrlFromId(extractYouTubeId(url), { autoplay })
}

// For call sites that already hold a pre-extracted, validated ID (e.g. a
// modal component that received `videoId` as a prop) — still re-validates
// against the same ID pattern so a bad prop can never reach the iframe src.
export function youtubeEmbedUrlFromId(id, { autoplay = false } = {}) {
  if (!id || !YOUTUBE_ID_RE.test(id)) return null
  return `https://www.youtube.com/embed/${id}${autoplay ? '?autoplay=1' : ''}`
}
