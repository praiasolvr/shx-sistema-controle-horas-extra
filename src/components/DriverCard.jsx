import { Link } from 'react-router-dom'
import RouteProgress from './RouteProgress'
import EmpresaBadge from './EmpresaBadge'
import { STATUS_META } from '../utils/hours'

export default function DriverCard({ driver, totalHoursStr, total75Str = '00:00', total100Str = '00:00', usage }) {
  const meta = STATUS_META[usage.status] || STATUS_META.ok

  const formatarParaRelogio = (decimal) => {
    if (!decimal || decimal <= 0) return '00:00'
    const h = Math.floor(decimal)
    const m = Math.round((decimal - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  return (
    <div className="bg-white rounded-xl border border-line p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between">
      <div>
        <div className="flex items-start justify-between mb-3">
          <div>
            <Link to={`/motoristas/${driver.id}`} className="font-display font-semibold text-lg hover:underline text-ink">
              {driver.name}
            </Link>
            <p className="text-xs text-slate mt-0.5">Matrícula: {driver.matricula || 'N/D'}</p>
          </div>
          <EmpresaBadge empresa={driver.empresa} />
        </div>

        {/* Progresso visual */}
        <div className="my-4">
          <div className="flex justify-between text-xs font-semibold mb-1">
            <span className="text-slate">Acumulado do mês</span>
            <span className={meta.text}>{meta.label} ({usage.percent}%)</span>
          </div>
          <RouteProgress percent={usage.percent} status={usage.status} />
        </div>
      </div>

      {/* Caixa de detalhes de Horas */}
      <div className="border-t border-line/60 pt-3 mt-2">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate">Total Geral</div>
            <div className="font-mono font-bold text-base text-ink">{totalHoursStr}h</div>
          </div>
          <div className="border-l border-line/60">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate">Extras 75%</div>
            <div className="font-mono font-semibold text-sm text-slate-800">{total75Str}h</div>
          </div>
          <div className="border-l border-line/60">
            <div className="text-[10px] uppercase font-mono tracking-wider text-slate">Extras 100%</div>
            <div className="font-mono font-semibold text-sm text-slate-800">{total100Str}h</div>
          </div>
        </div>
      </div>
    </div>
  )
}