import { useEffect, useMemo, useState } from "react";
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
  onSnapshot,
  collectionGroup,
} from "firebase/firestore";
import { db } from "../firebase";
import { useDrivers } from "../hooks/useDrivers";
import { useAuth } from "../context/AuthContext";
import { EMPRESAS } from "../utils/constants";

// Função auxiliar para download direto no navegador
function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// Converter array de objetos para texto CSV
function convertToCSV(dataArray) {
  if (!dataArray || dataArray.length === 0) return "";
  const headers = Object.keys(dataArray[0]);
  const rows = dataArray.map((obj) =>
    headers
      .map((header) => {
        let val = obj[header];
        if (val === null || val === undefined) val = "";
        if (typeof val === "object") val = JSON.stringify(val);
        val = String(val).replace(/"/g, '""');
        return `"${val}"`;
      })
      .join(","),
  );
  return [headers.join(","), ...rows].join("\r\n");
}

export default function Admin() {
  const { user } = useAuth();
  const { drivers, loading: loadingDrivers } = useDrivers();

  // Estados de Status e Logs
  const [autoBackup, setAutoBackup] = useState(null);
  const [loadingAutoBackup, setLoadingAutoBackup] = useState(true);
  const [backupLogs, setBackupLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  // Configurações de Exportação (Backup Manual)
  const [exportFormat, setExportFormat] = useState("json"); // 'json', 'excel', 'csv', 'zip'
  const [selectedExportCols, setSelectedExportCols] = useState({
    users: true,
    drivers: true,
    entries: true,
  });
  const [exporting, setExporting] = useState(false);

  // Configurações de Restauração
  const [restoring, setRestoring] = useState(false);
  const [restoreMessage, setRestoreMessage] = useState(null);

  // Configurações da Zona de Perigo (Exclusão Granular)
  const [selectedDeleteCols, setSelectedDeleteCols] = useState({
    users: false,
    drivers: false,
    entries: false,
  });
  const [deletingData, setDeletingData] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deleteMessage, setDeleteMessage] = useState(null);

  // Carrega status de backup e escuta histórico de logs
  useEffect(() => {
    async function loadAutoBackupStatus() {
      try {
        const snap = await getDoc(doc(db, "system", "lastBackup"));
        setAutoBackup(snap.exists() ? snap.data() : null);
      } catch {
        setAutoBackup(null);
      } finally {
        setLoadingAutoBackup(false);
      }
    }
    loadAutoBackupStatus();

    const q = query(
      collection(db, "backup_logs"),
      orderBy("createdAt", "desc"),
      limit(20),
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));
        setBackupLogs(logs);
        setLoadingLogs(false);
      },
      (error) => {
        console.error("Erro ao buscar histórico de backups:", error);
        setLoadingLogs(false);
      },
    );

    return () => unsubscribe();
  }, []);

  // Função auxiliar para registrar logs de operação
  async function logBackupOperation(type, details) {
    try {
      await addDoc(collection(db, "backup_logs"), {
        type,
        performedBy: user?.email || user?.displayName || "Usuário Desconhecido",
        userId: user?.uid || null,
        createdAt: new Date(),
        ...details,
      });
    } catch (err) {
      console.error("Erro ao salvar log no Firestore:", err);
    }
  }

  const porEmpresa = useMemo(() => {
    const counts = {};
    EMPRESAS.forEach((e) => (counts[e] = 0));
    let semEmpresa = 0;
    drivers.forEach((d) => {
      if (d.empresa && counts[d.empresa] !== undefined) counts[d.empresa]++;
      else semEmpresa++;
    });
    return { counts, semEmpresa };
  }, [drivers]);

  // ==========================================
  // BUSCA DE DADOS PARA EXPORTAÇÃO
  // ==========================================
  async function fetchCollectionsData() {
    const result = {};

    if (selectedExportCols.users) {
      const snap = await getDocs(collection(db, "users"));
      result.users = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }

    if (selectedExportCols.drivers) {
      const snap = await getDocs(collection(db, "drivers"));
      result.drivers = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
    }

    if (selectedExportCols.entries) {
      const snap = await getDocs(collectionGroup(db, "entries"));
      result.entries = snap.docs.map((docSnap) => ({
        id: docSnap.id,
        driverId: docSnap.ref.parent.parent
          ? docSnap.ref.parent.parent.id
          : null,
        ...docSnap.data(),
      }));
    }

    return result;
  }

  // EXPORTAÇÃO (BACKUP MANUAL MULTI-FORMATO)
  async function handleManualBackup() {
    if (
      !selectedExportCols.users &&
      !selectedExportCols.drivers &&
      !selectedExportCols.entries
    ) {
      alert("Selecione ao menos uma coleção para exportar.");
      return;
    }

    setExporting(true);
    const dateStr = new Date().toISOString().slice(0, 10);

    try {
      const data = await fetchCollectionsData();
      const exportSummary = {
        users: data.users?.length || 0,
        drivers: data.drivers?.length || 0,
        entries: data.entries?.length || 0,
      };

      if (exportFormat === "json") {
        const payload = {
          geradoEm: new Date().toISOString(),
          resumo: exportSummary,
          ...data,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], {
          type: "application/json",
        });
        const filename = `backup-sistema-${dateStr}.json`;
        downloadBlob(blob, filename);

        await logBackupOperation("EXPORT_MANUAL", {
          format: "JSON",
          fileName: filename,
          ...exportSummary,
        });
      } else if (exportFormat === "excel") {
        const XLSX = await import("xlsx");
        const workbook = XLSX.utils.book_new();

        if (data.users) {
          const wsUsers = XLSX.utils.json_to_sheet(data.users);
          XLSX.utils.book_append_sheet(workbook, wsUsers, "Usuarios");
        }
        if (data.drivers) {
          const wsDrivers = XLSX.utils.json_to_sheet(data.drivers);
          XLSX.utils.book_append_sheet(workbook, wsDrivers, "Motoristas");
        }
        if (data.entries) {
          const wsEntries = XLSX.utils.json_to_sheet(data.entries);
          XLSX.utils.book_append_sheet(workbook, wsEntries, "Lancamentos");
        }

        const filename = `backup-sistema-${dateStr}.xlsx`;
        XLSX.writeFile(workbook, filename);

        await logBackupOperation("EXPORT_MANUAL", {
          format: "EXCEL",
          fileName: filename,
          ...exportSummary,
        });
      } else if (exportFormat === "csv") {
        for (const [colName, colData] of Object.entries(data)) {
          if (colData && colData.length > 0) {
            const csvStr = convertToCSV(colData);
            const blob = new Blob(["\ufeff" + csvStr], {
              type: "text/csv;charset=utf-8;",
            });
            downloadBlob(blob, `export-${colName}-${dateStr}.csv`);
          }
        }
        await logBackupOperation("EXPORT_MANUAL", {
          format: "CSV",
          fileName: `multi-csv-${dateStr}`,
          ...exportSummary,
        });
      } else if (exportFormat === "zip") {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();

        if (data.users)
          zip.file("users.json", JSON.stringify(data.users, null, 2));
        if (data.drivers)
          zip.file("drivers.json", JSON.stringify(data.drivers, null, 2));
        if (data.entries)
          zip.file("entries.json", JSON.stringify(data.entries, null, 2));

        const content = await zip.generateAsync({ type: "blob" });
        const filename = `backup-sistema-${dateStr}.zip`;
        downloadBlob(content, filename);

        await logBackupOperation("EXPORT_MANUAL", {
          format: "ZIP",
          fileName: filename,
          ...exportSummary,
        });
      }
    } catch (err) {
      console.error("Erro na exportação:", err);
      alert(`Erro ao exportar dados: ${err.message}`);
    } finally {
      setExporting(false);
    }
  }

  // RESTAURAÇÃO DE BACKUP (JSON E ESTRUTURA ANTIGA/NOVA)
  async function handleRestoreBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const confirmacao = window.confirm(
      "ATENÇÃO: A restauração irá gravar/atualizar os registros correspondentes no Firestore. Deseja continuar?",
    );

    if (!confirmacao) {
      event.target.value = "";
      return;
    }

    setRestoring(true);
    setRestoreMessage(null);

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const backupData = JSON.parse(e.target.result);
        let totalUsers = 0;
        let totalDrivers = 0;
        let totalEntries = 0;

        let batch = writeBatch(db);
        let operationCount = 0;

        // 1. Processa a coleção 'users'
        if (backupData.users && Array.isArray(backupData.users)) {
          for (const userItem of backupData.users) {
            const { id: userId, ...userFields } = userItem;
            if (userId) {
              batch.set(doc(db, "users", userId), userFields, { merge: true });
              operationCount++;
              totalUsers++;

              if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }
            }
          }
        }

        // 2. Processa a coleção 'drivers'
        const driversList = backupData.drivers || backupData.motoristas;
        if (driversList && Array.isArray(driversList)) {
          for (const driver of driversList) {
            const { id: driverId, entries, ...driverFields } = driver;
            if (driverId) {
              batch.set(doc(db, "drivers", driverId), driverFields, {
                merge: true,
              });
              operationCount++;
              totalDrivers++;

              if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }

              if (entries && Array.isArray(entries)) {
                for (const entry of entries) {
                  const { id: entryId, ...entryFields } = entry;
                  if (entryId) {
                    batch.set(
                      doc(db, "drivers", driverId, "entries", entryId),
                      entryFields,
                      { merge: true },
                    );
                    operationCount++;
                    totalEntries++;

                    if (operationCount >= 450) {
                      await batch.commit();
                      batch = writeBatch(db);
                      operationCount = 0;
                    }
                  }
                }
              }
            }
          }
        }

        // 3. Processa a coleção 'entries' (plano)
        if (backupData.entries && Array.isArray(backupData.entries)) {
          for (const entry of backupData.entries) {
            const { id: entryId, driverId, ...entryFields } = entry;
            if (driverId && entryId) {
              batch.set(
                doc(db, "drivers", driverId, "entries", entryId),
                entryFields,
                { merge: true },
              );
              operationCount++;
              totalEntries++;

              if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }
            }
          }
        }

        if (operationCount > 0) {
          await batch.commit();
        }

        setRestoreMessage({
          type: "success",
          text: `Restauração concluída! Processados: ${totalUsers} usuários, ${totalDrivers} motoristas, ${totalEntries} lançamentos.`,
        });

        await logBackupOperation("RESTORE", {
          fileName: file.name,
          users: totalUsers,
          drivers: totalDrivers,
          entries: totalEntries,
        });
      } catch (err) {
        console.error(err);
        setRestoreMessage({
          type: "error",
          text: `Erro ao restaurar backup: ${err.message}`,
        });
      } finally {
        setRestoring(false);
        event.target.value = "";
      }
    };

    reader.readAsText(file);
  }

  // EXCLUSÃO GRANULAR DE DADOS
  async function handleDeleteData() {
    if (
      !selectedDeleteCols.users &&
      !selectedDeleteCols.drivers &&
      !selectedDeleteCols.entries
    ) {
      alert("Selecione pelo menos uma coleção para excluir.");
      return;
    }

    if (deleteConfirmationText.trim().toUpperCase() !== "DELETAR") {
      alert("Por favor, digite a palavra DELETAR para confirmar a exclusão.");
      return;
    }

    if (selectedDeleteCols.users) {
      const confirmSelfDelete = window.confirm(
        "ATENÇÃO: Você selecionou para apagar os USUÁRIOS. Seu próprio perfil não será apagado por segurança, mas os demais sim. Deseja prosseguir?",
      );
      if (!confirmSelfDelete) return;
    }

    setDeletingData(true);
    setDeleteMessage(null);

    try {
      let batch = writeBatch(db);
      let operationCount = 0;
      let totalDeleted = 0;

      // 1. Excluir Lançamentos (`entries`)
      if (selectedDeleteCols.entries) {
        const entriesSnap = await getDocs(collectionGroup(db, "entries"));
        for (const entryDoc of entriesSnap.docs) {
          batch.delete(entryDoc.ref);
          operationCount++;
          totalDeleted++;

          if (operationCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }

      // 2. Excluir Motoristas (`drivers`)
      if (selectedDeleteCols.drivers) {
        const driversSnap = await getDocs(collection(db, "drivers"));
        for (const driverDoc of driversSnap.docs) {
          if (!selectedDeleteCols.entries) {
            const subEntries = await getDocs(
              collection(db, "drivers", driverDoc.id, "entries"),
            );
            for (const subDoc of subEntries.docs) {
              batch.delete(subDoc.ref);
              operationCount++;
              totalDeleted++;

              if (operationCount >= 450) {
                await batch.commit();
                batch = writeBatch(db);
                operationCount = 0;
              }
            }
          }

          batch.delete(driverDoc.ref);
          operationCount++;
          totalDeleted++;

          if (operationCount >= 450) {
            await batch.commit();
            batch = writeBatch(db);
            operationCount = 0;
          }
        }
      }

      // 3. Excluir Usuários (`users`)
      if (selectedDeleteCols.users) {
        const usersSnap = await getDocs(collection(db, "users"));
        for (const userDoc of usersSnap.docs) {
          if (userDoc.id !== user?.uid) {
            batch.delete(userDoc.ref);
            operationCount++;
            totalDeleted++;

            if (operationCount >= 450) {
              await batch.commit();
              batch = writeBatch(db);
              operationCount = 0;
            }
          }
        }
      }

      if (operationCount > 0) {
        await batch.commit();
      }

      setDeleteMessage({
        type: "success",
        text: `Operação concluída! ${totalDeleted} registro(s) excluído(s) nas coleções selecionadas.`,
      });
      setDeleteConfirmationText("");

      await logBackupOperation("DELETE_ALL", {
        totalDeleted,
        targetCollections: selectedDeleteCols,
      });
    } catch (err) {
      console.error(err);
      setDeleteMessage({
        type: "error",
        text: `Erro ao apagar dados: ${err.message}`,
      });
    } finally {
      setDeletingData(false);
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <p className="text-xs font-mono uppercase tracking-wide text-slate mb-1">
          Administração
        </p>
        <h1 className="font-display text-3xl font-semibold">
          Gerenciar sistema
        </h1>
        <p className="text-sm text-slate mt-1">
          Visão geral, backup granular, restauração e manutenção de dados.
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
              <p className="text-2xl font-mono font-semibold">
                {drivers.length}
              </p>
              <p className="text-slate">Motoristas cadastrados</p>
            </div>
            {EMPRESAS.map((e) => (
              <div key={e}>
                <p className="text-2xl font-mono font-semibold">
                  {porEmpresa.counts[e]}
                </p>
                <p className="text-slate">{e}</p>
              </div>
            ))}
            {porEmpresa.semEmpresa > 0 && (
              <div>
                <p className="text-2xl font-mono font-semibold">
                  {porEmpresa.semEmpresa}
                </p>
                <p className="text-slate">Sem empresa definida</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* RELATÓRIOS & HISTÓRICO DE OPERAÇÕES */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">
          Relatórios & Histórico de Operações
        </h2>
        <p className="text-sm text-slate mb-4">
          Registro recente de backups baixados, restaurações executadas e
          manutenções no sistema.
        </p>

        {loadingLogs ? (
          <p className="text-sm text-slate">Carregando histórico…</p>
        ) : backupLogs.length === 0 ? (
          <p className="text-sm text-slate italic">
            Nenhum registro encontrado ainda.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="hidden sm:grid sm:grid-cols-12 gap-3 pb-2 px-3 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div className="col-span-3">Data / Hora</div>
              <div className="col-span-3">Tipo</div>
              <div className="col-span-3">Realizado por</div>
              <div className="col-span-3">Detalhes</div>
            </div>

            {backupLogs.map((log) => {
              const dataFormatada = log.createdAt?.toDate
                ? log.createdAt.toDate().toLocaleString("pt-BR")
                : "—";

              let badgeStyle = "bg-slate-100 text-slate-700";
              let tipoTexto = log.type;

              if (log.type === "EXPORT_MANUAL") {
                badgeStyle = "bg-blue-50 text-blue-700 border border-blue-200";
                tipoTexto = `Backup (${log.format || "JSON"})`;
              } else if (log.type === "RESTORE") {
                badgeStyle =
                  "bg-emerald-50 text-emerald-700 border border-emerald-200";
                tipoTexto = "Restauração";
              } else if (log.type === "DELETE_ALL") {
                badgeStyle = "bg-rose-50 text-rose-700 border border-rose-200";
                tipoTexto = "Exclusão";
              }

              const uCount = log.users ?? log.totalUsuarios ?? 0;
              const mCount = log.drivers ?? log.totalMotoristas ?? 0;
              const lCount = log.entries ?? log.totalLancamentos ?? 0;

              return (
                <div
                  key={log.id}
                  className="flex flex-col sm:grid sm:grid-cols-12 gap-2 sm:gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition items-start sm:items-center text-xs"
                >
                  <div className="sm:col-span-3 font-mono text-slate-600 font-medium">
                    {dataFormatada}
                  </div>
                  <div className="sm:col-span-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-md font-semibold ${badgeStyle}`}
                    >
                      {tipoTexto}
                    </span>
                  </div>
                  <div className="sm:col-span-3 text-slate-700 font-medium truncate w-full">
                    {log.performedBy}
                  </div>
                  <div className="sm:col-span-3 text-slate-600 font-medium">
                    {log.type === "EXPORT_MANUAL" && (
                      <span>
                        {uCount} {uCount === 1 ? "usuário" : "usuários"},{" "}
                        {mCount} {mCount === 1 ? "motorista" : "motoristas"},{" "}
                        {lCount} {lCount === 1 ? "lançamento" : "lançamentos"}
                      </span>
                    )}
                    {log.type === "RESTORE" && (
                      <span className="text-emerald-700">
                        Restaurados: {uCount}{" "}
                        {uCount === 1 ? "usuário" : "usuários"}, {mCount}{" "}
                        {mCount === 1 ? "motorista" : "motoristas"}, {lCount}{" "}
                        {lCount === 1 ? "lançamento" : "lançamentos"}
                      </span>
                    )}
                    {log.type === "DELETE_ALL" && (
                      <span className="text-rose-600">
                        {log.totalDeleted ?? 0} registros excluídos
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BACKUP MANUAL */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">
          Backup manual e Exportação
        </h2>
        <p className="text-sm text-slate mb-4">
          Selecione as coleções do banco de dados e o formato no qual deseja
          baixar os arquivos.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              1. Coleções inclusas:
            </label>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExportCols.users}
                  onChange={(e) =>
                    setSelectedExportCols({
                      ...selectedExportCols,
                      users: e.target.checked,
                    })
                  }
                  className="rounded text-ink focus:ring-ink"
                />
                Usuários (<code className="text-xs">users</code>)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExportCols.drivers}
                  onChange={(e) =>
                    setSelectedExportCols({
                      ...selectedExportCols,
                      drivers: e.target.checked,
                    })
                  }
                  className="rounded text-ink focus:ring-ink"
                />
                Motoristas (<code className="text-xs">drivers</code>)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedExportCols.entries}
                  onChange={(e) =>
                    setSelectedExportCols({
                      ...selectedExportCols,
                      entries: e.target.checked,
                    })
                  }
                  className="rounded text-ink focus:ring-ink"
                />
                Lançamentos de Horas (<code className="text-xs">entries</code>)
              </label>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200">
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              2. Formato do arquivo:
            </label>
            <div className="space-y-2 text-sm text-slate-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="json"
                  checked={exportFormat === "json"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="text-ink focus:ring-ink"
                />
                JSON{" "}
                <span className="text-xs text-slate-400">
                  (Recomendado p/ restauração)
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="excel"
                  checked={exportFormat === "excel"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="text-ink focus:ring-ink"
                />
                Excel (.xlsx com abas por coleção)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="csv"
                  checked={exportFormat === "csv"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="text-ink focus:ring-ink"
                />
                CSV (Planilhas de texto plano)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="exportFormat"
                  value="zip"
                  checked={exportFormat === "zip"}
                  onChange={(e) => setExportFormat(e.target.value)}
                  className="text-ink focus:ring-ink"
                />
                ZIP (Arquivo compactado com JSONs)
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleManualBackup}
          disabled={exporting}
          className="bg-ink text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-ink/90 transition disabled:opacity-50"
        >
          {exporting ? "Gerando exportação…" : "Exportar dados selecionados"}
        </button>
      </div>

      {/* RESTAURAR BACKUP */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">
          Restaurar backup
        </h2>
        <p className="text-sm text-slate mb-4">
          Selecione um arquivo <code className="font-mono">.json</code> para
          restaurar/atualizar os registros no banco de dados.
        </p>

        <label className="inline-block bg-white border border-slate-300 text-slate-700 font-medium px-4 py-2.5 rounded-lg text-sm cursor-pointer hover:bg-slate-50 transition">
          {restoring ? "Restaurando dados…" : "Selecionar arquivo .json"}
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
              restoreMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {restoreMessage.text}
          </div>
        )}
      </div>

      {/* BACKUP AUTOMÁTICO */}
      <div className="bg-white rounded-xl shadow-card p-5 mb-5">
        <h2 className="font-display text-lg font-semibold mb-1">
          Backup automático
        </h2>
        <p className="text-sm text-slate mb-3">
          Uma Cloud Function agendada roda todo dia de madrugada e salva uma
          cópia dos dados no Cloud Storage.
        </p>
        {loadingAutoBackup ? (
          <p className="text-sm text-slate">Verificando…</p>
        ) : autoBackup ? (
          <div className="rounded-lg bg-signal/10 text-sm px-4 py-3">
            <p className="text-signal font-medium">Backup automático ativo</p>
            <p className="text-slate mt-1">
              Último backup:{" "}
              {autoBackup.at?.toDate
                ? autoBackup.at.toDate().toLocaleString("pt-BR")
                : "—"}
              {" · "}
              {autoBackup.totalMotoristas} motoristas,{" "}
              {autoBackup.totalLancamentos} lançamentos
            </p>
            <p className="text-slate mt-1 font-mono text-xs">
              {autoBackup.fileName}
            </p>
          </div>
        ) : (
          <div className="rounded-lg bg-amber/10 text-sm px-4 py-3 text-amber-dark">
            Nenhum backup automático encontrado ainda.
          </div>
        )}
      </div>

      {/* ZONA DE PERIGO */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-5 mb-5">
        <h2 className="font-display text-lg font-semibold text-red-700 mb-1">
          Zona de perigo: Limpeza de dados
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Selecione as coleções que deseja apagar{" "}
          <strong>permanentemente</strong> do banco de dados.
        </p>

        <div className="bg-white/80 p-3 rounded-lg border border-red-200 mb-4">
          <p className="text-xs font-semibold text-red-800 uppercase mb-2">
            Marque o que deseja apagar:
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-red-900">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDeleteCols.entries}
                onChange={(e) =>
                  setSelectedDeleteCols({
                    ...selectedDeleteCols,
                    entries: e.target.checked,
                  })
                }
                className="rounded text-red-600 focus:ring-red-500"
              />
              Apenas Lançamentos (<code className="text-xs">entries</code>)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDeleteCols.drivers}
                onChange={(e) =>
                  setSelectedDeleteCols({
                    ...selectedDeleteCols,
                    drivers: e.target.checked,
                  })
                }
                className="rounded text-red-600 focus:ring-red-500"
              />
              Motoristas (<code className="text-xs">drivers</code>)
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedDeleteCols.users}
                onChange={(e) =>
                  setSelectedDeleteCols({
                    ...selectedDeleteCols,
                    users: e.target.checked,
                  })
                }
                className="rounded text-red-600 focus:ring-red-500"
              />
              Usuários do sistema (<code className="text-xs">users</code>)
            </label>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-medium text-red-800 mb-1">
            Digite <strong>DELETAR</strong> para confirmar:
          </label>
          <input
            type="text"
            value={deleteConfirmationText}
            onChange={(e) => setDeleteConfirmationText(e.target.value)}
            placeholder="DELETAR"
            className="w-full sm:w-64 px-3 py-2 text-sm border border-red-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
          />
        </div>

        <button
          onClick={handleDeleteData}
          disabled={deletingData}
          className="bg-red-600 text-white rounded-lg px-4 py-2.5 text-sm font-medium hover:bg-red-700 transition disabled:opacity-50"
        >
          {deletingData ? "Apagando dados…" : "Excluir dados selecionados"}
        </button>

        {deleteMessage && (
          <div
            className={`mt-3 text-sm p-3 rounded-lg ${
              deleteMessage.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-red-100 text-red-800 border border-red-300"
            }`}
          >
            {deleteMessage.text}
          </div>
        )}
      </div>
    </div>
  );
}