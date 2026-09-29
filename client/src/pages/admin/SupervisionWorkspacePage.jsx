import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore.js'
import { ROUTES } from '../../config/constants.js'
import AdminSupervisionPage from './AdminSupervisionPage.jsx'

export default function SupervisionWorkspacePage({ team, position }) {
  const { user } = useAuthStore()
  const admin = user?.isPrimaryAdmin || user?.role === 'admin'
  if (!admin && (user?.supervisionTeam !== team || user?.supervisionPosition !== position)) return <Navigate to={ROUTES.ADMIN_SUPERVISION} replace />
  return <AdminSupervisionPage lockedTeam={team} workspacePosition={position} />
}
