import { formatHours, monthLabel } from './hours'
import { STATUS_LABELS } from './constants'

function buildRows(computedList) {
  return computedList.map(({ driver, totalHours, usage }) => ({
    Nome: driver.name,
    Matrícula: driver.matricula || '',
    Empresa: driver.empresa || '',
    'Função/Veículo': driver.role || '',
    'Horas lançadas': Number(totalHours.toFixed(1)),
    'Limite mensal': Number(driver.maxHours) || 0,
    '% do limite': Number(usage.percent.toFixed(0)),
    Status: STATUS_LABELS[usage.status]
  }))
}

export async function exportExcel(computedList, filterLabel = 'Todas') {
  const XLSX = await import('xlsx')
  const data = buildRows(computedList)
  const ws = XLSX.utils.json_to_sheet(data)
  ws['!cols'] = [
    { wch: 24 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 16 }
  ]
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Horas Extra')
  const safeMonth = monthLabel().replace(/\s+/g, '-')
  XLSX.writeFile(wb, `horas-extra-${safeMonth}-${filterLabel}.xlsx`)
}

export async function exportPDF(computedList, filterLabel = 'Todas') {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
  const autoTable = (await import('jspdf-autotable')).default

  const docPdf = new jsPDF()
  docPdf.setFontSize(14)
  docPdf.text(`Relatório de Horas Extra — ${monthLabel()}`, 14, 16)
  docPdf.setFontSize(10)
  docPdf.setTextColor(100)
  docPdf.text(`Filtro: ${filterLabel}`, 14, 22)

  autoTable(docPdf, {
    startY: 28,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [18, 25, 43] },
    head: [['Nome', 'Matrícula', 'Empresa', 'Horas', 'Limite', '%', 'Status']],
    body: computedList.map(({ driver, totalHours, usage }) => [
      driver.name,
      driver.matricula || '-',
      driver.empresa || '-',
      formatHours(totalHours),
      formatHours(driver.maxHours),
      `${usage.percent.toFixed(0)}%`,
      STATUS_LABELS[usage.status]
    ])
  })

  const safeMonth = monthLabel().replace(/\s+/g, '-')
  docPdf.save(`horas-extra-${safeMonth}-${filterLabel}.pdf`)
}
