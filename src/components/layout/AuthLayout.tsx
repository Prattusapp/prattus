import React from "react"

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  subtitle?: string
  logoUrl?: string
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle, logoUrl }) => {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-slate-950 bg-gradient-to-br from-blue-700 via-slate-900 to-black p-4 font-sans focus-within:outline-none">
      <div className="w-full max-w-md animate-in fade-in zoom-in duration-500">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-3xl bg-blue-600 shadow-2xl transition-all overflow-hidden p-2 border border-white/10">
              <img src={logoUrl || "/logo_prattus.png"} alt="Prattus Logo" className="w-full h-full object-contain brightness-0 invert" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">{title}</h1>
          {subtitle && (
            <p className="mt-2 text-sm text-blue-100/60">{subtitle}</p>
          )}
        </div>

        <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-2xl shadow-[0_32px_64px_-16px_rgba(0,0,0,0.5)] p-8">
          {children}
        </div>

        <div className="mt-8 text-center text-xs text-white/30">
          <p>&copy; {new Date().getFullYear()} Prattus APP. Todos os direitos reservados.</p>
        </div>
      </div>
    </div>
  )
}
