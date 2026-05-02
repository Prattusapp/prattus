import { Building2 } from "lucide-react"

export default function FaturamentoServidores() {
  return (
    <div className="w-full max-w-full overflow-x-hidden space-y-6 animate-in fade-in duration-500 pb-10 px-4 md:px-0">
      <header>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight flex items-center gap-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          Faturamento - Servidores e Acompanhantes
        </h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Gestão de valores preenchidos para servidores e acompanhantes.
        </p>
      </header>
      
      <div className="flex flex-col items-center justify-center p-20 bg-muted/20 border border-border/50 border-dashed rounded-3xl">
         <p className="text-muted-foreground font-bold tracking-widest uppercase text-sm">Em breve...</p>
      </div>
    </div>
  )
}
