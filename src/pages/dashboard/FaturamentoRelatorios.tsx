import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { FileText, Loader2, Printer, ChevronLeft, ChevronRight, Calendar, User as UserIcon, Users } from "lucide-react"
import { Card, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { format, addMonths, subMonths, getDaysInMonth, startOfMonth, endOfMonth } from "date-fns"
import { ptBR } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { jsPDF } from "jspdf"
import autoTable from "jspdf-autotable"

export default function FaturamentoRelatorios() {
  const [loading, setLoading] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [institutionId, setInstitutionId] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [reportType, setReportType] = useState<"pacientes" | "servidores" | "todos">("pacientes")
  
  const [services, setServices] = useState<any[]>([])
  const [company, setCompany] = useState<any>(null)
  
  const [recordsPacientes, setRecordsPacientes] = useState<Record<string, Record<number, number>>>({})
  const [recordsServidores, setRecordsServidores] = useState<Record<string, Record<number, number>>>({})

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
      
      const orderMap: Record<string, number> = {
        'desjejum': 1,
        'lanche manhã': 2,
        'lanche da manhã': 2,
        'almoço': 3,
        'lanche tarde': 4,
        'lanche da tarde': 4,
        'jantar': 5,
        'lanche noite': 6,
        'ceia': 6
      }
      
      const sortedServs = (servs || []).sort((a, b) => {
        const orderA = orderMap[a.name.toLowerCase()] || 99
        const orderB = orderMap[b.name.toLowerCase()] || 99
        return orderA - orderB
      })

      setServices(sortedServs)

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
      const newPacientes: Record<string, Record<number, number>> = {}
      const newServidores: Record<string, Record<number, number>> = {}
      services.forEach(s => {
        newPacientes[s.id] = {}
        newServidores[s.id] = {}
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
             if (!newPacientes[item.service_id]) newPacientes[item.service_id] = {}
             newPacientes[item.service_id][day] = (newPacientes[item.service_id][day] || 0) + Number(item.value)
           })
         }
      }
      
      if (reportType === 'servidores' || reportType === 'todos') {
         try {
           const { data: dataServ } = await supabase
             .from('faturamento_servidores')
             .select('*')
             .eq('institution_id', institutionId)
             .gte('date', start)
             .lte('date', end)

           if (dataServ) {
             dataServ.forEach(item => {
               const itemDate = new Date(item.date + 'T12:00:00Z')
               const day = itemDate.getUTCDate()
               if (!newServidores[item.service_id]) newServidores[item.service_id] = {}
               newServidores[item.service_id][day] = (newServidores[item.service_id][day] || 0) + Number(item.value)
             })
           }
         } catch (e) {
           console.log("Tabela faturamento_servidores ainda nao existe", e)
         }
      }

      setRecordsPacientes(newPacientes)
      setRecordsServidores(newServidores)
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

  const daysInMonth = getDaysInMonth(currentDate)
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  // Determinar os grupos baseados no reportType
  const renderGroups = []
  
  if (reportType === 'pacientes' || reportType === 'todos') {
    renderGroups.push({
      id: 'pacientes',
      title: 'PACIENTES',
      records: recordsPacientes,
      services: services
    })
  }

  if (reportType === 'servidores' || reportType === 'todos') {
    const servServices = services.filter(s => {
      const n = s.name.toLowerCase()
      return n.includes('desjejum') || n.includes('almoço') || n.includes('almoco') || n.includes('jantar')
    })
    
    renderGroups.push({
      id: 'servidores',
      title: 'SERVIDORES E ACOMPANHANTES',
      records: recordsServidores,
      services: servServices
    })
  }

  const handlePrint = () => {
    setGeneratingPDF(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const margin = 15
      let currentY = 15

      // Cabeçalho Principal
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
      doc.text("RELATÓRIO DE FATURAMENTO", 148.5, currentY, { align: 'center' })
      currentY += 8
      doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(37, 99, 235)
      doc.text(`TIPO: ${reportType.toUpperCase()} | MÊS: ${format(currentDate, 'MMMM yyyy', { locale: ptBR }).toUpperCase()}`, 148.5, currentY, { align: 'center' })
      currentY += 15

      renderGroups.forEach((group, idx) => {
        if (idx > 0) {
           doc.addPage()
           currentY = 15
        }

        // Título do Grupo
        if (reportType === 'todos') {
           doc.setFontSize(12).setFont('helvetica', 'bold').setTextColor(15, 23, 42)
           doc.text(`TIPO: ${group.title}`, margin, currentY)
           currentY += 8
        }

        // 1. Tabela Detalhamento Diário
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
        doc.text("DETALHAMENTO DIÁRIO", margin, currentY)
        currentY += 5

        const dailyHead = [['Refeições', ...daysArray.map(String), 'Total']]
        const dailyBody = group.services.map(s => {
          let rowTotal = 0
          const rowData = daysArray.map(day => {
            const val = group.records[s.id]?.[day] || 0
            rowTotal += val
            return val > 0 ? val.toString() : '-'
          })
          return [s.name, ...rowData, rowTotal > 0 ? rowTotal.toString() : '-']
        })

        autoTable(doc, {
          startY: currentY,
          head: dailyHead,
          body: dailyBody,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], fontSize: 7, halign: 'center' },
          styles: { fontSize: 7, cellPadding: 1.5, halign: 'center', textColor: [0, 0, 0] },
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
        })

        currentY = (doc as any).lastAutoTable.finalY + 15

        // Checar se precisa de nova página para o Resumo
        if (currentY > 150) {
           doc.addPage()
           currentY = 15
        }

        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0, 0, 0)
        doc.text("QUADRO RESUMO (VALORES)", margin, currentY)
        currentY += 5

        const resumeHead = [['CÓDIGOS', 'REFEIÇÕES', 'QUANTIDADE ESTIMADA', 'VALOR UNITÁRIO R$', 'VALOR TOTAL R$']]
        let grandTotalPDF = 0
        const resumeBody = group.services.map(s => {
          let estimatedQty = 0
          daysArray.forEach(day => estimatedQty += (group.records[s.id]?.[day] || 0))
          const unitPrice = getPriceForService(s.name)
          const totalValue = estimatedQty * unitPrice
          grandTotalPDF += totalValue
          return [
            s.code || '-',
            s.name.toUpperCase(),
            estimatedQty > 0 ? estimatedQty.toLocaleString('pt-BR') : '-',
            unitPrice > 0 ? formatCurrency(unitPrice) : '-',
            totalValue > 0 ? formatCurrency(totalValue) : '-'
          ]
        })
        resumeBody.push(['', 'TOTAL GERAL', '', '', formatCurrency(grandTotalPDF)])

        autoTable(doc, {
          startY: currentY,
          head: resumeHead,
          body: resumeBody,
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [16, 185, 129], fontSize: 8, halign: 'center' },
          styles: { fontSize: 8, cellPadding: 2, halign: 'center', textColor: [0, 0, 0] },
          columnStyles: { 1: { halign: 'left', fontStyle: 'bold' }, 4: { halign: 'right', fontStyle: 'bold' } },
          didParseCell: (data) => {
            if (data.row.index === resumeBody.length - 1 && data.section === 'body') {
              data.cell.styles.fillColor = [209, 250, 229] 
              data.cell.styles.fontStyle = 'bold'
            }
          }
        })

        currentY = (doc as any).lastAutoTable.finalY + 15
      })

      doc.save(`Relatorio_Faturamento_${format(currentDate, 'MM-yyyy')}.pdf`)
    } catch (err: any) {
      console.error(err)
      alert("Erro ao gerar PDF: " + (err.message || String(err)))
    } finally {
      setGeneratingPDF(false)
    }
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      
      {/* Controles para Tela */}
      <div className="print:hidden space-y-6">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
              <FileText className="h-8 w-8 text-blue-600" />
              Relatórios de Faturamento
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-1">Gere e imprima relatórios consolidados.</p>
          </div>
          <Button onClick={handlePrint} disabled={generatingPDF} className="rounded-xl px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-md">
             {generatingPDF ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Printer className="w-5 h-5 mr-2" />}
             {generatingPDF ? "Gerando PDF..." : "Baixar Relatório (PDF)"}
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
        <div className="bg-white text-black p-4 md:p-8 rounded-3xl shadow-xl border border-slate-200 w-full overflow-x-auto">
           {/* Cabeçalho */}
           <div className="text-center mb-8 border-b-2 border-slate-800 pb-4">
              <h1 className="text-2xl font-black uppercase tracking-widest text-slate-900">RELATÓRIO DE FATURAMENTO</h1>
              <h2 className="text-lg font-bold text-slate-700 mt-2">
                 TIPO: <span className="uppercase text-blue-700">{reportType}</span> | MÊS: <span className="uppercase text-blue-700">{format(currentDate, 'MMMM yyyy', { locale: ptBR })}</span>
              </h2>
           </div>

           {/* Renderização dos Grupos */}
           {renderGroups.map((group, idx) => {
             let grandTotal = 0

             return (
               <div key={group.id} className={cn("w-full", idx > 0 && "mt-16 pt-12 border-t-4 border-slate-800 border-dashed")}>
                 
                 {reportType === 'todos' && (
                   <h2 className="text-xl font-black text-slate-900 mb-8 uppercase tracking-widest bg-slate-100 p-3 rounded-lg border-l-4 border-blue-600">
                     {group.title}
                   </h2>
                 )}

                 {/* 1. Tabela Detalhada (Dias) */}
                 <div className="mb-12">
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-800 mb-4 bg-slate-100 p-2 inline-block rounded-md border border-slate-300">
                       Detalhamento Diário
                    </h3>
                    <div className="overflow-x-auto w-full">
                      <table className="w-full text-[10px] border-collapse border border-slate-400 font-mono table-fixed">
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
                          {group.services.map(s => {
                            let rowTotal = 0
                            return (
                              <tr key={s.id} className="hover:bg-slate-50">
                                <td className="border border-slate-400 p-1 font-bold text-slate-800 break-words leading-tight">{s.name}</td>
                                {daysArray.map(day => {
                                  const val = group.records[s.id]?.[day] || 0
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

                 {/* 2. Tabela Resumo Valorizado */}
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
                        {group.services.map(s => {
                          let estimatedQty = 0
                          daysArray.forEach(day => {
                            estimatedQty += (group.records[s.id]?.[day] || 0)
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
             )
           })}

        </div>
      )}

    </div>
  )
}
