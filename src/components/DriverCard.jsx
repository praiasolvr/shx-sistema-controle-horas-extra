import { Link } from 'react-router-dom'
import RouteProgress from './RouteProgress'
import EmpresaBadge from './EmpresaBadge'
import { formatHours } from '../utils/hours'

export default function DriverCard({ driver, totalHours, usage }) {
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
          <p className="text-lg font-semibold leading-none">{formatHours(totalHours)}</p>
          <p className="text-[11px] text-slate mt-1">de {formatHours(driver.maxHours)}</p>
        </div>
      </div>
      <RouteProgress percent={usage.percent} status={usage.status} />
    </Link>
  )
}
