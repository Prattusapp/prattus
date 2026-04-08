import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Plus, 
  Search, 
  Filter, 
  MoreHorizontal, 
  CheckCircle2, 
  Clock,
  AlertCircle
} from "lucide-react"
import { cn } from "@/lib/utils"

interface ExtraDiet {
  id: string
  setor_id: number
  leito: string
  paciente: string
  item: string
  quantidade: number
  observacao: string
  status: 'pendente' | 'preparando' | 'entregue'
  criado_em: string
  hospital_setores?: { name: string }
}

export default function Extras() {
  const [extras, setExtras] = useState<ExtraDiet[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    fetchExtras()
  }, [])

  const fetchExtras = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('extras_dieta')
        .select('*, hospital_setores(name)')
        .order('criado_em', { ascending: false })
      
      if (error) throw error
      setExtras(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('extras_dieta')
        .update({ status })
        .eq('id', id)
      
      if (error) throw error
      fetchExtras()
    } catch (err) {
      console.error(err)
    }
  }

  const filteredExtras = extras.filter(e => 
    e.paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.item?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.hospital_setores?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dietas Extras</h1>
          <p className="text-muted-foreground">Gestão de suplementos e itens fora do mapa padrão.</p>
        </div>
        
        <button className="flex h-11 items-center gap-2 rounded-2xl bg-blue-600 px-6 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-500 active:scale-95">
          <Plus className="h-5 w-5" />
          Novo Pedido
        </button>
      </header>

      {/* Filters & Search */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input 
            type="text" 
            placeholder="Buscar por paciente, item ou setor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-card pl-10 pr-4 text-sm focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex h-11 items-center gap-2 rounded-2xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted transition-colors">
            <Filter className="h-4 w-4" />
            Filtros
          </button>
        </div>
      </div>

      {/* Grid of Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-48 rounded-3xl border border-border bg-card animate-pulse" />
          ))
        ) : filteredExtras.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-20 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mb-4 opacity-20" />
            <p>Nenhum item extra encontrado.</p>
          </div>
        ) : filteredExtras.map(extra => (
          <div key={extra.id} className="group relative overflow-hidden rounded-3xl border border-border bg-card p-6 shadow-sm transition-all hover:shadow-md hover:border-blue-500/20">
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                  extra.status === 'entregue' ? "bg-emerald-500/10 text-emerald-500" : 
                  extra.status === 'preparando' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                )}>
                  {extra.status === 'entregue' ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                  {extra.status}
                </span>
                <h3 className="mt-2 text-lg font-bold leading-tight">{extra.item}</h3>
              </div>
              <button className="rounded-xl p-2 hover:bg-muted text-muted-foreground transition-colors">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paciente</span>
                <span className="font-semibold">{extra.paciente}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Setor / Leito</span>
                <span className="font-semibold">{extra.hospital_setores?.name} - {extra.leito}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Quantidade</span>
                <span className="font-semibold">{extra.quantidade} un</span>
              </div>
            </div>

            <div className="mt-6 flex gap-2">
              {extra.status !== 'entregue' && (
                <button 
                  onClick={() => updateStatus(extra.id, 'entregue')}
                  className="flex-1 h-9 rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-600 text-xs font-bold hover:bg-emerald-500 hover:text-white transition-all capitalize"
                >
                  Marcar como Entregue
                </button>
              )}
              {extra.status === 'pendente' && (
                <button 
                  onClick={() => updateStatus(extra.id, 'preparando')}
                  className="flex-1 h-9 rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-600 text-xs font-bold hover:bg-amber-500 hover:text-white transition-all capitalize"
                >
                  Preparar
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
