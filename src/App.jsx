import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Menu } from 'lucide-react'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import DriverList from './pages/DriverList'
import DriverDetail from './pages/DriverDetail'
import LaunchHours from './pages/LaunchHours'
import UsersManagement from './pages/UsersManagement'
import Reports from './pages/Reports'

function AppShell() {
  const { user, loading } = useAuth()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate">Carregando…</p>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  return (
    <div className="flex min-h-screen bg-cloud">
      <Sidebar isOpen={mobileMenuOpen} onClose={() => setMobileMenuOpen(false)} />

      <div className="flex-1 min-w-0 flex flex-col">
        {/* Barra superior visível apenas em telas pequenas, com o botão para abrir o menu */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 bg-ink text-white px-4 py-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Abrir menu"
            className="p-1 -ml-1 text-white/80 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display text-lg font-semibold leading-none">TRÁFEGO</h1>
        </header>

        <main className="flex-1 min-w-0">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/lancar-horas" element={<LaunchHours />} />
            <Route path="/motoristas" element={<DriverList />} />
            <Route path="/motoristas/:id" element={<DriverDetail />} />
            <Route path="/usuarios" element={<UsersManagement />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </main>
      </div>
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
