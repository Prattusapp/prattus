import { useEffect, useState } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import Login from "@/pages/auth/Login"
import Register from "@/pages/auth/Register"
import LandingPage from "@/pages/public/LandingPage"
import { MainLayout } from "@/components/layout/MainLayout"
import { ThemeProvider } from "next-themes"
import Dashboard from "@/pages/dashboard/Dashboard"
import MealCountSpreadsheet from "@/pages/dashboard/MealCountSpreadsheet"
import MealCountSummary from "@/pages/dashboard/MealCountSummary"
import MealCountDetailed from "@/pages/dashboard/MealCountDetailed"
import Extras from "@/pages/dashboard/Extras"
import Lactario from "@/pages/dashboard/Lactario"
import ConfigPage from "@/pages/dashboard/Config"
import MealCountView from "@/pages/dashboard/MealCountView"
import OnboardingPage from "@/pages/onboarding/OnboardingPage"
import Financeiro from "@/pages/dashboard/Financeiro"
import { PasswordChangeGate } from "@/components/auth/PasswordChangeGate"
import { RoleGuard } from "@/components/auth/RoleGuard"

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setLoading(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return (
    <PasswordChangeGate>
      {children}
    </PasswordChangeGate>
  )
}

export default function AppRoutes() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <MainLayout><Dashboard /></MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/onboarding" 
          element={
            <ProtectedRoute>
              <OnboardingPage />
            </ProtectedRoute>
          } 
        />

        <Route path="/contagem" element={<Navigate to="/contagem/diaria" replace />} />
        
        <Route 
          path="/contagem/diaria" 
          element={
            <ProtectedRoute>
              <MainLayout><MealCountSpreadsheet /></MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/contagem/relatorios/sintetico" 
          element={
            <ProtectedRoute>
              <MainLayout><MealCountSummary /></MainLayout>
            </ProtectedRoute>
          } 
        />
        
        <Route 
          path="/contagem/relatorios/analitico" 
          element={
            <ProtectedRoute>
              <MainLayout><MealCountDetailed /></MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/extras" 
          element={
            <ProtectedRoute>
              <MainLayout><Extras /></MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/lactario" 
          element={
            <ProtectedRoute>
              <MainLayout><Lactario /></MainLayout>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/config" 
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['gerente']} fallbackPath="/dashboard">
                <MainLayout><ConfigPage /></MainLayout>
              </RoleGuard>
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/contagem/view/:unitId/:date" 
          element={
            <ProtectedRoute>
              <MealCountView />
            </ProtectedRoute>
          } 
        />

        <Route 
          path="/financeiro" 
          element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['gerente']}>
                <MainLayout><Financeiro /></MainLayout>
              </RoleGuard>
            </ProtectedRoute>
          } 
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ThemeProvider>
  )
}
