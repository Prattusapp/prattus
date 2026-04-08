import React, { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { useNavigate } from "react-router-dom"

const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
})

type LoginFormValues = z.infer<typeof loginSchema>

export default function Login() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>("")
  const navigate = useNavigate()

  React.useEffect(() => {
    const fetchLogo = async () => {
      const { data } = await supabase.from('hospital_config').select('logo_url').single()
      if (data?.logo_url) setLogoUrl(data.logo_url)
    }
    fetchLogo()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginFormValues) => {
    setLoading(true)
    setError(null)
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      })

      if (error) throw error
      
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Erro ao fazer login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Bem-vindo de volta" 
      subtitle="Entre com suas credenciais para gerenciar as refeições"
      logoUrl={logoUrl}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-white/70" htmlFor="email">
            E-mail
          </label>
          <input
            {...register("email")}
            id="email"
            type="email"
            placeholder="nome@exemplo.com"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          {errors.email && (
            <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-white/70" htmlFor="password">
              Senha
            </label>
            <button type="button" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
              Esqueceu a senha?
            </button>
          </div>
          <input
            {...register("password")}
            id="password"
            type="password"
            placeholder="••••••••"
            disabled={loading}
            className="w-full h-11 rounded-xl bg-white/5 border border-white/10 px-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
          />
          {errors.password && (
            <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.password.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-11 relative flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-all shadow-[0_8px_16px_-4px_rgba(37,99,235,0.5)] active:scale-95 disabled:opacity-50 disabled:active:scale-100"
        >
          {loading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            "Entrar no Sistema"
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
