import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { AccessDenied } from '../components/shared/AccessDenied'
import { isModuleEnabled, moduleLabelFa } from '../kernel/moduleRegistry'

export const ProtectedRoute = ({ isAuthenticated }) => {
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <Outlet />
}

export const ModuleRouteGuard = ({ session, moduleId, children }) => {
  if (isModuleEnabled(session?.modules, moduleId)) {
    return children
  }

  return <AccessDenied message={`ماژول ${moduleLabelFa(moduleId, session?.modules)} غیرفعال است.`} />
}

export const CapabilityRouteGuard = ({ session, capability, children }) => {
  if (!capability || Boolean(session?.capabilities?.[capability])) {
    return children
  }

  return <AccessDenied message="دسترسی کافی وجود ندارد." />
}

export const OwnerRouteGuard = ({ session, children }) => {
  if (session?.capabilities?.canManageSystemSettings) {
    return children
  }

  return <Navigate to="/" replace />
}

