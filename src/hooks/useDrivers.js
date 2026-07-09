import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy,
  getDocs,
  writeBatch
} from 'firebase/firestore'
import { db } from '../firebase'

const driversRef = collection(db, 'drivers')
const IMPORT_CHUNK_SIZE = 400 // limite seguro abaixo do máximo de 500 operações por batch

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const q = query(driversRef, orderBy('name'))
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setDrivers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })))
        setLoading(false)
      },
      (err) => {
        setError(err.message)
        setLoading(false)
      }
    )
    return unsubscribe
  }, [])

  async function addDriver({ name, matricula, empresa, role, phone, maxHours }) {
    return addDoc(driversRef, {
      name: name.trim(),
      matricula: matricula?.trim() || '',
      empresa: empresa || '',
      role: role?.trim() || '',
      phone: phone?.trim() || '',
      maxHours: Number(maxHours) || 0,
      createdAt: serverTimestamp()
    })
  }

  async function updateDriver(id, data) {
    const ref = doc(db, 'drivers', id)
    const payload = { ...data }
    if (payload.maxHours !== undefined) {
      payload.maxHours = Number(payload.maxHours) || 0
    }
    return updateDoc(ref, payload)
  }

  async function deleteDriver(id) {
    // Remove primeiro os lançamentos de horas (subcoleção) e depois o motorista,
    // já que o Firestore não faz exclusão em cascata automaticamente.
    const entriesRef = collection(db, 'drivers', id, 'entries')
    const entriesSnap = await getDocs(entriesRef)
    if (!entriesSnap.empty) {
      const batch = writeBatch(db)
      entriesSnap.docs.forEach((entryDoc) => batch.delete(entryDoc.ref))
      await batch.commit()
    }
    const ref = doc(db, 'drivers', id)
    return deleteDoc(ref)
  }

  // Importação em massa a partir de uma lista já normalizada (vinda do CSV/Excel).
  // Cada item: { name, matricula, empresa, role, phone, maxHours }
  async function bulkImportDrivers(rows) {
    const validRows = rows.filter((r) => r.name && r.name.trim())
    for (let i = 0; i < validRows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + IMPORT_CHUNK_SIZE)
      const batch = writeBatch(db)
      chunk.forEach((row) => {
        const ref = doc(driversRef)
        batch.set(ref, {
          name: row.name.trim(),
          matricula: row.matricula?.trim() || '',
          empresa: row.empresa?.trim() || '',
          role: row.role?.trim() || '',
          phone: row.phone?.trim() || '',
          maxHours: Number(row.maxHours) || 0,
          createdAt: serverTimestamp()
        })
      })
      await batch.commit()
    }
    return validRows.length
  }

  return { drivers, loading, error, addDriver, updateDriver, deleteDriver, bulkImportDrivers }
}
