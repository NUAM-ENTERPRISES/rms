import { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '@/app/hooks'
import { toast } from 'sonner'
import LoadingScreen from '@/components/atoms/LoadingScreen'

interface ProtectedRouteProps {
  children: ReactNode
  roles?: string[]
  permissions?: string[]
}

export default function ProtectedRoute({ 
  children, 
  roles, 
  permissions 
}: ProtectedRouteProps) {
  const location = useLocation()
  const { status, user } = useAppSelector((state) => state.auth)

  // Show loading while bootstrapping
  if (status === 'loading') {
    return <LoadingScreen />
  }

  // Redirect to login if not authenticated
  if (status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?next=${next}`} replace />
  }

  // Check role requirements
  if (roles && roles.length > 0 && user) {
    const hasRequiredRole = roles.some(role => user.roles.includes(role))
    if (!hasRequiredRole) {
      toast.error('Insufficient permissions to access this page')
      return <Navigate to="/dashboard" replace />
    }
  }

  // Check permission requirements
  if (permissions && permissions.length > 0 && user) {
    const hasRequiredPermission = permissions.some(permission => 
      user.permissions.includes(permission) || user.permissions.includes('*')
    )
    if (!hasRequiredPermission) {
      toast.error('Insufficient permissions to access this page')
      return <Navigate to="/dashboard" replace />
    }
  }

  // User is authenticated and has required permissions
  return <>{children}</>
}
