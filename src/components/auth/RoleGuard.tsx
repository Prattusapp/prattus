import { useState, useEffect } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Loader2 } from "lucide-react"

interface RoleGuardProps {
  children: React.ReactNode
  allowedRoles: string[]
  fallbackPath?: string
}

export const RoleGuard = ({ children, allowedRoles, fallbackPath = "/dashboard" }: RoleGuardProps) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null)

  useEffect(() => {
    const checkRole = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          setIsAuthorized(false)
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single()

        if (profile && allowedRoles.includes(profile.role)) {
          setIsAuthorized(true)
        } else {
          setIsAuthorized(false)
        }
      } catch (error) {
        setIsAuthorized(false)
      }
    }

    checkRole()
  }, [allowedRoles])

  if (isAuthorized === null) {
    return (
      <div className="flex h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!isAuthorized) {
    // Redireciona o usuário para um caminho seguro caso não tenha acesso
    return <Navigate to={fallbackPath} replace />
  }

  return <>{children}</>
}
