// Parser simples de CSV (suporta campos entre aspas com vírgula/quebra de linha)
export function parseCSV(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (char === '"' && next === '"') {
        field += '"'
        i++
      } else if (char === '"') {
        inQuotes = false
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',' || char === ';') {
      row.push(field)
      field = ''
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (char === '\r') {
      // ignora, o \n cuida da quebra de linha
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}

function normalizeHeader(h) {
  return h
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
}

const HEADER_MAP = {
  name: ['nome', 'motorista', 'name'],
  matricula: ['matricula', 'matrícula', 'registro', 'id funcionario'],
  empresa: ['empresa', 'company'],
  role: ['funcao', 'função', 'veiculo', 'veículo', 'cargo', 'role'],
  phone: ['telefone', 'celular', 'phone'],
  maxHours: ['limite', 'limite de horas', 'horas', 'maxhours', 'limite mensal']
}

function matchHeader(normalized) {
  for (const [key, aliases] of Object.entries(HEADER_MAP)) {
    if (aliases.some((alias) => normalizeHeader(alias) === normalized)) return key
  }
  return null
}

// Recebe uma matriz de linhas (a primeira sendo o cabeçalho) e devolve
// uma lista de objetos { name, matricula, empresa, role, phone, maxHours }
export function rowsToDrivers(matrix) {
  if (matrix.length === 0) return []
  const headerRow = matrix[0].map((h) => normalizeHeader(h))
  const keys = headerRow.map(matchHeader)

  return matrix.slice(1).map((row) => {
    const obj = { name: '', matricula: '', empresa: '', role: '', phone: '', maxHours: 0 }
    row.forEach((cell, idx) => {
      const key = keys[idx]
      if (!key) return
      obj[key] = key === 'maxHours' ? cell : (cell || '').toString().trim()
    })
    return obj
  })
}
