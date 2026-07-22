import { useEffect, useState, useCallback } from "react";
import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useAllEntries(drivers, selectedMonth) {
  const [entriesByDriver, setEntriesByDriver] = useState({});
  const [loading, setLoading] = useState(true);

  // Mapeia os IDs válidos dos motoristas visíveis para filtrar o resultado em memória
  const driverIdsSet = new Set((drivers || []).map((d) => d.id));

  const fetchEntries = useCallback(async () => {
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({});
      setLoading(false);
      return;
    }

    if (!selectedMonth) return;

    setLoading(true);

    try {
      // 1 ÚNICA REQUISIÇÃO para buscar todos os lançamentos do mês em todas as subcoleções "entries"
      const entriesQuery = query(
        collectionGroup(db, "entries"),
        where("date", ">=", `${selectedMonth}-01`),
        where("date", "<=", `${selectedMonth}-31`),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(entriesQuery);

      const result = {};

      // Inicializa o objeto para todos os motoristas
      drivers.forEach((driver) => {
        result[driver.id] = [];
      });

      // Agrupa os resultados pelo ID do motorista (extraído do caminho do documento)
      snapshot.docs.forEach((docSnap) => {
        // Exemplo do path do documento: "drivers/ID_DO_MOTORISTA/entries/ID_DO_LANCAMENTO"
        const pathSegments = docSnap.ref.path.split("/");
        const driverId = pathSegments[1]; // Pega o ID do motorista pai

        // Apenas inclui se o motorista pertencer à lista ativa da empresa
        if (driverIdsSet.has(driverId)) {
          if (!result[driverId]) {
            result[driverId] = [];
          }
          result[driverId].push({
            id: docSnap.id,
            ...docSnap.data(),
          });
        }
      });

      setEntriesByDriver(result);
    } catch (error) {
      console.error("Erro ao buscar entries com collectionGroup:", error);
    } finally {
      setLoading(false);
    }
  }, [drivers, selectedMonth]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entriesByDriver,
    loading,
    refetch: fetchEntries,
  };
}