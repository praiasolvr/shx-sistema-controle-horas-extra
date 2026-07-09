const { onDocumentWritten } = require('firebase-functions/v2/firestore')
const { initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const nodemailer = require('nodemailer')

initializeApp()
const db = getFirestore()

// Configure estas variáveis em functions/.env (veja functions/.env.example)
// e faça o deploy novamente para elas terem efeito.
const SMTP_HOST = process.env.SMTP_HOST
const SMTP_PORT = Number(process.env.SMTP_PORT || 587)
const SMTP_USER = process.env.SMTP_USER
const SMTP_PASS = process.env.SMTP_PASS
const ALERT_EMAIL_TO = process.env.ALERT_EMAIL_TO // pode ser uma lista separada por vírgula

const transporter =
  SMTP_HOST && SMTP_USER && SMTP_PASS
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: SMTP_PORT,
        secure: SMTP_PORT === 465,
        auth: { user: SMTP_USER, pass: SMTP_PASS }
      })
    : null

function currentMonthKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// Retorna o "degrau" de alerta mais alto já atingido: 0, 75, 90 ou 100.
function bucketFor(percent) {
  if (percent >= 100) return 100
  if (percent >= 90) return 90
  if (percent >= 75) return 75
  return 0
}

// Dispara sempre que um lançamento de horas é criado, editado ou excluído
// dentro de drivers/{driverId}/entries/{entryId}.
exports.checkOvertimeThreshold = onDocumentWritten(
  'drivers/{driverId}/entries/{entryId}',
  async (event) => {
    const { driverId } = event.params
    const driverRef = db.collection('drivers').doc(driverId)
    const driverSnap = await driverRef.get()
    if (!driverSnap.exists) return

    const driver = driverSnap.data()
    const maxHours = Number(driver.maxHours) || 0
    if (maxHours <= 0) return

    const monthKey = currentMonthKey()
    const entriesSnap = await driverRef.collection('entries').get()
    const totalHours = entriesSnap.docs
      .map((d) => d.data())
      .filter((e) => (e.date || '').startsWith(monthKey))
      .reduce((sum, e) => sum + (Number(e.hours) || 0), 0)

    const percent = (totalHours / maxHours) * 100
    const bucket = bucketFor(percent)

    // Guarda o último degrau avisado por mês para não reenviar o mesmo alerta
    // a cada novo lançamento (só dispara de novo ao CRUZAR o próximo degrau).
    const bucketField = `lastAlertBucket_${monthKey}`
    const lastBucket = driver[bucketField] || 0

    if (bucket > 0 && bucket > lastBucket) {
      await driverRef.update({ [bucketField]: bucket })
      await sendAlert({ driver, totalHours, maxHours, percent, bucket })
    }

    // Se as horas foram reduzidas/excluídas e caíram abaixo de um degrau já
    // avisado, reseta para permitir um novo aviso caso volte a subir depois.
    if (bucket < lastBucket) {
      await driverRef.update({ [bucketField]: bucket })
    }
  }
)

async function sendAlert({ driver, totalHours, maxHours, percent, bucket }) {
  const subject = `Aviso de horas extra: ${driver.name} atingiu ${bucket}% do limite`
  const text =
    `${driver.name} (${driver.empresa || 'sem empresa'}, matrícula ${driver.matricula || '-'}) ` +
    `lançou ${totalHours.toFixed(1)}h de um limite de ${maxHours}h neste mês (${percent.toFixed(0)}%).`

  if (transporter && ALERT_EMAIL_TO) {
    try {
      await transporter.sendMail({
        from: SMTP_USER,
        to: ALERT_EMAIL_TO,
        subject,
        text
      })
    } catch (err) {
      console.error('Falha ao enviar e-mail de alerta:', err)
    }
  } else {
    console.log('[alerta simulado — configure functions/.env para enviar de verdade]', subject, text)
  }

  // --- WhatsApp opcional via Twilio ---------------------------------------
  // 1) npm install twilio (dentro da pasta functions)
  // 2) preencha TWILIO_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM e
  //    ALERT_WHATSAPP_TO em functions/.env
  // 3) descomente o bloco abaixo
  
  if (process.env.TWILIO_SID) {
    const twilio = require('twilio')(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN)
    await twilio.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_FROM}`,
      to: `whatsapp:${process.env.ALERT_WHATSAPP_TO}`,
      body: text
    })
  }
}
