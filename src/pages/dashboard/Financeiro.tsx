import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { 
  TrendingUp, 
  DollarSign, 
  Utensils, 
  Users, 
  Calendar,
  Filter,
  ArrowUpRight,
  ChevronRight,
  Activity,
  Baby,
  FileDown,
  FileText
} from "lucide-react"
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts"
import { cn } from "@/lib/utils"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const COLORS = ["#3b82f6", "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981", "#06b6d4"]

export default function Financeiro() {
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setDate(1) // Início do mês atual
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedPublic, setSelectedPublic] = useState("all")
  const [selectedService, setSelectedService] = useState("all")
  
  const [publicTypes, setPublicTypes] = useState<any[]>([])
  const [config, setConfig] = useState<any>(null)
  
  const [stats, setStats] = useState({
    totalMeals: 0,
    totalValue: 0,
    avgValue: 0,
    growth: "+0.0%",
    efficiency: "0.0%"
  })
  
  const [serviceData, setServiceData] = useState<any[]>([])
  const [publicData, setPublicData] = useState<any[]>([])
  const [dailyTrend, setDailyTrend] = useState<any[]>([])
  const [rawData, setRawData] = useState<any[]>([])

  useEffect(() => {
    fetchBaseData()
  }, [])

  useEffect(() => {
    if (config) calculateFinancials()
  }, [startDate, endDate, selectedPublic, selectedService, config])

  const fetchBaseData = async () => {
    try {
      const { data: pTypes } = await supabase.from('contagem_tipos').select('*').eq('active', true)
      setPublicTypes(pTypes || [])
      
      const { data: cfg } = await supabase.from('hospital_config').select('*').single()
      setConfig(cfg)
    } catch (err) {
      console.error(err)
    }
  }

  const calculateFinancials = async () => {
    setLoading(true)
    try {
      // Cálculo do período anterior para comparação
      const start = new Date(startDate)
      const end = new Date(endDate)
      const diffTime = Math.abs(end.getTime() - start.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1

      const prevEnd = new Date(start)
      prevEnd.setDate(prevEnd.getDate() - 1)
      const prevStart = new Date(prevEnd)
      prevStart.setDate(prevStart.getDate() - (diffDays - 1))

      const prevStartDateStr = prevStart.toISOString().split('T')[0]
      const prevEndDateStr = prevEnd.toISOString().split('T')[0]

      // 1. Buscar Contagens (Período Atual)
      let query = supabase
        .from('contagem_refeicoes')
        .select(`*, contagem_tipos(name), hospital_setores(name)`)
        .gte('data', startDate)
        .lte('data', endDate)

      if (selectedPublic !== "all") query = query.eq('tipo_contagem_id', selectedPublic)
      if (selectedService !== "all") query = query.eq('tipo_refeicao', selectedService)
      const { data: meals } = await query

      // 2. Buscar Contagens (Período Anterior para Eficiência)
      let prevQuery = supabase
        .from('contagem_refeicoes')
        .select(`quantidade`)
        .gte('data', prevStartDateStr)
        .lte('data', prevEndDateStr)
      
      if (selectedPublic !== "all") prevQuery = prevQuery.eq('tipo_contagem_id', selectedPublic)
      if (selectedService !== "all") prevQuery = prevQuery.eq('tipo_refeicao', selectedService)
      const { data: prevMealsData } = await prevQuery

      // 3. Buscar Extras e Lactário (Simplificado para o cálculo principal)
      const { data: extras } = await supabase.from('extras_dieta').select('*').gte('data', startDate).lte('data', endDate)
      const { data: lactarios } = await supabase.from('lactario').select('*').gte('data', startDate).lte('data', endDate)

      const prices: any = {
        'desjejum': Number(config.price_desjejum || 0),
        'almoco': Number(config.price_almoco || 0),
        'lanche_manha': Number(config.price_lanche_manha || 0),
        'lanche_tarde': Number(config.price_lanche_tarde || 0),
        'jantar': Number(config.price_jantar || 0),
        'lanche_noite': Number(config.price_lanche_noite || 0),
        'extras': Number(config.price_extras || 0),
        'lactario': Number(config.price_lactario || 0)
      }

      // Agregação Atual
      let totalMeals = 0
      let totalValue = 0
      const serviceMap: any = {}
      const publicMap: any = {}
      const trendMap: any = {}

      meals?.forEach(m => {
        const qty = m.quantidade || 0
        const val = qty * (prices[m.tipo_refeicao] || 0)
        const pName = m.contagem_tipos?.name || 'Não Informado'
        const sName = m.tipo_refeicao === 'lanche_noite' ? 'Lanche Noite' : 
                     m.tipo_refeicao === 'lanche_manha' ? 'Lanche Manhã' :
                     m.tipo_refeicao === 'lanche_tarde' ? 'Lanche Tarde' :
                     m.tipo_refeicao === 'almoco' ? 'Almoço' :
                     m.tipo_refeicao === 'lactario' ? 'Lactário' :
                     m.tipo_refeicao.charAt(0).toUpperCase() + m.tipo_refeicao.slice(1).replace('_', ' ')

        totalMeals += qty
        totalValue += val
        serviceMap[sName] = (serviceMap[sName] || 0) + val
        publicMap[pName] = (publicMap[pName] || 0) + val
        trendMap[m.data] = (trendMap[m.data] || 0) + val
      })

      extras?.forEach(e => {
        const val = (e.quantidade || 0) * prices['extras']
        totalMeals += (e.quantidade || 0)
        totalValue += val
        serviceMap['Extras'] = (serviceMap['Extras'] || 0) + val
        trendMap[e.data] = (trendMap[e.data] || 0) + val
      })

      lactarios?.forEach(l => {
        const val = (l.quantidade || 0) * prices['lactario']
        totalMeals += (l.quantidade || 0)
        totalValue += val
        serviceMap['Lactário'] = (serviceMap['Lactário'] || 0) + val
        trendMap[l.data] = (trendMap[l.data] || 0) + val
      })

      // Cálculo de Eficiência (Comparação)
      const prevTotalMeals = prevMealsData?.reduce((acc, current) => acc + (current.quantidade || 0), 0) || 0
      const efficiency = prevTotalMeals > 0 ? (totalMeals / prevTotalMeals) * 100 : 100
      const efficiencyTrend = totalMeals >= prevTotalMeals 
        ? `+${((totalMeals / (prevTotalMeals || 1) - 1) * 100).toFixed(1)}%`
        : `${((totalMeals / (prevTotalMeals || 1) - 1) * 100).toFixed(1)}%`


      // Lista para exportação
      const exportList: any[] = []

      meals?.forEach(m => {
        const qty = m.quantidade || 0
        const price = prices[m.tipo_refeicao] || 0
        const pName = m.contagem_tipos?.name || 'Não Informado'
        const sName = m.tipo_refeicao === 'lanche_noite' ? 'Lanche Noite' : m.tipo_refeicao.charAt(0).toUpperCase() + m.tipo_refeicao.slice(1).replace('_', ' ')
        
        exportList.push({
          Data: m.data.split('-').reverse().join('/'),
          Setor: m.hospital_setores?.name || 'Não Informado',
          Serviço: sName,
          Público: pName,
          Quantidade: qty,
          Unitário: price,
          Total: qty * price
        })
      })

      extras?.forEach(e => {
        const qty = e.quantidade || 0
        const price = prices['extras']
        exportList.push({
          Data: e.data.split('-').reverse().join('/'),
          Setor: 'Geral',
          Serviço: 'Extras',
          Público: 'Geral',
          Quantidade: qty,
          Unitário: price,
          Total: qty * price
        })
      })

      lactarios?.forEach(l => {
        const qty = l.quantidade || 0
        const price = prices['lactario']
        exportList.push({
          Data: l.data.split('-').reverse().join('/'),
          Setor: 'Geral',
          Serviço: 'Lactário',
          Público: 'Geral',
          Quantidade: qty,
          Unitário: price,
          Total: qty * price
        })
      })

      setRawData(exportList.sort((a,b) => b.Data.localeCompare(a.Data)))

      setStats({
        totalMeals,
        totalValue,
        avgValue: totalMeals > 0 ? totalValue / totalMeals : 0,
        growth: efficiencyTrend,
        efficiency: efficiency.toFixed(1) + "%"
      })

      setServiceData(Object.entries(serviceMap).map(([name, value]) => ({ name, value })))
      setPublicData(Object.entries(publicMap).map(([name, value]) => ({ name, value })))
      setDailyTrend(Object.entries(trendMap).sort().map(([date, value]) => {
        const [year, month, day] = date.split('-')
        return { 
          date: `${day}/${month}`, 
          value 
        }
      }))

    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  const exportPDF = () => {
    const doc = new jsPDF()
    const tableData = rawData.map(row => [
      row.Data,
      row.Setor,
      row.Serviço,
      row.Público,
      row.Quantidade,
      formatCurrency(row.Unitário),
      formatCurrency(row.Total)
    ])

    doc.setFontSize(18)
    doc.text('Relatório Financeiro - Prattus', 14, 20)
    doc.setFontSize(10)
    doc.text(`Período: ${startDate.split('-').reverse().join('/')} até ${endDate.split('-').reverse().join('/')}`, 14, 28)
    doc.text(`Faturamento Total: ${formatCurrency(stats.totalValue)}`, 14, 34)

    autoTable(doc, {
      startY: 40,
      head: [['Data', 'Setor', 'Serviço', 'Público', 'Qtd', 'V. Unit', 'V. Total']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [59, 130, 246] },
      styles: { fontSize: 7 }
    })

    doc.save(`financeiro_prattus_${startDate}_${endDate}.pdf`)
  }

  const exportXLS = () => {
    const wb = XLSX.utils.book_new()
    
    // ABA GERAL
    const geralData = rawData.map(row => ({
      ...row,
      Unitário: formatCurrency(row.Unitário),
      Total: formatCurrency(row.Total)
    }))

    // Linha Total Geral
    geralData.push({
      Data: 'TOTAL',
      Setor: '-',
      Serviço: '-',
      Público: '-',
      Quantidade: rawData.reduce((acc, current) => acc + current.Quantidade, 0),
      Unitário: '-',
      Total: formatCurrency(stats.totalValue)
    })

    const wsGeral = XLSX.utils.json_to_sheet(geralData)
    XLSX.utils.book_append_sheet(wb, wsGeral, "Geral")

    // ABAS POR PÚBLICO
    const publics = [...new Set(rawData.map(r => r.Público))]
    
    publics.forEach(p => {
      const filtered = rawData.filter(r => r.Público === p)
      const subData = filtered.map(row => ({
        ...row,
        Unitário: formatCurrency(row.Unitário),
        Total: formatCurrency(row.Total)
      }))

      const subTotalValue = filtered.reduce((acc, curr) => acc + curr.Total, 0)
      const subQty = filtered.reduce((acc, curr) => acc + curr.Quantidade, 0)

      subData.push({
        Data: 'TOTAL',
        Setor: '-',
        Serviço: '-',
        Público: p,
        Quantidade: subQty,
        Unitário: '-',
        Total: formatCurrency(subTotalValue)
      })

      const ws = XLSX.utils.json_to_sheet(subData)
      // Excel names max 31 chars
      const sheetName = p.substring(0, 31)
      XLSX.utils.book_append_sheet(wb, ws, sheetName)
    })

    XLSX.writeFile(wb, `financeiro_prattus_${startDate}_${endDate}.xlsx`)
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-2">
        <div className="text-center md:text-left">
          <h1 className="text-3xl font-black tracking-tight bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
            Dashboard Financeiro
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Análise estratégica de custos e faturamento.</p>
        </div>
        
        <div className="flex flex-col md:flex-row items-center gap-3 w-full md:w-auto">
          {/* Grid de Datas - Lado a Lado no Mobile */}
          <div className="grid grid-cols-2 gap-2 w-full md:flex md:w-auto">
            {/* Data Inicial */}
            <div className="flex items-center justify-center gap-1.5 bg-card border border-border p-2 md:p-1 rounded-2xl shadow-sm overflow-hidden">
               <div className="flex items-center justify-center gap-1 w-full px-1 md:px-3">
                 <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter md:hidden">De</span>
                 <Input 
                   type="date" 
                   value={startDate} 
                   onChange={(e) => setStartDate(e.target.value)}
                   className="border-none bg-transparent h-8 w-full md:w-32 p-0 focus-visible:ring-0 text-[10px] md:text-xs font-black text-center" 
                 />
               </div>
            </div>

            {/* Data Final */}
            <div className="flex items-center justify-center gap-1.5 bg-card border border-border p-2 md:p-1 rounded-2xl shadow-sm overflow-hidden">
               <div className="flex items-center justify-center gap-1 w-full px-1 md:px-3">
                 <Calendar className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                 <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter md:hidden">Até</span>
                 <Input 
                   type="date" 
                   value={endDate} 
                   onChange={(e) => setEndDate(e.target.value)}
                   className="border-none bg-transparent h-8 w-full md:w-32 p-0 focus-visible:ring-0 text-[10px] md:text-xs font-black text-center" 
                 />
               </div>
            </div>
          </div>
          
          {/* Seletor de Públicos */}
          <div className="flex items-center justify-center gap-2 bg-card border border-border p-2 md:p-1 rounded-2xl shadow-sm w-full md:w-auto">
             <Filter className="ml-2 h-4 w-4 text-muted-foreground" />
             <select 
               value={selectedPublic} 
               onChange={(e) => setSelectedPublic(e.target.value)}
               className="bg-transparent h-8 px-2 text-xs font-bold outline-none border-none flex-1 md:flex-none text-center"
             >
               <option value="all">Todos Públicos</option>
               {publicTypes.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>

          {/* Seletor de Serviços */}
          <div className="flex items-center justify-center gap-2 bg-card border border-border p-2 md:p-1 rounded-2xl shadow-sm w-full md:w-auto">
             <Utensils className="ml-2 h-4 w-4 text-muted-foreground" />
             <select 
               value={selectedService} 
               onChange={(e) => setSelectedService(e.target.value)}
               className="bg-transparent h-8 px-2 text-xs font-bold outline-none border-none flex-1 md:flex-none text-center"
             >
               <option value="all">Todos Serviços</option>
               <option value="desjejum">Desjejum</option>
               <option value="lanche_manha">Lanche Manhã</option>
               <option value="almoco">Almoço</option>
               <option value="lanche_tarde">Lanche Tarde</option>
               <option value="jantar">Jantar</option>
               <option value="lanche_noite">Lanche Noite</option>
               <option value="extras">Extras</option>
               <option value="lactario">Lactário</option>
             </select>
          </div>

          {/* Botões de Exportação */}
          <div className="grid grid-cols-2 md:flex items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
            <Button 
              variant="outline" 
              className="h-11 md:h-9 px-4 rounded-2xl gap-2 font-bold text-xs w-full"
              onClick={exportPDF}
              disabled={loading || rawData.length === 0}
            >
              <FileDown className="h-4 w-4" />
              PDF
            </Button>
            <Button 
              variant="outline" 
              className="h-11 md:h-9 px-4 rounded-2xl gap-2 font-bold text-xs border-emerald-500/20 text-emerald-600 hover:bg-emerald-50 w-full"
              onClick={exportXLS}
              disabled={loading || rawData.length === 0}
            >
              <FileText className="h-4 w-4" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Faturamento Total" 
          value={formatCurrency(stats.totalValue)} 
          icon={<DollarSign className="h-5 w-5" />} 
          trend={stats.growth}
          color="blue"
        />
        <StatCard 
          title="Refeições Contadas" 
          value={stats.totalMeals.toString()} 
          icon={<Utensils className="h-5 w-5" />} 
          trend={stats.growth}
          color="indigo"
        />
        <StatCard 
          title="Ticket Médio" 
          value={formatCurrency(stats.avgValue)} 
          icon={<TrendingUp className="h-5 w-5" />} 
          trend="+0.0%"
          color="slate"
        />
        <StatCard 
          title="Eficiência Contratual" 
          value={stats.efficiency || "0.0%"} 
          icon={<Activity className="h-5 w-5" />} 
          trend={stats.growth}
          color="blue"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold">Evolução Financeira</h3>
              <p className="text-[10px] text-muted-foreground">Faturamento diário no período</p>
            </div>
          </div>
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }} 
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 10 }}
                  tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`}
                  width={75}
                />
                <Tooltip 
                  formatter={(val: number) => [formatCurrency(val), "Faturamento"]}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    borderColor: 'hsl(var(--border))',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorValue)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-3xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-6">
            <h3 className="text-base font-black text-slate-800">Distribuição por Serviço</h3>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Participação financeira por categoria</p>
          </div>
          <div className="flex flex-col gap-6">
            <div className="h-[200px] w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={serviceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    onClick={(data) => {
                      const serviceKey = data?.name?.toLowerCase().replace(' ', '_').replace('á', 'a').replace('ç', 'c')
                      if (serviceKey) setSelectedService(serviceKey)
                    }}
                    className="cursor-pointer outline-none"
                  >
                    {serviceData.map((_entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} cornerRadius={4} strokeWidth={0} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(val: any) => [formatCurrency(val), "Faturamento"]}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '16px',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-1 gap-2 pr-2">
               {serviceData.sort((a,b) => b.value - a.value).map((item, idx) => {
                 const serviceKey = item.name.toLowerCase().replace(' ', '_').replace('á', 'a').replace('ç', 'c')
                 const isActive = selectedService === serviceKey
                 
                 return (
                   <div 
                     key={item.name} 
                     className={cn(
                       "flex items-center justify-between p-2.5 rounded-xl transition-all group cursor-pointer border border-transparent",
                       isActive ? "bg-blue-600/10 border-blue-500/30 ring-1 ring-blue-500/20" : "hover:bg-muted/50"
                     )}
                     onClick={() => setSelectedService(isActive ? 'all' : serviceKey)}
                   >
                     <div className="flex items-center gap-3">
                        <div 
                          className="h-2.5 w-2.5 rounded-full shadow-sm shrink-0" 
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }} 
                        />
                        <span className={cn(
                          "text-xs transition-colors",
                          isActive ? "font-black text-blue-700" : "font-semibold text-slate-600 group-hover:text-slate-900"
                        )}>
                          {item.name}
                        </span>
                     </div>
                     <span className={cn(
                       "text-xs font-black",
                       isActive ? "text-blue-700" : "text-slate-800"
                     )}>
                       {formatCurrency(item.value)}
                     </span>
                   </div>
                 )
               })}
            </div>
          </div>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-black flex items-center gap-2 text-zinc-800">
            <Users className="h-4 w-4 text-blue-600" />
            Faturamento por Público
          </h2>
          <Button variant="ghost" className="h-7 px-2 text-[11px] font-bold" onClick={() => setSelectedPublic('all')}>Ver Todos</Button>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {publicData.map((pub, idx) => {
            const pType = publicTypes.find(p => p.name === pub.name)
            return (
              <Card 
                key={pub.name} 
                className={cn(
                  "rounded-2xl border-border/50 hover:border-blue-500/30 transition-all group overflow-hidden cursor-pointer",
                  selectedPublic === pType?.id && "border-blue-500 bg-blue-500/5 shadow-sm"
                )}
                onClick={() => pType && setSelectedPublic(pType.id === selectedPublic ? 'all' : pType.id)}
              >
                 <CardContent className="p-0">
                   <div className="p-4 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <p className={cn(
                          "text-[9px] font-black uppercase tracking-widest transition-colors",
                          selectedPublic === pType?.id ? "text-blue-600" : "text-muted-foreground group-hover:text-blue-500"
                        )}>{pub.name}</p>
                        <h4 className="text-lg font-black">{formatCurrency(pub.value)}</h4>
                      </div>
                      <div className={cn(
                        "h-8 w-8 rounded-lg flex items-center justify-center transition-all",
                        selectedPublic === pType?.id ? "bg-blue-600 text-white" : "bg-muted/50 group-hover:bg-blue-600 group-hover:text-white"
                      )}>
                        <ChevronRight className="h-4 w-4" />
                      </div>
                   </div>
                   <div className="h-1 w-full bg-muted/30">
                      <div 
                        className="h-full bg-blue-600" 
                        style={{ width: `${Math.min(100, (pub.value / stats.totalValue) * 100)}%` }} 
                      />
                   </div>
                 </CardContent>
              </Card>
            )
          })}
          {publicData.length === 0 && (
            <div className="col-span-full py-12 text-center border-2 border-dashed rounded-3xl text-muted-foreground">
              Nenhum dado financeiro encontrado para os filtros selecionados.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({ title, value, icon, trend, color }: { title: string, value: string, icon: React.ReactNode, trend: string, color: string }) {
  const isPositive = trend.startsWith('+')
  
  return (
    <div className="group rounded-3xl border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-blue-500/20">
      <div className="flex items-center justify-between mb-3">
        <div className={cn(
          "flex h-9 w-9 items-center justify-center rounded-xl ring-1",
          color === "blue" ? "bg-blue-600/10 text-blue-600 ring-blue-500/20" : "bg-indigo-600/10 text-indigo-600 ring-indigo-500/20"
        )}>
          {icon}
        </div>
        <div className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
          isPositive ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
        )}>
          {trend}
        </div>
      </div>
      <div className="space-y-0.5">
        <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">{title}</p>
        <h4 className="text-xl font-black">{value}</h4>
      </div>
    </div>
  )
}
