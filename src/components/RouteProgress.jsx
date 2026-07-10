import { STATUS_META } from '../utils/hours'

export default function RouteProgress({ percent, status, compact = false }) {
  // Busca o meta correspondente. Se não achar, cria um fallback seguro para não quebrar a tela
  const meta = STATUS_META[status] || {
    color: '#64748b', // Cinza slate padrão
    text: 'text-slate',
    label: 'Normal'
  }
  
  const clampedForBar = Math.min(percent, 100)

  return (
    <div>
      <div className="route-track" style={{ height: compact ? 8 : 10 }}>
        <div
          className="route-fill"
          style={{ width: `${clampedForBar}%`, backgroundColor: meta.color }}
        />
        <div
          className="route-marker"
          style={{ left: `${clampedForBar}%`, backgroundColor: meta.color }}
        />
      </div>
      {!compact && (
        <div className="mt-1.5 flex items-center justify-between text-xs">
          <span className={`font-medium ${meta.text}`}>{meta.label}</span>
          <span className="font-mono text-slate">{percent.toFixed(0)}%</span>
        </div>
      )}
    </div>
  )
}