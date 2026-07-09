const COLORS = {
  'Praia Sol': { bg: 'bg-amber/30', text: 'text-amber-dark' },
  Vereda: { bg: 'bg-signal/30', text: 'text-ink' }
}

export default function EmpresaBadge({ empresa }) {
  if (!empresa) return <span className="text-xs text-slate">—</span>
  const c = COLORS[empresa] || { bg: 'bg-slate/10', text: 'text-slate' }
  return (
    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {empresa}
    </span>
  )
}
