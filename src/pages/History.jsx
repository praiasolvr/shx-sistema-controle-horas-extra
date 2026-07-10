import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { doc, deleteDoc } from 'firebase/firestore'
import { db } from '../firebase'
import { useDrivers } from '../hooks/useDrivers'
import { useAllEntries } from '../hooks/useAllEntries'
import { formatHours, monthLabel, currentMonthKey, sumHours } from '../utils/hours'
import { EMPRESAS } from '../utils/constants'
import EmpresaBadge from '../components/EmpresaBadge'
import ConfirmDialog from '../components/ConfirmDialog'

export default function History() {
  const { drivers, loading: loadingDrivers } = useDrivers()
  const { entriesByDriver, loading: loadingEntries } = useAllEntries(drivers)

  const [search, setSearch] = useState('')
  const [empresaFilter, setEmpresaFilter] = useState('Todas')
  const [monthFilter, setMonthFilter] = useState(currentMonthKey())
  const [deleting, setDeleting] = useState(null)

  const driversById = useMemo(() => {
    const map = {}
    drivers.forEach((d) => (map[d.id] = d))
    return map
  }, [drivers])

  const allRows = useMemo(() => {
    const rows = []
    Object.entries(entriesByDriver).forEach(([driverId, entries]) => {
      const driver = driversById[driverId]
      if (!driver) return
      entries.forEach((entry) => {
        rows.push({ ...entry, driverId, driver })
      })
    })
    return rows
  }, [entriesByDriver, driversById])

  const availableMonths = useMemo(() => {
    const set = new Set(allRows.map((r) => (r.date || '').slice(0, 7)).filter(Boolean))
    set.add(currentMonthKey())
    return [...set].sort().reverse()
  }, [allRows])

  const filteredRows = useMemo(() => {
    return allRows
      .filter((r) => monthFilter === 'todos' || (r.date || '').startsWith(monthFilter))
      .filter((r) => empresaFilter === 'Todas' || r.driver.empresa === empresaFilter)
      .filter((r) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        return (
          r.driver.name.toLowerCase().includes(q) ||
          (r.driver.matricula || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0))
  }, [allRows, monthFilter, empresaFilter, search])

  const totalHours = sumHours(filteredRows)
  const loading = loadingDrivers || loadingEntries

  async function handleDelete() {
    await deleteDoc(doc(db, 'drivers', deleting.driverId, 'entries', deleting.id))
    setDeleting(null)
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">Histórico</p>
        <h1 className="font-display text-3xl font-semibold">Lançamentos</h1>
        <p className="text-sm text-slate mt-1">
          Todos os lançamentos de horas extra registrados na frota.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nome ou matrícula"
          className="flex-1 rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
        <select
          value={empresaFilter}
          onChange={(e) => setEmpresaFilter(e.target.value)}
          className="rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
        >
          <option value="Todas">Todas as empresas</option>
          {EMPRESAS.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
        >
          <option value="todos">Todos os meses</option>
          {availableMonths.map((m) => (
            <option key={m} value={m}>
              {monthLabel(m)}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate">
          {filteredRows.length} lançamento{filteredRows.length === 1 ? '' : 's'}
        </p>
        <p className="text-sm font-medium">
          Total: <span className="font-mono">{formatHours(totalHours)}</span>
        </p>
      </div>

      {loading && <p className="text-slate">Carregando…</p>}

      {!loading && filteredRows.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center text-slate">
          Nenhum lançamento encontrado para este filtro.
        </div>
      )}

      {!loading && filteredRows.length > 0 && (
        <div className="bg-white rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate border-b border-line whitespace-nowrap">
                <th className="px-5 py-3 font-medium">Data</th>
                <th className="px-5 py-3 font-medium">Motorista</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Matrícula</th>
                <th className="px-5 py-3 font-medium font-mono">Horas</th>
                <th className="px-5 py-3 font-medium">Observação</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((row) => (
                <tr key={`${row.driverId}-${row.id}`} className="border-b border-line last:border-0 hover:bg-cloud/50">
                  <td className="px-5 py-2 whitespace-nowrap">
                    {new Date(row.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-2 whitespace-nowrap">
                    <Link to={`/motoristas/${row.driverId}`} className="font-medium hover:underline">
                      {row.driver.name}
                    </Link>
                  </td>
                  <td className="px-5 py-2">
                    <EmpresaBadge empresa={row.driver.empresa} />
                  </td>
                  <td className="px-5 py-2 font-mono text-slate">{row.driver.matricula || '—'}</td>
                  <td className="px-5 py-2 font-mono">{formatHours(row.hours)}</td>
                  <td className="px-5 py-2 text-slate">{row.note || '—'}</td>
                  <td className="px-5 py-2 text-right whitespace-nowrap">
                    <button
                      onClick={() => setDeleting(row)}
                      className="text-alert hover:text-alert/80 text-xs font-medium"
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

      {deleting && (
        <ConfirmDialog
          title="Excluir lançamento"
          message={`Excluir o lançamento de ${formatHours(deleting.hours)} de ${deleting.driver.name}?`}
          onCancel={() => setDeleting(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  )
}
