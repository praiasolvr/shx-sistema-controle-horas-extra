import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDrivers } from '../hooks/useDrivers'
import DriverFormModal from '../components/DriverFormModal'
import ImportDriversModal from '../components/ImportDriversModal'
import ConfirmDialog from '../components/ConfirmDialog'
import EmpresaBadge from '../components/EmpresaBadge'
import { formatHours } from '../utils/hours'

export default function DriverList() {
  const { drivers, loading, addDriver, updateDriver, deleteDriver, bulkImportDrivers } = useDrivers()
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)

  async function handleSave(data) {
    if (editing) {
      await updateDriver(editing.id, data)
    } else {
      await addDriver(data)
    }
    setShowForm(false)
    setEditing(null)
  }

  async function handleDelete() {
    await deleteDriver(deleting.id)
    setDeleting(null)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">Cadastro</p>
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

      {loading && <p className="text-slate">Carregando…</p>}

      {!loading && drivers.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center">
          <p className="font-display text-xl mb-1">Nenhum motorista cadastrado</p>
          <p className="text-sm text-slate">
            Clique em "Novo motorista" ou "Importar lista" para começar.
          </p>
        </div>
      )}

      {!loading && drivers.length > 0 && (
        <div className="bg-white rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate border-b border-line whitespace-nowrap">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Matrícula</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Função / veículo</th>
                <th className="px-5 py-3 font-medium">Telefone</th>
                <th className="px-5 py-3 font-medium font-mono">Limite mensal</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {drivers.map((driver) => (
                <tr key={driver.id} className="border-b border-line last:border-0 hover:bg-cloud/50">
                  <td className="px-5 py-3 whitespace-nowrap">
                    <Link to={`/motoristas/${driver.id}`} className="font-medium hover:underline">
                      {driver.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-slate font-mono">{driver.matricula || '—'}</td>
                  <td className="px-5 py-3">
                    <EmpresaBadge empresa={driver.empresa} />
                  </td>
                  <td className="px-5 py-3 text-slate">{driver.role || '—'}</td>
                  <td className="px-5 py-3 text-slate">{driver.phone || '—'}</td>
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

      {showForm && (
        <DriverFormModal
          initial={editing}
          onClose={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onSave={handleSave}
        />
      )}

      {showImport && (
        <ImportDriversModal
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
