import { STATUS_META } from '../utils/hours'

export default function RouteProgress({ percent, status, compact = false }) {
  const meta = STATUS_META[status]
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
