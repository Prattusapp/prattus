import React from "react"
import { useNavigate } from "react-router-dom"
import { LucideShieldCheck, LucideLayoutDashboard, LucideCoffee, LucideMilk } from "lucide-react"

export default function LandingPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-slate-950 text-white selection:bg-blue-500/30 font-sans">
      {/* Navbar */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <div className="flex items-center">
            <div className="flex h-10 w-24 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 overflow-hidden p-1.5 transition-all hover:scale-105 active:scale-95 cursor-pointer border border-white/10">
              <img src="/logo_prattus.png" alt="Logo" className="w-full h-full object-contain brightness-0 invert" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Entrar
            </button>
            <button 
              onClick={() => navigate("/register")}
              className="rounded-full bg-blue-600 px-5 py-2 text-sm font-bold text-white transition-all hover:bg-blue-500 active:scale-95 shadow-lg shadow-blue-500/20"
            >
              Criar Conta Grátis
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 lg:pt-48 lg:pb-32">
        <div className="absolute top-0 left-1/2 -z-10 h-[500px] w-full -translate-x-1/2 bg-blue-600/10 blur-[120px]" />
        
        <div className="mx-auto max-w-7xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-blue-400">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
            </span>
            Nova Versão 2.0 Disponível
          </div>
          
          <h1 className="mt-8 text-5xl font-black tracking-tight sm:text-7xl">
            Gestão Inteligente de <br />
            <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
              Refeições Hospitalares
            </span>
          </h1>
          
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-400 leading-relaxed">
            O Prattus APP centraliza o controle de contagem diária, dietas extras e lactário 
            em uma interface mobile-first, garantindo precisão e agilidade no serviço de nutrição hospitalar.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-6">
            <button 
              onClick={() => navigate("/register")}
              className="group relative h-16 w-full sm:w-auto overflow-hidden rounded-2xl bg-blue-600 px-10 font-black text-lg transition-all hover:bg-blue-500 active:scale-95 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.6)]"
            >
              COMEÇAR AGORA GRÁTIS
            </button>
            <div className="flex flex-col items-center sm:items-start gap-1">
              <button onClick={() => navigate("/login")} className="text-sm font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-2">
                Já tem uma conta? <span className="text-blue-400 underline decoration-blue-400/30 underline-offset-4">Acesse aqui</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 lg:py-32">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard 
              icon={<LucideLayoutDashboard className="h-6 w-6 text-blue-400" />}
              title="Auditória em Tempo Real"
              description="Acompanhe o status do serviço por setor instantaneamente."
            />
            <FeatureCard 
              icon={<LucideShieldCheck className="h-6 w-6 text-blue-400" />}
              title="Segurança RLS"
              description="Controle de acesso por níveis (Admin, Gestor e Colaborador)."
            />
            <FeatureCard 
              icon={<LucideCoffee className="h-6 w-6 text-blue-400" />}
              title="Dietas Extras"
              description="Gestão ágil de inclusões foras do mapa padrão de refeições."
            />
            <FeatureCard 
              icon={<LucideMilk className="h-6 w-6 text-blue-400" />}
              title="Gestão de Lactário"
              description="Controle rigoroso de formulações infantis por horário."
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6">
        <div className="mx-auto max-w-7xl flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-slate-500">
          <p>© {new Date().getFullYear()} Prattus APP. Desenvolvido para Excelência em Nutrição.</p>
          <div className="flex gap-8">
            <a href="#" className="hover:text-white">Sobre</a>
            <a href="#" className="hover:text-white">Termos</a>
            <a href="#" className="hover:text-white">Privacidade</a>
          </div>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="group rounded-3xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.05] hover:border-white/10">
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-600/10 ring-1 ring-blue-500/20 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-bold">{title}</h3>
      <p className="text-sm leading-relaxed text-slate-400">
        {description}
      </p>
    </div>
  )
}
