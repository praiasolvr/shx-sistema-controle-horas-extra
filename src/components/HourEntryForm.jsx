import { useState } from 'react'

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

export default function HourEntryForm({ onAdd }) {
  const [date, setDate] = useState(todayISO())
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!hours) return
    setSaving(true)
    await onAdd({ date, hours, note })
    setHours('')
    setNote('')
    setSaving(false)
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-5 mb-6">
      <h3 className="font-display text-lg font-semibold mb-3">Lançar horas extras</h3>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="block text-xs font-medium text-slate mb-1">Data</label>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-slate mb-1">Horas</label>
          <input
            type="number"
            min="0"
            step="0.5"
            required
            value={hours}
            onChange={(e) => setHours(e.target.value)}
            placeholder="Ex: 2.5"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium text-slate mb-1">Observação</label>
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Opcional"
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink/90 transition disabled:opacity-60"
        >
          {saving ? 'Salvando…' : 'Adicionar'}
        </button>
      </div>
    </form>
  )
}
