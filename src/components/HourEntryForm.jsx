import { useState, useMemo } from 'react'

export default function HourEntryForm({ onAdd }) {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Calcula apenas as horas brutas trabalhadas no período escolhido
  const resumoPeriodo = useMemo(() => {
    if (!startTime || !endTime) return null

    const [startH, startM] = startTime.split(':').map(Number)
    const [endH, endM] = endTime.split(':').map(Number)
    
    let totalMinutos = (endH * 60 + endM) - (startH * 60 + startM)

    // Suporte caso a jornada passe da meia-noite
    if (totalMinutos < 0) {
      totalMinutos += 24 * 60
    }

    const horasDecimais = totalMinutos / 60
    const h = Math.floor(horasDecimais)
    const m = Math.round((horasDecimais - h) * 60)
    const formatado = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    return {
      horasDecimais,
      formatado
    }
  }, [startTime, endTime])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!resumoPeriodo || isSubmitting) return

    setIsSubmitting(true)
    try {
      await onAdd({
        date,
        hours: resumoPeriodo.horasDecimais, // Envia o valor decimal puro para o banco
        note: note.trim() 
          ? `${note.trim()} (${startTime} às ${endTime})`
          : `${startTime} às ${endTime}`
      })
      setStartTime('')
      setEndTime('')
      setNote('')
    } catch (error) {
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-card p-5 mb-5">
      <h3 className="font-display text-lg font-semibold mb-4">Lançar período trabalhado</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
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
          <label className="block text-xs font-medium text-slate mb-1">Hora Inicial</label>
          <input
            type="time"
            required
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate mb-1">Hora Final</label>
          <input
            type="time"
            required
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>
      </div>

      {resumoPeriodo && (
        <div className="bg-cloud/60 border border-line/50 rounded-lg p-3 mb-4 text-sm font-medium text-ink">
          ⏱️ Subtotal trabalhado neste período: <span className="font-mono bg-white px-2 py-0.5 border border-line/40 rounded shadow-sm font-bold">{resumoPeriodo.formatado}h</span>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs font-medium text-slate mb-1">Observação (Opcional)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Ex: Rota extra"
          className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting || !resumoPeriodo}
          className="bg-ink hover:bg-ink/90 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-40"
        >
          {isSubmitting ? 'Salvando...' : 'Adicionar Lançamento'}
        </button>
      </div>
    </form>
  )
}