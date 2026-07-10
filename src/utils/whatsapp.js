// Monta um link do WhatsApp a partir de um telefone (qualquer formato) e uma mensagem.
// Se o número não tiver código do país, assume Brasil (55).
export function buildWhatsAppLink(phone, message) {
  const digits = (phone || '').replace(/\D/g, '')
  if (!digits) return null
  const withCountry = digits.length <= 11 ? `55${digits}` : digits
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(message)}`
}

export function fillTemplate(template, values) {
  return template.replace(/\{(\w+)\}/g, (_, key) => (values[key] !== undefined ? values[key] : `{${key}}`))
}
