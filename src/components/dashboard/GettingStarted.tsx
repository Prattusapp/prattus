import React, { useEffect, useState } from "react"
import { 
  Building2, 
  MapPin, 
  Layers, 
  Users, 
  CheckCircle2, 
  ArrowRight,
  Sparkles
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import { Link } from "react-router-dom"

export default function GettingStarted() {
  const [steps, setSteps] = useState({
    institution: false,
    units: false,
    sectors: false,
    publics: false
  })
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<any>(null)

  useEffect(() => {
    async function checkProgress() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      
      setUserProfile(profile)

      if (profile?.institution_id) {
        // Consultas em paralelo para checar progresso
        const [
          { count: instCount },
          { count: unitCount },
          { count: sectorCount },
          { count: publicCount }
        ] = await Promise.all([
          supabase.from('hospital_config').select('*', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
          supabase.from('hospital_unidades').select('*', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
          supabase.from('hospital_setores').select('*', { count: 'exact', head: true }).eq('institution_id', profile.institution_id),
          supabase.from('contagem_tipos').select('*', { count: 'exact', head: true }).eq('institution_id', profile.institution_id)
        ])

        setSteps({
          institution: (instCount || 0) > 0,
          units: (unitCount || 0) > 0,
          sectors: (sectorCount || 0) > 0,
          publics: (publicCount || 0) > 0
        })
      }
      setLoading(false)
    }

    checkProgress()
  }, [])

  const allStepsDone = Object.values(steps).every(s => s)

  if (loading || allStepsDone) {
    return null
  }

  const completedCount = Object.values(steps).filter(Boolean).length
  const progressPercent = (completedCount / 4) * 100

  return (
    <div className="rounded-3xl border border-blue-500/20 bg-gradient-to-br from-blue-600/10 via-background to-background p-8 mb-8 relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles className="h-24 w-24 text-blue-500" />
      </div>

      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-black tracking-tight mb-2 flex items-center gap-2">
              Olá, {userProfile?.full_name?.split(' ')[0]}! Vamos começar?
              <Sparkles className="h-5 w-5 text-blue-500 animate-pulse" />
            </h2>
            <p className="text-muted-foreground">
              Siga os passos abaixo para configurar sua instituição e liberar todas as funções do Prattus.
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm font-bold text-blue-500 mb-2">{completedCount} de 4 concluídos</div>
            <div className="w-48 h-2 bg-blue-500/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-blue-500 transition-all duration-1000 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StepCard 
            title="Instituição"
            description="Dados do Hospital/Empresa"
            icon={<Building2 className="h-5 w-5" />}
            isDone={steps.institution}
            link="/config?tab=hospital"
          />
          <StepCard 
            title="Unidade"
            description="Cadastre sua primeira unidade"
            icon={<MapPin className="h-5 w-5" />}
            isDone={steps.units}
            link="/config?tab=unidades"
          />
          <StepCard 
            title="Setores"
            description="Defina os setores hospitalares"
            icon={<Layers className="h-5 w-5" />}
            isDone={steps.sectors}
            link="/config?tab=setores"
          />
          <StepCard 
            title="Públicos"
            description="Tipos de dietas e públicos"
            icon={<Users className="h-5 w-5" />}
            isDone={steps.publics}
            link="/config?tab=publicos"
          />
        </div>
      </div>
    </div>
  )
}

function StepCard({ title, description, icon, isDone, link }: { 
  title: string, 
  description: string, 
  icon: React.ReactNode, 
  isDone: boolean,
  link: string
}) {
  return (
    <Link 
      to={link}
      className={cn(
        "flex flex-col p-5 rounded-2xl border transition-all hover:scale-[1.02] active:scale-[0.98]",
        isDone 
          ? "bg-emerald-500/5 border-emerald-500/20" 
          : "bg-card border-border hover:border-blue-500/40 hover:shadow-lg shadow-sm"
      )}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "h-10 w-10 rounded-xl flex items-center justify-center",
          isDone ? "bg-emerald-500/10 text-emerald-500" : "bg-blue-500/10 text-blue-500"
        )}>
          {isDone ? <CheckCircle2 className="h-5 w-5" /> : icon}
        </div>
        {!isDone && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div>
        <h4 className={cn("font-bold text-sm", isDone && "text-emerald-600")}>{title}</h4>
        <p className="text-xs text-muted-foreground line-clamp-1">{description}</p>
      </div>
    </Link>
  )
}
