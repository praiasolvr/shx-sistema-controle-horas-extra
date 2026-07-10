import { useState } from 'react'
import { formatHours } from '../utils/hours'
import { buildWhatsAppLink, fillTemplate } from '../utils/whatsapp'

const DEFAULT_TEMPLATE =
  'Olá {nome}, identificamos que você atingiu {percentual}% do seu limite de horas extra este mês ' +
  '({horas} de {limite} permitidas). Por favor, entre em contato com a operação para alinharmos a escala.'

export default function WhatsAppAlertModal({ alertedDrivers, onClose }) {
  const [message, setMessage] = useState(DEFAULT_TEMPLATE)

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-1">Avisar por WhatsApp</h2>
        <p className="text-sm text-slate mb-4">
          Envie a mensagem abaixo para cada motorista que está atingindo o limite. Clique em
          "Enviar" para abrir o WhatsApp já com o texto preenchido.
        </p>

        <label className="block text-sm font-medium text-slate mb-1">Mensagem</label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={4}
          className="w-full rounded-lg border border-line px-3 py-2 text-sm mb-1 focus:outline-none focus:ring-2 focus:ring-ink/20"
        />
        <p className="text-xs text-slate mb-4">
          Placeholders disponíveis: {'{nome}'}, {'{percentual}'}, {'{horas}'}, {'{limite}'}, {'{empresa}'}
        </p>

        {alertedDrivers.length === 0 ? (
          <p className="text-sm text-slate">Nenhum motorista está em 75% ou mais no momento.</p>
        ) : (
          <ul className="divide-y divide-line border border-line rounded-lg overflow-hidden">
            {alertedDrivers.map(({ driver, usage, totalHours }) => {
              const finalMessage = fillTemplate(message, {
                nome: driver.name,
                percentual: usage.percent.toFixed(0),
                horas: formatHours(totalHours),
                limite: formatHours(driver.maxHours),
                empresa: driver.empresa || ''
              })
              const link = buildWhatsAppLink(driver.phone, finalMessage)

              return (
                <li key={driver.id} className="flex items-center justify-between gap-3 flex-wrap px-4 py-3">
                  <div>
                    <p className="font-medium text-sm">{driver.name}</p>
                    <p className="text-xs text-slate">
                      {usage.percent.toFixed(0)}% do limite
                      {!driver.phone && ' · sem telefone cadastrado'}
                    </p>
                  </div>
                  {link ? (
                    <a
                      href={link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-signal text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-signal/90 transition shrink-0"
                    >
                      Enviar
                    </a>
                  ) : (
                    <span className="text-xs text-slate shrink-0">Sem telefone</span>
                  )}
                </li>
              )
            })}
          </ul>
        )}

        <div className="pt-5">
          <button
            onClick={onClose}
            className="w-full rounded-lg border border-line py-2.5 font-medium text-slate hover:bg-cloud transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
