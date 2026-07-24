import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import DriverList from './pages/DriverList'
import DriverDetail from './pages/DriverDetail'
import LaunchHours from './pages/LaunchHours'
import History from './pages/History'
import Backups from './pages/Backups'
import UserManagement from './pages/UsersManagement'
import Reports from './pages/Reports'

// Componente para proteger rotas exclusivas do Administrador
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from './firebase'

function ProtectedAdminRoute({ children }) {
  const { user, loading: authLoading } = useAuth()
  const [role, setRole] = useState(null)
  const [checkingRole, setCheckingRole] = useState(true)

  useEffect(() => {
    async function fetchUserRole() {
      if (user?.uid) {
        try {
          const docSnap = await getDoc(doc(db, 'users', user.uid))
          if (docSnap.exists()) {
            setRole(docSnap.data().role)
          }
        } catch (error) {
          console.error('Erro ao verificar permissão de admin:', error)
        } finally {
          setCheckingRole(false)
        }
      } else {
        setCheckingRole(false)
      }
    }

    if (!authLoading) {
      fetchUserRole()
    }
  }, [user, authLoading])

  if (authLoading || checkingRole) {
    return (
      <div className="p-8 text-center text-slate">
        <p>Verificando permissões...</p>
      </div>
    )
  }

  // Permite acesso APENAS se a role do Firestore for 'admin'
  if (role !== 'admin') {
    return (
      <div className="p-8 text-center max-w-md mx-auto mt-20 bg-white rounded-xl shadow-card border border-line">
        <h2 className="text-xl font-semibold text-red-600 mb-2">Acesso Restrito</h2>
        <p className="text-sm text-slate">
          Esta área é reservada exclusivamente para o perfil Administrador.
        </p>
      </div>
    )
  }

  return children
}

function AppShell() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cloud">
        <p className="text-slate">Carregando…</p>
      </div>
    )
  }

  // Se não estiver autenticado, exibe a tela de login
  if (!user) {
    return <Login />
  }

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cloud">
      <Sidebar />
      <main className="flex-1 min-w-0">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/lancar-horas" element={<LaunchHours />} />
          <Route path="/lancamentos" element={<History />} />
          <Route path="/motoristas" element={<DriverList />} />
          <Route path="/motoristas/:id" element={<DriverDetail />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/usuarios" element={<UserManagement />} />
          
          {/* Rota protegida apenas para Admin */}
          <Route
            path="/admin"
            element={
              <ProtectedAdminRoute>
                <Backups />
              </ProtectedAdminRoute>
            }
          />
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