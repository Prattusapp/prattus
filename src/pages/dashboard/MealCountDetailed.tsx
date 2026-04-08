import { useEffect, useState, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Printer, 
  Loader2,
  Search,
  FileDown,
  FileSpreadsheet
} from "lucide-react"
import { utils, writeFile } from "xlsx"
import { Button } from "@/components/ui/button"
import { useReactToPrint } from "react-to-print"
import { format, parseISO } from "date-fns"
import { cn } from "@/lib/utils"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

type MealType = 'desjejum' | 'almoco' | 'lanche_manha' | 'lanche_tarde' | 'jantar' | 'lanche_noite' | 'extras' | 'lactario'

interface CountType {
  id: string
  name: string
}

export default function MealCountDetailed() {
  const printRef = useRef(null)
  
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  
  // Filters
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0])
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedUnitId, setSelectedUnitId] = useState<string>("")
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")
  
  // Data State
  const [unidades, setUnidades] = useState<any[]>([])
  const [countTypes, setCountTypes] = useState<CountType[]>([])
  const [company, setCompany] = useState<any>(null)
  const [sectors, setSectors] = useState<any[]>([])
  const [counts, setCounts] = useState<any[]>([])
  const [creatorsMap, setCreatorsMap] = useState<Record<string, any>>({})

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

  useEffect(() => { fetchInitialData() }, [])

  const fetchInitialData = async () => {
    setLoading(true)
    try {
      const { data: configData } = await supabase.from('hospital_config').select('*').single()
      setCompany(configData)
      const { data: uData } = await supabase.from('hospital_unidades').select('*').order('name')
      setUnidades(uData || [])
      if (uData && uData.length > 0) setSelectedUnitId(uData[0].id)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { if (selectedUnitId) fetchTypesByUnit() }, [selectedUnitId])

  const fetchTypesByUnit = async () => {
    try {
      const { data } = await supabase.from('contagem_tipos').select('id, name').eq('unidade_id', selectedUnitId).eq('active', true).order('name')
      setCountTypes(data || [])
    } catch (err) { console.error(err) }
  }

  const handleSearch = async () => {
    if (!selectedUnitId || !startDate || !endDate) return
    setSearching(true)
    try {
      const { data: sectorsData } = await supabase.from('hospital_setores').select('*').eq('unidade_id', selectedUnitId).eq('active', true).order('name')
      setSectors(sectorsData || [])
      const sectorIds = sectorsData?.map(s => s.id) || []
      let query = supabase.from('contagem_refeicoes').select('*').gte('data', startDate).lte('data', endDate).in('setor_id', sectorIds)
      if (selectedTypeId !== "all") query = query.eq('tipo_contagem_id', selectedTypeId)
      const { data: countsData } = await query
      setCounts(countsData || [])
      if (countsData && countsData.length > 0) {
        const uniqueCreatorIds = [...new Set(countsData.map(c => c.criado_por).filter(Boolean))] as string[]
        const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueCreatorIds)
        const pMap: Record<string, any> = {}
        profiles?.forEach(p => { pMap[p.id] = p })
        setCreatorsMap(pMap)
      }
    } catch (err) { console.error(err) } finally { setSearching(false) }
  }

  const getCountValue = (sectorId: number, mealId: MealType, typeId: string) => {
    return counts.filter(c => c.setor_id === sectorId && c.tipo_refeicao === mealId && c.tipo_contagem_id === typeId).reduce((acc, curr) => acc + (curr.quantidade || 0), 0)
  }

  const getColumnTotal = (mealId: MealType, typeId: string) => {
    return counts.filter(c => c.tipo_refeicao === mealId && c.tipo_contagem_id === typeId).reduce((acc, curr) => acc + (curr.quantidade || 0), 0)
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Relatorio_Analitico_${startDate}_a_${endDate}`,
  })

  const formatAddress = (u: any) => {
    if (!u) return "---"
    if (u.address && u.address.length > 5) return u.address
    const parts = [
      u.logradouro,
      u.numero ? `Nº ${u.numero}` : null,
      u.bairro,
      u.cidade ? `${u.cidade}${u.uf ? `/${u.uf}` : ''}` : null
    ].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : "---"
  }

  const generatePDF = () => {
    if (!activeTypesToDisplay.length) return
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      activeTypesToDisplay.forEach((type, idx) => {
        if (idx > 0) doc.addPage()
        const margin = 15
        let currentY = 15

        if (company?.logo_url) doc.addImage(company.logo_url, 'PNG', margin, currentY, 55, 18)
        doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(37, 99, 235)
        doc.text(company?.razao_social || "Ideal Alimentação", 85, currentY + 5)
        doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(150, 150, 150)
        doc.text(`RELATÓRIO ANALÍTICO - PERÍODO: ${format(parseISO(startDate), "dd/MM/yyyy")} ATÉ ${format(parseISO(endDate), "dd/MM/yyyy")}`, 85, currentY + 10)
        doc.text(`PÚBLICO: ${type.name.toUpperCase()}`, 85, currentY + 14)

        const boxW = 120, boxH = 18, boxX = 297 - margin - boxW
        doc.setDrawColor(226, 232, 240).setFillColor(255, 255, 255).roundedRect(boxX, currentY, boxW, boxH, 3, 3, 'FD')
        doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(50, 50, 50).text(currentUnit?.name || "UNIDADE", boxX + boxW - 5, currentY + 6, { align: 'right' })
        doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(100, 100, 100).text(`CNPJ: ${currentUnit?.cnpj || '---'} | Período: ${format(parseISO(startDate), 'dd/MM/yyyy')} - ${format(parseISO(endDate), 'dd/MM/yyyy')}`, boxX + boxW - 5, currentY + 11, { align: 'right' })
        doc.text(formatAddress(currentUnit), boxX + boxW - 5, currentY + 15, { align: 'right' })
        
        currentY += 38
        doc.setDrawColor(59, 130, 246).setLineWidth(0.5).line(margin, currentY, 297 - margin, currentY)
        currentY += 8
        doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(`Período de Referência: ${format(parseISO(startDate), "dd/MM/yyyy")} até ${format(parseISO(endDate), "dd/MM/yyyy")}`, margin, currentY)
        currentY += 8

        const tableData = sectors.map(sector => [sector.name, ...mealTypes.map(m => getCountValue(sector.id, m.id, type.id).toString())])
        autoTable(doc, {
          startY: currentY,
          head: [['SETOR / CLÍNICA', ...mealTypes.map(m => m.label.toUpperCase())]],
          body: [...tableData, ['TOTAL GERAL', ...mealTypes.map(m => getColumnTotal(m.id, type.id).toString())]],
          margin: { left: margin, right: margin },
          theme: 'grid',
          headStyles: { fillColor: [37, 99, 235], fontSize: 8, halign: 'center' }, // #2563eb
          styles: { fontSize: 7, cellPadding: 2, halign: 'center', textColor: [0, 0, 0] },
          columnStyles: { 0: { halign: 'left', fontStyle: 'bold', minCellWidth: 50 } },
          didParseCell: (data) => { if (data.row.index === sectors.length && data.section === 'body') { data.cell.styles.fillColor = [245, 245, 245]; data.cell.styles.fontStyle = 'bold'; } }
        })

        const typeCounts = counts.filter(c => c.tipo_contagem_id === type.id && (c.quantidade || 0) > 0);
        const creatorIds = typeCounts.map(c => c.criado_por).filter(Boolean);
        const counts_map: Record<string, number> = {};
        creatorIds.forEach(id => { counts_map[id] = (counts_map[id] || 0) + 1; });
        const winnerId = Object.entries(counts_map).sort((a,b) => b[1] - a[1])[0]?.[0];
        const creator = creatorsMap[winnerId || ""];
        const finalY = (doc as any).lastAutoTable.finalY + 15
        
        doc.setFontSize(6).setFont('helvetica', 'bold').setTextColor(100, 150, 200).text("RESPONSABILIDADE TÉCNICA", margin, finalY)
        doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(`${creator?.full_name?.toUpperCase() || 'USUÁRIO REGISTRADO'} | ${creator?.job_title?.toUpperCase() || creator?.role?.toUpperCase() || 'TÉCNICO'} | ${creator?.email || '---'}`, margin, finalY + 5)
        doc.setFontSize(7).text(`Folha ${idx + 1} de ${activeTypesToDisplay.length} | Gerado em ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 282, 195, { align: 'right' })
      })
      doc.save(`Relatorio_Analitico_Prattus_${startDate}_a_${endDate}.pdf`)
    } catch (err) { console.error(err); alert("Erro ao gerar PDF."); }
  }
  
  const exportXLS = () => {
    const wb = utils.book_new()
    
    // Função para criar uma aba com o menu de "Slicer"
    const createSheet = (_sheetName: string, targetType?: any) => {
      const aoa: any[][] = [
        [], // Linha 1: Espaço para o cabeçalho
        [], // Linha 2: Menu de Segmentação (Slicer)
        [], // Linha 3: Respiro
        ['SETOR / CLÍNICA', ...mealTypes.map(m => m.label.toUpperCase()), 'TOTAL'] // Linha 4: Cabeçalho da Tabela
      ]

      // 1. Gerar os dados da tabela
      const typesToProcess = targetType ? [targetType] : activeTypesToDisplay
      let currentRowCount = 0

      typesToProcess.forEach(type => {
        // Se for a aba "TUDO", adicionamos um cabeçalho de grupo
        if (!targetType) {
          aoa.push([`--- PÚBLICO: ${type.name.toUpperCase()} ---`])
        }

        sectors.forEach(sector => {
          const vals = mealTypes.map(m => getCountValue(sector.id, m.id, type.id))
          const total = vals.reduce((a, b) => a + b, 0)
          if (total > 0) {
            aoa.push([sector.name, ...vals, total])
            currentRowCount++
          }
        })
      })

      if (currentRowCount === 0 && targetType) return null

      const ws = utils.aoa_to_sheet(aoa)
      
      // 2. Configurar o "Slicer" (Menu de Navegação no Topo Direito - Colunas I, J, K)
      // Vamos colocar o nome do público atual no local em destaque
      ws['I1'] = { v: "Navegação (Slicer):", t: 's' }
      const menuStartCol = 8 // Coluna I
      
      const menuOptions = [{ name: 'GERAL', sheet: 'GERAL' }, ...activeTypesToDisplay.map(t => ({ name: t.name, sheet: t.name.substring(0, 31) }))]
      
      menuOptions.forEach((opt, idx) => {
        const cellRef = utils.encode_cell({ c: menuStartCol + idx, r: 1 })
        ws[cellRef] = { 
          v: `[ ${opt.name.toUpperCase()} ]`, 
          t: 's',
          l: { Target: `#'${opt.sheet}'!A1`, Tooltip: `Ir para ${opt.name}` }
        }
      })

      // 3. AutoFiltro na linha 4
      const range = { s: { c: 0, r: 3 }, e: { c: 9, r: aoa.length - 1 } }
      ws['!autofilter'] = { ref: utils.encode_range(range) }
      
      // Ajustar larguras de coluna
      ws['!cols'] = [{ wch: 40 }, ...mealTypes.map(() => ({ wch: 15 })), { wch: 10 }]

      return ws
    }

    // Criar a aba Geral
    const wsGeral = createSheet('GERAL')
    if (wsGeral) utils.book_append_sheet(wb, wsGeral, "GERAL")

    // Criar as abas individuais
    activeTypesToDisplay.forEach(type => {
      const sheetName = type.name.substring(0, 31)
      const ws = createSheet(sheetName, type)
      if (ws) {
        ws['I1'] = { v: `PERÍODO: ${format(parseISO(startDate), "dd/MM/yyyy")} ATÉ ${format(parseISO(endDate), "dd/MM/yyyy")}`, t: 's' }
        utils.book_append_sheet(wb, ws, sheetName)
      }
    })

    writeFile(wb, `Analitico_Prattus_${startDate}_a_${endDate}.xlsx`)
  }

  const currentUnit = unidades.find(u => u.id === selectedUnitId)
  const activeTypesToDisplay = selectedTypeId === "all" ? countTypes.filter(ct => counts.some(c => c.tipo_contagem_id === ct.id)) : countTypes.filter(ct => ct.id === selectedTypeId)

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>

  return (
    <div className="space-y-6 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between no-print px-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">Relatório Analítico</h1>
          <p className="text-muted-foreground font-medium">Visão detalhada por público.</p>
        </div>
        <div className="flex gap-2">
          {counts.length > 0 && (
            <>
              <Button onClick={exportXLS} variant="outline" className="rounded-xl border-emerald-600/30 text-emerald-600 gap-2 font-bold h-10"><FileSpreadsheet className="h-4 w-4" />Baixar Excel</Button>
              <Button onClick={generatePDF} variant="outline" className="rounded-xl border-blue-600/30 text-blue-600 gap-2 font-bold h-10"><FileDown className="h-4 w-4" />Baixar PDF</Button>
              <Button onClick={() => handlePrint()} className="rounded-xl bg-blue-600 gap-2 font-bold h-10"><Printer className="h-4 w-4" />Imprimir</Button>
            </>
          )}
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-5 items-end p-6 rounded-2xl border bg-card/10 no-print">
        <div className="space-y-1.5 col-span-2 grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data Inicial</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600/20" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data Final</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-600/20" />
          </div>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unidade</label>
          <select value={selectedUnitId} onChange={(e) => setSelectedUnitId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" >
            {unidades.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Público</label>
          <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none" >
            <option value="all">Todos</option>
            {countTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <Button onClick={handleSearch} disabled={searching} className="rounded-xl bg-blue-600 h-10 font-bold gap-2">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Buscar</Button>
      </div>

      <div className="w-full overflow-x-auto pb-4">
        <div className="space-y-10 px-2 min-w-[210mm]" ref={printRef}>
        {searching ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /><p className="font-bold text-muted-foreground">Cruzando dados...</p></div>
        ) : activeTypesToDisplay.map((type, idx) => {
            const typeCounts = counts.filter(c => c.tipo_contagem_id === type.id && (c.quantidade || 0) > 0);
            const creatorIds = typeCounts.map(c => c.criado_por).filter(Boolean);
            const counts_map: Record<string, number> = {};
            creatorIds.forEach(id => { counts_map[id] = (counts_map[id] || 0) + 1; });
            const winnerId = Object.entries(counts_map).sort((a,b) => b[1] - a[1])[0]?.[0];
            const creator = creatorsMap[winnerId || ""];

            return (
              <div key={type.id} className="bg-white text-slate-950 p-[15mm] border rounded-2xl shadow-sm print:shadow-none print:border-none print:p-0 break-after-page min-h-[180mm] w-[210mm] mx-auto">
                <div className="flex justify-between items-stretch mb-10">
                  <div className="w-[70mm] flex items-center justify-start">
                    {company?.logo_url && <img src={company.logo_url} alt="Logo" className="max-h-[80px] w-auto object-contain" />}
                  </div>
                  <div className="flex-1 px-8 flex flex-col justify-start pt-1">
                    <h2 className="text-2xl font-bold text-blue-700 leading-tight">{company?.razao_social || "Ideal Alimentação"}</h2>
                    <p className="text-[10px] font-medium text-slate-400 tracking-wider">RELATÓRIO ANALÍTICO - {type.name.toUpperCase()}</p>
                  </div>
                  <div className="w-[120mm] border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-right flex flex-col justify-center">
                    <h2 className="text-[11px] font-black text-slate-800 leading-tight uppercase">{currentUnit?.name || "UNIDADE"}</h2>
                    <p className="text-[9px] font-bold text-slate-500 mt-1">CNPJ: {currentUnit?.cnpj || "---"} | Período: {format(parseISO(startDate), 'dd/MM/yyyy')} - {format(parseISO(endDate), 'dd/MM/yyyy')}</p>
                    <p className="text-[9px] font-medium text-slate-400">{formatAddress(currentUnit)}</p>
                  </div>
                </div>
                <div className="h-0.5 bg-blue-600 w-full mb-4 bg-opacity-70"></div>
                <p className="mb-6 font-bold text-slate-800 text-sm">Referência: {format(parseISO(startDate), "dd/MM/yyyy")} até {format(parseISO(endDate), "dd/MM/yyyy")}</p>
                <div className="overflow-x-auto border border-slate-300 rounded-sm mb-10">
                  <table className="w-full border-collapse">
                    <thead className="bg-[#2563eb] text-white uppercase font-bold text-[10px]">
                      <tr>
                        <th className="p-2.5 text-left border-r border-white/20 min-w-[150px]">Setor / Clínica</th>
                        {mealTypes.map(m => <th key={m.id} className="p-2.5 text-center border-r border-white/20">{m.label}</th>)}
                      </tr>
                    </thead>
                    <tbody className="text-[11px] text-slate-900 font-medium">
                      {sectors.map(sector => (
                        <tr key={sector.id} className="border-b border-slate-200">
                          <td className="p-2 font-bold border-r border-slate-200 bg-slate-50/30">{sector.name}</td>
                          {mealTypes.map(m => {
                            const val = getCountValue(sector.id, m.id, type.id);
                            return <td key={m.id} className={cn("p-2 text-center border-r border-slate-200", val > 0 ? "font-bold text-blue-700 bg-blue-50/50" : "text-slate-300")}>{val || "0"}</td>
                          })}
                        </tr>
                      ))}
                      <tr className="bg-slate-50 font-bold text-[12px] border-t-2 border-slate-300">
                        <td className="p-3 uppercase">TOTAL GERAL</td>
                        {mealTypes.map(m => <td key={m.id} className="p-3 text-center">{getColumnTotal(m.id, type.id)}</td>)}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="mt-auto pt-8 flex flex-col items-start gap-1">
                  <p className="text-[9px] font-bold text-blue-400 tracking-widest uppercase">Responsabilidade Técnica</p>
                  <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
                    <span className="uppercase">{creator?.full_name || 'USUÁRIO REGISTRADO'}</span>
                    <span className="text-blue-600">|</span>
                    <span className="uppercase text-blue-600">{creator?.job_title || creator?.role || 'TÉCNICO'}</span>
                    <span className="text-slate-300">|</span>
                    <span className="text-slate-500 font-normal">{creator?.email || '---'}</span>
                  </div>
                  <p className="text-[8px] text-slate-400 mt-4">Folha {idx + 1} de {activeTypesToDisplay.length} - Gerado em {format(new Date(), "dd/MM/yyyy HH:mm")}</p>
                </div>
              </div>
            )
          })}
      </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          .no-print { display: none !important; }
          .break-after-page { page-break-after: always; }
          body { background: white !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
    </div>
  )
}
