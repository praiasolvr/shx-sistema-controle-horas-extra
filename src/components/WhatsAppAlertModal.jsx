import { useState, useMemo } from 'react'
import { formatHours } from '../utils/hours'
import { buildWhatsAppLink } from '../utils/whatsapp'

const DEFAULT_TEMPLATE = 'MOTORISTAS QUE ESTÃO ATINGINDO O LIMITE:'

export default function WhatsAppAlertModal({ alertedDrivers, onClose }) {
  const [messageHeader, setMessageHeader] = useState(DEFAULT_TEMPLATE)
  // Estado para armazenar o número customizado que receberá o alerta
  const [targetPhone, setTargetPhone] = useState('')

  // Constrói o texto completo unindo o título + a listagem dos motoristas com quebras de linha
  const fullMessage = useMemo(() => {
    let text = `${messageHeader}\n\n`

    if (alertedDrivers.length === 0) {
      text += 'Nenhum motorista atingindo o limite no momento.'
    } else {
      alertedDrivers.forEach(({ driver, usage, totalHours }) => {
        text += `• *${driver.name}* (${driver.empresa || 'Sem Empresa'})\n`
        text += `  Progresso: ${usage.percent.toFixed(0)}%\n`
        text += `  Horas: ${formatHours(totalHours)} de ${formatHours(driver.maxHours)} permitidas\n\n`
      })
    }

    return text.trim()
  }, [messageHeader, alertedDrivers])

  // Cria o link final apontando para o número customizado escolhido
  const whatsappLink = useMemo(() => {
    if (!targetPhone) return null
    // Remove qualquer caractere que não seja número antes de enviar para a função
    const cleanPhone = targetPhone.replace(/\D/g, '')
    return buildWhatsAppLink(cleanPhone, fullMessage)
  }, [targetPhone, fullMessage])

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-1">Enviar Relatório por WhatsApp</h2>
        <p className="text-sm text-slate mb-4">
          Digite o número de telefone de destino (ex: Gerente ou Operação) para disparar a lista condensada dos motoristas em alerta.
        </p>

        {/* Campo para escolher qual número vai receber */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate mb-1">WhatsApp de Destino</label>
          <input
            type="text"
            placeholder="Ex: 27999999999"
            value={targetPhone}
            onChange={(e) => setTargetPhone(e.target.value)}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20 font-mono"
          />
          <p className="text-[11px] text-slate mt-1">Insira com o DDD (somente números).</p>
        </div>

        {/* Campo para editar o título/texto fixo de cabeçalho */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate mb-1">Cabeçalho do Texto</label>
          <textarea
            value={messageHeader}
            onChange={(e) => setMessageHeader(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
        </div>

        {/* Pré-visualização da mensagem completa que vai ser enviada */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate mb-1">Pré-visualização do Relatório</label>
          <div className="w-full rounded-lg bg-cloud/40 border border-line px-3 py-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate">
            {fullMessage}
          </div>
        </div>

        {/* Botão de envio unificado */}
        <div className="flex flex-col gap-2 pt-2 border-t border-line">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-signal text-white text-center font-medium py-2.5 rounded-lg hover:bg-signal/90 transition block"
            >
              Enviar Lista Completa via WhatsApp
            </a>
          ) : (
            <button
              disabled
              className="w-full bg-slate/20 text-slate/60 text-center font-medium py-2.5 rounded-lg cursor-not-allowed"
            >
              Informe um número para liberar o envio
            </button>
          )}

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