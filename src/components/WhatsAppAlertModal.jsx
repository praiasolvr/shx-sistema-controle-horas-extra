import { useState, useMemo } from 'react'
import { buildWhatsAppLink } from '../utils/whatsapp'

const DEFAULT_TEMPLATE = 'MOTORISTAS QUE ESTÃO ATINGINDO O LIMITE:'

export default function WhatsAppAlertModal({ alertedDrivers, onClose }) {
  const [messageHeader, setMessageHeader] = useState(DEFAULT_TEMPLATE)
  // Tipo de envio: 'phone' (Número específico) ou 'group' (Grupo/Geral)
  const [sendType, setSendType] = useState('phone')
  const [targetPhone, setTargetPhone] = useState('')

  // Formata o decimal em formato relógio (HH:MM)
  const formatarParaRelogio = (decimal) => {
    if (!decimal || decimal <= 0) return '00:00'
    const h = Math.floor(decimal)
    const m = Math.round((decimal - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  // Constrói o texto completo do relatório
  const fullMessage = useMemo(() => {
    let text = `${messageHeader}\n\n`

    if (alertedDrivers.length === 0) {
      text += 'Nenhum motorista atingindo o limite no momento.'
    } else {
      alertedDrivers.forEach(({ driver, totalHours }) => {
        const matriculaStr = driver.matricula ? ` · #${driver.matricula}` : ''
        const horasFormatadas = formatarParaRelogio(totalHours)
        
        text += `• *${driver.name}* (${driver.empresa || 'Sem Empresa'}${matriculaStr}): *${horasFormatadas}h*\n`
      })
    }

    return text.trim()
  }, [messageHeader, alertedDrivers])

  // Cria o link dinâmico dependendo do modo selecionado
  const whatsappLink = useMemo(() => {
    const encodedMessage = encodeURIComponent(fullMessage)

    if (sendType === 'group') {
      // Link universal do WhatsApp (Abre a lista de contatos/grupos para você escolher para quem mandar)
      return `https://api.whatsapp.com/send?text=${encodedMessage}`
    }

    // Modo número individual
    if (!targetPhone) return null
    const cleanPhone = targetPhone.replace(/\D/g, '')
    
    // Se você usa o utilitário buildWhatsAppLink:
    return buildWhatsAppLink ? buildWhatsAppLink(cleanPhone, fullMessage) : `https://wa.me/${cleanPhone}?text=${encodedMessage}`
  }, [sendType, targetPhone, fullMessage])

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-1">Enviar Relatório por WhatsApp</h2>
        <p className="text-sm text-slate mb-4">
          Escolha como deseja compartilhar a lista dos motoristas em alerta.
        </p>

        {/* Alternador de Destino (Número x Grupo) */}
        <div className="flex bg-cloud p-1 rounded-lg border border-line mb-4">
          <button
            type="button"
            onClick={() => setSendType('phone')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              sendType === 'phone'
                ? 'bg-white text-ink shadow-sm'
                : 'text-slate hover:text-ink'
            }`}
          >
            Número Específico
          </button>
          <button
            type="button"
            onClick={() => setSendType('group')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition ${
              sendType === 'group'
                ? 'bg-white text-ink shadow-sm'
                : 'text-slate hover:text-ink'
            }`}
          >
            Grupo / Outra Conversa
          </button>
        </div>

        {/* Campo para número de telefone (apenas se sendType === 'phone') */}
        {sendType === 'phone' ? (
          <div className="mb-4 animate-in fade-in duration-150">
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
        ) : (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200/60 rounded-lg text-xs text-amber-800 animate-in fade-in duration-150">
            💡 Ao clicar em enviar, o WhatsApp abrirá sua lista de conversas para você selecionar o <strong>Grupo</strong> ou contato desejado.
          </div>
        )}

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

        {/* Pré-visualização da mensagem */}
        <div className="mb-5">
          <label className="block text-sm font-medium text-slate mb-1">Pré-visualização do Relatório</label>
          <div className="w-full rounded-lg bg-cloud/40 border border-line px-3 py-3 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto text-slate">
            {fullMessage}
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col gap-2 pt-2 border-t border-line">
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-signal text-white text-center font-medium py-2.5 rounded-lg hover:bg-signal/90 transition block"
            >
              {sendType === 'group'
                ? 'Abrir WhatsApp e Escolher Grupo'
                : 'Enviar para Número Especificado'}
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