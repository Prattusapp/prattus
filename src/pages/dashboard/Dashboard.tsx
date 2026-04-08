import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area,
  Cell
} from "recharts"
import { 
  Utensils, 
  TrendingUp, 
  Users, 
  Activity,
  PlusCircle,
  Calendar as CalendarIcon,
  Filter,
  RefreshCcw
} from "lucide-react"
import { cn } from "@/lib/utils"
import GettingStarted from "@/components/dashboard/GettingStarted"

const COLORS = ["#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe", "#dbeafe", "#bfdbfe", "#93c5fd", "#60a5fa"]

export default function Dashboard() {
  const [loading, setLoading] = useState(true)
  const [mealTypeData, setMealTypeData] = useState<any[]>([])
  const [trendData, setTrendData] = useState<any[]>([])
  const [stats, setStats] = useState<any[]>([])
  
  // Filtros - Padrão últimos 7 dias
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 6)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedMealType, setSelectedMealType] = useState<string>("all")

  // Estado de tela mobile
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    fetchDashboardData()
  }, [startDate, endDate, selectedMealType])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      // 1. Buscar Contagens Filtradas
      let query = supabase
        .from('contagem_refeicoes')
        .select('*, contagem_tipos(name)')
        .gte('data', startDate)
        .lte('data', endDate)

      if (selectedMealType !== 'all') {
        query = query.eq('tipo_refeicao', selectedMealType)
      }

      const { data: meals } = await query

      // Buscar Extras (apenas se 'all' ou 'extras')
      let extras: any[] = []
      if (selectedMealType === 'all' || selectedMealType === 'extras') {
        const { data: extrasData } = await supabase
          .from('extras_dieta')
          .select('quantidade, data')
          .gte('data', startDate)
          .lte('data', endDate)
        extras = extrasData || []
      }

      // Buscar Lactários (apenas se 'all' ou 'lactário')
      let lactarios: any[] = []
      if (selectedMealType === 'all' || selectedMealType === 'lactario') {
        const { data: lactariosData } = await supabase
          .from('lactario')
          .select('quantidade, data')
          .gte('data', startDate)
          .lte('data', endDate)
        lactarios = lactariosData || []
      }

      // Processar Dados
      let totalQty = 0
      const publicTotals: any = {}
      const distributionMap: any = {
        'Desjejum': 0, 'Lanche Manhã': 0, 'Almoço': 0, 'Lanche Tarde': 0, 'Jantar': 0, 'Lanche Noite': 0, 'Extras': 0, 'Lactário': 0
      }
      
      const trendMap: any = {}
      
      // Inicializar mapa de tendência baseado no intervalo
      const start = new Date(startDate)
      const end = new Date(endDate)
      const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
      const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

      for (let i = 0; i <= (daysDiff > 30 ? 30 : daysDiff); i++) {
        const d = new Date(startDate)
        d.setDate(d.getDate() + i + 1) // +1 for timezone offset adjustment
        const dateStr = d.toISOString().split('T')[0]
        const dayLabel = daysDiff <= 7 ? daysOfWeek[d.getUTCDay()] : dateStr.split('-').reverse().slice(0, 2).join('/')
        trendMap[dateStr] = { day: dayLabel, total: 0 }
      }

      meals?.forEach(m => {
        const qty = m.quantidade || 0
        totalQty += qty
        
        const pubName = m.contagem_tipos?.name || 'Outros'
        publicTotals[pubName] = (publicTotals[pubName] || 0) + qty
        
        // Mapa de Distribuição
        let label = 'Desjejum'
        if (m.tipo_refeicao === 'desjejum') label = 'Desjejum'
        else if (m.tipo_refeicao === 'lanche_manha') label = 'Lanche Manhã'
        else if (m.tipo_refeicao === 'almoco') label = 'Almoço'
        else if (m.tipo_refeicao === 'lanche_tarde') label = 'Lanche Tarde'
        else if (m.tipo_refeicao === 'jantar') label = 'Jantar'
        else if (m.tipo_refeicao === 'lanche_noite') label = 'Lanche Noite'
        
        distributionMap[label] = (distributionMap[label] || 0) + qty

        // Mapa de Tendência
        if (trendMap[m.data]) trendMap[m.data].total += qty
      })

      const extraQty = extras.reduce((a, b) => a + (b.quantidade || 0), 0)
      const lactarioQty = lactarios.reduce((a, b) => a + (b.quantidade || 0), 0)
      
      distributionMap['Extras'] += extraQty
      distributionMap['Lactário'] += lactarioQty
      
      // Adicionar Extras e Lactários à tendência
      extras.forEach(e => { if (trendMap[e.data]) trendMap[e.data].total += (e.quantidade || 0) })
      lactarios.forEach(l => { if (trendMap[l.data]) trendMap[l.data].total += (l.quantidade || 0) })

      const grandTotal = totalQty + extraQty + lactarioQty
      const isToday = startDate === endDate && startDate === new Date().toISOString().split('T')[0]

      // Preparar Cartões
      const cards = [
        { title: isToday ? "Total Hoje" : "Total Período", value: grandTotal, icon: <Utensils className="h-5 w-5" />, color: "blue" },
        ...Object.entries(publicTotals)
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3)
          .map(([name, value], idx) => ({
            title: name,
            value: value,
            icon: idx === 0 ? <Users className="h-5 w-5" /> : idx === 1 ? <Activity className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />,
            color: idx === 0 ? "indigo" : idx === 1 ? "slate" : "blue"
          }))
      ]

      while (cards.length < 4) {
        cards.push({ title: "Extras/Lactário", value: extraQty + lactarioQty, icon: <PlusCircle className="h-5 w-5" />, color: "slate" })
      }

      setStats(cards)
      setMealTypeData(
        Object.entries(distributionMap)
          .map(([name, total]) => ({ name, total }))
          .filter((item: any) => 
            item.total > 0 || 
            (selectedMealType === 'all' && ['Desjejum', 'Lanche Manhã', 'Almoço', 'Lanche Tarde', 'Jantar', 'Lanche Noite'].includes(item.name))
          )
      )
      setTrendData(Object.values(trendMap))

    } catch (err) {
      import.meta.env.DEV && console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-10">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Painel de Controle
          </h1>
          <p className="text-muted-foreground mt-1">Gestão operacional de refeições e análises.</p>
        </div>
        
        <div className="flex flex-wrap items-center justify-center gap-3 bg-muted/20 p-2 rounded-2xl border border-border/50">
          <div className="flex items-center gap-2 px-3 py-1.5 border-border/50 md:border-r">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-32"
            />
            <span className="text-muted-foreground mx-1">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none w-32"
            />
          </div>
          
          <div className="flex items-center gap-2 px-3 py-1.5 border-border/50 md:border-r">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select 
              value={selectedMealType}
              onChange={(e) => setSelectedMealType(e.target.value)}
              className="bg-transparent border-none p-0 text-sm font-bold focus:ring-0 outline-none cursor-pointer appearance-none pr-4"
            >
              <option value="all">Todos Serviços</option>
              <option value="desjejum">Desjejum</option>
              <option value="lanche_manha">Lanche Manhã</option>
              <option value="almoco">Almoço</option>
              <option value="lanche_tarde">Lanche Tarde</option>
              <option value="jantar">Jantar</option>
              <option value="lanche_noite">Lanche Noite</option>
              <option value="extras">Dietas/Extras</option>
              <option value="lactario">Lactário</option>
            </select>
          </div>

          <button 
            onClick={fetchDashboardData}
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted transition-colors"
          >
            <RefreshCcw className={cn("h-4 w-4 text-blue-600", loading && "animate-spin")} />
          </button>
        </div>
      </header>

      {/* Checklist de Boas-vindas baseada em progresso real */}
      <GettingStarted />

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 rounded-3xl bg-muted animate-pulse" />
          ))
        ) : (
          stats.map((stat, i) => (
            <StatCard 
              key={i}
              title={stat.title} 
              value={stat.value.toString()} 
              icon={stat.icon} 
              trend="+0.0%" // Trend real poderia ser implementada comparando datas
              color={stat.color}
            />
          ))
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-3 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-lg font-bold">Tendência Semanal</h3>
              <p className="text-sm text-muted-foreground">Volume total de refeições nos últimos 7 dias</p>
            </div>
          </div>
          <div className={cn("w-full transition-all", isMobile ? "h-[220px]" : "h-[300px]")}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="day" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 9 : 10 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '16px',
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="total" 
                  stroke="#3b82f6" 
                  strokeWidth={3}
                  fillOpacity={1} 
                  fill="url(#colorTotal)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="lg:col-span-4 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="mb-8">
            <h3 className="text-lg font-bold">Distribuição por Tipo</h3>
            <p className="text-sm text-muted-foreground">Volume de refeições por categoria hoje</p>
          </div>
          <div className={cn("w-full transition-all", isMobile ? "h-[250px]" : "h-[300px]")}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mealTypeData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: isMobile ? 10 : 12 }}
                  interval={0}
                  angle={isMobile ? -45 : 0}
                  textAnchor={isMobile ? "end" : "middle"}
                  height={isMobile ? 70 : 30}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '16px'
                  }}
                />
                <Bar dataKey="total" radius={[6, 6, 0, 0]}>
                  {mealTypeData.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string, icon: React.ReactNode, trend: string, color: string }) {
  const isPositive = trend.startsWith('+')
  
  return (
    <div className="group rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-500/20">
      <div className="flex items-center justify-between mb-4">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-2xl ring-1",
          color === "blue" ? "bg-blue-600/10 text-blue-600 ring-blue-500/20" : "bg-indigo-600/10 text-indigo-600 ring-indigo-500/20"
        )}>
          {icon}
        </div>
        <div className={cn(
          "text-xs font-bold px-2 py-1 rounded-full",
          isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
        )}>
          {trend}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black">{value}</h4>
      </div>
    </div>
  )
}
