import { useState } from 'react'
import { EMPRESAS } from '../utils/constants'

export default function DriverFormModal({ initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '')
  const [matricula, setMatricula] = useState(initial?.matricula || '')
  const [empresa, setEmpresa] = useState(initial?.empresa || EMPRESAS[0])
  const [role, setRole] = useState(initial?.role || '')
  const [phone, setPhone] = useState(initial?.phone || '')
  const [maxHours, setMaxHours] = useState(initial?.maxHours ?? 20)
  const [saving, setSaving] = useState(false)
  const isEdit = Boolean(initial)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    await onSave({ name, matricula, empresa, role, phone, maxHours })
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-4">
          {isEdit ? 'Editar motorista' : 'Novo motorista'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Nome</label>
            <input
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Nome completo"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Matrícula</label>
              <input
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
                placeholder="Ex: 00123"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Empresa</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
              >
                {EMPRESAS.map((e) => (
                  <option key={e} value={e}>
                    {e}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Função / veículo</label>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
                placeholder="Ex: Carreta 04"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate mb-1">Telefone</label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
                placeholder="(00) 00000-0000"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate mb-1">
              Limite de horas extra mensais
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              required
              value={maxHours}
              onChange={(e) => setMaxHours(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
            />
            <p className="text-xs text-slate mt-1">
              O sistema avisa automaticamente ao atingir 75%, 90% e 100% deste valor.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-line py-2.5 font-medium text-slate hover:bg-cloud transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-lg bg-ink text-white py-2.5 font-medium hover:bg-ink/90 transition disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
