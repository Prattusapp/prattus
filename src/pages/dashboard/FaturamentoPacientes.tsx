import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { FileText, Loader2, ChevronLeft, ChevronRight, Save, CheckCircle2 } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function FaturamentoPacientes() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  
  const [currentDate, setCurrentDate] = useState(new Date())
  const [services, setServices] = useState<any[]>([])
  const [activeTab, setActiveTab] = useState<string>("")
  
  // records: { [service_id]: { [day]: number } }
  const [records, setRecords] = useState<Record<string, Record<number, string>>>({})

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (institutionId) {
      fetchRecordsForMonth(currentDate)
    }
  }, [currentDate, institutionId])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('institution_id').eq('id', user.id).single()
      if (!profile?.institution_id) return

      setInstitutionId(profile.institution_id)

      const { data: servs, error: servsError } = await supabase
        .from('hospital_servicos')
        .select('*')
        .order('name')
        
      if (servsError) throw servsError

      setServices(servs || [])
      if (servs && servs.length > 0) {
        setActiveTab(servs[0].id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecordsForMonth = async (date: Date) => {
    if (!institutionId) return
    
    const start = startOfMonth(date).toISOString().split('T')[0]
    const end = endOfMonth(date).toISOString().split('T')[0]

    try {
      const { data, error } = await supabase
        .from('faturamento_pacientes')
        .select('*')
        .eq('institution_id', institutionId)
        .gte('date', start)
        .lte('date', end)

      if (error) throw error

      const newRecords: Record<string, Record<number, string>> = {}
      services.forEach(s => {
        newRecords[s.id] = {}
      })

      if (data) {
        data.forEach(item => {
          const itemDate = new Date(item.date + 'T12:00:00Z') // Fix timezone issue by parsing with time
          const day = itemDate.getUTCDate()
          if (!newRecords[item.service_id]) newRecords[item.service_id] = {}
          newRecords[item.service_id][day] = item.value.toString()
        })
      }
      setRecords(newRecords)
    } catch (err) {
      console.error(err)
    }
  }

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))

  const handleValueChange = (serviceId: string, day: number, value: string) => {
    // Apenas permitir números e separadores decimais
    const sanitizedValue = value.replace(/[^0-9.,]/g, '')
    
    setRecords(prev => ({
      ...prev,
      [serviceId]: {
        ...(prev[serviceId] || {}),
        [day]: sanitizedValue
      }
    }))
  }

  const handleValueBlur = async (serviceId: string, day: number, value: string) => {
    if (!institutionId) return
    
    // Converte vírgula para ponto se houver
    let numericValue = parseFloat(value.replace(',', '.'))
    if (isNaN(numericValue) && value !== '') return // não salvar lixo
    
    // Se estiver vazio, consideramos 0 para deletar ou atualizar pra 0?
    // Vamos salvar como 0
    if (value === '') numericValue = 0

    const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd')
    
    setSaving(true)
    try {
      const { error } = await supabase
        .from('faturamento_pacientes')
        .upsert({
          institution_id: institutionId,
          service_id: serviceId,
          date: dateStr,
          value: numericValue
        }, { onConflict: 'institution_id, service_id, date' })

      if (error) throw error
    } catch (err) {
      console.error(err)
      alert("Não foi possível salvar o valor automaticamente. Verifique sua conexão.")
    } finally {
      setSaving(false)
    }
  }

  const handleBulkSaveTab = async (serviceId: string) => {
    if (!institutionId) return
    setSaving(true)
    try {
      const recordsToUpsert = []
      const daysInMonth = getDaysInMonth(currentDate)
      for (let day = 1; day <= daysInMonth; day++) {
        const rawValue = records[serviceId]?.[day]
        if (rawValue !== undefined && rawValue !== '') {
           let numericValue = parseFloat(rawValue.replace(',', '.'))
           if (!isNaN(numericValue)) {
              const dateStr = format(new Date(currentDate.getFullYear(), currentDate.getMonth(), day), 'yyyy-MM-dd')
              recordsToUpsert.push({
                 institution_id: institutionId,
                 service_id: serviceId,
                 date: dateStr,
                 value: numericValue
              })
           }
        }
      }

      if (recordsToUpsert.length > 0) {
        const { error } = await supabase
          .from('faturamento_pacientes')
          .upsert(recordsToUpsert, { onConflict: 'institution_id, service_id, date' })

        if (error) throw error
      }
    } catch (err) {
      console.error(err)
      alert("Erro ao salvar dados desta aba. Verifique sua conexão.")
    } finally {
      setSaving(false)
    }
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      <header>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-blue-600" />
          Faturamento - Pacientes
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">Preencha os valores faturados por dia para cada serviço.</p>
      </header>

      <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
        <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={handlePrevMonth} className="rounded-xl h-10 w-10">
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <div className="text-center w-40">
              <span className="font-black text-lg capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
            </div>
            <Button variant="outline" size="icon" onClick={handleNextMonth} className="rounded-xl h-10 w-10">
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
             {saving && <><Loader2 className="h-4 w-4 animate-spin text-blue-600" /> Salvando...</>}
             {!saving && <><Save className="h-4 w-4 text-emerald-600" /> Salvo</>}
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : services.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground text-xs font-bold uppercase tracking-widest">
              Nenhum serviço cadastrado nas configurações.
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="overflow-x-auto w-full border-b border-border/50 bg-muted/10">
                <TabsList className="w-auto inline-flex h-14 items-center justify-start rounded-none bg-transparent p-0">
                  {services.map(s => (
                    <TabsTrigger 
                      key={s.id} 
                      value={s.id}
                      className="inline-flex items-center justify-center whitespace-nowrap px-6 h-14 border-b-2 border-transparent font-bold text-sm text-muted-foreground transition-all hover:text-foreground data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-blue-600/5 rounded-none"
                    >
                      {s.name}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>

              {services.map((s, index) => (
                <TabsContent key={s.id} value={s.id} className="p-0 m-0 focus-visible:outline-none">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-0 border-t border-border/50">
                     {daysArray.map(day => {
                        const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
                        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
                        const value = (records[s.id] && records[s.id][day]) !== undefined ? records[s.id][day] : ''

                        return (
                          <div key={day} className={cn("p-4 border-r border-b border-border/50 flex flex-col gap-3 transition-colors", isWeekend ? "bg-muted/30" : "bg-card hover:bg-muted/10")}>
                             <div className="flex items-center justify-between">
                                <span className={cn("text-xs font-black uppercase tracking-widest", isWeekend ? "text-rose-500" : "text-slate-500")}>
                                  Dia {day}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{format(dateObj, 'eee', { locale: ptBR })}</span>
                             </div>
                             <Input 
                               type="text"
                               inputMode="decimal"
                               value={value}
                               onChange={(e) => handleValueChange(s.id, day, e.target.value)}
                               onBlur={(e) => handleValueBlur(s.id, day, e.target.value)}
                               className="rounded-xl h-12 text-center font-black text-lg focus-visible:ring-blue-600 transition-all border-slate-200 shadow-inner bg-slate-50/50"
                               placeholder="-"
                             />
                          </div>
                        )
                     })}
                  </div>
                  <div className="p-4 md:p-6 border-t border-border/50 bg-muted/10 flex justify-end">
                    <Button 
                      size="lg"
                      disabled={saving}
                      onClick={async () => {
                         await handleBulkSaveTab(s.id)
                         const isLast = index === services.length - 1
                         if (!isLast) {
                            setActiveTab(services[index + 1].id)
                            window.scrollTo({ top: 0, behavior: 'smooth' })
                         } else {
                            alert("Todos os dados do mês foram salvos com sucesso!")
                         }
                      }}
                      className={cn(
                        "rounded-xl px-8 shadow-md transition-all font-bold",
                        index === services.length - 1 ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                      )}
                    >
                      {saving ? (
                        <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Salvando...</>
                      ) : index === services.length - 1 ? (
                        <><CheckCircle2 className="w-5 h-5 mr-2" /> Finalizar e Salvar</>
                      ) : (
                        <>Salvar e Próximo Serviço <ChevronRight className="w-5 h-5 ml-2" /></>
                      )}
                    </Button>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
