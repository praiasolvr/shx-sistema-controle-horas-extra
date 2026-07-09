import { Link } from 'react-router-dom'
import { STATUS_META } from '../utils/hours'

export default function AlertBanner({ alertedDrivers }) {
  if (alertedDrivers.length === 0) return null

  return (
    <div className="rounded-xl border border-amber/40 bg-amber/10 px-4 py-3 mb-6">
      <p className="text-sm font-medium text-amber-dark mb-2">
        {alertedDrivers.length === 1
          ? '1 motorista precisa de atenção'
          : `${alertedDrivers.length} motoristas precisam de atenção`}
      </p>
      <ul className="space-y-1">
        {alertedDrivers.map(({ driver, usage }) => {
          const meta = STATUS_META[usage.status]
          return (
            <li key={driver.id} className="text-sm flex items-center gap-2">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: meta.color }}
              />
              <Link to={`/motoristas/${driver.id}`} className="font-medium hover:underline">
                {driver.name}
              </Link>
              <span className="text-slate">
                — {meta.label.toLowerCase()} ({usage.percent.toFixed(0)}%)
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
