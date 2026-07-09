// Regras de status de horas extra.
// 0-74%   -> ok (verde)
// 75-89%  -> atenção (âmbar) — aviso solicitado pelo usuário
// 90-99%  -> quase no limite (âmbar escuro)
// >=100%  -> excedeu o limite (vermelho)

export function currentMonthKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function filterEntriesByMonth(entries, monthKey = currentMonthKey()) {
  return entries.filter((e) => (e.date || '').startsWith(monthKey))
}

export function sumHours(entries) {
  return entries.reduce((total, e) => total + (Number(e.hours) || 0), 0)
}

export function getUsage(totalHours, maxHours) {
  const max = Number(maxHours) || 0
  const percent = max > 0 ? Math.min((totalHours / max) * 100, 999) : 0
  return {
    percent,
    remaining: Math.max(max - totalHours, 0),
    status: getStatus(percent)
  }
}

export function getStatus(percent) {
  if (percent >= 100) return 'excedido'
  if (percent >= 90) return 'critico'
  if (percent >= 75) return 'atencao'
  return 'ok'
}

export const STATUS_META = {
  ok: {
    label: 'Dentro do limite',
    color: '#16A34A',
    bg: 'bg-signal/10',
    text: 'text-signal',
    ring: 'ring-signal/30'
  },
  atencao: {
    label: 'Atingiu 75% do limite',
    color: '#F5A524',
    bg: 'bg-amber/10',
    text: 'text-amber-dark',
    ring: 'ring-amber/40'
  },
  critico: {
    label: 'Atingiu 90% do limite',
    color: '#C97A0B',
    bg: 'bg-amber/20',
    text: 'text-amber-dark',
    ring: 'ring-amber-dark/40'
  },
  excedido: {
    label: 'Limite de horas excedido',
    color: '#DC2626',
    bg: 'bg-alert/10',
    text: 'text-alert',
    ring: 'ring-alert/40'
  }
}

export function formatHours(value) {
  const n = Number(value) || 0
  return `${n.toFixed(1)}h`
}

export function monthLabel(monthKey = currentMonthKey()) {
  const [y, m] = monthKey.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  const label = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
