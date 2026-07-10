import { Link } from 'react-router-dom'
import RouteProgress from './RouteProgress'
import EmpresaBadge from './EmpresaBadge'

export default function DriverCard({ driver, totalHoursStr, usage }) {
  // Função auxiliar rápida para garantir que o limite também apareça como relógio (ex: 40:00)
  const formatarLimite = (decimal) => {
    if (!decimal || decimal <= 0) return '00:00'
    const h = Math.floor(decimal)
    const m = Math.round((decimal - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return (
    <Link
      to={`/motoristas/${driver.id}`}
      className="block bg-white rounded-xl shadow-card p-5 hover:-translate-y-0.5 hover:shadow-lg transition"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className="font-display text-xl font-semibold leading-tight">{driver.name}</h3>
            <EmpresaBadge empresa={driver.empresa} />
          </div>
          <p className="text-xs text-slate">
            {driver.matricula && <span className="font-mono">#{driver.matricula}</span>}
            {driver.matricula && driver.role && ' · '}
            {driver.role}
          </p>
        </div>
        <div className="text-right font-mono shrink-0 ml-3">
          {/* Exibe diretamente a string formatada em HH:MM vinda do Dashboard */}
          <p className="text-lg font-semibold leading-none">{totalHoursStr}h</p>
          <p className="text-[11px] text-slate mt-1">de {formatarLimite(driver.maxHours)}h</p>
        </div>
      </div>
      <RouteProgress percent={usage.percent} status={usage.status} />
    </Link>
  )
}