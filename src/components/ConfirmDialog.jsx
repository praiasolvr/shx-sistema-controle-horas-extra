export default function ConfirmDialog({ title, message, confirmLabel = 'Excluir', onCancel, onConfirm }) {
  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-sm p-6">
        <h2 className="font-display text-xl font-semibold mb-2">{title}</h2>
        <p className="text-sm text-slate mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-lg border border-line py-2.5 font-medium text-slate hover:bg-cloud transition"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-lg bg-alert text-white py-2.5 font-medium hover:bg-alert/90 transition"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
