import { useMemo, useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useDrivers } from '../hooks/useDrivers'
import { useHourEntries } from '../hooks/useHourEntries'
import { monthLabel, STATUS_META } from '../utils/hours'
import RouteProgress from '../components/RouteProgress'
import EmpresaBadge from '../components/EmpresaBadge'
import ConfirmDialog from '../components/ConfirmDialog'
import DriverFormModal from '../components/DriverFormModal'

export default function DriverDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { drivers, updateDriver, deleteDriver } = useDrivers()
  const { entries, deleteEntry } = useHourEntries(id)
  const [deletingEntry, setDeletingEntry] = useState(null)
  const [deletingDriver, setDeletingDriver] = useState(false)
  const [editingDriver, setEditingDriver] = useState(false)

  // Estados de controle de acesso do usuário logado
  const [userRole, setUserRole] = useState(null)
  const [userEmpresa, setUserEmpresa] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  useEffect(() => {
    async function fetchUserRole() {
      const currentUser = auth.currentUser
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists()) {
            const userData = docSnap.data()
            setUserRole(userData.role)
            setUserEmpresa(userData.empresa || '')
          }
        } catch (error) {
          console.error('Erro ao buscar perfil do usuário no detalhe:', error)
        } finally {
          setLoadingUser(false)
        }
      } else {
        setLoadingUser(false)
      }
    }
    fetchUserRole()
  }, [])

  const driver = drivers.find((d) => d.id === id)

  // Transforma horas decimais para formato HH:MM clássico
  const formatarParaRelogio = (decimal) => {
    if (!decimal || decimal <= 0) return '00:00'
    const totalMinutos = Math.round(decimal * 60)
    const h = Math.floor(totalMinutos / 60)
    const m = totalMinutos % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const computedUsage = useMemo(() => {
    if (!driver) return null

    const currentMonthStr = new Date().toISOString().substring(0, 7)
    const monthEntries = entries.filter((entry) => {
      if (!entry.date) return false
      return entry.date.substring(0, 7) === currentMonthStr
    })

    let minutos75 = 0
    let minutos100 = 0

    // Separação dia a dia exata por minutos
    monthEntries.forEach((entry) => {
      const brutoDiaEmMinutos = Math.round((Number(entry.hours) || 0) * 60)
      const limite2HorasEmMinutos = 120

      if (brutoDiaEmMinutos <= limite2HorasEmMinutos) {
        minutos75 += brutoDiaEmMinutos
      } else {
        minutos75 += limite2HorasEmMinutos
        minutos100 += (brutoDiaEmMinutos - limite2HorasEmMinutos)
      }
    })

    const total75Decimal = minutos75 / 60
    const total100Decimal = minutos100 / 60
    const totalFaturadoDecimal = total75Decimal + total100Decimal
    const maxHours = Number(driver.maxHours) || 40
    const percent = maxHours > 0 ? (totalFaturadoDecimal / maxHours) * 100 : 0

    // Define o status seguindo fielmente as chaves do seu STATUS_META em utils/hours.js
    let status = 'ok'
    if (percent >= 100) status = 'excedido'
    else if (percent >= 90) status = 'critico'
    else if (percent >= 75) status = 'atencao'

    return {
      totalHours: totalFaturadoDecimal,
      totalHoursStr: formatarParaRelogio(totalFaturadoDecimal),
      total75Str: formatarParaRelogio(total75Decimal),
      total100Str: formatarParaRelogio(total100Decimal),
      maxHoursStr: formatarParaRelogio(maxHours),
      percent,
      status,
    }
  }, [driver, entries])

  if (loadingUser) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <p className="text-slate">Carregando permissões...</p>
      </div>
    )
  }

  if (!driver) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <p className="text-slate">Motorista não encontrado.</p>
        <Link to="/motoristas" className="text-ink underline">
          Voltar para a lista
        </Link>
      </div>
    )
  }

  // Barreira de Segurança: Se não for supervisor e tentar ver motorista de outra empresa, bloqueia o acesso
  const isSupervisor = userRole === 'supervisor'
  const belongsToSameEmpresa = driver.empresa === userEmpresa

  if (!isSupervisor && !belongsToSameEmpresa) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-700 font-semibold text-lg mb-1">Acesso não autorizado</p>
          <p className="text-sm text-red-600 mb-4">
            Você não possui permissões para visualizar motoristas associados à empresa "{driver.empresa}".
          </p>
          <Link to="/motoristas" className="text-red-700 font-medium underline hover:text-red-800">
            Voltar para a lista permitida
          </Link>
        </div>
      </div>
    )
  }

  async function handleDeleteDriver() {
    await deleteDriver(driver.id)
    navigate('/motoristas')
  }

  // Fallback seguro caso dê divergência futura
  const meta = STATUS_META[computedUsage.status] || STATUS_META.ok

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <Link to="/motoristas" className="text-sm text-slate hover:text-ink">
        ← Motoristas
      </Link>

      <div className="flex items-start justify-between mt-3 mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="font-display text-3xl font-semibold">{driver.name}</h1>
            <EmpresaBadge empresa={driver.empresa} />
          </div>
          <p className="text-sm text-slate">
            {driver.matricula && <span className="font-mono">Matrícula #{driver.matricula} · </span>}
            {driver.role || 'Sem função definida'}
            {driver.phone && ` · ${driver.phone}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            to={`/lancar-horas?motorista=${driver.id}`}
            className="text-sm font-medium bg-ink text-white rounded-lg px-3 py-2 hover:bg-ink/90 transition"
          >
            Lançar horas
          </Link>
          
          {/* Ações restritas: Apenas supervisores editam ou excluem motoristas */}
          {isSupervisor && (
            <>
              <button
                onClick={() => setEditingDriver(true)}
                className="text-sm font-medium text-slate hover:text-ink px-3 py-2"
              >
                Editar
              </button>
              <button
                onClick={() => setDeletingDriver(true)}
                className="text-sm font-medium text-alert hover:text-alert/80 px-3 py-2"
              >
                Excluir
              </button>
            </>
          )}
        </div>
      </div>

      {/* Card Informativo Mensal Dinâmico */}
      <div className={`rounded-xl border p-5 mb-6 bg-white shadow-card ring-1 ${meta.ring || 'border-line'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-mono uppercase tracking-wide text-slate">{monthLabel()}</p>
          <span className={`text-xs font-semibold ${meta.text}`}>{meta.label}</span>
        </div>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="font-mono text-3xl font-semibold">{computedUsage.totalHoursStr}h</span>
          <span className="text-slate text-sm">de {computedUsage.maxHoursStr}h permitidas</span>
        </div>
        <RouteProgress percent={computedUsage.percent} status={computedUsage.status} />

        {/* Distribuição das Horas (75% e 100%) */}
        <div className="grid grid-cols-2 gap-4 border-t border-line/60 pt-4 mt-4">
          <div>
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate">Horas Regime 75%</p>
            <p className="font-mono font-semibold text-lg text-ink mt-0.5">{computedUsage.total75Str}h</p>
          </div>
          <div className="border-l border-line/60 pl-4">
            <p className="text-[10px] uppercase font-mono tracking-wider text-slate">Horas Regime 100%</p>
            <p className="font-mono font-semibold text-lg text-ink mt-0.5">{computedUsage.total100Str}h</p>
          </div>
        </div>
      </div>

      {/* Histórico Geral de Lançamentos */}
      <div className="bg-white rounded-xl shadow-card overflow-hidden">
        <div className="px-5 py-3 border-b border-line">
          <h3 className="font-display text-lg font-semibold">Histórico de lançamentos</h3>
        </div>
        {entries.length === 0 ? (
          <p className="px-5 py-6 text-sm text-slate">
            Nenhum lançamento registrado ainda.{' '}
            <Link to={`/lancar-horas?motorista=${driver.id}`} className="text-ink underline">
              Lançar agora
            </Link>
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-slate border-b border-line">
                <th className="px-5 py-2 font-medium">Data</th>
                <th className="px-5 py-2 font-medium font-mono">Horas</th>
                <th className="px-5 py-2 font-medium">Observação</th>
                <th className="px-5 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className="border-b border-line last:border-0 hover:bg-cloud/20">
                  <td className="px-5 py-2">
                    {new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-5 py-2 font-mono">{formatarParaRelogio(entry.hours)}h</td>
                  <td className="px-5 py-2 text-slate">{entry.note || '—'}</td>
                  <td className="px-5 py-2 text-right">
                    {/* Apenas supervisores podem excluir lançamentos do histórico */}
                    {isSupervisor && (
                      <button
                        onClick={() => setDeletingEntry(entry)}
                        className="text-alert hover:text-alert/80 text-xs font-medium"
                      >
                        Excluir
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editingDriver && isSupervisor && (
        <DriverFormModal
          initial={driver}
          onClose={() => setEditingDriver(false)}
          onSave={async (data) => {
            await updateDriver(driver.id, data)
            setEditingDriver(false)
          }}
        />
      )}

      {deletingDriver && isSupervisor && (
        <ConfirmDialog
          title="Excluir motorista"
          message={`Tem certeza que deseja excluir ${driver.name}? Todos os lançamentos de horas dele também serão perdidos.`}
          onCancel={() => setDeletingDriver(false)}
          onConfirm={handleDeleteDriver}
        />
      )}

      {deletingEntry && isSupervisor && (
        <ConfirmDialog
          title="Excluir lançamento"
          message="Tem certeza que deseja excluir este lançamento de horas?"
          onCancel={() => setDeletingEntry(null)}
          onConfirm={async () => {
            await deleteEntry(deletingEntry.id)
            setDeletingEntry(null)
          }}
        />
      )}
    </div>
  )
}