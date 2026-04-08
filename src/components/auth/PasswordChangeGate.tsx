import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, ShieldAlert, Key, CheckCircle2 } from "lucide-react"

export function PasswordChangeGate({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    checkStatus()
  }, [])

  const checkStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      setUserId(user.id)
      const { data: profile } = await supabase
        .from('profiles')
        .select('require_password_change')
        .eq('id', user.id)
        .single()
      
      if (profile?.require_password_change) {
        setOpen(true)
      }
    }
  }

  const handleUpdate = async () => {
    if (password.length < 6) {
      setError("A senha deve ter pelo menos 6 caracteres.")
      return
    }
    if (password !== confirmPassword) {
      setError("As senhas não coincidem.")
      return
    }

    setLoading(true)
    setError("")
    
    try {
      // 1. Atualizar a senha no sistema de Auth do Supabase
      const { error: authError } = await supabase.auth.updateUser({ password: password })
      if (authError) throw authError

      // 2. Atualizar a flag no perfil para não pedir mais a troca
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ require_password_change: false })
        .eq('id', userId)
      
      if (profileError) throw profileError

      setSuccess(true)
      setTimeout(() => {
        setOpen(false)
        window.location.reload() // Recarrega para limpar qualquer cache de permissão
      }, 2000)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {children}
      
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden relative">
            <div className="items-center text-center p-6 pb-2">
              <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                <ShieldAlert className="h-8 w-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-black text-slate-900">Primeiro Acesso Seguro</h2>
              <p className="text-slate-500 mt-2 text-sm">
                Para sua segurança, você precisa definir uma senha pessoal e permanente antes de começar a usar o Prattus.
              </p>
            </div>

            {!success ? (
              <div className="space-y-6 py-6 px-6">
                {error && (
                  <div className="bg-rose-50 text-rose-600 p-3 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-100">
                    <ShieldAlert className="h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-500 px-1">Nova Senha Pessoal</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 rounded-xl h-12 bg-slate-50 focus:bg-white transition-all border-slate-200"
                      placeholder="Mínimo 6 caracteres"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="font-bold text-xs uppercase tracking-widest text-slate-500 px-1">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input 
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10 rounded-xl h-12 bg-slate-50 focus:bg-white transition-all border-slate-200"
                      placeholder="Repita sua senha"
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleUpdate} 
                  disabled={loading}
                  className="w-full rounded-2xl h-12 bg-blue-600 hover:bg-blue-500 font-black shadow-lg shadow-blue-500/20 active:scale-95 transition-all text-white mt-4"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Ativar Minha Conta AGORA
                </Button>
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 px-6">
                <div className="h-20 w-20 bg-emerald-100 rounded-full flex items-center justify-center animate-bounce">
                  <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Ativação Concluída!</h3>
                  <p className="text-slate-500 mt-1">Sua senha foi atualizada com segurança.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
