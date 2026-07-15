// Exemplo de como ajustar o seu components/AlertBanner.jsx:
export default function AlertBanner({ alertedDrivers, alertaHoras = 40 }) {
  if (alertedDrivers.length === 0) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex items-start gap-3">
      {/* Ícone de Alerta */}
      <div className="text-amber-600 mt-0.5">⚠️</div>
      <div>
        <h4 className="font-semibold text-amber-900 text-sm">
          Atenção necessária ({alertedDrivers.length})
        </h4>
        <p className="text-xs text-amber-700 mt-0.5">
          Os seguintes motoristas já atingiram ou ultrapassaram o limite de <strong>{alertaHoras} horas extras</strong> acumuladas no mês atual:
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {alertedDrivers.map(({ driver, totalHoursStr }) => (
            <span 
              key={driver.id} 
              className="inline-flex items-center gap-1 bg-white border border-amber-200 rounded px-2 py-0.5 text-xs font-medium text-amber-800"
            >
              {driver.name} ({totalHoursStr}h)
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}