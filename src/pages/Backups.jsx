import { useEffect, useMemo, useState } from 'react'
import {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  addDoc,
  query,
  orderBy,
  limit,
  onSnapshot
} from 'firebase/firestore'
import { db } from '../firebase'
import { useDrivers } from '../hooks/useDrivers'
import { useAuth } from '../context/AuthContext' // Hook do usuário logado
import { EMPRESAS } from '../utils/constants'

function downloadJSON(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function Admin() {
  const { user } = useAuth()
  const { drivers, loading: loadingDrivers } = useDrivers()

  // Estados de Operação
  const [exporting, setExporting] = useState(false)
  const [autoBackup, setAutoBackup] = useState(null)
  const [loadingAutoBackup, setLoadingAutoBackup] = useState(true)

  // Estados para restauração
  const [restoring, setRestoring] = useState(false)
  const [restoreMessage, setRestoreMessage] = useState(null)

  // Estados para apagar tudo
  const [deletingAll, setDeletingAll] = useState(false)
  const [deleteConfirmationText, setDeleteConfirmationText] = useState('')
  const [deleteMessage, setDeleteMessage] = useState(null)

  // Estado para os Logs de Backup
  const [backupLogs, setBackupLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)

  // 1. Carrega o status do backup automático e escuta os relatórios de logs em tempo real
  useEffect(() => {
    async function loadAutoBackupStatus() {
      try {
        const snap = await getDoc(doc(db, 'system', 'lastBackup'))
        setAutoBackup(snap.exists() ? snap.data() : null)
      } catch {
        setAutoBackup(null)
      } finally {
        setLoadingAutoBackup(false)
      }
    }
    loadAutoBackupStatus()

    // Busca os últimos 20 registros de log de backup no Firestore
    const q = query(collection(db, 'backup_logs'), orderBy('createdAt', 'desc'), limit(20))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data()
        }))
        setBackupLogs(logs)
        setLoadingLogs(false)
      },
      (error) => {
        console.error('Erro ao buscar histórico de backups:', error)
        setLoadingLogs(false)
      }
    )

    return () => unsubscribe()
  }, [])

  // Função auxiliar para gravar relatório na coleção 'backup_logs'
  async function logBackupOperation(type, details) {
    try {
      await addDoc(collection(db, 'backup_logs'), {
        type, // 'EXPORT_MANUAL', 'RESTORE', 'DELETE_ALL'
        performedBy: user?.email || user?.displayName || 'Usuário Desconhecido',
        userId: user?.uid || null,
        createdAt: new Date(),
        ...details
      })
    } catch (err) {
      console.error('Erro ao salvar relatório de log:', err)
    }
  }

  const porEmpresa = useMemo(() => {
    const counts = {}
    EMPRESAS.forEach((e) => (counts[e] = 0))
    let semEmpresa = 0
    drivers.forEach((d) => {
      if (d.empresa && counts[d.empresa] !== undefined) counts[d.empresa]++
      else semEmpresa++
    })
    return { counts, semEmpresa }
  }, [drivers])

  // EXPORTAÇÃO MANUAL
  async function handleManualBackup() {
    setExporting(true)
    try {
      const driversSnap = await getDocs(collection(db, 'drivers'))
      const driversData = []
      for (const driverDoc of driversSnap.docs) {
        const entriesSnap = await getDocs(collection(db, 'drivers', driverDoc.id, 'entries'))
        driversData.push({
          id: driverDoc.id,
          ...driverDoc.data(),
          entries: entriesSnap.docs.map((e) => ({ id: e.id, ...e.data() }))
        })
      }

      const totalLancamentos = driversData.reduce((sum, d) => sum + d.entries.length, 0)
      const backup = {
        geradoEm: new Date().toISOString(),
        totalMotoristas: driversData.length,
        totalLancamentos,
        motoristas: driversData
      }

      const filename = `backup-controle-horas-${new Date().toISOString().slice(0, 10)}.json`
      downloadJSON(backup, filename)

      // Registra o log no banco de dados
      await logBackupOperation('EXPORT_MANUAL', {
        fileName: filename,
        totalMotoristas: driversData.length,
        totalLancamentos
      })
    } finally {
      setExporting(false)
    }
  }

  // RESTAURAÇÃO DE BACKUP
  async function handleRestoreBackup(event) {
    const file = event.target.files[0]
    if (!file) return

    const confirmacao = window.confirm(
      'ATENÇÃO: A restauração irá regravar/atualizar os motoristas e lançamentos existentes no banco de dados. Deseja continuar?'
    )

    if (!confirmacao) {
      event.target.value = ''
      return
    }

    setRestoring(true)
    setRestoreMessage(null)

    const reader = new FileReader()

    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result)

        if (!backupData.motoristas || !Array.isArray(backupData.motoristas)) {
          throw new Error('Arquivo de backup inválido ou num formato não suportado.')
        }

        let totalDriversRestored = 0
        let totalEntriesRestored = 0

        let batch = writeBatch(db)
        let operationCount = 0

        for (const driver of backupData.motoristas) {
          const { id: driverId, entries, ...driverFields } = driver

          const driverRef = doc(db, 'drivers', driverId)
          batch.set(driverRef, driverFields, { merge: true })
          operationCount++
          totalDriversRestored++

          if (operationCount >= 450) {
            await batch.commit()
            batch = writeBatch(db)
            operationCount = 0
          }

          if (entries && Array.isArray(entries)) {
            for (const entry of entries) {
              const { id: entryId, ...entryFields } = entry
              const entryRef = doc(db, 'drivers', driverId, 'entries', entryId)
              batch.set(entryRef, entryFields, { merge: true })
              operationCount++
              totalEntriesRestored++

              if (operationCount >= 450) {
                await batch.commit()
                batch = writeBatch(db)
                operationCount = 0
              }
            }
          }
        }

        if (operationCount > 0) {
          await batch.commit()
        }

        setRestoreMessage({
          type: 'success',
          text: `Restauração concluída com sucesso! ${totalDriversRestored} motoristas e ${totalEntriesRestored} lançamentos processados.`
        })

        // Registra o log no banco de dados
        await logBackupOperation('RESTORE', {
          fileName: file.name,
          totalMotoristas: totalDriversRestored,
          totalLancamentos: totalEntriesRestored
        })
      } catch (err) {
        console.error(err)
        setRestoreMessage({
          type: 'error',
          text: `Erro ao restaurar backup: ${err.message}`
        })
      } finally {
        setRestoring(false)
        event.target.value = ''
      }
    }

    reader.readAsText(file)
  }

  // APAGAR TUDO
  async function handleDeleteAllData() {
    if (deleteConfirmationText.trim().toUpperCase() !== 'DELETAR') {
      alert('Por favor, digite a palavra DELETAR para confirmar a exclusão.')
      return
    }

    setDeletingAll(true)
    setDeleteMessage(null)

    try {
      const driversSnap = await getDocs(collection(db, 'drivers'))
      let batch = writeBatch(db)
      let operationCount = 0
      let totalDeleted = 0

      for (const driverDoc of driversSnap.docs) {
        const entriesSnap = await getDocs(collection(db, 'drivers', driverDoc.id, 'entries'))
        for (const entryDoc of entriesSnap.docs) {
          batch.delete(entryDoc.ref)
          operationCount++
          totalDeleted++

          if (operationCount >= 450) {
            await batch.commit()
            batch = writeBatch(db)
            operationCount = 0
          }
        }

        batch.delete(driverDoc.ref)
        operationCount++
        totalDeleted++

        if (operationCount >= 450) {
          await batch.commit()
          batch = writeBatch(db)
          operationCount = 0
        }
      }

      if (operationCount > 0) {
        await batch.commit()
      }

      setDeleteMessage({
        type: 'success',
        text: `Limpeza concluída! Todos os dados foram removidos (${totalDeleted} registros excluídos).`
      })
      setDeleteConfirmationText('')

      // Registra o log no banco de dados
      await logBackupOperation('DELETE_ALL', {
        totalDeleted
      })
    } catch (err) {
      console.error(err)
      setDeleteMessage({
        type: 'error',
        text: `Erro ao apagar dados: ${err.message}`
      })
    } finally {
      setDeletingAll(false)
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">Administração</p>
        <h1 className="font-display text-3xl font-semibold">Gerenciar sistema</h1>
        <p className="text-sm text-slate mt-1">
          Visão geral, backup dos dados, relatórios e manutenção.
        </p>
      </div>

      {/* VISÃO GERAL */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-3">Visão geral</h2>
        {loadingDrivers ? (
          <p className="text-sm text-slate">Carregando…</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-2xl font-mono font-semibold">{drivers.length}</p>
              <p className="text-slate">Motoristas cadastrados</p>
            </div>
            {EMPRESAS.map((e) => (
              <div key={e}>
                <p className="text-2xl font-mono font-semibold">{porEmpresa.counts[e]}</p>
                <p className="text-slate">{e}</p>
              </div>
            ))}
            {porEmpresa.semEmpresa > 0 && (
              <div>
                <p className="text-2xl font-mono font-semibold">{porEmpresa.semEmpresa}</p>
                <p className="text-slate">Sem empresa definida</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* HISTÓRICO DE RELATÓRIOS DE BACKUP */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">Relatórios & Histórico de Operações</h2>
        <p className="text-sm text-slate mb-4">
          Registro recente de backups baixados, restaurações executadas e manutenções no sistema.
        </p>

        {loadingLogs ? (
          <p className="text-sm text-slate">Carregando histórico…</p>
        ) : backupLogs.length === 0 ? (
          <p className="text-sm text-slate italic">Nenhum registro encontrado ainda.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500 font-medium text-xs uppercase tracking-wider">
                  <th className="py-2 px-3">Data / Hora</th>
                  <th className="py-2 px-3">Tipo</th>
                  <th className="py-2 px-3">Realizado por</th>
                  <th className="py-2 px-3">Detalhes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {backupLogs.map((log) => {
                  const dataFormatada = log.createdAt?.toDate
                    ? log.createdAt.toDate().toLocaleString('pt-BR')
                    : '—'

                  let badgeColor = 'bg-slate-100 text-slate-700'
                  let tipoTexto = log.type

                  if (log.type === 'EXPORT_MANUAL') {
                    badgeColor = 'bg-blue-50 text-blue-700 border border-blue-200'
                    tipoTexto = 'Backup Manual'
                  } else if (log.type === 'RESTORE') {
                    badgeColor = 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    tipoTexto = 'Restauração'
                  } else if (log.type === 'DELETE_ALL') {
                    badgeColor = 'bg-rose-50 text-rose-700 border border-rose-200'
                    tipoTexto = 'Exclusão Geral'
                  }

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 whitespace-nowrap text-xs font-mono text-slate-600">
                        {dataFormatada}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded ${badgeColor}`}>
                          {tipoTexto}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 font-medium text-xs">
                        {log.performedBy}
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600">
                        {log.type === 'EXPORT_MANUAL' && (
                          <span>
                            {log.totalMotoristas} motoristas, {log.totalLancamentos} lançamentos
                          </span>
                        )}
                        {log.type === 'RESTORE' && (
                          <span>
                            Restaurados {log.totalMotoristas} motoristas e {log.totalLancamentos} lançamentos
                          </span>
                        )}
                        {log.type === 'DELETE_ALL' && (
                          <span className="text-rose-600 font-medium">
                            {log.totalDeleted} registros excluídos
                          </span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* BACKUP MANUAL */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">Backup manual</h2>
        <p className="text-sm text-slate mb-4">
          Baixa um arquivo .json com todos os motoristas e todos os lançamentos de horas já registrados.
        </p>
        <button
          onClick={handleManualBackup}
          disabled={exporting}
          className="bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-ink/90 transition disabled:opacity-50"
        >
          {exporting ? 'Gerando backup…' : 'Baixar backup completo (.json)'}
        </button>
      </div>

      {/* RESTAURAR BACKUP */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">Restaurar backup</h2>
        <p className="text-sm text-slate mb-4">
          Selecione um arquivo <code className="font-mono">.json</code> baixado anteriormente para restaurar os dados.
        </p>

        <label className="inline-block bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition">
          {restoring ? 'Restaurando dados…' : 'Selecionar arquivo .json'}
          <input
            type="file"
            accept=".json"
            onChange={handleRestoreBackup}
            disabled={restoring}
            className="hidden"
          />
        </label>

        {restoreMessage && (
          <div
            className={`mt-3 text-sm p-3 rounded-lg ${
              restoreMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            {restoreMessage.text}
          </div>
        )}
      </div>

      {/* BACKUP AUTOMÁTICO */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">Backup automático</h2>
        <p className="text-sm text-slate mb-3">
          Uma Cloud Function agendada roda todo dia de madrugada e salva uma cópia dos dados no Cloud Storage.
        </p>
        {loadingAutoBackup ? (
          <p className="text-sm text-slate">Verificando…</p>
        ) : autoBackup ? (
          <div className="rounded-lg bg-signal/10 text-sm px-4 py-3">
            <p className="text-signal font-medium">Backup automático ativo</p>
            <p className="text-slate mt-1">
              Último backup: {autoBackup.at?.toDate ? autoBackup.at.toDate().toLocaleString('pt-BR') : '—'}
              {' · '}
              {autoBackup.totalMotoristas} motoristas, {autoBackup.totalLancamentos} lançamentos
            </p>
            <p className="text-slate mt-1 font-mono text-xs">{autoBackup.fileName}</p>
          </div>
        ) : (
          <div className="rounded-lg bg-amber/10 text-sm px-4 py-3 text-amber-dark">
            Nenhum backup automático encontrado ainda.
          </div>
        )}
      </div>

      {/* ZONA DE PERIGO: APAGAR TUDO */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
        <h2 className="font-display text-lg font-semibold text-red-700 mb-1">Zona de perigo: Apagar todos os dados</h2>
        <p className="text-sm text-red-600 mb-4">
          Esta ação exclui <strong>permanentemente</strong> todos os motoristas e todos os lançamentos do banco de dados.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <input
            type="text"
            placeholder="Digite DELETAR para confirmar"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            disabled={deletingAll}
            className="border border-red-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 bg-white"
          />
          <button
            onClick={handleDeleteAllData}
            disabled={deletingAll || deleteConfirmationText.trim().toUpperCase() !== 'DELETAR'}
            className="bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {deletingAll ? 'Apagando banco de dados…' : 'Apagar todos os dados'}
          </button>
        </div>

        {deleteMessage && (
          <div
            className={`mt-3 text-sm p-3 rounded-lg ${
              deleteMessage.type === 'success'
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {deleteMessage.text}
          </div>
        )}
      </div>
    </div>
  )
}