import React, { useState, useMemo, useEffect } from "react";
import {
  collection,
  onSnapshot,
  doc,
  getDoc,
  getDocFromCache,
  query,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAllEntries } from "../hooks/useAllEntries";
import { useVisibilityListener } from "../hooks/useVisibilityListener";
import {
  Calendar,
  Clock,
  FileText,
  User,
  Search,
  MapPin,
  X,
  Hash,
  Download,
  Printer,
} from "lucide-react";

export default function Reports() {
  const [drivers, setDrivers] = useState([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  const [userEmpresa, setUserEmpresa] = useState(null);
  const [loadingUser, setLoadingUser] = useState(true);

  // Escuta se a aba atual está visível para pausar/retomar listeners
  const isVisible = useVisibilityListener();

  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const [selectedMonth, setSelectedMonth] = useState(
    `${currentYear}-${currentMonth}`,
  );
  const [selectedDriverForModal, setSelectedDriverForModal] = useState(null);

  // ================= CONVERSÃO E CÁLCULO CORRIGIDO =================
  const formatarParaRelogio = (decimal) => {
    if (!decimal || decimal <= 0) return "00:00";
    const h = Math.floor(decimal);
    const m = Math.round((decimal - h) * 60);
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const calcularFechamento = (listaDeEntries) => {
    let minutos75 = 0;
    let minutos100 = 0;

    listaDeEntries.forEach((entry) => {
      const brutoDiaEmMinutos = Math.round((Number(entry.hours) || 0) * 60);
      const limite2HorasEmMinutos = 120;

      if (brutoDiaEmMinutos <= limite2HorasEmMinutos) {
        minutos75 += brutoDiaEmMinutos;
      } else {
        minutos75 += limite2HorasEmMinutos;
        minutos100 += brutoDiaEmMinutos - limite2HorasEmMinutos;
      }
    });

    const total75Decimal = minutos75 / 60;
    const total100Decimal = minutos100 / 60;
    const totalGeralDecimal = total75Decimal + total100Decimal;

    return {
      total75Str: formatarParaRelogio(total75Decimal),
      total100Str: formatarParaRelogio(total100Decimal),
      totalGeralStr: formatarParaRelogio(totalGeralDecimal),
      totalGeralDecimal: totalGeralDecimal,
    };
  };

  // 1. Identifica o usuário e a empresa (Tenta no Cache Primeiro -> Fallback no Servidor)
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      if (!user) {
        setLoadingUser(false);
        return;
      }

      const userDocRef = doc(db, "users", user.uid);
      let userData = null;

      // Estratégia resiliente de leitura do perfil:
      try {
        // Tenta ler do cache do navegador
        const cacheSnap = await getDocFromCache(userDocRef);
        if (cacheSnap.exists()) {
          userData = cacheSnap.data();
        }
      } catch (cacheError) {
        // Se falhar/não existir no cache, lê direto do servidor do Firestore
        try {
          const serverSnap = await getDoc(userDocRef);
          if (serverSnap.exists()) {
            userData = serverSnap.data();
          }
        } catch (serverError) {
          console.error("Erro ao buscar perfil no servidor:", serverError);
        }
      }

      // Aplica a empresa obtida ou faz fallback pelo domínio do e-mail
      if (userData && userData.empresa) {
        setUserEmpresa(userData.empresa);
      } else {
        const email = user.email?.toLowerCase() || "";
        if (email.includes("vereda")) setUserEmpresa("vereda");
        else if (email.includes("praia sol") || email.includes("praiasol"))
          setUserEmpresa("praia sol");
        else setUserEmpresa("todas");
      }

      setLoadingUser(false);
    });

    return () => unsubscribeAuth();
  }, []);

  // 2. Carrega motoristas (Pausa a busca se a aba estiver oculta)
  useEffect(() => {
    if (loadingUser || !userEmpresa || !isVisible) return;

    const driversQuery =
      userEmpresa.toLowerCase() === "todas"
        ? collection(db, "drivers")
        : query(collection(db, "drivers"), where("empresa", "==", userEmpresa));

    const unsubscribe = onSnapshot(
      driversQuery,
      (snapshot) => {
        const loadedDrivers = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));

        loadedDrivers.sort((a, b) =>
          (a.name || "").localeCompare(b.name || ""),
        );

        setDrivers(loadedDrivers);
        setLoadingDrivers(false);
      },
      (error) => {
        console.error("Erro no listener de motoristas:", error);
        setLoadingDrivers(false);
      },
    );

    return () => unsubscribe();
  }, [userEmpresa, loadingUser, isVisible]);

  // 3. Consome o hook useAllEntries (Internamente otimizado)
  const { entriesByDriver, loading: loadingEntries } = useAllEntries(
    drivers,
    selectedMonth,
  );

  // 4. Une, filtra e ordena os lançamentos para a lista principal
  const filteredEntries = useMemo(() => {
    if (!entriesByDriver) return [];

    const allFlattenedEntries = Object.entries(entriesByDriver).flatMap(
      ([driverId, entries]) => {
        const driverInfo = drivers.find((d) => d.id === driverId);

        return entries.map((entry) => ({
          ...entry,
          driverId,
          driverName:
            driverInfo?.name || entry.createdByName || "Motorista Desconhecido",
          driverMatricula:
            driverInfo?.matricula || driverInfo?.registration || "",
          empresa: driverInfo?.empresa || "Não Informada",
        }));
      },
    );

    const activeList = allFlattenedEntries.filter((entry) => {
      const matchesMonth = entry.date && entry.date.startsWith(selectedMonth);
      const matchesSearch =
        entry.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.driverMatricula
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        (entry.note &&
          entry.note.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesMonth && matchesSearch;
    });

    return activeList.sort((a, b) => {
      const nameCompare = a.driverName.localeCompare(b.driverName);
      if (nameCompare !== 0) return nameCompare;
      return (b.date || "").localeCompare(a.date || "");
    });
  }, [entriesByDriver, drivers, selectedMonth, searchTerm]);

  // 5. Cálculos dos Fechamentos usando a regra de Minutos
  const fechamentoGeralEmpresa = useMemo(() => {
    return calcularFechamento(filteredEntries);
  }, [filteredEntries]);

  // 6. Filtra lançamentos específicos para o Modal
  const modalDriverEntries = useMemo(() => {
    if (!selectedDriverForModal || !entriesByDriver) return [];
    const entries = entriesByDriver[selectedDriverForModal.id] || [];

    return entries
      .filter((entry) => entry.date && entry.date.startsWith(selectedMonth))
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [selectedDriverForModal, entriesByDriver, selectedMonth]);

  // 7. Fechamento exclusivo do Motorista Selecionado
  const fechamentoModalDriver = useMemo(() => {
    return calcularFechamento(modalDriverEntries);
  }, [modalDriverEntries]);

  // ================= EXPORTAÇÃO DE DADOS =================
  const handleExportCSV = () => {
    if (filteredEntries.length === 0) return;

    const headers = [
      "Motorista",
      "Matrícula",
      "Empresa",
      "Data",
      "Horas Totais",
      "Horas 75%",
      "Horas 100%",
      "Observação",
      "Lançado Por",
    ];

    const rows = filteredEntries.map((entry) => {
      const brutoDiaEmMinutos = Math.round((Number(entry.hours) || 0) * 60);
      const limite2Horas = 120;
      let min75 =
        brutoDiaEmMinutos <= limite2Horas ? brutoDiaEmMinutos : limite2Horas;
      let min100 =
        brutoDiaEmMinutos > limite2Horas ? brutoDiaEmMinutos - limite2Horas : 0;

      const formattedDate =
        entry.date && entry.date.includes("-")
          ? entry.date.split("-").reverse().join("/")
          : entry.date;

      return [
        `"${entry.driverName.replace(/"/g, '""')}"`,
        `"${entry.driverMatricula}"`,
        `"${entry.empresa}"`,
        `"${formattedDate}"`,
        `"${formatarParaRelogio(Number(entry.hours))}"`,
        `"${formatarParaRelogio(min75 / 60)}"`,
        `"${formatarParaRelogio(min100 / 60)}"`,
        `"${(entry.note || "").replace(/"/g, '""')}"`,
        `"${entry.createdByName || "Sistema"}"`,
      ].join(";");
    });

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `relatorio_horas_extras_${userEmpresa}_${selectedMonth}.csv`,
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    window.print();
  };

  if (loadingUser || loadingDrivers || loadingEntries) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6 bg-slate-50 min-h-screen relative print:bg-white print:p-0">
      {/* CABEÇALHO */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5 print:border-b-2 print:border-black">
        <div>
          <span className="text-sm font-medium text-slate-500 uppercase tracking-wider print:text-black">
            Painel de Auditoria - {userEmpresa?.toUpperCase()}
          </span>
          <h1 className="text-2xl font-bold text-slate-800 mt-1 print:text-black">
            Relatório de Horas Extras
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 print:hidden">
          <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-64">
            <Search className="h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar motorista, matrícula ou obs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border-none outline-none text-sm text-slate-700 bg-transparent"
            />
          </div>

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm w-full sm:w-auto">
            <Calendar className="h-4 w-4 text-slate-400" />
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="border-none text-slate-700 font-medium cursor-pointer outline-none text-sm"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={handleExportCSV}
              disabled={filteredEntries.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              <span>CSV</span>
            </button>

            <button
              onClick={handlePrint}
              disabled={filteredEntries.length === 0}
              className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white text-sm font-semibold px-3.5 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir/PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* CARDS INDICADORES */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 print:grid-cols-3">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between print:border-black">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 print:text-black">
              Total Geral da Empresa
            </p>
            <p className="text-3xl font-extrabold text-blue-600 print:text-black">
              {fechamentoGeralEmpresa.totalGeralStr} hrs
            </p>
            <div className="text-[11px] text-slate-400 flex gap-2 mt-1 print:text-black">
              <span>
                75%: <strong>{fechamentoGeralEmpresa.total75Str}</strong>
              </span>
              <span>
                100%: <strong>{fechamentoGeralEmpresa.total100Str}</strong>
              </span>
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl print:hidden">
            <Clock className="h-6 w-6 text-blue-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between print:border-black">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 print:text-black">
              Total de Registros
            </p>
            <p className="text-3xl font-extrabold text-slate-800 print:text-black">
              {filteredEntries.length}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl print:hidden">
            <FileText className="h-6 w-6 text-slate-600" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between print:border-black">
          <div className="space-y-1">
            <p className="text-sm font-medium text-slate-500 print:text-black">
              Motoristas Visíveis
            </p>
            <p className="text-3xl font-extrabold text-slate-800 print:text-black">
              {drivers.length}
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl print:hidden">
            <User className="h-6 w-6 text-slate-600" />
          </div>
        </div>
      </div>

      {/* TABELA DE RELATÓRIO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-black print:shadow-none">
        {filteredEntries.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            <Calendar className="h-12 w-12 mx-auto text-slate-300 mb-3" />
            <p className="font-medium text-base">
              Nenhum lançamento para o período
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase tracking-wider print:bg-slate-200 print:text-black">
                  <th className="p-4">Motorista</th>
                  <th className="p-4">Data</th>
                  <th className="p-4">Horas Extras</th>
                  <th className="p-4">Horário / Justificativa</th>
                  <th className="p-4">Lançado por</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm text-slate-700 print:divide-slate-300">
                {filteredEntries.map((entry) => {
                  const formattedDate =
                    entry.date && entry.date.includes("-")
                      ? entry.date.split("-").reverse().join("/")
                      : entry.date;

                  return (
                    <tr
                      key={entry.id}
                      onClick={() =>
                        setSelectedDriverForModal({
                          id: entry.driverId,
                          name: entry.driverName,
                          matricula: entry.driverMatricula,
                          empresa: entry.empresa,
                        })
                      }
                      className="hover:bg-blue-50/40 transition-colors cursor-pointer print:hover:bg-transparent"
                    >
                      <td className="p-4">
                        <div className="font-semibold text-slate-900 text-blue-600 hover:underline print:text-black print:no-underline">
                          {entry.driverName}
                        </div>
                        <div className="text-xs text-slate-400 flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 print:text-slate-600">
                          {entry.driverMatricula && (
                            <span className="flex items-center gap-0.5 font-medium text-slate-500 print:text-black">
                              <Hash className="h-3 w-3 print:hidden" />{" "}
                              Matrícula: {entry.driverMatricula}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5">
                            <MapPin className="h-3 w-3 print:hidden" />{" "}
                            {entry.empresa}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-slate-600 font-medium print:text-black">
                        {formattedDate}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 print:border-black print:text-black print:bg-transparent">
                          {formatarParaRelogio(Number(entry.hours))} hrs
                        </span>
                      </td>
                      <td className="p-4">
                        {entry.note ? (
                          <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 print:bg-transparent print:border-none print:p-0 print:text-black">
                            {entry.note}
                          </span>
                        ) : (
                          <span className="text-slate-300 italic text-xs print:text-slate-500">
                            Sem observações
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="text-xs">
                          <p className="font-medium text-slate-700 print:text-black">
                            {entry.createdByName || "Sistema"}
                          </p>
                          <p className="text-slate-400 text-[10px] print:text-slate-600">
                            {entry.createdByEmail}
                          </p>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL DETALHES DO MOTORISTA */}
      {selectedDriverForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200 print:hidden">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden max-h-[85vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {selectedDriverForModal.name}
                </h2>
                <div className="text-xs font-semibold text-slate-500 flex items-center gap-3 mt-1 uppercase tracking-wider">
                  {selectedDriverForModal.matricula && (
                    <span className="flex items-center gap-1 font-medium text-slate-600 bg-slate-200/60 px-1.5 py-0.5 rounded">
                      <Hash className="h-3 w-3 text-slate-500" /> Matrícula:{" "}
                      {selectedDriverForModal.matricula}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-blue-600" /> Empresa:{" "}
                    {selectedDriverForModal.empresa}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedDriverForModal(null)}
                className="p-2 rounded-xl hover:bg-slate-200/60 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Histórico de Lançamentos ({selectedMonth})
                </h3>
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium">
                  {modalDriverEntries.length}{" "}
                  {modalDriverEntries.length === 1 ? "registro" : "registros"}
                </span>
              </div>

              {modalDriverEntries.length === 0 ? (
                <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  <Calendar className="h-8 w-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm font-medium">
                    Nenhum lançamento neste mês.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {modalDriverEntries.map((entry) => {
                    const formattedDate =
                      entry.date && entry.date.includes("-")
                        ? entry.date.split("-").reverse().join("/")
                        : entry.date;

                    const brutoDiaEmMinutos = Math.round(
                      (Number(entry.hours) || 0) * 60,
                    );
                    const limite2HorasEmMinutos = 120;

                    let min75 = 0;
                    let min100 = 0;

                    if (brutoDiaEmMinutos <= limite2HorasEmMinutos) {
                      min75 = brutoDiaEmMinutos;
                    } else {
                      min75 = limite2HorasEmMinutos;
                      min100 = brutoDiaEmMinutos - limite2HorasEmMinutos;
                    }

                    const de75Str = formatarParaRelogio(min75 / 60);
                    const de100Str = formatarParaRelogio(min100 / 60);

                    return (
                      <div
                        key={entry.id}
                        className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:border-slate-200 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <span className="text-sm font-bold text-slate-800">
                            {formattedDate}
                          </span>

                          <div className="flex items-center gap-1.5 ml-auto">
                            <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600 border border-slate-200">
                              75%: {de75Str}
                            </span>
                            {min100 > 0 && (
                              <span className="px-1.5 py-0.5 text-[10px] font-semibold rounded bg-amber-50 text-amber-700 border border-amber-200">
                                100%: {de100Str}
                              </span>
                            )}
                            <span className="px-2 py-0.5 rounded-lg font-black text-xs bg-emerald-50 text-emerald-700 border border-emerald-100">
                              {formatarParaRelogio(Number(entry.hours))} hrs
                            </span>
                          </div>
                        </div>

                        {entry.note ? (
                          <p className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-600 leading-relaxed">
                            <strong className="text-slate-700">Obs:</strong>{" "}
                            {entry.note}
                          </p>
                        ) : (
                          <p className="text-[11px] text-slate-300 italic">
                            Sem observações informadas
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
              <div className="text-xs text-slate-500 flex gap-3">
                <span>
                  Total 75%:{" "}
                  <strong className="text-slate-700 font-bold">
                    {fechamentoModalDriver.total75Str}
                  </strong>
                </span>
                <span>
                  Total 100%:{" "}
                  <strong className="text-slate-700 font-bold">
                    {fechamentoModalDriver.total100Str}
                  </strong>
                </span>
              </div>
              <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-none border-slate-200/60 pt-2 sm:pt-0">
                <span className="text-sm font-medium text-slate-600">
                  Total Acumulado:
                </span>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xl font-black text-blue-600">
                    {fechamentoModalDriver.totalGeralStr} hrs
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}