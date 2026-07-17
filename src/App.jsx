import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
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
      <Sidebar />
      <main className="flex-1">
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
