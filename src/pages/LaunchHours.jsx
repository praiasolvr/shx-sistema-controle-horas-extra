import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDrivers } from '../hooks/useDrivers'
import { useHourEntries } from '../hooks/useHourEntries'
import {
  filterEntriesByMonth,
  sumHours,
  getUsage,
  formatHours,
  monthLabel,
  STATUS_META
} from '../utils/hours'
import { EMPRESAS } from '../utils/constants'
import EmpresaBadge from '../components/EmpresaBadge'
import RouteProgress from '../components/RouteProgress'
import HourEntryForm from '../components/HourEntryForm'
import ConfirmDialog from '../components/ConfirmDialog'

export default function LaunchHours() {
  const { drivers, loading } = useDrivers()
  const [searchParams] = useSearchParams()
  const [empresaFilter, setEmpresaFilter] = useState('Todas')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(searchParams.get('motorista') || '')
  const [deletingEntry, setDeletingEntry] = useState(null)

  useEffect(() => {
    const fromUrl = searchParams.get('motorista')
    if (fromUrl) setSelectedId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  const filteredDrivers = useMemo(() => {
    return drivers.filter((d) => {
      const matchesEmpresa = empresaFilter === 'Todas' || d.empresa === empresaFilter
      const matchesSearch =
        !search.trim() ||
        d.name.toLowerCase().includes(search.toLowerCase()) ||
        (d.matricula || '').toLowerCase().includes(search.toLowerCase())
      return matchesEmpresa && matchesSearch
    })
  }, [drivers, empresaFilter, search])

  const selectedDriver = drivers.find((d) => d.id === selectedId)
  const { entries, addEntry, deleteEntry } = useHourEntries(selectedId)

  const monthEntries = useMemo(() => filterEntriesByMonth(entries), [entries])
  const totalHours = sumHours(monthEntries)
  const usage = selectedDriver ? getUsage(totalHours, selectedDriver.maxHours) : null

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">
          {monthLabel()}
        </p>
        <h1 className="font-display text-3xl font-semibold">Lançar horas</h1>
        <p className="text-sm text-slate mt-1">
          Escolha um motorista e registre as horas extras do dia.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-5">
        {/* Coluna de seleção de motorista */}
        <div className="bg-white rounded-xl shadow-card p-4 h-fit">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome ou matrícula"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
          <div className="flex gap-1.5 mb-3">
            {['Todas', ...EMPRESAS].map((option) => (
              <button
                key={option}
                onClick={() => setEmpresaFilter(option)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  empresaFilter === option ? 'bg-ink text-white' : 'bg-cloud text-slate hover:text-ink'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          {loading && <p className="text-sm text-slate">Carregando…</p>}

          <div className="max-h-[420px] overflow-y-auto -mx-1">
            {filteredDrivers.map((driver) => (
              <button
                key={driver.id}
                onClick={() => setSelectedId(driver.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 transition ${
                  selectedId === driver.id ? 'bg-ink text-white' : 'hover:bg-cloud'
                }`}
              >
                <span className="font-medium block truncate">{driver.name}</span>
                <span
                  className={`text-xs block truncate ${
                    selectedId === driver.id ? 'text-white/70' : 'text-slate'
                  }`}
                >
                  {driver.empresa || 'Sem empresa'}
                  {driver.matricula && ` · #${driver.matricula}`}
                </span>
              </button>
            ))}
            {!loading && filteredDrivers.length === 0 && (
              <p className="text-sm text-slate px-3 py-2">Nenhum motorista encontrado.</p>
            )}
          </div>
        </div>

        {/* Coluna de lançamento */}
        <div>
          {!selectedDriver && (
            <div className="bg-white rounded-xl shadow-card p-10 text-center text-slate">
              Selecione um motorista na lista ao lado para lançar horas.
            </div>
          )}

          {selectedDriver && usage && (
            <>
              <div
                className={`rounded-xl border p-5 mb-5 bg-white shadow-card ring-1 ${
                  STATUS_META[usage.status].ring
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-xl font-semibold">{selectedDriver.name}</h2>
                    <EmpresaBadge empresa={selectedDriver.empresa} />
                  </div>
                  <Link
                    to={`/motoristas/${selectedDriver.id}`}
                    className="text-xs text-slate hover:text-ink underline"
                  >
                    Ver histórico completo
                  </Link>
                </div>
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="font-mono text-2xl font-semibold">
                    {formatHours(totalHours)}
                  </span>
                  <span className="text-slate text-sm">
                    de {formatHours(selectedDriver.maxHours)} permitidas este mês
                  </span>
                </div>
                <RouteProgress percent={usage.percent} status={usage.status} />
              </div>

              <HourEntryForm onAdd={addEntry} />

              <div className="bg-white rounded-xl shadow-card overflow-hidden">
                <div className="px-5 py-3 border-b border-line">
                  <h3 className="font-display text-lg font-semibold">Últimos lançamentos</h3>
                </div>
                {entries.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-slate">Nenhum lançamento registrado ainda.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate border-b border-line">
                        <th className="px-5 py-2 font-medium">Data</th>
                        <th className="px-5 py-2 font-medium font-mono">Horas</th>
                        <th className="px-5 py-2 font-medium">Observação</th>
                        <th className="px-5 py-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {entries.slice(0, 15).map((entry) => (
                        <tr key={entry.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-2">
                            {new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                          </td>
                          <td className="px-5 py-2 font-mono">{formatHours(entry.hours)}</td>
                          <td className="px-5 py-2 text-slate">{entry.note || '—'}</td>
                          <td className="px-5 py-2 text-right">
                            <button
                              onClick={() => setDeletingEntry(entry)}
                              className="text-alert hover:text-alert/80 text-xs font-medium"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {deletingEntry && (
        <ConfirmDialog
          title="Excluir lançamento"
          message="Tem certeza que deseja excluir este lançamento de horas?"
          onCancel={() => setDeletingEntry(null)}
          onConfirm={async () => {
            await deleteEntry(deletingEntry.id)
            setDeletingEntry(null)
          }}
        />
      )}
    </div>
  )
}
