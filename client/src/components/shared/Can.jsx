import { useAuthStore } from '../../store/authStore.js'

// Frontend permission guard — hides/disables UI only. This is NEVER the
// real security boundary: every sensitive route this hides is independently
// re-checked by requirePermission()/requirePrimaryAdmin() on the backend
// (server/src/middleware/rbac.middleware.js), which returns 403 regardless
// of what this component rendered.
//
// Usage:
//   <Can permission="users.create">...</Can>
//   <Can any={['users.update', 'users.disable']}>...</Can>
//   <Can all={['permissions.assign']} fallback={<p>لا تملك صلاحية</p>}>...</Can>
export default function Can({ permission, any, all, primaryAdmin, fallback = null, children }) {
  const { hasPermission, hasAnyPermission, hasAllPermissions, isPrimaryAdmin } = useAuthStore()

  let allowed = true
  if (primaryAdmin) allowed = allowed && isPrimaryAdmin()
  if (permission) allowed = allowed && hasPermission(permission)
  if (any) allowed = allowed && hasAnyPermission(any)
  if (all) allowed = allowed && hasAllPermissions(all)

  return allowed ? children : fallback
}
