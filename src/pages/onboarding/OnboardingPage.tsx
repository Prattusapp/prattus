import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { useNavigate } from "react-router-dom"
import { 
  Building2, 
  MapPin, 
  Layers, 
  Users, 
  ArrowRight, 
  ArrowLeft, 
  CheckCircle2, 
  Loader2,
  Plus
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

const steps = [
  { id: 1, title: 'Instituição', icon: Building2 },
  { id: 2, title: 'Primeira Unidade', icon: MapPin },
  { id: 3, title: 'Setores', icon: Layers },
  { id: 4, title: 'Público', icon: Users },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  // Form States
  const [inst, setInst] = useState({ razao_social: '', cnpj: '' })
  const [unit, setUnit] = useState({ name: '', cep: '', logradouro: '', numero: '', bairro: '', cidade: '', uf: '' })
  const [sectors] = useState(['Ala A', 'UTI', 'Enfermaria'])
  const [publicTypes] = useState([
    { name: 'Paciente', active: true },
    { name: 'Acompanhante', active: true },
    { name: 'Colaborador', active: true }
  ])

  // CEP Search
  const fetchCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, "")
    if (cleanCEP.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`)
        const data = await res.json()
        if (!data.erro) {
          setUnit(prev => ({
            ...prev,
            logradouro: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            uf: data.uf
          }))
        }
      } catch (err) { console.error(err) }
    }
  }

  const finishOnboarding = async () => {
    setLoading(true)
    try {
      // 1. Obter usuário logado
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error("Usuário não logado")

      // 2. Criar a Instituição (A Empresa/Hospital)
      const { data: instRecord, error: instRecErr } = await supabase
        .from('institutions')
        .insert({ name: inst.razao_social })
        .select()
        .single()
      if (instRecErr) throw instRecErr
      const institutionId = instRecord.id

      // 3. Atualizar o Perfil do Usuário com o ID da nova instituição
      const { error: profErr } = await supabase
        .from('profiles')
        .update({ 
          institution_id: institutionId,
          onboarding_completed: true,
          updated_at: new Date() 
        })
        .eq('id', user.id)
      if (profErr) throw profErr

      // 4. Salvar Configuração do Hospital
      const { error: configErr } = await supabase
        .from('hospital_config')
        .insert({ 
          ...inst, 
          institution_id: institutionId,
          updated_at: new Date() 
        })
      if (configErr) throw configErr

      // 5. Salvar Primeira Unidade
      const { data: uData, error: uErr } = await supabase
        .from('hospital_unidades')
        .insert({ 
          ...unit,
          institution_id: institutionId 
        })
        .select()
        .single()
      if (uErr) throw uErr

      // 6. Salvar Setores Sugeridos
      const sectorPayload = sectors.map(name => ({ 
        name, 
        unit_id: uData.id,
        institution_id: institutionId
      }))
      const { error: sErr } = await supabase.from('hospital_setores').insert(sectorPayload)
      if (sErr) throw sErr

      // 7. Salvar Tipos de Público Padrão
      const publicPayload = publicTypes.map(p => ({ 
        ...p, 
        unit_id: uData.id,
        institution_id: institutionId
      }))
      const { error: pErr } = await supabase.from('contagem_tipos').insert(publicPayload)
      if (pErr) throw pErr

      navigate('/dashboard')
    } catch (err: any) {
      alert("Erro ao configurar sistema: " + err.message)
    } finally {
      setLoading(false)
    }
  }

  const next = () => {
    if (currentStep === 1 && (!inst.razao_social || !inst.cnpj)) return alert("Preencha os dados da instituição")
    if (currentStep === 2 && (!unit.name || !unit.cep)) return alert("Preencha os dados da unidade")
    setCurrentStep(prev => Math.min(prev + 1, 4))
  }
  const prev = () => setCurrentStep(prev => Math.max(prev - 1, 1))

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-950 to-slate-950">
      
      <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in duration-500">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600 font-black text-xl mb-4 shadow-lg shadow-blue-500/20">P</div>
          <h1 className="text-3xl font-black tracking-tight">Bem-vindo ao Prattus APP</h1>
          <p className="text-slate-400">Configure sua instituição hospitalar em poucos segundos.</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center justify-between px-4 relative">
          <div className="absolute top-[20px] left-0 w-full h-[2px] bg-white/5 -z-10" />
          {steps.map(step => (
            <div key={step.id} className="flex flex-col items-center gap-2">
              <div className={cn(
                "h-10 w-10 flex items-center justify-center rounded-full border-2 transition-all duration-300",
                currentStep >= step.id ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20 scale-110" : "bg-slate-900 border-white/10 text-white/30"
              )}>
                {currentStep > step.id ? <CheckCircle2 className="h-6 w-6" /> : <step.icon className="h-5 w-5" />}
              </div>
              <span className={cn(
                "text-[10px] font-black uppercase tracking-widest",
                currentStep >= step.id ? "text-blue-400" : "text-white/20"
              )}>{step.title}</span>
            </div>
          ))}
        </div>

        {/* Content Card */}
        <Card className="rounded-[40px] border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden shadow-2xl">
          <CardContent className="p-8 md:p-12">
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Nome do Novo Hospital / Empresa</Label>
                    <Input value={inst.razao_social} onChange={e => setInst({...inst, razao_social: e.target.value})} placeholder="Razão Social" className="h-14 rounded-2xl bg-white/5 border-white/10" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-white/50">CNPJ</Label>
                    <Input value={inst.cnpj} onChange={e => setInst({...inst, cnpj: e.target.value})} placeholder="00.000.000/0000-00" className="h-14 rounded-2xl bg-white/5 border-white/10" />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Nome da Unidade Principal</Label>
                    <Input value={unit.name} onChange={e => setUnit({...unit, name: e.target.value})} placeholder="Ex: Unidade Central" className="h-14 rounded-2xl bg-white/5 border-white/10" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-white/50">CEP (Localidade)</Label>
                      <Input value={unit.cep} onChange={e => setUnit({...unit, cep: e.target.value})} onBlur={() => fetchCEP(unit.cep)} placeholder="00000-000" className="h-14 rounded-2xl bg-white/5 border-white/10" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Cidade</Label>
                      <Input value={unit.cidade} disabled className="h-14 rounded-2xl bg-white/5 border-white/10 opacity-60" placeholder="Cidade" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Configuraremos Setores Sugeridos</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {sectors.map((s, idx) => (
                      <div key={idx} className="flex items-center gap-3 bg-white/5 p-4 rounded-2xl border border-white/10 transition-colors hover:bg-white/10">
                        <Layers className="h-4 w-4 text-blue-400" />
                        <span className="font-bold text-sm tracking-tight">{s}</span>
                      </div>
                    ))}
                    <div className="flex items-center gap-3 bg-blue-600/10 p-4 rounded-2xl border border-blue-500/20 text-blue-400 opacity-50">
                      <Plus className="h-4 w-4" />
                      <span className="font-bold text-sm">Mais depois...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-6">
                 <div className="space-y-4">
                  <Label className="text-xs font-bold uppercase tracking-widest text-white/50">Públicos-Alvo Padrão (Ativos)</Label>
                  <div className="space-y-3">
                    {publicTypes.map((p, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white/5 p-4 rounded-2xl border border-white/10 ring-1 ring-white/5">
                        <div className="flex items-center gap-3">
                          <Users className="h-4 w-4 text-blue-400" />
                          <span className="font-bold text-sm">{p.name}</span>
                        </div>
                        <div className="h-6 w-14 bg-emerald-500/20 rounded-full flex items-center justify-center text-[9px] font-black text-emerald-500 uppercase tracking-widest">ON</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-12 gap-4">
              <Button 
                variant="ghost" 
                onClick={prev} 
                disabled={currentStep === 1 || loading}
                className="rounded-2xl h-14 px-8 font-bold text-white/30 hover:text-white"
              >
                <ArrowLeft className="h-5 w-5 mr-2" /> Voltar
              </Button>
              
              {currentStep < 4 ? (
                <Button 
                  onClick={next}
                  className="rounded-2xl h-14 flex-1 bg-blue-600 hover:bg-blue-500 font-black shadow-lg shadow-blue-500/30"
                >
                  PRÓXIMO PASSO <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              ) : (
                <Button 
                  onClick={finishOnboarding}
                  disabled={loading}
                  className="rounded-2xl h-14 flex-1 bg-emerald-600 hover:bg-emerald-500 font-black shadow-lg shadow-emerald-500/30"
                >
                  {loading ? <Loader2 className="h-6 w-6 animate-spin mr-2" /> : null}
                  FINALIZAR SETUP <CheckCircle2 className="h-5 w-5 ml-2" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-[10px] uppercase font-bold tracking-widest text-white/20">Configuração rápida e segura • Prattus Enterprise</p>
      </div>
    </div>
  )
}
