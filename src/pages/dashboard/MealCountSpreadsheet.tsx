import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { 
  Save, 
  RefreshCcw, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"

type MealType = 'desjejum' | 'almoco' | 'lanche_manha' | 'lanche_tarde' | 'jantar' | 'lanche_noite' | 'extras' | 'lactario'

interface Sector {
  id: number
  name: string
  unidade_id: string
}

interface CountType {
  id: string
  name: string
}

export default function MealCountSpreadsheet() {
  const [searchParams] = useSearchParams()
  const initialDate = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(initialDate)
  const [activeTab, setActiveTab] = useState<MealType>('desjejum')
  const [countTypes, setCountTypes] = useState<CountType[]>([])
  const [activeCountTypeId, setActiveCountTypeId] = useState<string>("")
  const [sectors, setSectors] = useState<Sector[]>([])
  const [data, setData] = useState<Record<number, Record<MealType, Record<string, number>>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null)
  const [institutionId, setInstitutionId] = useState<string | null>(null)

  // Units
  const [unidades, setUnidades] = useState<any[]>([])
  const [selectedUnitId, setSelectedUnitId] = useState<string>("")
  
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const mealTypes: { id: MealType, label: string }[] = [
    { id: 'desjejum', label: 'Desjejum' },
    { id: 'lanche_manha', label: 'Lanche Manhã' },
    { id: 'almoco', label: 'Almoço' },
    { id: 'lanche_tarde', label: 'Lanche Tarde' },
    { id: 'jantar', label: 'Jantar' },
    { id: 'lanche_noite', label: 'Lanche Noite' },
    { id: 'extras', label: 'Extras' },
    { id: 'lactario', label: 'Lactário' },
  ]


  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (selectedUnitId) {
      fetchTypesByUnit()
    }
  }, [selectedUnitId])

  useEffect(() => {
    if (countTypes.length > 0) {
      fetchCounts()
    }
  }, [date, countTypes])

  const fetchInitialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single()
        if (profile?.institution_id) setInstitutionId(profile.institution_id)
      }

      const { data: configData } = await supabase.from('hospital_config').select('razao_social, logo_url').single()
      if (configData) {
        // configData is available if needed in the future
      }

      // Fetch Units
      const { data: uData } = await supabase.from('hospital_unidades').select('*').order('name')
      const units = uData || []
      setUnidades(units)
      if (units.length > 0) setSelectedUnitId(units[0].id)

      const { data: sectorsData } = await supabase.from('hospital_setores').select('*').eq('active', true).order('name')
      setSectors(sectorsData || [])
    } catch (err) {
      import.meta.env.DEV && console.error(err)
    }
  }

  const fetchTypesByUnit = async () => {
    if (!selectedUnitId) return
    try {
      const { data: typesData } = await supabase
        .from('contagem_tipos')
        .select('*')
        .eq('active', true)
        .eq('unidade_id', selectedUnitId)
        .order('name')
      
      if (typesData) {
        setCountTypes(typesData)
        if (typesData.length > 0) {
          setActiveCountTypeId(typesData[0].id)
        } else {
          setActiveCountTypeId("")
        }
      }
    } catch (err) {
      import.meta.env.DEV && console.error(err)
    }
  }

  const fetchCounts = async () => {
    setLoading(true)
    try {
      const { data: countsData, error: cError } = await supabase
        .from('contagem_refeicoes')
        .select('*')
        .eq('data', date)
      
      if (cError) throw cError

      const initialData: Record<number, Record<MealType, Record<string, number>>> = {}
      sectors.forEach(s => {
        initialData[s.id] = {
          desjejum: {}, lanche_manha: {}, almoco: {}, lanche_tarde: {}, jantar: {}, lanche_noite: {}, extras: {}, lactario: {}
        }
        countTypes.forEach(t => {
          initialData[s.id].desjejum[t.id] = 0
          initialData[s.id].lanche_manha[t.id] = 0
          initialData[s.id].almoco[t.id] = 0
          initialData[s.id].lanche_tarde[t.id] = 0
          initialData[s.id].jantar[t.id] = 0
          initialData[s.id].lanche_noite[t.id] = 0
          initialData[s.id].extras[t.id] = 0
          initialData[s.id].lactario[t.id] = 0
        })
      })

      countsData?.forEach(c => {
        const mealType = c.tipo_refeicao as MealType
        if (initialData[c.setor_id] && c.tipo_contagem_id) {
          initialData[c.setor_id][mealType][c.tipo_contagem_id] = c.quantidade
        }
      })

      setData(initialData)
    } catch (err: any) {
      import.meta.env.DEV && console.error(err)
      setStatus({ type: 'error', message: "Falha ao carregar contagens" })
    } finally {
      setLoading(false)
    }
  }

  const getTabTotal = (meal: MealType) => {
    let total = 0
    Object.values(data).forEach(sectorData => {
      const mealData = sectorData[meal]
      if (activeCountTypeId && mealData[activeCountTypeId]) {
        total += mealData[activeCountTypeId]
      }
    })
    return total
  }

  const handleInputChange = (sectorId: number, meal: MealType, typeId: string, value: string) => {
    const numValue = parseInt(value) || 0
    setData(prev => {
      const sectorData = prev[sectorId] || {
        desjejum: {}, lanche_manha: {}, almoco: {}, lanche_tarde: {}, jantar: {}, lanche_noite: {}, extras: {}, lactario: {}
      }
      const mealData = (sectorData[meal] || {}) as Record<string, number>
      
      return {
        ...prev,
        [sectorId]: {
          ...sectorData,
          [meal]: {
            ...mealData,
            [typeId]: numValue
          }
        }
      }
    })
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      const upsertData: any[] = []
      
      Object.entries(data).forEach(([sId, meals]) => {
        Object.entries(meals).forEach(([mType, types]) => {
          const qty = types[activeCountTypeId];
          if (typeof qty === 'number') {
            upsertData.push({
              data: date,
              setor_id: parseInt(sId),
              tipo_refeicao: mType,
              tipo_contagem_id: activeCountTypeId,
              quantidade: qty,
              criado_por: user?.id,
              institution_id: institutionId
            })
          }
        })
      })

      if (upsertData.length === 0) {
        setStatus({ type: 'success', message: "Nada para salvar" })
        return
      }

      const { error } = await supabase
        .from('contagem_refeicoes')
        .upsert(upsertData, { onConflict: 'data,setor_id,tipo_refeicao,tipo_contagem_id' })
      
      if (error) throw error
      setStatus({ type: 'success', message: "Dados salvos com sucesso!" })
    } catch (err: any) {
      import.meta.env.DEV && console.error(err)
      setStatus({ type: 'error', message: "Erro ao salvar: " + err.message })
    } finally {
      setSaving(false)
    }
  }

  const currentTypeIndex = countTypes.findIndex(t => t.id === activeCountTypeId)
  const currentMealIndex = mealTypes.findIndex(m => m.id === activeTab)

  const handleNext = async () => {
    if (currentMealIndex === mealTypes.length - 1 && currentTypeIndex === countTypes.length - 1) {
      await handleSave()
      setShowSuccessModal(true)
      return
    }

    if (currentMealIndex < mealTypes.length - 1) {
      setActiveTab(mealTypes[currentMealIndex + 1].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (currentTypeIndex < countTypes.length - 1) {
      await handleSave()
      setActiveCountTypeId(countTypes[currentTypeIndex + 1].id)
      setActiveTab(mealTypes[0].id)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      await handleSave()
    }
  }

  const handlePrev = () => {
    if (currentMealIndex > 0) {
      setActiveTab(mealTypes[currentMealIndex - 1].id)
    } else if (currentTypeIndex > 0) {
      setActiveCountTypeId(countTypes[currentTypeIndex - 1].id)
      setActiveTab(mealTypes[mealTypes.length - 1].id)
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const resetWizard = () => {
    setActiveCountTypeId(countTypes[0]?.id || "")
    setActiveTab(mealTypes[0].id)
    setShowSuccessModal(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      {/* Desktop Header */}
      {!isMobile && (
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border/50 -mx-4 px-4 py-4 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              Contagem de Refeições
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 tracking-wider">Unidade:</span>
              <select 
                value={selectedUnitId}
                onChange={(e) => setSelectedUnitId(e.target.value)}
                className="bg-transparent text-blue-600 font-bold border-none p-0 h-auto focus:ring-0 cursor-pointer text-xs"
              >
                {unidades.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl border border-border/10">
              {countTypes.map(t => (
                <button
                  key={t.id}
                  onClick={() => setActiveCountTypeId(t.id)}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                    activeCountTypeId === t.id 
                      ? "bg-background text-blue-600 shadow-sm border border-border/50" 
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t.name}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 bg-muted/30 p-1 rounded-xl">
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input 
                  type="date" 
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-8 w-36 rounded-lg border-none bg-transparent pl-9 pr-2 text-xs font-bold focus:ring-0 outline-none"
                />
              </div>
              
              <button 
                onClick={fetchCounts}
                title="Recarregar"
                className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
              >
                <RefreshCcw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
              </button>
            </div>

            <button 
              onClick={handleSave}
              disabled={saving || loading}
              className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-black text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-50"
            >
              {saving ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Salvar {countTypes.find(t => t.id === activeCountTypeId)?.name || "Público"}
            </button>
          </div>
        </header>
      )}

      {/* Mobile Wizard Header */}
      {isMobile && (
        <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border/50 -mx-4 px-4 pt-4 pb-0 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex flex-col gap-1">
              <h1 className="text-2xl font-black tracking-tighter text-slate-800 leading-none">Lançamento</h1>
              
              {/* Stepper de Públicos */}
              <div className="flex items-center gap-1.5 mt-2">
                {countTypes.map((t, idx) => {
                  const isActive = idx === currentTypeIndex;
                  const isPast = idx < currentTypeIndex;
                  return (
                    <div 
                      key={t.id} 
                      className="flex flex-col gap-0.5 min-w-[40px]"
                    >
                      <div className={cn(
                        "h-1.5 rounded-full transition-all duration-500",
                        isActive ? "w-full bg-blue-600" : isPast ? "w-full bg-emerald-500" : "w-4 bg-slate-200"
                      )} />
                      <span className={cn(
                        "text-[8px] font-black uppercase tracking-tighter transition-all",
                        isActive ? "text-blue-600" : isPast ? "text-emerald-600" : "text-slate-400"
                      )}>
                        {t.name.split(' ')[0]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="bg-blue-600/10 px-2 py-1 rounded-lg">
              <span className="text-[10px] font-black text-blue-600 uppercase">
                {countTypes.length > 0 && mealTypes.length > 0 
                  ? `${((currentTypeIndex * mealTypes.length + currentMealIndex + 1) / (countTypes.length * mealTypes.length) * 100).toFixed(0)}%`
                  : "0%"}
              </span>
            </div>
          </div>

          {/* Steps Timeline (Meal Types) - 2 Rows Grid */}
          <div className="grid grid-cols-4 gap-y-3 gap-x-1 pb-4">
            {mealTypes.map((m, idx) => {
              const isActive = activeTab === m.id
              const isPast = idx < currentMealIndex
              
              return (
                <div 
                  key={m.id} 
                  className={cn(
                    "flex flex-col items-center gap-1 transition-all",
                    isActive ? "opacity-100" : isPast ? "opacity-40" : "opacity-30"
                  )}
                >
                  <div className={cn(
                    "h-1 w-full rounded-full",
                    isActive ? "bg-blue-600" : isPast ? "bg-emerald-500" : "bg-muted"
                  )} />
                  <span className={cn(
                    "text-[7px] font-black uppercase tracking-tighter text-center leading-none px-0.5",
                    isActive ? "text-blue-600" : "text-muted-foreground"
                  )}>
                    {m.label.replace(' ', '\n')}
                  </span>
                </div>
              )
            })}
          </div>
        </header>
      )}

      {status && (
        <div className={cn(
          "flex items-center gap-3 rounded-2xl border p-4 text-sm font-medium animate-in slide-in-from-top-2 mx-auto max-w-sm",
          status.type === 'success' ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600" : "bg-rose-500/10 border-rose-500/20 text-rose-600"
        )}>
          {status.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          {status.message}
        </div>
      )}

      {/* Tabs Navigation (Desktop only) */}
      {!isMobile && (
        <div className="flex items-center gap-2 overflow-x-auto pb-4 no-scrollbar -mx-4 px-4">
          {mealTypes.map(m => (
            <button
              key={m.id}
              onClick={() => setActiveTab(m.id)}
              className={cn(
                "flex flex-col items-start gap-1 rounded-2xl px-6 py-3 transition-all min-w-[120px]",
                activeTab === m.id 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30 scale-105" 
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              )}
            >
              <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{m.label}</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tighter">{getTabTotal(m.id)}</span>
                <span className="text-[10px] opacity-60 font-medium">TOTAL (TIPO)</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Simplified Table / Wizard List */}
      <div className={cn(
        "relative overflow-hidden border border-border bg-card shadow-xl",
        isMobile ? "rounded-2xl" : "rounded-3xl"
      )}>
        <div className="overflow-x-auto overflow-y-hidden">
          <table className="w-full border-collapse text-left text-sm">
            {!isMobile && (
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="sticky left-0 z-20 bg-muted/90 backdrop-blur-md px-6 py-6 font-bold min-w-[200px]">Setor</th>
                  <th className="px-4 py-4 text-center font-black border-l border-border/50 uppercase tracking-widest text-[11px] text-blue-500 bg-blue-600/5">
                    Quantidade de {countTypes.find(t => t.id === activeCountTypeId)?.name || "Refeições"}
                  </th>
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-border/50">
              {loading ? (
                Array.from({ length: isMobile ? 4 : 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-5"><div className="h-4 w-24 bg-muted rounded" /></td>
                    <td className="p-3"><div className="h-10 w-full bg-muted/50 rounded-xl" /></td>
                  </tr>
                ))
              ) : sectors.filter(s => s.unidade_id === selectedUnitId).map(sector => (
                <tr key={sector.id} className="hover:bg-muted/30 transition-colors group">
                  <td className={cn(
                    "px-6 py-5 font-bold text-foreground transition-colors",
                    !isMobile && "sticky left-0 z-10 bg-card/90 backdrop-blur-md border-r border-border/10 group-hover:bg-muted/50"
                  )}>
                    {sector.name}
                  </td>
                  <td className={cn(
                    "p-3",
                    !isMobile && "border-l border-border/10 bg-blue-500/5"
                  )}>
                    <input 
                      type="number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={data[sector.id]?.[activeTab]?.[activeCountTypeId] || ''}
                      onChange={(e) => handleInputChange(sector.id, activeTab, activeCountTypeId, e.target.value)}
                      className={cn(
                        "w-full h-14 text-center font-black rounded-xl bg-muted/20 transition-all focus:bg-background focus:ring-2 focus:ring-blue-500 border-none outline-none",
                        isMobile ? "text-2xl" : "text-xl"
                      )}
                      placeholder="0"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Sticky Navigation */}
      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-lg border-t border-border/50 flex gap-3 z-40">
          <button
            disabled={currentTypeIndex === 0 && currentMealIndex === 0}
            onClick={handlePrev}
            className="flex-1 h-16 rounded-2xl bg-muted text-muted-foreground font-black flex items-center justify-center gap-2 active:scale-95 disabled:opacity-30 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
            Voltar
          </button>
          <button
            onClick={handleNext}
            disabled={saving}
            className="flex-[2] h-16 rounded-2xl bg-blue-600 text-white font-black flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20 active:scale-95 transition-all"
          >
            {saving ? <RefreshCcw className="h-5 w-5 animate-spin" /> : (
              <>
                { (currentMealIndex === mealTypes.length - 1 && currentTypeIndex === countTypes.length - 1) ? (
                  <>
                    Finalizar
                    <CheckCircle2 className="h-5 w-5" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="h-5 w-5" />
                  </>
                )}
              </>
            )}
          </button>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[40px] p-8 w-full max-w-sm shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300 text-center">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            
            <h2 className="text-2xl font-black tracking-tight text-slate-800 mb-2">Excelente!</h2>
            <p className="text-slate-500 font-medium leading-relaxed mb-8">
              Dados do dia <span className="font-bold text-slate-800">{format(parseISO(date), "dd/MM/yyyy")}</span> salvos com sucesso no sistema.
            </p>

            <button
              onClick={resetWizard}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCcw className="h-4 w-4" />
              Novo Lançamento
            </button>
          </div>
        </div>
      )}

      <style>{`
        ::-webkit-scrollbar { display: none; }
        * { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  )
}
