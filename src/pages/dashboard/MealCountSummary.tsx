import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { 
  Calendar as CalendarIcon, 
  Search, 
  ChevronRight, 
  FileText,
  Filter,
  History
} from "lucide-react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { format, subDays, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"

interface ArchiveRecord {
  data: string
  unidade_id: string
  unidade_name: string
  total_meal_count: number
  unique_sectors: number
  creator_name: string
  creator_role: string
}

export default function MealCountSummary() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [records, setRecords] = useState<ArchiveRecord[]>([])
  
  // Filters
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'))
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'))

  const fetchArchives = async () => {
    setLoading(true)
    try {
      // 1. Fetch all Units for naming
      const { data: unitsData } = await supabase.from('hospital_unidades').select('id, name')
      const unitsMap: Record<string, string> = {}
      unitsData?.forEach(u => { unitsMap[u.id] = u.name })

      // 2. Fetch all Sectors to map them to units
      const { data: sectorsData } = await supabase.from('hospital_setores').select('id, unidade_id')
      const sectorToUnitMap: Record<number, string> = {}
      sectorsData?.forEach(s => { sectorToUnitMap[s.id] = s.unidade_id })

      // 3. Query counts
      const { data, error } = await supabase
        .from('contagem_refeicoes')
        .select('data, quantidade, setor_id, criado_por')
        .gte('data', startDate)
        .lte('data', endDate)
        .order('data', { ascending: false })

      if (error) throw error

      if (!data) {
        setRecords([])
        return
      }

      // 4. Group by [Date + Unit]
      const grouped = data.reduce((acc: any, curr) => {
        const date = curr.data
        const unitId = sectorToUnitMap[curr.setor_id] || 'undefined'
        const key = `${date}_${unitId}`

        if (!acc[key]) {
          acc[key] = { 
            data: date, 
            unidade_id: unitId,
            unidade_name: unitsMap[unitId] || "Unidade não identificada",
            total_meal_count: 0, 
            sectors: new Set(),
            creators: {} as Record<string, number>
          }
        }
        acc[key].total_meal_count += (curr.quantidade || 0)
        if (curr.setor_id) acc[key].sectors.add(curr.setor_id)
        
        if (curr.criado_por) {
          acc[key].creators[curr.criado_por] = (acc[key].creators[curr.criado_por] || 0) + 1
        }
        return acc
      }, {})

      // 5. Fetch profiles for winning creators
      const allCreatorIds = [...new Set(data.map(d => d.criado_por).filter(Boolean))] as string[]
      let profilesMap: Record<string, any> = {}
      if (allCreatorIds.length > 0) {
        const { data: pData } = await supabase.from('profiles').select('id, full_name, role, job_title').in('id', allCreatorIds)
        pData?.forEach(p => { profilesMap[p.id] = p })
      }

      const result: ArchiveRecord[] = Object.values(grouped).map((item: any) => {
        // Find major creator
        const winnerId = Object.entries(item.creators as Record<string, number>)
          .sort((a, b) => b[1] - a[1])[0]?.[0]
        const profile = profilesMap[winnerId || ""]

        return {
          data: item.data,
          unidade_id: item.unidade_id,
          unidade_name: item.unidade_name,
          total_meal_count: item.total_meal_count,
          unique_sectors: item.sectors.size,
          creator_name: profile?.full_name || "Sistema",
          creator_role: profile?.job_title || profile?.role || "Técnico"
        }
      })

      setRecords(result)
    } catch (err) {
      console.error("Error fetching archives:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchArchives()
  }, [startDate, endDate])

  const setLast7Days = () => {
    const end = new Date()
    const start = subDays(end, 7)
    setStartDate(format(start, 'yyyy-MM-dd'))
    setEndDate(format(end, 'yyyy-MM-dd'))
  }

  const handleRowClick = (date: string, unitId: string) => {
    // Navigate to Premium View (Consolidated)
    navigate(`/contagem/view/${unitId}/${date}`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
            Relatório Sintético
          </h1>
          <p className="text-muted-foreground">Histórico consolidado de refeições por unidade (Total Geral).</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <Button 
            variant="outline" 
            onClick={setLast7Days}
            className="rounded-xl border-border/50 bg-card/50 backdrop-blur-sm hover:bg-blue-600/10 hover:text-blue-600 transition-all gap-2"
          >
            <History className="h-4 w-4" />
            Últimos 7 Dias
          </Button>
        </div>
      </header>

      {/* Filters Card */}
      <div className="grid gap-4 md:grid-cols-[1fr,1fr,auto] items-end p-6 rounded-2xl border border-border/50 bg-card/30 backdrop-blur-md shadow-sm">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Data Inicial</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-widest text-muted-foreground ml-1">Data Final</label>
          <div className="relative">
            <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full rounded-xl border border-border/50 bg-background pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-600/20 outline-none transition-all"
            />
          </div>
        </div>

        <Button 
          onClick={fetchArchives}
          className="h-[42px] px-6 rounded-xl bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/20 gap-2 font-bold"
        >
          <Search className="h-4 w-4" />
          Filtrar Período
        </Button>
      </div>

      {/* Records List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="text-muted-foreground animate-pulse">Buscando dados...</p>
          </div>
        ) : records.length > 0 ? (
          records.map((record) => (
            <div 
              key={`${record.data}_${record.unidade_id}`}
              onClick={() => handleRowClick(record.data, record.unidade_id)}
              className="group relative flex items-center justify-between p-5 rounded-2xl border border-border/50 bg-card/50 hover:bg-muted/50 hover:border-blue-600/30 transition-all cursor-pointer shadow-sm overflow-hidden"
            >
              <div className="absolute inset-y-0 left-0 w-1 bg-transparent group-hover:bg-blue-600 transition-all" />
              
              <div className="flex items-center gap-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <FileText className="h-6 w-6" />
                </div>
                
                <div className="flex flex-col flex-1">
                  <h3 className="font-black text-lg">
                    {format(parseISO(record.data), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </h3>
                  <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-3 text-sm">
                    <span className="font-black text-blue-600 uppercase tracking-widest text-[10px] leading-tight">
                      {record.unidade_name}
                    </span>
                    <span className="hidden md:inline text-muted-foreground/30">•</span>
                    <div className="flex items-center gap-1 text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-tight">
                      <span className="md:hidden text-slate-400">POR: </span>
                      <span className="text-slate-800">{record.creator_name}</span>
                      <span className="mx-1 opacity-40">|</span>
                      <span className="text-slate-400 font-medium lowercase first-letter:uppercase">{record.creator_role}</span>
                    </div>
                    <span className="hidden md:flex items-center gap-1.5 text-muted-foreground font-medium ml-auto">
                      <Filter className="h-3.5 w-3.5" />
                      {record.unique_sectors} setores registrados
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-1 uppercase tracking-widest">Total Geral</p>
                  <p className="text-2xl font-black text-blue-600 tracking-tighter">{record.total_meal_count}</p>
                </div>
                <div className="h-10 w-10 flex items-center justify-center rounded-full bg-muted group-hover:bg-blue-600/10 group-hover:text-blue-600 transition-all">
                  <ChevronRight className="h-5 w-5" />
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-20 px-6 rounded-3xl border border-dashed border-border/50 bg-card/20 text-center">
            <div className="h-20 w-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
              <History className="h-10 w-10 text-muted-foreground/50" />
            </div>
            <h3 className="text-xl font-bold">Nenhum registro encontrado</h3>
            <p className="text-muted-foreground max-w-sm mt-2">
              Não foram encontradas contagens no período selecionado.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
