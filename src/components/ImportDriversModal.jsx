import { useState } from 'react'
import { parseCSV, rowsToDrivers } from '../utils/csv'
import { EMPRESAS } from '../utils/constants'

const TEMPLATE_HEADERS = ['Nome', 'Matricula', 'Empresa','Limite']
const TEMPLATE_EXAMPLE = ['João da Silva', '00123', 'Praia Sol', 'Carreta 04', '(11) 90000-0000', '20']

export default function ImportDriversModal({ onClose, onImport }) {
  const [rows, setRows] = useState([])
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [importing, setImporting] = useState(false)
  const [done, setDone] = useState(null)

  function downloadTemplate() {
    const csv = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.join(',')].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'modelo-motoristas.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    setDone(null)
    setFileName(file.name)

    try {
      const isExcel = /\.xlsx?$/i.test(file.name)
      let matrix

      if (isExcel) {
        const XLSX = await import('xlsx')
        const buffer = await file.arrayBuffer()
        const workbook = XLSX.read(buffer, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        matrix = XLSX.utils.sheet_to_json(firstSheet, { header: 1, raw: false, defval: '' })
      } else {
        const text = await file.text()
        matrix = parseCSV(text)
      }

      const parsed = rowsToDrivers(matrix).filter((r) => r.name)
      if (parsed.length === 0) {
        setError('Não encontrei nenhuma linha válida. Confira se a coluna "Nome" está preenchida.')
        setRows([])
        return
      }
      setRows(parsed)
    } catch (err) {
      setError('Não foi possível ler este arquivo. Tente exportar novamente como .csv ou .xlsx.')
      setRows([])
    }
  }

  async function handleConfirm() {
    setImporting(true)
    const count = await onImport(rows)
    setImporting(false)
    setDone(count)
    setRows([])
  }

  return (
    <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50 px-4">
      <div className="bg-white rounded-xl shadow-card w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="font-display text-2xl font-semibold mb-1">Importar motoristas</h2>
        <p className="text-sm text-slate mb-4">
          Envie uma planilha .csv ou .xlsx com as colunas: Nome, Matrícula, Empresa (Praia Sol ou
          Vereda), Função, Telefone e Limite de horas.
        </p>

        <button
          onClick={downloadTemplate}
          className="text-sm font-medium text-ink underline underline-offset-2 mb-4"
        >
          Baixar planilha modelo
        </button>

        <div className="border-2 border-dashed border-line rounded-lg p-6 text-center mb-4">
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFile}
            className="block mx-auto text-sm"
          />
          {fileName && <p className="text-xs text-slate mt-2">Arquivo: {fileName}</p>}
        </div>

        {error && <p className="text-sm text-alert mb-4">{error}</p>}

        {done !== null && (
          <div className="rounded-lg bg-signal/10 text-signal text-sm px-4 py-3 mb-4">
            {done} motorista{done === 1 ? '' : 's'} importado{done === 1 ? '' : 's'} com sucesso.
          </div>
        )}

        {rows.length > 0 && (
          <div className="mb-4">
            <p className="text-sm font-medium mb-2">
              Pré-visualização ({rows.length} motorista{rows.length === 1 ? '' : 's'})
            </p>
            <div className="max-h-64 overflow-y-auto border border-line rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-cloud sticky top-0">
                  <tr className="text-left">
                    <th className="px-3 py-2 font-medium">Nome</th>
                    <th className="px-3 py-2 font-medium">Matrícula</th>
                    <th className="px-3 py-2 font-medium">Empresa</th>
                    <th className="px-3 py-2 font-medium">Limite</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, idx) => (
                    <tr key={idx} className="border-t border-line">
                      <td className="px-3 py-1.5">{r.name}</td>
                      <td className="px-3 py-1.5">{r.matricula || '—'}</td>
                      <td className="px-3 py-1.5">
                        {r.empresa || '—'}
                        {r.empresa && !EMPRESAS.includes(r.empresa) && (
                          <span className="text-amber-dark"> (confira)</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">{r.maxHours || '0'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-line py-2.5 font-medium text-slate hover:bg-cloud transition"
          >
            Fechar
          </button>
          <button
            onClick={handleConfirm}
            disabled={rows.length === 0 || importing}
            className="flex-1 rounded-lg bg-ink text-white py-2.5 font-medium hover:bg-ink/90 transition disabled:opacity-40"
          >
            {importing ? 'Importando…' : `Importar ${rows.length || ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}
