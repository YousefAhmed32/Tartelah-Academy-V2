import { useAuthStore } from '../../store/authStore.js'
import AccessDeniedPage from './AccessDeniedPage.jsx'

// Route-level counterpart to Can.jsx — Can hides/disables a piece of UI,
// this gates an entire page. Closes the gap where a restricted admin-family
// user who types a URL directly (bypassing the Sidebar, which already hides
// the link) would previously get a rendered-but-broken page instead of a
// clear explanation, since nothing at the React Router level enforced
// permissions before this. Like Can, this is UX only — the real boundary is
// the matching requirePermission(...) middleware on the backend route.
export default function RequirePermission({ permission, any, all, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions } = useAuthStore()
  let allowed = true
  if (permission) allowed = allowed && hasPermission(permission)
  if (any) allowed = allowed && hasAnyPermission(any)
  if (all) allowed = allowed && hasAllPermissions(all)
  return allowed ? children : <AccessDeniedPage />
}
