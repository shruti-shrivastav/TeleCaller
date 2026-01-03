import { useAuth } from '@/hooks/use-auth'
import { Navigate } from 'react-router-dom'

interface Props {
  children: React.ReactNode
}

export const ProtectedRoute = ({ children }: Props) => {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) return <Navigate to="/" replace />
  return <>{children}</>
}