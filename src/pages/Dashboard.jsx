import { useMemo, useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Chart from 'react-apexcharts'
import { auth, db } from '../firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useDrivers } from '../hooks/useDrivers'
import { useAllEntries } from '../hooks/useAllEntries'
import { getUsage, monthLabel, filterEntriesByMonth, STATUS_META } from '../utils/hours'
import { EMPRESAS } from '../utils/constants'
import { exportExcel, exportPDF } from '../utils/export'
import { Download } from 'lucide-react'
import { FaRegFilePdf } from "react-icons/fa6"
import { FaWhatsapp } from "react-icons/fa"
import DriverCard from '../components/DriverCard'
import EmpresaBadge from '../components/EmpresaBadge'
import AlertBanner from '../components/AlertBanner'
import RouteProgress from '../components/RouteProgress'
import WhatsAppAlertModal from '../components/WhatsAppAlertModal'

export default function Dashboard() {
  const navigate = useNavigate()
  
  // Estados de controle de acesso do usuário logado
  const [userRole, setUserRole] = useState(null)
  const [userEmpresa, setUserEmpresa] = useState(null) 
  const [loadingUser, setLoadingUser] = useState(true)

  // Só ativa a busca de motoristas e lançamentos quando o perfil do usuário for totalmente carregado
  const { drivers = [], loading: loadingDrivers } = useDrivers()
  const { entriesByDriver = {}, loading: loadingEntries } = useAllEntries(drivers)
  
  const [empresaFilter, setEmpresaFilter] = useState('Todas')
  const [search, setSearch] = useState('')
  const [viewMode, setViewMode] = useState('cards')
  const [exportScope, setExportScope] = useState('todos')
  const [exporting, setExporting] = useState(false)
  const [showWhatsApp, setShowWhatsApp] = useState(false)
  
  // Régua controlada diretamente por HORAS (padrão 40 horas)
  const [alertaHoras, setAlertaHoras] = useState(40)

  // 1. Busca primeiro o perfil do usuário logado de forma segura
  useEffect(() => {
    let isMounted = true

    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (!currentUser) {
        if (isMounted) {
          setLoadingUser(false)
          navigate('/login')
        }
        return
      }

      try {
        const docRef = doc(db, 'users', currentUser.uid)
        const docSnap = await getDoc(docRef)

        if (!isMounted) return

        if (docSnap.exists()) {
          const userData = docSnap.data()
          setUserRole(userData.role || 'cliente')
          
          if (userData.role !== 'supervisor' && userData.empresa) {
            setUserEmpresa(userData.empresa)
            setEmpresaFilter(userData.empresa) 
          } else {
            setUserEmpresa('Todas')
            setEmpresaFilter('Todas')
          }
        } else {
          console.error('Perfil de usuário não encontrado no banco.')
          setUserRole('cliente')
          setUserEmpresa('Nenhuma')
        }
      } catch (error) {
        console.error('Erro ao buscar o perfil do usuário no painel:', error)
      } finally {
        if (isMounted) setLoadingUser(false)
      }
    })

    return () => {
      isMounted = false
      unsubscribe()
    }
  }, [navigate])

  const formatarParaRelogio = (decimal) => {
    if (!decimal || decimal <= 0) return '00:00'
    const h = Math.floor(decimal)
    const m = Math.round((decimal - h) * 60)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  const computed = useMemo(() => {
    if (loadingUser || !Array.isArray(drivers)) return []

    const driversFilteredByUserEmpresa = drivers.filter((driver) => {
      if (userRole === 'supervisor' || userEmpresa === 'Todas') return true
      return driver.empresa === userEmpresa
    })

    return driversFilteredByUserEmpresa.map((driver) => {
      const monthEntries = filterEntriesByMonth(entriesByDriver[driver.id] || [])
      let minutos75 = 0
      let minutos100 = 0

      monthEntries.forEach((entry) => {
        const brutoDiaEmMinutos = Math.round((Number(entry.hours) || 0) * 60)
        const limite2HorasEmMinutos = 2 * 60

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
      const usage = getUsage(totalFaturadoDecimal, driver.maxHours)

      return { 
        driver, 
        totalHours: totalFaturadoDecimal, 
        totalHoursStr: formatarParaRelogio(totalFaturadoDecimal), 
        total75Str: formatarParaRelogio(total75Decimal), 
        total100Str: formatarParaRelogio(total100Decimal), 
        usage 
      }
    })
  }, [drivers, entriesByDriver, userRole, userEmpresa, loadingUser])

  // Filtra de acordo com a busca, filtro de empresa e escopo de horas extras
  const filtered = useMemo(() => {
    return computed
      .filter((c) => empresaFilter === 'Todas' || c.driver.empresa === empresaFilter)
      .filter((c) => {
        if (exportScope === 'comHoras') {
          return c.totalHours > 0
        }
        return true
      })
      .filter((c) => {
        if (!search.trim()) return true
        const q = search.toLowerCase()
        const nameMatch = (c.driver.name || '').toLowerCase().includes(q)
        const matriculaMatch = (c.driver.matricula || '').toLowerCase().includes(q)
        return nameMatch || matriculaMatch
      })
  }, [computed, empresaFilter, search, exportScope])

  // Ordena a lista em ordem alfabética de A-Z
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => 
      (a.driver.name || '').localeCompare(b.driver.name || '')
    )
  }, [filtered])
  
  // Limitação para exibir os 10 primeiros
  const top10Exibidos = useMemo(() => {
    return sorted.slice(0, 10)
  }, [sorted])

  // Filtragem dos motoristas que atingiram/ultrapassaram a régua
  const alertedDrivers = useMemo(() => {
    return filtered
      .filter((c) => c.totalHours >= alertaHoras)
      .sort((a, b) => (a.driver.name || '').localeCompare(b.driver.name || ''))
  }, [filtered, alertaHoras])

  // --- MODELAGEM DOS GRÁFICOS APEXCHARTS ---
  const analytics = useMemo(() => {
    const currentScopeData = computed.filter((c) => empresaFilter === 'Todas' || c.driver.empresa === empresaFilter)
    
    let totalAcumuladoDecimal = 0
    let motoristasAtivosComHoras = 0
    let statusOk = 0
    let statusAtencao = 0
    let statusCritico = 0
    let statusExcedido = 0

    currentScopeData.forEach(item => {
      totalAcumuladoDecimal += item.totalHours
      if (item.totalHours > 0) motoristasAtivosComHoras++
      
      if (item.usage.status === 'atencao') statusAtencao++
      else if (item.usage.status === 'critico') statusCritico++
      else if (item.usage.status === 'excedido') statusExcedido++
      else statusOk++
    })

    const mediaPorCondutor = currentScopeData.length > 0 ? (totalAcumuladoDecimal / currentScopeData.length) : 0
    const motoristasCriticosTotal = statusCritico + statusExcedido

    const rankingTop5 = [...currentScopeData]
      .filter(item => item.totalHours > 0)
      .sort((a, b) => b.totalHours - a.totalHours)
      .slice(0, 5)

    const donutConfig = {
      series: [statusOk, statusAtencao, statusCritico, statusExcedido],
      options: {
        chart: { type: 'donut', id: 'status-frota-chart' },
        labels: ['Normal (OK)', 'Atenção', 'Crítico', 'Excedido'],
        colors: ['#10B981', '#F59E0B', '#EF4444', '#7F1D1D'],
        legend: { position: 'bottom' },
        dataLabels: { enabled: true },
        plotOptions: {
          pie: {
            donut: {
              labels: {
                show: true,
                total: { show: true, label: 'Frota', formatter: () => currentScopeData.length }
              }
            }
          }
        }
      }
    }

    const barConfig = {
      series: [{
        name: 'Horas Acumuladas',
        data: rankingTop5.map(item => Math.round(item.totalHours))
      }],
      options: {
        chart: { type: 'bar', id: 'top-ranking-chart', toolbar: { show: false } },
        colors: ['#040a18'],
        plotOptions: {
          bar: { borderRadius: 4, horizontal: true, barHeight: '55%' }
        },
        dataLabels: {
          enabled: true,
          formatter: function (val, opts) {
            const index = opts.dataPointIndex
            return rankingTop5[index] ? rankingTop5[index].totalHoursStr + 'h' : val + 'h'
          }
        },
        xaxis: {
          categories: rankingTop5.map(item => item.driver.name)
        },
        grid: { borderColor: '#E2E8F0', strokeDashArray: 4 }
      }
    }

    return {
      totalAcumuladoStr: formatarParaRelogio(totalAcumuladoDecimal),
      mediaPorCondutorStr: formatarParaRelogio(mediaPorCondutor),
      motoristasAtivosComHoras,
      motoristasCriticos: motoristasCriticosTotal,
      donutConfig,
      barConfig,
      temDadosRanking: rankingTop5.length > 0
    }
  }, [computed, empresaFilter])

  const loading = loadingDrivers || loadingEntries || loadingUser

  async function handleExport(type) {
    const rows = sorted 
    const label = `${empresaFilter}${exportScope === 'comHoras' ? '-com-hora-extra' : ''}`
    setExporting(true)
    try {
      if (type === 'excel') {
        await exportExcel(rows, label, entriesByDriver) 
      } else {
        await exportPDF(rows, label)
      }
    } catch (err) {
      console.error('Erro ao exportar arquivo:', err)
    } finally {
      setExporting(false)
    }
  }

  if (loadingUser) {
    return (
      <div className="p-8 text-center text-slate">
        Autenticando e carregando perfil de acesso...
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div>
          <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">
            {monthLabel()}
          </p>
          <h1 className="font-display text-3xl font-semibold">Painel geral</h1>
        </div>
        
        <div className="flex gap-2">
          {userRole === 'supervisor' && (
            <Link
              to="/usuarios"
              className="border border-line bg-white text-ink rounded-lg px-4 py-2 text-sm font-medium hover:bg-cloud transition"
            >
              Gerenciar Usuários
            </Link>
          )}

          <Link
            to="/lancar-horas"
            className="bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink/90 transition"
          >
            + Lançar horas
          </Link>
        </div>
      </div>

      <AlertBanner alertedDrivers={alertedDrivers} alertaHoras={alertaHoras} />

      {/* Filtros */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar motorista por nome ou matrícula"
            className="w-full sm:max-w-xs rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
          />
          
          {userRole === 'supervisor' ? (
            <div className="flex gap-1.5 bg-white border border-line rounded-lg p-1 w-fit">
              {['Todas', ...EMPRESAS].map((option) => (
                <button
                  key={option}
                  onClick={() => setEmpresaFilter(option)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition whitespace-nowrap ${
                    empresaFilter === option ? 'bg-ink text-white' : 'text-slate hover:text-ink'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center px-3 py-2 bg-cloud border border-line rounded-lg text-sm text-slate font-medium w-fit">
              Empresa: <span className="text-ink ml-1 font-semibold">{userEmpresa}</span>
            </div>
          )}
        </div>

        <div className="flex gap-1.5 bg-white border border-line rounded-lg p-1 w-fit">
          <button
            onClick={() => setViewMode('cards')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'cards' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
            }`}
          >
            Cards
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition ${
              viewMode === 'list' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {/* Exportação, WhatsApp e Régua de Alerta */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 bg-white border border-line rounded-lg p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1 flex-wrap">
          <div className="flex gap-1.5 bg-cloud rounded-lg p-1 w-fit">
            <button
              onClick={() => setExportScope('todos')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                exportScope === 'todos' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setExportScope('comHoras')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition whitespace-nowrap ${
                exportScope === 'comHoras' ? 'bg-ink text-white' : 'text-slate hover:text-ink'
              }`}
            >
              Somente c/ hora extra
            </button>
          </div>

          <div className="flex items-center gap-2 bg-cloud rounded-lg p-1 w-fit border border-line/40">
            <span className="text-xs text-slate font-medium pl-2 pr-1">Régua do Alerta:</span>
            {[30, 40, 50].map((horas) => (
              <button
                key={horas}
                onClick={() => setAlertaHoras(horas)}
                className={`px-2 py-1 rounded-md text-xs font-semibold transition ${
                  alertaHoras === horas
                    ? 'bg-ink text-white shadow-sm'
                    : 'text-slate hover:text-ink hover:bg-cloud/50'
                }`}
              >
                {horas}h
              </button>
            ))}
          </div>
        </div>

        {/* Botões Otimizados */}
        <div className="flex gap-2 lg:ml-auto flex-wrap">
          <button
            onClick={() => handleExport('excel')}
            disabled={exporting || sorted.length === 0}
            className="flex items-center justify-center gap-2 border border-line rounded-lg px-4 py-2 text-sm font-medium text-ink hover:bg-cloud transition disabled:opacity-40 shadow-sm"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>Exportar Excel</span>
          </button>

          <button
            onClick={() => handleExport('pdf')}
            disabled={exporting || sorted.length === 0}
            className="flex items-center justify-center gap-2 border border-line rounded-lg px-4 py-2 text-sm font-medium text-ink hover:bg-cloud transition disabled:opacity-40 shadow-sm"
          >
            <FaRegFilePdf className="w-4 h-4 shrink-0 text-red-600" />
            <span>Exportar PDF</span>
          </button>

          <button
            onClick={() => setShowWhatsApp(true)}
            disabled={alertedDrivers.length === 0}
            className="flex items-center justify-center gap-2 bg-signal text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-signal/90 transition disabled:opacity-40 shadow-sm"
          >
            <FaWhatsapp className="w-4 h-4 shrink-0 text-white" />
            <span>Avisar por WhatsApp{alertedDrivers.length > 0 ? ` (${alertedDrivers.length})` : ''}</span>
          </button>
        </div>
      </div>

      {/* SEÇÃO MONITORADOS (EXIBE MÁXIMO 10 REGISTROS) */}
      <div className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h2 className="text-xs font-bold text-slate uppercase tracking-wider">
            Motoristas Ativos ({top10Exibidos.length} de {sorted.length})
          </h2>
        </div>

        {loading && <p className="text-slate text-center py-4">Carregando dados…</p>}

        {!loading && drivers.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-10 text-center border border-line">
            <p className="font-display text-xl mb-1">Nenhum motorista cadastrado</p>
            <p className="text-sm text-slate">
              Vá até "Motoristas" para adicionar o primeiro motorista da frota.
            </p>
          </div>
        )}

        {!loading && drivers.length > 0 && sorted.length === 0 && (
          <div className="bg-white rounded-xl shadow-card p-10 text-center border border-line">
            <p className="text-slate">Nenhum motorista correspondente aos filtros aplicados.</p>
          </div>
        )}

        {/* MODO CARDS */}
        {!loading && top10Exibidos.length > 0 && viewMode === 'cards' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {top10Exibidos.map((item) => (
              <DriverCard 
                key={item.driver.id} 
                {...item} 
              />
            ))}
          </div>
        )}

        {/* MODO LISTA */}
        {!loading && top10Exibidos.length > 0 && viewMode === 'list' && (
          <div className="bg-white rounded-xl shadow-card overflow-x-auto border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate border-b border-line whitespace-nowrap bg-cloud/40">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Empresa</th>
                  <th className="px-5 py-3 font-medium font-mono">Total / 75% / 100%</th>
                  <th className="px-5 py-3 font-medium w-56">Progresso</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {top10Exibidos.map(({ driver, totalHoursStr, total75Str, total100Str, usage }) => {
                  const meta = STATUS_META[usage.status] || STATUS_META.ok
                  return (
                    <tr
                      key={driver.id}
                      className="border-b border-line last:border-0 hover:bg-cloud/50"
                    >
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Link to={`/motoristas/${driver.id}`} className="font-medium hover:underline text-ink">
                          {driver.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3">
                        <EmpresaBadge empresa={driver.empresa} />
                      </td>
                      <td className="px-5 py-3 font-mono whitespace-nowrap">
                        <div className="font-bold text-ink">{totalHoursStr}h</div>
                        <div className="text-xs text-slate">
                          75%: <span className="font-medium text-ink/80">{total75Str}h</span> | 
                          100%: <span className="font-medium text-ink/80">{total100Str}h</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <RouteProgress percent={usage.percent} status={usage.status} compact />
                      </td>
                      <td className={`px-5 py-3 font-medium whitespace-nowrap ${meta.text}`}>
                        {meta.label}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* LINHA DIVISORA */}
      <hr className="border-line" />

      {/* SEÇÃO INFERIOR: GRÁFICOS E METRICAS */}
      {!loading && computed.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xs font-bold text-slate uppercase tracking-wider px-1">
            Métricas de Desempenho e Indicadores
          </h2>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-line p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate uppercase tracking-wider block">Total Frota</span>
              <h2 className="text-2xl font-bold font-mono text-ink mt-1">{analytics.totalAcumuladoStr}h</h2>
              <span className="text-[10px] text-slate block mt-0.5">Horas somadas no mês</span>
            </div>
            
            <div className="bg-white border border-line p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate uppercase tracking-wider block">Média p/ Motorista</span>
              <h2 className="text-2xl font-bold font-mono text-ink mt-1">{analytics.mediaPorCondutorStr}h</h2>
              <span className="text-[10px] text-slate block mt-0.5">Média operacional ativa</span>
            </div>

            <div className="bg-white border border-line p-4 rounded-xl shadow-sm flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate uppercase tracking-wider block">Com Extras</span>
              <h2 className="text-2xl font-bold font-mono text-slate-800 mt-1">{analytics.motoristasAtivosComHoras}</h2>
              <span className="text-[10px] text-slate block mt-0.5">Condutores com horas extras</span>
            </div>

            <div className={`bg-white border p-4 rounded-xl shadow-sm flex flex-col justify-between border-l-4 ${
              analytics.motoristasCriticos > 0 ? 'border-red-500 bg-red-50/10' : 'border-line'
            }`}>
              <span className={`text-xs font-bold uppercase tracking-wider block ${analytics.motoristasCriticos > 0 ? 'text-red-600' : 'text-slate'}`}>
                Status Crítico
              </span>
              <h2 className={`text-2xl font-bold font-mono mt-1 ${analytics.motoristasCriticos > 0 ? 'text-red-600' : 'text-ink'}`}>
                {analytics.motoristasCriticos}
              </h2>
              <span className="text-[10px] text-slate block mt-0.5">Excedidos ou em estado crítico</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            
            <div className="bg-white border border-line p-5 rounded-xl shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Visão Geral de Conformidade</h3>
                <p className="text-xs text-slate">Distribuição proporcional das condições de horas extras da frota</p>
              </div>
              <div className="flex-1 flex items-center justify-center">
                <Chart 
                  options={analytics.donutConfig.options} 
                  series={analytics.donutConfig.series} 
                  type="donut" 
                  width="100%" 
                  height={280} 
                />
              </div>
            </div>

            <div className="bg-white border border-line p-5 rounded-xl shadow-sm flex flex-col">
              <div className="mb-4">
                <h3 className="text-sm font-bold text-ink uppercase tracking-wide">Top 5 Condutores — Maior Volume</h3>
                <p className="text-xs text-slate">Ranking analítico baseado em lançamentos acumulados vigentes</p>
              </div>
              <div className="flex-1">
                {!analytics.temDadosRanking ? (
                  <div className="text-center py-14 text-xs text-slate">Nenhum dado computado para exibição do gráfico.</div>
                ) : (
                  <Chart 
                    options={analytics.barConfig.options} 
                    series={analytics.barConfig.series} 
                    type="bar" 
                    width="100%" 
                    height={260} 
                  />
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {showWhatsApp && (
        <WhatsAppAlertModal alertedDrivers={alertedDrivers} onClose={() => setShowWhatsApp(false)} />
      )}
    </div>
  )
}