import { useEffect, useState, useRef } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { 
  Printer, 
  FileText, 
  ArrowLeft,
  Loader2,
  Table as TableIcon
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useReactToPrint } from "react-to-print"
import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"
import * as XLSX from 'xlsx'
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

type MealType = 'desjejum' | 'almoco' | 'lanche_manha' | 'lanche_tarde' | 'jantar' | 'lanche_noite' | 'extras' | 'lactario'

export default function MealCountView() {
  const { unitId, date } = useParams<{ unitId: string, date: string }>()
  const navigate = useNavigate()
  const printRef = useRef(null)
  
  const [loading, setLoading] = useState(true)
  const [company, setCompany] = useState<any>(null)
  const [unit, setUnit] = useState<any>(null)
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

  useEffect(() => {
    fetchData()
  }, [unitId, date])

  const fetchData = async () => {
    if (!unitId || !date) return
    setLoading(true)
    try {
      const { data: configData } = await supabase.from('hospital_config').select('*').single()
      setCompany(configData)

      const { data: unitData } = await supabase.from('hospital_unidades').select('*').eq('id', unitId).single()
      setUnit(unitData)

      const { data: sectorsData } = await supabase.from('hospital_setores').select('*').eq('unidade_id', unitId).eq('active', true).order('name')
      setSectors(sectorsData || [])

      const sectorIds = sectorsData?.map(s => s.id) || []
      const { data: countsData } = await supabase.from('contagem_refeicoes').select('*').eq('data', date).in('setor_id', sectorIds)
      setCounts(countsData || [])

      if (countsData && countsData.length > 0) {
        const uniqueCreatorIds = [...new Set(countsData.map(c => c.criado_por).filter(Boolean))] as string[]
        if (uniqueCreatorIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('*').in('id', uniqueCreatorIds)
          const pMap: Record<string, any> = {}
          profiles?.forEach(p => { pMap[p.id] = p })
          setCreatorsMap(pMap)
        }
      }
    } catch (err) { import.meta.env.DEV && console.error(err) } finally { setLoading(false) }
  }

  const getMajorCreator = () => {
    if (!counts.length) return null;
    const creatorIds = counts.filter(c => (c.quantidade || 0) > 0).map(c => c.criado_por).filter(Boolean);
    const counts_map: Record<string, number> = {};
    creatorIds.forEach(id => { counts_map[id] = (counts_map[id] || 0) + 1; });
    const winnerId = Object.entries(counts_map).sort((a,b) => b[1] - a[1])[0]?.[0];
    return creatorsMap[winnerId || ""];
  }

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

  const getCountValue = (sectorId: number, mealId: MealType) => {
    return counts.filter(c => c.setor_id === sectorId && c.tipo_refeicao === mealId).reduce((acc, curr) => acc + (curr.quantidade || 0), 0)
  }

  const getColumnTotal = (mealId: MealType) => {
    return counts.filter(c => c.tipo_refeicao === mealId).reduce((acc, curr) => acc + (curr.quantidade || 0), 0)
  }

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `Auditoria_Prattus_${date}`,
  })

  const exportPDF = async () => {
    setLoading(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
      const margin = 15
      let currentY = 15
      if (company?.logo_url) doc.addImage(company.logo_url, 'PNG', margin, currentY, 55, 18)
      doc.setFontSize(14).setFont('helvetica', 'bold').setTextColor(37, 99, 235)
      doc.text(company?.razao_social || "Ideal Alimentação", 85, currentY + 5)
      doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(150, 150, 150)
      doc.text("AUDITORIA CONSOLIDADA DE REFEIÇÕES", 85, currentY + 10)

      const boxW = 120, boxH = 18, boxX = 297 - margin - boxW
      doc.setDrawColor(226, 232, 240).setFillColor(255, 255, 255).roundedRect(boxX, currentY, boxW, boxH, 3, 3, 'FD')
      doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(50, 50, 50).text(unit?.name || "UNIDADE", boxX + boxW - 5, currentY + 6, { align: 'right' })
      doc.setFontSize(7).setFont('helvetica', 'normal').setTextColor(100, 100, 100).text(`CNPJ: ${unit?.cnpj || '---'} | Data: ${format(parseISO(date!), 'dd/MM/yyyy')}`, boxX + boxW - 5, currentY + 11, { align: 'right' })
      doc.text(formatAddress(unit), boxX + boxW - 5, currentY + 15, { align: 'right' })
      currentY += 38
      doc.setDrawColor(59, 130, 246).setLineWidth(0.5).line(margin, currentY, 297 - margin, currentY)
      currentY += 8
      doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(`Referência: ${format(parseISO(date!), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, margin, currentY)
      currentY += 8
      autoTable(doc, {
        head: [['Setor', ...mealTypes.map(m => m.label)]],
        body: [...sectors.map(s => [s.name, ...mealTypes.map(m => getCountValue(s.id, m.id).toString())]), ['TOTAL GERAL', ...mealTypes.map(m => getColumnTotal(m.id).toString())]],
        startY: currentY,
        theme: 'grid',
        headStyles: { fillColor: [37, 99, 235], fontSize: 8, fontStyle: 'bold', halign: 'center' }, // #2563eb
        styles: { fontSize: 7, cellPadding: 2, halign: 'center', textColor: [0, 0, 0] },
        columnStyles: { 0: { fontStyle: 'bold', halign: 'left', minCellWidth: 40 } },
        didParseCell: (data) => { if (data.row.index === sectors.length && data.section === 'body') { data.cell.styles.fillColor = [245, 245, 245]; data.cell.styles.fontStyle = 'bold'; } }
      })
      const majorCreator = getMajorCreator(), finalY = (doc as any).lastAutoTable.finalY + 15
      doc.setFontSize(6).setFont('helvetica', 'bold').setTextColor(100, 150, 200).text("RESPONSABILIDADE TÉCNICA", margin, finalY)
      doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(0, 0, 0).text(`${majorCreator?.full_name?.toUpperCase() || 'USUÁRIO REGISTRADO'} | ${majorCreator?.job_title?.toUpperCase() || majorCreator?.role?.toUpperCase() || 'TÉCNICO'} | ${majorCreator?.email || '---'}`, margin, finalY + 5)
      
      // Sanitized filename
      const safeDate = date ? date.split('T')[0] : 'relatorio'
      const fileName = `SINTETICO_${safeDate}.pdf`
      doc.save(fileName)
    } catch (err: any) { import.meta.env.DEV && console.error(err); alert("Erro ao gerar PDF."); } finally { setLoading(false) }
  }

  const exportXLSX = () => {
    const majorCreator = getMajorCreator();
    const worksheetData = [["RELATÓRIO DE CONTAGEM"], [`Instituição: ${company?.razao_social || '---'}`], [`Unidade: ${unit?.name || '---'}`], [`Data: ${format(parseISO(date!), 'dd/MM/yyyy')}`], [], ["Setores", ...mealTypes.map(m => m.label)], ...sectors.map(s => [s.name, ...mealTypes.map(m => getCountValue(s.id, m.id))]), ["TOTAL GERAL", ...mealTypes.map(m => getColumnTotal(m.id))], [], [`Responsável: ${majorCreator?.full_name || '---'}`]]
    const ws = XLSX.utils.aoa_to_sheet(worksheetData), wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Contagem")
    
    // Sanitized filename
    const safeDate = date ? date.split('T')[0] : 'relatorio'
    XLSX.writeFile(wb, `SINTETICO_${safeDate}.xlsx`)
  }

  if (loading) return <div className="flex h-[60vh] items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-blue-600" /></div>
  const majorProfile = getMajorCreator();

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col md:flex-row items-center justify-between no-print px-4 py-4 md:py-2 gap-4">
        <Button variant="ghost" onClick={() => navigate(-1)} className="self-start md:self-auto rounded-xl gap-2 text-muted-foreground -ml-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </Button>
        <div className="grid grid-cols-2 md:flex gap-2 w-full md:w-auto">
          <Button onClick={exportXLSX} variant="outline" className="rounded-xl gap-2 h-10 md:h-9 text-xs font-bold w-full">
            <TableIcon className="h-3.5 w-3.5" />
            Excel
          </Button>
          <Button onClick={exportPDF} variant="outline" className="rounded-xl gap-2 h-10 md:h-9 text-xs font-bold w-full">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button onClick={() => handlePrint()} className="col-span-2 md:col-span-1 rounded-xl gap-2 bg-blue-600 h-10 md:h-9 text-xs font-black w-full">
            <Printer className="h-3.5 w-3.5" />
            Imprimir Relatório
          </Button>
        </div>
      </div>

      <div className="flex-1 bg-muted/20 pb-10 no-print overflow-x-auto">
        <div className="min-w-[1000px] md:min-w-0 flex justify-center p-4">
          <div ref={printRef} className="bg-white text-slate-950 p-[15mm] shadow-2xl w-[297mm] h-auto print:shadow-none print:p-0 print:w-full" style={{ minHeight: '210mm' }}>
          <div className="flex justify-between items-stretch mb-10">
            <div className="w-[70mm] flex items-center justify-start">
              {company?.logo_url && <img src={company.logo_url} alt="Logo" className="max-h-[80px] w-auto object-contain" />}
            </div>
            <div className="flex-1 px-8 flex flex-col justify-start pt-1">
              <h1 className="text-2xl font-bold text-blue-700 leading-tight">{company?.razao_social || "Ideal Alimentação"}</h1>
              <p className="text-[10px] font-medium text-slate-400 tracking-wider">AUDITORIA CONSOLIDADA DE REFEIÇÕES</p>
            </div>
            <div className="flex-none w-[120mm] border border-slate-200 rounded-2xl p-4 bg-slate-50/50 text-right flex flex-col justify-center">
              <h2 className="text-[11px] font-black text-slate-800 leading-tight uppercase">{unit?.name || "UNIDADE"}</h2>
              <p className="text-[9px] font-bold text-slate-500 mt-1">CNPJ: {unit?.cnpj || "---"} | Data: {format(parseISO(date!), 'dd/MM/yyyy')}</p>
              <p className="text-[9px] font-medium text-slate-400">{formatAddress(unit)}</p>
            </div>
          </div>
          <div className="h-0.5 bg-blue-600 w-full mb-4 bg-opacity-70"></div>
          <p className="mb-6 font-bold text-slate-800 text-sm">Referência: {format(parseISO(date!), "eeee, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
          <div className="overflow-hidden border border-slate-300 rounded-sm mb-10">
            <table className="w-full border-collapse">
              <thead className="bg-[#2563eb] text-white uppercase font-bold text-[10px]">
                <tr>
                  <th className="p-2.5 text-left border-r border-white/20 min-w-[150px]">Setor</th>
                  {mealTypes.map(m => <th key={m.id} className="p-2.5 text-center border-r border-white/20">{m.label}</th>)}
                </tr>
              </thead>
              <tbody className="text-[11px] text-slate-900 font-medium">
                {sectors.map(sector => (
                  <tr key={sector.id} className="border-b border-slate-200">
                    <td className="p-2 font-bold border-r border-slate-200 bg-slate-50/30">{sector.name}</td>
                    {mealTypes.map(m => <td key={m.id} className="p-2 text-center border-r border-slate-200">{getCountValue(sector.id, m.id) || "0"}</td>)}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold text-[12px] border-t-2 border-slate-300">
                  <td className="p-3 uppercase">Total Geral</td>
                  {mealTypes.map(m => <td key={m.id} className="p-3 text-center">{getColumnTotal(m.id)}</td>)}
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-auto pt-8 flex flex-col items-start gap-1">
            <p className="text-[9px] font-bold text-blue-400 tracking-widest uppercase">Responsabilidade Técnica</p>
            <div className="flex items-center gap-2 font-bold text-sm text-slate-800">
              <span className="uppercase">{majorProfile?.full_name || 'USUÁRIO REGISTRADO'}</span>
              <span className="text-blue-600">|</span>
              <span className="uppercase text-blue-600">{majorProfile?.job_title || majorProfile?.role || 'TÉCNICO'}</span>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500 font-normal">{majorProfile?.email || '---'}</span>
            </div>
          </div>
          </div>
        </div>
      </div>
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 10mm; }
          body { margin: 0; padding: 0; background: white !important; }
          .no-print { display: none !important; }
          table { border-collapse: collapse !important; }
          th, td { border: 1px solid #e2e8f0 !important; }
        }
      `}</style>
    </div>
  )
}
