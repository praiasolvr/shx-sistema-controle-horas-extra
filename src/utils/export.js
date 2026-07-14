import { formatHours, monthLabel, filterEntriesByMonth } from './hours'
import { STATUS_LABELS } from './constants'

// Função auxiliar precisa para converter decimais em HH:MM de relógio
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
  // 1. Mapeamos todos os lançamentos ativos para descobrir quais datas REAIS foram lançadas
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

  // Ordena as datas cronologicamente
  const datasOrdenadas = Array.from(datasLancadasSet).sort()

  // 2. Montando as linhas
  const rows = computedList.map(({ driver, totalHoursStr, usage }) => {
    // Dados Cadastrais à esquerda
    const row = {
      Nome: driver.name,
      Matrícula: driver.matricula || '',
      Empresa: driver.empresa || '',
      'Total Geral (HH:MM)': totalHoursStr,
    }

    const rawEntries = entriesByDriver[driver.id] || []
    const monthEntries = filterEntriesByMonth(rawEntries)

    // 3. Preenche as colunas para cada data com lançamento
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

        // Monta os detalhes de forma amigável: "Horário inicial às Horário final | Observação"
        const horario = (lancamento.startTime && lancamento.endTime) 
          ? `${lancamento.startTime} às ${lancamento.endTime}`
          : ''
        const obs = lancamento.observation ? lancamento.observation.trim() : ''
        
        row[colDetails] = [horario, obs].filter(Boolean).join(' | ') || '-'
      } else {
        // Se este motorista específico não trabalhou no dia
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

export async function exportExcel(computedList, filterLabel = 'Todas', entriesByDriver = {}) {
  const XLSX = await import('xlsx')
  
  const { rows, totalColunasDeDias } = buildRows(computedList, entriesByDriver)
  const ws = XLSX.utils.json_to_sheet(rows)

  // Configuração de tamanho das colunas do Excel
  const baseCols = [
    { wch: 24 }, // Nome
    { wch: 12 }, // Matrícula
    { wch: 12 }, // Empresa
    { wch: 18 }, // Total Geral (HH:MM)
  ]
  
  // 4 colunas por dia lançado (Total, 75%, 100% e Detalhes)
  const dayCols = []
  for (let i = 0; i < totalColunasDeDias; i++) {
    dayCols.push({ wch: 12 }) // Total
    dayCols.push({ wch: 12 }) // 75%
    dayCols.push({ wch: 12 }) // 100%
    dayCols.push({ wch: 28 }) // Detalhes/Obs (coluna um pouco mais larga para caber o texto)
  }
  
  ws['!cols'] = [...baseCols, ...dayCols]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Espelho de Ponto')
  
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
    head: [['Nome', 'Matrícula', 'Empresa', 'Horas']],
    body: computedList.map(({ driver, totalHoursStr, usage }) => [
      driver.name,
      driver.matricula || '-',
      driver.empresa || '-',
      totalHoursStr,
      formatarParaRelogio(driver.maxHours),
      `${usage.percent.toFixed(0)}%`,
      STATUS_LABELS[usage.status] || usage.status
    ])
  })

  const safeMonth = monthLabel().replace(/\s+/g, '-')
  docPdf.save(`horas-extra-${safeMonth}-${filterLabel}.pdf`)
}