import { useState, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { 
  LayoutDashboard, 
  UtensilsCrossed, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  User,
  TrendingUp
} from "lucide-react"
import { ThemeToggle } from "./ThemeToggle"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"


export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [contagemOpen, setContagemOpen] = useState(true)
  const location = useLocation()

  const [profile, setProfile] = useState<{ full_name: string, role: string } | null>(null)
  const [logoUrl, setLogoUrl] = useState<string>("/logo_prattus.png")

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        // Buscar dados completos do perfil na tabela profiles
        supabase.from('profiles').select('full_name, role').eq('id', user.id).single()
          .then(({ data }) => {
            if (data) {
              setProfile({ 
                full_name: data.full_name || user.email?.split('@')[0] || 'Usuário', 
                role: data.role || 'colaborador' 
              })
            }
          })
        
        // Buscar Logo
        supabase.from('hospital_config').select('logo_url').single()
          .then(({ data }) => {
            if (data?.logo_url) setLogoUrl(data.logo_url)
          })
      }
    })
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const navItems = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { 
      label: "Contagem", 
      icon: UtensilsCrossed,
      subItems: [
        { label: "Lançamento Diário", href: "/contagem/diaria" },
        { label: "Relatório Sintético", href: "/contagem/relatorios/sintetico" },
        { label: "Relatório Analítico", href: "/contagem/relatorios/analitico" },
      ]
    },
    /* 
    { label: "Extras", href: "/extras", icon: PlusCircle },
    { label: "Lactário", href: "/lactario", icon: Baby }, 
    */
    ...(profile?.role === 'gerente' ? [{ label: "Financeiro", href: "/financeiro", icon: TrendingUp }] : []),
    { label: "Configurações", href: "/config", icon: Settings },
  ]

  return (
    <div className="flex min-h-screen max-w-[100vw] overflow-x-hidden bg-background font-sans transition-colors duration-300">
      {/* Desktop Sidebar */}
      <aside className="hidden w-72 flex-col border-r border-border bg-card/30 backdrop-blur-md lg:flex">
        <div className="flex h-24 items-center justify-center border-b border-border/50 px-6">
          <div className="flex h-16 w-full items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 overflow-hidden p-2 border border-white/10">
            <img src={logoUrl} alt="Logo" className="h-full w-auto object-contain brightness-0 invert" />
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon
            const isContagem = item.label === "Contagem"
            
            if (isContagem && item.subItems) {
              const anyActive = item.subItems.some(sub => location.pathname === sub.href)
              return (
                <div key={item.label} className="space-y-1">
                  <button
                    onClick={() => setContagemOpen(!contagemOpen)}
                    className={cn(
                      "w-full group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground outline-none",
                      anyActive && "bg-blue-600/5 text-blue-600"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", anyActive && "text-blue-600")} />
                      {item.label}
                    </div>
                    <ChevronRight className={cn("h-4 w-4 transition-transform duration-300", contagemOpen && "rotate-90")} />
                  </button>
                  
                  {contagemOpen && (
                    <div className="pl-12 space-y-1 animate-in slide-in-from-top-2 duration-300">
                      {item.subItems.map(sub => {
                        const subActive = location.pathname === sub.href
                        return (
                          <Link
                            key={sub.href}
                            to={sub.href}
                            className={cn(
                              "block py-2 text-sm font-medium transition-all",
                              subActive ? "text-blue-600 font-bold" : "text-muted-foreground hover:text-foreground"
                            )}
                          >
                            {sub.label}
                          </Link>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            }

            const active = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href!}
                className={cn(
                  "group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium transition-all text-muted-foreground hover:bg-muted hover:text-foreground",
                  active && "bg-blue-600/10 text-blue-600 shadow-sm"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", active && "text-blue-600")} />
                  {item.label}
                </div>
                {active && <ChevronRight className="h-4 w-4" />}
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="p-4 border-t border-border/50">
          <div className="flex items-center gap-3 px-2 py-3 rounded-2xl bg-muted/30">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate">{profile?.full_name || 'Usuário'}</p>
              <span className="text-[10px] font-black uppercase tracking-widest text-blue-500">{profile?.role || '...'}</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border/50 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Tema</span>
            <ThemeToggle />
          </div>
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
          >
            <LogOut className="h-5 w-5" />
            Sair da Conta
          </button>
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/80 backdrop-blur-md px-4 lg:hidden">
          <div className="flex items-center">
            <div className="flex h-10 w-24 items-center justify-center rounded-xl bg-blue-600 shadow-lg shadow-blue-500/20 overflow-hidden p-1.5 border border-white/10">
              <img src={logoUrl || "/logo_prattus.png"} alt="Prattus Logo" className="w-full h-full object-contain brightness-0 invert" />
            </div>
          </div>
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-card/50"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </header>

        {/* Mobile Sidebar Overlay */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden">
            <div className="fixed inset-y-0 left-0 w-full max-w-xs bg-card p-6 shadow-2xl animate-in slide-in-from-left duration-300">
              <div className="flex items-center justify-between mb-8">
              <div className="flex items-center w-full justify-center">
                <div className="flex h-12 w-full items-center justify-center rounded-2xl bg-blue-600 shadow-lg shadow-blue-500/20 overflow-hidden p-2 border border-white/10">
                  <img src={logoUrl} alt="Logo" className="h-full w-auto object-contain brightness-0 invert" />
                </div>
              </div>
                <button onClick={() => setMobileMenuOpen(false)} className="rounded-full p-2 hover:bg-muted">
                  <X className="h-6 w-6" />
                </button>
              </div>

              <nav className="space-y-2">
                {navItems.map((item) => {
                  const Icon = item.icon
                  const isContagem = item.label === "Contagem"
                  
                  if (isContagem && item.subItems) {
                    return (
                      <div key={item.label} className="space-y-1">
                        <div className="flex items-center gap-4 rounded-xl px-4 py-3 text-base font-semibold text-muted-foreground bg-muted/20">
                          <Icon className="h-6 w-6" />
                          {item.label}
                        </div>
                        <div className="pl-10 space-y-1">
                          {item.subItems.map(sub => {
                            const subActive = location.pathname === sub.href
                            return (
                              <Link
                                key={sub.href}
                                to={sub.href}
                                onClick={() => setMobileMenuOpen(false)}
                                className={cn(
                                  "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all",
                                  subActive ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                                )}
                              >
                                {sub.label}
                              </Link>
                            )
                          })}
                        </div>
                      </div>
                    )
                  }

                  const active = location.pathname === item.href
                  return (
                    <Link
                      key={item.label}
                      to={item.href || "#"}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-4 rounded-xl px-4 py-4 text-base font-semibold",
                        active ? "bg-blue-600 text-white" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      <Icon className="h-6 w-6" />
                      {item.label}
                    </Link>
                  )
                })}
              </nav>

              <div className="absolute bottom-10 left-6 right-6 space-y-6">
                <div className="flex items-center justify-between rounded-2xl bg-muted p-4">
                  <span className="font-bold">Alterar Tema</span>
                  <ThemeToggle />
                </div>
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-destructive/20 px-4 py-4 font-bold text-destructive"
                >
                  <LogOut className="h-6 w-6" />
                  Sair do Sistema
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
