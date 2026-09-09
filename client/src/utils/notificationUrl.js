// Defense-in-depth mirror of the backend's actionUrl validation
// (server/src/config/notificationDestinations.js#isSafeInternalActionUrl).
// The backend already refuses to persist anything unsafe, but a legacy
// document written before that guard existed, or a future producer bug,
// should still never make `navigate()` follow an external URL or a
// protocol scheme (`javascript:`, `data:`, etc.) — only a same-origin,
// client-routable relative path is ever navigated to.
export function isSafeInternalPath(url) {
  if (typeof url !== 'string' || !url) return false
  if (!url.startsWith('/') || url.startsWith('//')) return false
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(url)) return false
  return true
}
