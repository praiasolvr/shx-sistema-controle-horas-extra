import { monthLabel, filterEntriesByMonth } from './hours'
import { STATUS_LABELS } from './constants'

// Função auxiliar para converter decimais em HH:MM de relógio
function formatarParaRelogio(decimal) {
  if (decimal === undefined || decimal === null || decimal < 0) return '00:00'
  const totalMinutos = Math.round(decimal * 60)
  const h = Math.floor(totalMinutos / 60)
  const m = totalMinutos % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

// Formata a string de data "AAAA-MM-DD" para "DD/MM/AAAA"
function formatarDataBr(dateStr) {
  if (!dateStr) return ''
  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr
  return `${parts[2]}/${parts[1]}/${parts[0]}`
}

function buildRows(computedList, entriesByDriver) {
  const datasLancadasSet = new Set()
  
  computedList.forEach(({ driver }) => {
    const rawEntries = entriesByDriver[driver.id] || []
    const monthEntries = filterEntriesByMonth(rawEntries)
    monthEntries.forEach(entry => {
      if (entry.date && entry.hours > 0) {
        datasLancadasSet.add(entry.date)
      }
    })
  })

  const datasOrdenadas = Array.from(datasLancadasSet).sort()

  const rows = computedList.map(({ driver, totalHoursStr }) => {
    const row = {
      Nome: driver.name,
      Matrícula: driver.matricula || '',
      Empresa: driver.empresa || '',
      'Total Geral (HH:MM)': totalHoursStr,
    }

    const rawEntries = entriesByDriver[driver.id] || []
    const monthEntries = filterEntriesByMonth(rawEntries)

    datasOrdenadas.forEach(dataStr => {
      const dataFormatada = formatarDataBr(dataStr)
      const colTotal = `${dataFormatada} - Total`
      const col75 = `${dataFormatada} - 75%`
      const col100 = `${dataFormatada} - 100%`
      const colDetails = `${dataFormatada} - Detalhes/Obs`

      const lancamento = monthEntries.find(entry => entry.date === dataStr)

      if (lancamento) {
        const totalMinutos = Math.round((Number(lancamento.hours) || 0) * 60)
        const limite75Minutos = 2 * 60 // Até 2h = 75%

        let min75 = 0
        let min100 = 0

        if (totalMinutos <= limite75Minutos) {
          min75 = totalMinutos
        } else {
          min75 = limite75Minutos
          min100 = totalMinutos - limite75Minutos
        }

        row[colTotal] = formatarParaRelogio(lancamento.hours)
        row[col75] = formatarParaRelogio(min75 / 60)
        row[col100] = formatarParaRelogio(min100 / 60)

        const horario = (lancamento.startTime && lancamento.endTime) 
          ? `${lancamento.startTime} às ${lancamento.endTime}`
          : ''
        const obs = lancamento.observation ? lancamento.observation.trim() : ''
        
        row[colDetails] = [horario, obs].filter(Boolean).join(' | ') || '-'
      } else {
        row[colTotal] = '00:00'
        row[col75] = '00:00'
        row[col100] = '00:00'
        row[colDetails] = '-'
      }
    })

    return { row, totalColunasDeDias: datasOrdenadas.length }
  })

  return {
    rows: rows.map(r => r.row),
    totalColunasDeDias: rows[0]?.totalColunasDeDias || 0
  }
}

// -------------------------------------------------------------
// EXPORTAÇÃO EXCEL
// -------------------------------------------------------------
export async function exportExcel(computedList, filterLabel = 'Todas', entriesByDriver = {}) {
  const XLSX = await import('xlsx')
  
  const { rows, totalColunasDeDias } = buildRows(computedList, entriesByDriver)
  const ws = XLSX.utils.json_to_sheet(rows)

  const baseCols = [
    { wch: 24 }, // Nome
    { wch: 12 }, // Matrícula
    { wch: 12 }, // Empresa
    { wch: 18 }, // Total Geral (HH:MM)
  ]
  
  const dayCols = []
  for (let i = 0; i < totalColunasDeDias; i++) {
    dayCols.push({ wch: 12 }) // Total
    dayCols.push({ wch: 12 }) // 75%
    dayCols.push({ wch: 12 }) // 100%
    dayCols.push({ wch: 28 }) // Detalhes/Obs
  }
  
  ws['!cols'] = [...baseCols, ...dayCols]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Espelho de Ponto')
  
  const safeMonth = monthLabel().replace(/\s+/g, '-')
  XLSX.writeFile(wb, `horas-extra-${safeMonth}-${filterLabel}.xlsx`)
}

// -------------------------------------------------------------
// EXPORTAÇÃO PDF APRIMORADA
// -------------------------------------------------------------
export async function exportPDF(computedList, filterLabel = 'Todas') {
  const jsPDFModule = await import('jspdf')
  const jsPDF = jsPDFModule.jsPDF || jsPDFModule.default
  const autoTable = (await import('jspdf-autotable')).default

  const docPdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  })

  // Cabeçalho Corporativo
  docPdf.setFillColor(18, 25, 43)
  docPdf.rect(0, 0, 210, 24, 'F')

  docPdf.setTextColor(255, 255, 255)
  docPdf.setFontSize(14)
  docPdf.setFont('helvetica', 'bold')
  docPdf.text('RELATÓRIO DE MONITORAMENTO DE HORAS EXTRA', 14, 12)

  docPdf.setFontSize(9)
  docPdf.setFont('helvetica', 'normal')
  docPdf.text(`Competência: ${monthLabel()}  |  Filtro: ${filterLabel}`, 14, 18)

  const dataEmissao = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
  docPdf.setFontSize(8)
  docPdf.setTextColor(200, 200, 200)
  docPdf.text(`Emitido em: ${dataEmissao}`, 196, 18, { align: 'right' })

  // Tabela com AutoTable
  autoTable(docPdf, {
    startY: 28,
    head: [[
      'Nome do Motorista', 
      'Matrícula', 
      'Empresa', 
      'Realizado', 
      'Limite', 
      'Uso (%)', 
      'Status'
    ]],
    body: computedList.map(({ driver, totalHoursStr, usage }) => [
      driver.name,
      driver.matricula || '-',
      driver.empresa || '-',
      totalHoursStr,
      formatarParaRelogio(driver.maxHours || 60),
      `${usage.percent.toFixed(0)}%`,
      STATUS_LABELS[usage.status] || usage.status
    ]),
    theme: 'striped',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [40, 40, 40],
      valign: 'middle'
    },
    headStyles: {
      fillColor: [18, 25, 43],
      textColor: [255, 255, 255],
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'left'
    },
    columnStyles: {
      0: { cellWidth: 50, fontStyle: 'bold' },
      1: { cellWidth: 22, halign: 'center' },
      2: { cellWidth: 32 },
      3: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
      4: { cellWidth: 20, halign: 'center' },
      5: { cellWidth: 20, halign: 'center' },
      6: { cellWidth: 24, halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.section === 'body' && data.column.index === 6) {
        const statusText = String(data.cell.raw).toLowerCase()
        if (statusText.includes('excedido') || statusText.includes('crítico')) {
          data.cell.styles.textColor = [220, 38, 38]
          data.cell.styles.fontStyle = 'bold'
        } else if (statusText.includes('atencao') || statusText.includes('alerta')) {
          data.cell.styles.textColor = [217, 119, 6]
          data.cell.styles.fontStyle = 'bold'
        } else {
          data.cell.styles.textColor = [16, 185, 129]
        }
      }
    },
    didDrawPage: function (data) {
      const pageCount = docPdf.internal.getNumberOfPages()
      docPdf.setFontSize(8)
      docPdf.setTextColor(130, 130, 130)
      
      docPdf.setDrawColor(220, 220, 220)
      docPdf.line(14, 285, 196, 285)
      
      docPdf.text('Documento Interno · Controle de Ponto e Horas Extras', 14, 289)
      docPdf.text(`Página ${data.pageNumber} de ${pageCount}`, 196, 289, { align: 'right' })
    }
  })

  const safeMonth = monthLabel().replace(/\s+/g, '-')
  docPdf.save(`relatorio-horas-extra-${safeMonth}-${filterLabel}.pdf`)
}