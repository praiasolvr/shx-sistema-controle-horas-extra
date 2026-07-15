import { useEffect, useState } from 'react'
import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore'
import { db } from '../firebase'
import { useAuth } from '../context/AuthContext' // 1. Importe o hook de autenticação

export function useHourEntries(driverId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth() // 2. Obtenha o usuário logado

  useEffect(() => {
    if (!driverId) {
      setEntries([])
      setLoading(false)
      return
    }

    const ref = collection(db, 'drivers', driverId, 'entries')
    const q = query(ref, orderBy('date', 'desc'))

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setEntries(
          snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }))
        )
        setLoading(false)
      },
      (error) => {
        console.error('Erro ao carregar entries:', error)
        setLoading(false)
      }
    )

    return unsubscribe
  }, [driverId])

  async function addEntry({ date, hours, note }) {
    const ref = collection(db, 'drivers', driverId, 'entries')

    // 3. Adicione os campos de auditoria ao objeto
    return addDoc(ref, {
      date,
      hours: Number(hours) || 0,
      note: note?.trim() || '',
      createdAt: serverTimestamp(),
      createdById: user?.uid || 'sistema', // Registra o ID do usuário
      createdByEmail: user?.email || 'sistema', // Registra o ID do usuário
      createdByName: profile?.name || 'sistema' // Registra o e-mail para fácil visualização
    })
  }

  async function deleteEntry(entryId) {
    const ref = doc(db, 'drivers', driverId, 'entries', entryId)
    return deleteDoc(ref)
  }

  return {
    entries,
    loading,
    addEntry,
    deleteEntry
  }
}