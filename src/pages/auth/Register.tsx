import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { supabase } from "@/lib/supabase"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { useNavigate, Link } from "react-router-dom"
import { Loader2, User, Mail, Lock } from "lucide-react"

const registerSchema = z.object({
  full_name: z.string().min(3, "Nome muito curto"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
  confirm_password: z.string().min(6, "Confirme sua senha"),
}).refine((data) => data.password === data.confirm_password, {
  message: "As senhas não coincidem",
  path: ["confirm_password"],
})

type RegisterFormValues = z.infer<typeof registerSchema>

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterFormValues) => {
    setLoading(true)
    setError(null)
    
    try {
      // 1. Sign up user in Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.full_name,
            role: 'gerente',
            require_password_change: false,
            onboarding_completed: false
          }
        }
      })

      if (authError) throw authError
      if (!authData.user) throw new Error("Erro ao criar usuário")

      // 2. Ensure Profile is created with Gerente role
      // Note: Triggers usually handle this, but we reinforce it here if needed
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ 
          full_name: data.full_name,
          role: 'gerente',
          require_password_change: false,
          onboarding_completed: false,
          email: data.email
        })
        .eq('id', authData.user.id)

      if (profileError) {
        console.error("Erro ao atualizar perfil:", profileError)
      }
      
      navigate("/dashboard")
    } catch (err: any) {
      setError(err.message || "Erro ao realizar cadastro")
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout 
      title="Crie sua conta" 
      subtitle="Comece a gerenciar seu hospital com inteligência"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {error && (
          <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1">
            {error}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="full_name">
            Nome Completo
          </label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              {...register("full_name")}
              id="full_name"
              type="text"
              placeholder="Ex: João Silva"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
            />
          </div>
          {errors.full_name && (
            <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.full_name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="email">
            Seu E-mail Profissional
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
            <input
              {...register("email")}
              id="email"
              type="email"
              placeholder="nome@empresa.com"
              disabled={loading}
              className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
            />
          </div>
          {errors.email && (
            <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.email.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="password">
              Senha
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                {...register("password")}
                id="password"
                type="password"
                placeholder="••••••"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
              />
            </div>
            {errors.password && (
              <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/50 px-1" htmlFor="confirm_password">
              Confirmar
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
              <input
                {...register("confirm_password")}
                id="confirm_password"
                type="password"
                placeholder="••••••"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 pl-10 pr-4 text-sm text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all disabled:opacity-50"
              />
            </div>
            {errors.confirm_password && (
              <p className="text-[10px] text-destructive font-medium uppercase tracking-wider">{errors.confirm_password.message}</p>
            )}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-14 mt-4 relative flex items-center justify-center rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-[0_12px_24px_-8px_rgba(37,99,235,0.6)] active:scale-95 disabled:opacity-50"
        >
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            "CRIAR MINHA CONTA AGORA"
          )}
        </button>

        <p className="text-center text-xs text-white/40 pt-4">
          Já tem uma conta?{" "}
          <Link to="/login" className="text-blue-400 font-bold hover:text-blue-300 transition-colors">
            Acessar Sistema
          </Link>
        </p>
      </form>
    </AuthLayout>
  )
}
