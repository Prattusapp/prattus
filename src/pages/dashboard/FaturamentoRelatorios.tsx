import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { FileText, Loader2, Printer, ChevronLeft, ChevronRight, Calendar, User as UserIcon, Users } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"

export default function FaturamentoRelatorios() {
  const [loading, setLoading] = useState(true)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reportType, setReportType] = useState<"pacientes" | "servidores" | "todos">("pacientes")
  
  const [services, setServices] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  
  // records: { [service_id]: { [day]: number } }
  const [records, setRecords] = useState<Record<string, Record<number, number>>>({})

  useEffect(() => {
    fetchInitialData()
  }, [])

  useEffect(() => {
    if (institutionId) {
      fetchRecordsForMonth(currentDate)
    }
  }, [currentDate, institutionId, reportType])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('profiles').select('institution_id, unidade_id, role').eq('id', user.id).single()
      if (profile?.institution_id) {
         setInstitutionId(profile.institution_id)
      } else {
         const { data: unit } = await supabase.from('hospital_unidades').select('institution_id').eq('id', profile?.unidade_id).single()
         if (unit?.institution_id) setInstitutionId(unit.institution_id)
      }

      // Buscar Servicos
      const { data: servs } = await supabase.from('hospital_servicos').select('*').order('name')
      setServices(servs || [])

      // Buscar Preços (hospital_config)
      const { data: config } = await supabase.from('hospital_config').select('*').single()
      if (config) setCompany(config)

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRecordsForMonth = async (date: Date) => {
    if (!institutionId) return
    setLoading(true)
    
    const start = startOfMonth(date).toISOString().split('T')[0]
    const end = endOfMonth(date).toISOString().split('T')[0]

    try {
      const newRecords: Record<string, Record<number, number>> = {}
      services.forEach(s => {
        newRecords[s.id] = {}
      })

      if (reportType === 'pacientes' || reportType === 'todos') {
         const { data: dataPac } = await supabase
           .from('faturamento_pacientes')
           .select('*')
           .eq('institution_id', institutionId)
           .gte('date', start)
           .lte('date', end)

         if (dataPac) {
           dataPac.forEach(item => {
             const itemDate = new Date(item.date + 'T12:00:00Z')
             const day = itemDate.getUTCDate()
             if (!newRecords[item.service_id]) newRecords[item.service_id] = {}
             newRecords[item.service_id][day] = (newRecords[item.service_id][day] || 0) + Number(item.value)
           })
         }
      }
      
      // Quando existir a faturamento_servidores, adicionar o fetch aqui e somar no newRecords

      setRecords(newRecords)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const getPriceForService = (serviceName: string) => {
    if (!company) return 0
    const name = serviceName.toLowerCase()
    if (name.includes('desjejum')) return company.price_desjejum || 0
    if (name.includes('lanche da manhã') || name.includes('lanche manhã')) return company.price_lanche_manha || 0
    if (name.includes('almoço')) return company.price_almoco || 0
    if (name.includes('lanche da tarde') || name.includes('lanche tarde')) return company.price_lanche_tarde || 0
    if (name.includes('jantar')) return company.price_jantar || 0
    if (name.includes('lanche noite') || name.includes('ceia')) return company.price_lanche_noite || 0
    if (name.includes('extra') || name.includes('dieta')) return company.price_extras || 0
    if (name.includes('lactário') || name.includes('lactario')) return company.price_lactario || 0
    return 0
  }

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const handlePrevMonth = () => setCurrentDate(prev => subMonths(prev, 1))
  const handleNextMonth = () => setCurrentDate(prev => addMonths(prev, 1))

  const handlePrint = () => {
    window.print()
  }

  const daysInMonth = getDaysInMonth(currentDate)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Calcular TOTAIS
  let grandTotal = 0

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      
      {/* Controles para Tela (Não serão impressos) */}
      <div className="print:hidden space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Relatórios de Faturamento
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Gere e imprima relatórios consolidados.</p>
          </div>
          <Button onClick={handlePrint} className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md">
             <Printer className="w-5 h-5 mr-2" />
             Imprimir Relatório (PDF)
          </Button>
        </header>

        <Card className="rounded-3xl border-border/50 shadow-xl overflow-hidden">
          <CardHeader className="bg-muted/30 border-b border-border/50 p-4 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={handlePrevMonth} className="rounded-xl h-10 w-10">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center w-40 flex items-center justify-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-black text-lg capitalize">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
              </div>
              <Button variant="outline" size="icon" onClick={handleNextMonth} className="rounded-xl h-10 w-10">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            
            <div className="flex bg-muted p-1 rounded-xl">
               <Button 
                 variant={reportType === 'pacientes' ? 'default' : 'ghost'} 
                 size="sm" 
                 onClick={() => setReportType('pacientes')}
                 className={cn("rounded-lg text-xs font-bold", reportType === 'pacientes' && "bg-white text-blue-700 shadow-sm dark:bg-slate-800")}
               >
                 <UserIcon className="w-4 h-4 mr-2" /> Pacientes
               </Button>
               <Button 
                 variant={reportType === 'servidores' ? 'default' : 'ghost'} 
                 size="sm" 
                 onClick={() => setReportType('servidores')}
                 className={cn("rounded-lg text-xs font-bold", reportType === 'servidores' && "bg-white text-blue-700 shadow-sm dark:bg-slate-800")}
               >
                 <Users className="w-4 h-4 mr-2" /> Servidores
               </Button>
               <Button 
                 variant={reportType === 'todos' ? 'default' : 'ghost'} 
                 size="sm" 
                 onClick={() => setReportType('todos')}
                 className={cn("rounded-lg text-xs font-bold", reportType === 'todos' && "bg-white text-blue-700 shadow-sm dark:bg-slate-800")}
               >
                 Todos
               </Button>
            </div>

          </CardHeader>
        </Card>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 print:hidden">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="print:block hidden">
            {/* Espaçador pra forçar display print, opcional */}
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO (Mostra na tela também) */}
      {!loading && (
        <div className="bg-white text-black p-4 md:p-8 rounded-3xl shadow-xl border border-slate-200 print:shadow-none print:border-none print:p-0 print:m-0 w-full overflow-x-auto print:overflow-visible">
           {/* Cabeçalho de Impressão */}
           <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">RELATÓRIO DE FATURAMENTO</h1>
              <h2 className="text-lg font-bold text-slate-700 mt-2">
                 TIPO: <span className="uppercase text-blue-700">{reportType}</span> | MÊS: <span className="uppercase text-blue-700">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
              </h2>
           </div>

           {/* 1. Tabela Detalhada (Dias) */}
           <div className="mb-12">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 bg-slate-100 p-2 inline-block rounded-md border border-slate-300">
                 Detalhamento Diário
              </h3>
              <div className="overflow-x-auto w-full print:overflow-visible">
                <table className="w-full text-[10px] border-collapse border border-slate-400 font-mono table-fixed break-inside-avoid print:w-[100%]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-900">
                      <th className="border border-slate-400 p-1 w-24 font-bold uppercase text-left break-words">Refeições</th>
                      {daysArray.map(day => (
                        <th key={day} className="border border-slate-400 p-1 w-6 font-bold text-center">{day}</th>
                      ))}
                      <th className="border border-slate-400 p-1 w-12 font-black text-right bg-blue-100">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(s => {
                      let rowTotal = 0
                      return (
                        <tr key={s.id} className="hover:bg-slate-50">
                          <td className="border border-slate-400 p-1 font-bold text-slate-800 break-words leading-tight">{s.name}</td>
                          {daysArray.map(day => {
                            const val = records[s.id]?.[day] || 0
                            rowTotal += val
                            return (
                              <td key={day} className="border border-slate-400 p-1 text-center text-slate-600">
                                {val > 0 ? val : '-'}
                              </td>
                            )
                          })}
                          <td className="border border-slate-400 p-1 text-right font-black bg-blue-50 text-blue-900">
                            {rowTotal > 0 ? rowTotal : '-'}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
           </div>

           {/* 2. Tabela Resumo Valorizado (Conforme Print 2) */}
           <div className="page-break-before-auto break-inside-avoid">
              <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 bg-emerald-100 p-2 inline-block rounded-md border border-emerald-300">
                 Quadro Resumo (Valores)
              </h3>
              <table className="w-full max-w-4xl text-xs md:text-sm border-collapse border-2 border-slate-800 font-sans mx-auto">
                <thead>
                  <tr className="bg-emerald-100 text-slate-900 border-b-2 border-slate-800">
                    <th className="border border-slate-800 p-2 font-black uppercase text-center w-32">CÓDIGOS</th>
                    <th className="border border-slate-800 p-2 font-black uppercase text-center">REFEIÇÕES</th>
                    <th className="border border-slate-800 p-2 font-black uppercase text-center w-32">QUANTIDADE ESTIMADA</th>
                    <th className="border border-slate-800 p-2 font-black uppercase text-center w-32">VALOR UNITÁRIO R$</th>
                    <th className="border border-slate-800 p-2 font-black uppercase text-center w-32 bg-emerald-200">VALOR TOTAL R$</th>
                  </tr>
                </thead>
                <tbody>
                  {services.map(s => {
                    let estimatedQty = 0
                    daysArray.forEach(day => {
                      estimatedQty += (records[s.id]?.[day] || 0)
                    })
                    
                    const unitPrice = getPriceForService(s.name)
                    const totalValue = estimatedQty * unitPrice
                    grandTotal += totalValue

                    return (
                      <tr key={s.id} className="hover:bg-slate-50 odd:bg-emerald-50/30">
                        <td className="border border-slate-800 p-2 font-bold text-center text-slate-800 whitespace-nowrap">{s.code || '-'}</td>
                        <td className="border border-slate-800 p-2 font-bold text-center text-slate-900 uppercase">{s.name}</td>
                        <td className="border border-slate-800 p-2 font-black text-center text-slate-800 text-base">
                          {estimatedQty > 0 ? estimatedQty.toLocaleString('pt-BR') : '-'}
                        </td>
                        <td className="border border-slate-800 p-2 font-bold text-center text-slate-700">
                           {unitPrice > 0 ? formatCurrency(unitPrice) : '-'}
                        </td>
                        <td className="border border-slate-800 p-2 font-black text-right pr-4 text-emerald-900 bg-emerald-100/50 text-base">
                          {totalValue > 0 ? formatCurrency(totalValue) : '-'}
                        </td>
                      </tr>
                    )
                  })}
                  
                  {/* Linha de Total Geral */}
                  <tr className="bg-emerald-100 border-t-2 border-slate-800 text-slate-900">
                     <td colSpan={4} className="border border-slate-800 p-3 font-black text-center text-base uppercase tracking-widest">
                        Total Geral
                     </td>
                     <td className="border border-slate-800 p-3 font-black text-right pr-4 text-emerald-900 text-lg">
                        {formatCurrency(grandTotal)}
                     </td>
                  </tr>
                </tbody>
              </table>
           </div>

        </div>
      )}

    </div>
  )
}
