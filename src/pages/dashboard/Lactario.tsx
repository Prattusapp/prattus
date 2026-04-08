import React, { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { 
  Milk, 
  Clock, 
  Baby, 
  Search, 
  Plus, 
  MapPin,
  CheckCircle2,
  Timer
} from "lucide-react"
import { cn } from "@/lib/utils"

interface LactarioItem {
  id: string
  criancao: string
  formula: string
  volume: number
  horario: string
  setor_id: number
  leito: string
  status: 'preparo' | 'enviado' | 'recebido'
  hospital_setores?: { name: string }
}

export default function Lactario() {
  const [items, setItems] = useState<LactarioItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLactario()
  }, [])

  const fetchLactario = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('lactario')
        .select('*, hospital_setores(name)')
        .order('horario', { ascending: true })
      
      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('lactario')
        .update({ status })
        .eq('id', id)
      
      if (error) throw error
      fetchLactario()
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Gestão de Lactário</h1>
          <p className="text-muted-foreground">Cronograma de preparo e envio de fórmulas infantis.</p>
        </div>
        
        <button className="flex h-11 items-center gap-2 rounded-2xl bg-indigo-600 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:bg-indigo-500 active:scale-95">
          <Plus className="h-5 w-5" />
          Agendar Preparo
        </button>
      </header>

      {/* Schedule Timeline Style */}
      <div className="grid gap-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-3xl border border-border bg-card animate-pulse" />
          ))
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground border-2 border-dashed border-border rounded-3xl">
            <Milk className="h-12 w-12 mb-4 opacity-10" />
            <p>Nenhum preparo agendado para hoje.</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="relative flex items-center gap-6 rounded-3xl border border-border bg-card p-6 shadow-sm group hover:border-indigo-500/20 transition-all">
              <div className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
                <Clock className="h-4 w-4 opacity-70" />
                <span className="text-xs font-black">{item.horario}</span>
              </div>

              <div className="flex-1 grid md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-muted group-hover:bg-indigo-500/10 transition-colors">
                    <Baby className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.criancao || 'Paciente'}</h4>
                    <p className="text-xs text-muted-foreground">Criança / RN</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm">{item.formula}</h4>
                  <p className="text-xs text-muted-foreground">Fórmula / Suplemento</p>
                </div>

                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <h4 className="font-bold text-sm">{item.hospital_setores?.name}</h4>
                    <p className="text-xs text-muted-foreground">Leito {item.leito}</p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <span className={cn(
                    "text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full",
                    item.status === 'recebido' ? "bg-emerald-500/10 text-emerald-500" :
                    item.status === 'enviado' ? "bg-blue-500/10 text-blue-500" : "bg-amber-500/10 text-amber-500"
                  )}>
                    {item.status}
                  </span>
                </div>
              </div>

              <div className="flex flex-col gap-2 border-l border-border pl-6">
                {item.status === 'preparo' && (
                  <button 
                    onClick={() => updateStatus(item.id, 'enviado')}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors shadow-sm"
                    title="Enviar para Setor"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
                {item.status === 'enviado' && (
                  <button 
                    onClick={() => updateStatus(item.id, 'recebido')}
                    className="h-8 w-8 flex items-center justify-center rounded-lg bg-emerald-600 text-white hover:bg-emerald-500 transition-colors shadow-sm"
                    title="Confirmar Recebimento"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
