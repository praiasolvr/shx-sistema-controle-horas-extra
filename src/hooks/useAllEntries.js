import { useEffect, useState, useCallback } from "react";
import { collectionGroup, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../firebase";

export function useAllEntries(drivers, selectedMonth) {
  const [entriesByDriver, setEntriesByDriver] = useState({});
  const [loading, setLoading] = useState(true);

  // Se nenhum mês for informado, assume o mês atual no formato "YYYY-MM"
  const targetMonth = selectedMonth || new Date().toISOString().slice(0, 7);

  const fetchEntries = useCallback(async () => {
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({});
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const driverIdsSet = new Set(drivers.map((d) => d.id));

      // Calcula o último dia do mês para não travar em meses com 28, 30 ou 31 dias
      const [year, month] = targetMonth.split("-").map(Number);
      const lastDayNumber = new Date(year, month, 0).getDate();
      const startDate = `${targetMonth}-01`;
      const endDate = `${targetMonth}-${String(lastDayNumber).padStart(2, "0")}`;

      // 1 ÚNICA REQUISIÇÃO com collectionGroup
      const entriesQuery = query(
        collectionGroup(db, "entries"),
        where("date", ">=", startDate),
        where("date", "<=", endDate),
        orderBy("date", "desc")
      );

      const snapshot = await getDocs(entriesQuery);

      const result = {};

      // Inicializa o array de cada motorista
      drivers.forEach((driver) => {
        result[driver.id] = [];
      });

      // Agrupa os lançamentos pelo ID do motorista pai
      snapshot.docs.forEach((docSnap) => {
        const pathSegments = docSnap.ref.path.split("/");
        const driverId = pathSegments[1];

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
  }, [drivers, targetMonth]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entriesByDriver,
    loading,
    refetch: fetchEntries,
  };
}