import { useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { useIdleTimer } from './hooks/useIdleTimer'
import { Menu, AlertTriangle, LogOut, ShieldCheck } from 'lucide-react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import DriverList from './pages/DriverList'
import DriverDetail from './pages/DriverDetail'
import LaunchHours from './pages/LaunchHours'
import UsersManagement from './pages/UsersManagement'
import Reports from './pages/Reports'

// Componente de proteção para rotas restritas apenas para Admins
function AdminRoute({ children }) {
  const { user } = useAuth()

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />
  }

  return children
}

function AppShell() {
  const { user, loading, logout } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  // Configuração para teste rápido:
  // 1 * 60 * 1000 = 1 minuto em ms até exibir o modal
  // 15 * 1000 = 15 segundos em ms de tolerância no modal

  // CONFIGURAÇÃO PARA PRODUÇÃO:
  // 15 * 60 * 1000 = 15 minutos em ms até disparar o alerta
  // 60 * 1000      = 60 segundos (1 minuto) de contagem no modal

  const { isWarningOpen, countdown, resetTimer, handleForceLogout } = useIdleTimer(
    15 * 60 * 1000, 
    60 * 1000
  )

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate font-medium">Carregando…</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="flex min-h-screen bg-cloud relative">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior visível apenas em telas menores */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-ink text-white px-4 py-3 shadow-sm">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
            className="p-1 -ml-1 text-white/80 hover:text-white transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display text-lg font-semibold leading-none tracking-wide">TRÁFEGO</h1>
        </header>

        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancar-horas" element={<LaunchHours />} />
            <Route path="/motoristas" element={<DriverList />} />
            <Route path="/motoristas/:id" element={<DriverDetail />} />
            <Route path="/reports" element={<Reports />} />
            
            <Route
              path="/usuarios"
              element={
                <AdminRoute>
                  <UsersManagement />
                </AdminRoute>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>

      {/* ================= MODAL DE INATIVIDADE E AUTO-LOGOUT ================= */}
      {isWarningOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 text-center space-y-5 animate-in zoom-in-95 duration-200">
            
            <div className="w-14 h-14 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-600">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-800">Sua sessão está inativa</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Por motivos de segurança e otimização do sistema, sua sessão será encerrada automaticamente em:
              </p>
            </div>

            {/* Contador Regressivo do Hook */}
            <div className="bg-amber-50/80 border border-amber-200/60 rounded-xl py-3 px-4 flex items-center justify-center gap-2">
              <span className="text-3xl font-black text-amber-600 font-mono">
                {String(countdown).padStart(2, '0')}s
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={handleForceLogout}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-sm font-semibold transition-colors"
              >
                <LogOut className="h-4 w-4 text-slate-500" />
                <span>Sair Agora</span>
              </button>

              <button
                onClick={resetTimer}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold shadow-md shadow-blue-500/20 transition-all"
              >
                <ShieldCheck className="h-4 w-4" />
                <span>Continuar Conectado</span>
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}