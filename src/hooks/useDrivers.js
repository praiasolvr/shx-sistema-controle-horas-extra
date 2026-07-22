import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
  getDoc,
  getDocFromCache,
  writeBatch,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import { useVisibilityListener } from "./useVisibilityListener";

const driversRef = collection(db, "drivers");

const IMPORT_CHUNK_SIZE = 400;

export function useDrivers() {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [userRole, setUserRole] = useState(null);
  const [userEmpresa, setUserEmpresa] = useState("");
  const [loadingUser, setLoadingUser] = useState(true);

  const isVisible = useVisibilityListener();

  // ===============================
  // Busca usuário logado
  // ===============================
  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const user = auth.currentUser;

      if (!user) {
        if (mounted) {
          setLoadingUser(false);
        }
        return;
      }

      try {
        const userRef = doc(db, "users", user.uid);

        let snap;

        try {
          snap = await getDocFromCache(userRef);
        } catch {
          snap = await getDoc(userRef);
        }

        if (snap.exists() && mounted) {
          const data = snap.data();

          setUserRole(data.role || "colaborador");
          setUserEmpresa(data.empresa || "");
        }
      } catch (err) {
        console.error("Erro ao carregar usuário:", err);

        if (mounted) {
          setError("Erro ao carregar permissões.");
        }
      } finally {
        if (mounted) {
          setLoadingUser(false);
        }
      }
    }

    loadUser();

    return () => {
      mounted = false;
    };
  }, []);

  // ===============================
  // Listener dos motoristas
  // ===============================
  useEffect(() => {
    if (loadingUser || !isVisible || !auth.currentUser) {
      return;
    }

    let q = query(driversRef);

    if (userRole !== "supervisor" && userEmpresa) {
      q = query(driversRef, where("empresa", "==", userEmpresa));
    }

    const unsubscribe = onSnapshot(
      q,

      (snapshot) => {
        const list = snapshot.docs.map((item) => ({
          id: item.id,
          ...item.data(),
        }));

        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

        setDrivers(list);
        setLoading(false);
      },

      (err) => {
        console.error("Erro ao buscar motoristas:", err);

        setError(err.message);
        setLoading(false);
      },
    );

    return () => {
      unsubscribe();
    };
  }, [userRole, userEmpresa, loadingUser, isVisible]);

  // ===============================
  // Adicionar motorista
  // ===============================
  async function addDriver(data) {
    const empresaFinal =
      userRole !== "supervisor" && userEmpresa ? userEmpresa : data.empresa;

    return addDoc(driversRef, {
      name: data.name.trim(),

      matricula: data.matricula?.trim() || "",

      empresa: empresaFinal || "",

      role: data.role?.trim() || "",

      phone: data.phone?.trim() || "",

      maxHours: Number(data.maxHours) || 0,

      createdAt: serverTimestamp(),
    });
  }

  // ===============================
  // Atualizar motorista
  // ===============================
  async function updateDriver(id, data) {
    const ref = doc(db, "drivers", id);

    const payload = {
      ...data,
    };

    if (payload.maxHours !== undefined) {
      payload.maxHours = Number(payload.maxHours) || 0;
    }

    if (userRole !== "supervisor") {
      delete payload.empresa;
    }

    return updateDoc(ref, payload);
  }

  // ===============================
  // Excluir motorista
  // ===============================
  async function deleteDriver(id) {
    const entriesRef = collection(db, "drivers", id, "entries");

    const snap = await getDocs(entriesRef);

    if (!snap.empty) {
      const batch = writeBatch(db);

      snap.docs.forEach((entry) => batch.delete(entry.ref));

      await batch.commit();
    }

    return deleteDoc(doc(db, "drivers", id));
  }

  // ===============================
  // Importação em massa
  // ===============================
  async function bulkImportDrivers(rows) {
    const validRows = rows.filter((r) => r.name && r.name.trim());

    for (let i = 0; i < validRows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + IMPORT_CHUNK_SIZE);

      const batch = writeBatch(db);

      chunk.forEach((row) => {
        const ref = doc(driversRef);

        const empresaFinal =
          userRole !== "supervisor" && userEmpresa ? userEmpresa : row.empresa;

        batch.set(ref, {
          name: row.name.trim(),

          matricula: row.matricula?.trim() || "",

          empresa: empresaFinal?.trim() || "",

          role: row.role?.trim() || "",

          phone: row.phone?.trim() || "",

          maxHours: Number(row.maxHours) || 0,

          createdAt: serverTimestamp(),
        });
      });

      await batch.commit();
    }

    return validRows.length;
  }

  return {
    drivers,

    loading: loading || loadingUser,

    error,

    addDriver,

    updateDriver,

    deleteDriver,

    bulkImportDrivers,
  };
}
