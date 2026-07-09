import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDrivers } from '../hooks/useDrivers'
import { useAllEntries } from '../hooks/useAllEntries'
import { getUsage, monthLabel, sumHours, filterEntriesByMonth, formatHours, STATUS_META } from '../utils/hours'
import { EMPRESAS } from '../utils/constants'
import { exportExcel, exportPDF } from '../utils/export'
import DriverCard from '../components/DriverCard'
import EmpresaBadge from '../components/EmpresaBadge'
import AlertBanner from '../components/AlertBanner'
import RouteProgress from '../components/RouteProgress'

export default function Dashboard() {
  const { drivers, loading: loadingDrivers } = useDrivers()
  const { entriesByDriver, loading: loadingEntries } = useAllEntries(drivers)
  const [empresaFilter, setEmpresaFilter] = useState('Todas')
  const [viewMode, setViewMode] = useState('cards')
  const [exporting, setExporting] = useState(false)

  const computed = useMemo(() => {
    return drivers.map((driver) => {
      const monthEntries = filterEntriesByMonth(entriesByDriver[driver.id] || [])
      const totalHours = sumHours(monthEntries)
      const usage = getUsage(totalHours, driver.maxHours)
      return { driver, totalHours, usage }
    })
  }, [drivers, entriesByDriver])

  const filtered =
    empresaFilter === 'Todas'
      ? computed
      : computed.filter((c) => c.driver.empresa === empresaFilter)

  const sorted = [...filtered].sort((a, b) => b.usage.percent - a.usage.percent)

  const alertedDrivers = filtered
    .filter((c) => c.usage.percent >= 75)
    .sort((a, b) => b.usage.percent - a.usage.percent)

  const loading = loadingDrivers || loadingEntries

  async function handleExport(type) {
    setExporting(true)
    try {
      if (type === 'excel') await exportExcel(sorted, empresaFilter)
      else await exportPDF(sorted, empresaFilter)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-end justify-between mb-6 flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">
            {monthLabel()}
          </p>
          <h1 className="font-display text-3xl font-semibold">Painel geral</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting || sorted.length === 0}
            className="border border-line rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-cloud transition disabled:opacity-40"
          >
            Exportar Excel
          </button>
          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting || sorted.length === 0}
            className="border border-line rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-cloud transition disabled:opacity-40"
          >
            Exportar PDF
          </button>
          <Link
            to="/lancar-horas"
            className="bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink/90 transition"
          >
            + Lançar horas
          </Link>
        </div>
      </div>

      <AlertBanner alertedDrivers={alertedDrivers} />

      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <div className="flex gap-1.5 bg-white border border-line rounded-lg p-1">
          {['Todas', ...EMPRESAS].map((option) => (
            <button
              key={option}
              onClick={() => setEmpresaFilter(option)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
                empresaFilter === option ? 'bg-ink text-white' : 'text-slate hover:text-ink'
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="flex gap-1.5 bg-white border border-line rounded-lg p-1">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'cards' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'list' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {loading && <p className="text-slate">Carregando dados…</p>}

      {!loading && drivers.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center">
          <p className="font-display text-xl mb-1">Nenhum motorista cadastrado</p>
          <p className="text-sm text-slate">
            Vá até "Motoristas" para adicionar o primeiro motorista da frota.
          </p>
        </div>
      )}

      {!loading && drivers.length > 0 && sorted.length === 0 && (
        <div className="bg-white rounded-xl shadow-card p-10 text-center">
          <p className="text-slate">Nenhum motorista para o filtro selecionado.</p>
        </div>
      )}

      {!loading && sorted.length > 0 && viewMode === 'cards' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map(({ driver, totalHours, usage }) => (
            <DriverCard key={driver.id} driver={driver} totalHours={totalHours} usage={usage} />
          ))}
        </div>
      )}

      {!loading && sorted.length > 0 && viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate border-b border-line whitespace-nowrap">
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium font-mono">Horas</th>
                <th className="px-5 py-3 font-medium w-56">Progresso</th>
                <th className="px-5 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(({ driver, totalHours, usage }) => {
                const meta = STATUS_META[usage.status]
                return (
                  <tr
                    key={driver.id}
                    className="border-b border-line last:border-0 hover:bg-cloud/50"
                  >
                    <td className="px-5 py-3">
                      <Link to={`/motoristas/${driver.id}`} className="font-medium hover:underline">
                        {driver.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <EmpresaBadge empresa={driver.empresa} />
                    </td>
                    <td className="px-5 py-3 font-mono whitespace-nowrap">
                      {formatHours(totalHours)}{' '}
                      <span className="text-slate">/ {formatHours(driver.maxHours)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <RouteProgress percent={usage.percent} status={usage.status} compact />
                    </td>
                    <td className={`px-5 py-3 font-medium ${meta.text}`}>{meta.label}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
