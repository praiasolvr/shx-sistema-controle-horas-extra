import { useNavigate } from 'react-router-dom'
import RouteProgress from './RouteProgress'
import EmpresaBadge from './EmpresaBadge'
import { STATUS_META } from '../utils/hours'

export default function DriverCard({ 
  driver = {}, 
  totalHoursStr = '00:00', 
  total75Str = '00:00', 
  total100Str = '00:00', 
  usage = { percent: 0, status: 'ok' } 
}) {
  const navigate = useNavigate()

  // Evita erro caso usage venha nulo ou sem status
  const safeUsage = usage || { percent: 0, status: 'ok' }
  const meta = STATUS_META[safeUsage.status] || STATUS_META.ok

  return (
    <article className="bg-white rounded-xl border border-line p-5 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between group">
      <div>
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-2 mb-4">
          <div className="max-w-[70%]">
            <h3 className="font-display font-bold text-base text-ink tracking-tight truncate" title={driver?.name || 'Motorista'}>
              {driver?.name || 'Sem nome'}
            </h3>
            <p className="text-xs text-slate mt-0.5">
              Matrícula: <span className="font-mono bg-cloud px-1.5 py-0.5 rounded text-slate-700">{driver?.matricula || 'N/D'}</span>
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <EmpresaBadge empresa={driver?.empresa} />
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border ${meta?.bg || 'bg-cloud'} ${meta?.text || 'text-slate'} ${meta?.border || 'border-line'}`}>
              {meta?.label || 'Normal'}
            </span>
          </div>
        </div>

        {/* Bloco de Progresso Otimizado */}
        <div className="mb-5 bg-cloud/40 rounded-lg p-3 border border-line/40">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-medium text-slate-600">Uso do teto mensal</span>
            <span className={`font-mono font-bold ${meta?.text || 'text-slate'}`}>
              {Math.round(safeUsage.percent)}%
            </span>
          </div>
          <RouteProgress percent={safeUsage.percent} status={safeUsage.status} compact />
        </div>
      </div>

      {/* Rodapé: Métricas + Botão de Ação */}
      <div className="space-y-4">
        {/* Painel de Horas Detalhado */}
        <div className="grid grid-cols-3 gap-1 text-center border-y border-line/60 py-3">
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate block">Total Geral</span>
            <span className="font-mono font-bold text-base text-ink block mt-0.5">{totalHoursStr}h</span>
          </div>
          <div className="border-x border-line/60 px-1">
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate block">Extras 75%</span>
            <span className="font-mono font-semibold text-sm text-slate-700 block mt-0.5">{total75Str}h</span>
          </div>
          <div>
            <span className="text-[9px] uppercase font-bold tracking-wider text-slate block">Extras 100%</span>
            <span className="font-mono font-semibold text-sm text-slate-700 block mt-0.5">{total100Str}h</span>
          </div>
        </div>

        {/* Botão de Ver Detalhes */}
        <button
          onClick={() => driver?.id && navigate(`/motoristas/${driver.id}`)}
          disabled={!driver?.id}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg border border-line bg-white hover:bg-[#040a18] hover:border-[#040a18] hover:text-white text-slate-700 font-bold text-xs uppercase tracking-wider transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>Ver Detalhes</span>
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            fill="none" 
            viewBox="0 0 24 24" 
            strokeWidth={2.5} 
            stroke="currentColor" 
            className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </button>
      </div>
    </article>
  )
}