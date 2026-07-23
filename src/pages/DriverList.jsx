import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useDrivers } from '../hooks/useDrivers'
import DriverFormModal from '../components/DriverFormModal'
import ImportDriversModal from '../components/ImportDriversModal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmpresaBadge from '../components/EmpresaBadge'
import { formatHours } from '../utils/hours'

export default function DriverList() {
  const { drivers, loading: loadingDrivers, addDriver, updateDriver, deleteDriver, bulkImportDrivers } = useDrivers()
  
  // Controle de Acesso do Usuário Logado
  const [userRole, setUserRole] = useState(null)
  const [userEmpresa, setUserEmpresa] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  const [searchTerm, setSearchTerm] = useState('')

  // 1. Busca perfil do usuário logado no Firestore
  useEffect(() => {
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        if (isMounted) setLoadingUser(false)
        return
      }

      try {
        const docRef = doc(db, 'users', currentUser.uid)
        const docSnap = await getDoc(docRef)

        if (isMounted && docSnap.exists()) {
          const userData = docSnap.data()
          setUserRole(userData.role || 'cliente')
          setUserEmpresa(userData.empresa || 'Todas')
        }
      } catch (error) {
        console.error('Erro ao buscar perfil do usuário:', error)
      } finally {
        if (isMounted) setLoadingUser(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [])

  async function handleSave(data) {
    if (editing) {
      await updateDriver(editing.id, data)
    } else {
      // Garante que se não for supervisor, salva com a empresa fixa do usuário
      const payload = userRole === 'supervisor' 
        ? data 
        : { ...data, empresa: userEmpresa }

      await addDriver(payload)
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete() {
    await deleteDriver(deleting.id)
    setDeleting(null)
  }

  // 2. Filtra motoristas por Empresa do Usuário + Busca Por Nome/Matrícula
  const filteredDrivers = drivers.filter((driver) => {
    // Restrição de Acesso
    const isAllowedEmpresa = userRole === 'supervisor' || userEmpresa === 'Todas' || driver.empresa === userEmpresa
    if (!isAllowedEmpresa) return false

    // Filtro de Busca
    const matchesSearch = 
      driver.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.matricula?.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSearch
  })

  const loading = loadingDrivers || loadingUser

  if (loadingUser) {
    return <div className="p-8 text-center text-slate">Carregando permissões de acesso...</div>
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">
            Cadastro {userRole !== 'supervisor' && userEmpresa ? `• ${userEmpresa}` : ''}
          </p>
          <h1 className="font-display text-3xl font-semibold">Motoristas</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="border border-line rounded-lg px-4 py-2.5 font-medium text-ink hover:bg-cloud transition"
          >
            Importar lista
          </button>
          <button
            onClick={() => {
              setEditing(null)
              setShowForm(true)
            }}
            className="bg-ink text-white rounded-lg px-4 py-2.5 font-medium hover:bg-ink/90 transition"
          >
            + Novo motorista
          </button>
        </div>
      </div>

      {/* Barra de Filtros */}
      {!loading && drivers.length > 0 && (
        <div className="bg-white rounded-xl shadow-card p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center border border-line">
          <div className="w-full sm:flex-1">
            <label className="block text-xs font-medium text-slate mb-1">Buscar por nome ou matrícula</label>
            <input
              type="text"
              placeholder="Digite o nome ou matrícula..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:border-ink/50 transition"
            />
          </div>
        </div>
      )}

      {loading && <p className="text-slate">Carregando…</p>}

      {!loading && drivers.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center border border-line">
          <p className="font-display text-xl mb-1">Nenhum motorista cadastrado</p>
          <p className="text-sm text-slate">
            Clique em "Novo motorista" ou "Importar lista" para começar.
          </p>
        </div>
      )}

      {!loading && drivers.length > 0 && filteredDrivers.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center border border-line">
          <p className="font-display text-lg font-medium mb-1">Nenhum resultado encontrado</p>
          <p className="text-sm text-slate">Tente ajustar o termo de pesquisa.</p>
        </div>
      )}

      {/* Tabela Filtrada */}
      {!loading && filteredDrivers.length > 0 && (
        <div className="bg-white rounded-xl shadow-card overflow-x-auto border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate border-b border-line whitespace-nowrap bg-cloud/40">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Matrícula</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium font-mono">Limite mensal</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredDrivers.map((driver) => (
                <tr key={driver.id} className="border-b border-line last:border-0 hover:bg-cloud/50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link to={`/motoristas/${driver.id}`} className="font-medium hover:underline text-ink">
                      {driver.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate font-mono">{driver.matricula || '—'}</td>
                  <td className="px-5 py-3">
                    <EmpresaBadge empresa={driver.empresa} />
                  </td>
                  <td className="px-5 py-3 font-mono">{formatHours(driver.maxHours)}</td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => {
                        setEditing(driver)
                        setShowForm(true)
                      }}
                      className="text-slate hover:text-ink font-medium mr-4"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setDeleting(driver)}
                      className="text-alert hover:text-alert/80 font-medium"
                    >
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Passando userRole e userEmpresa para o Modal */}
      {showForm && (
        <DriverFormModal
          initial={editing}
          userRole={userRole}
          userEmpresa={userEmpresa}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      )}

      {showImport && (
        <ImportDriversModal
          userRole={userRole}
          userEmpresa={userEmpresa}
          onClose={() => setShowImport(false)}
          onImport={bulkImportDrivers}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Excluir motorista"
          message={`Tem certeza que deseja excluir ${deleting.name}? Todos os lançamentos de horas dele também serão perdidos.`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}