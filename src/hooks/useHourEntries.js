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
import { useAuth } from '../context/AuthContext'
import { useVisibilityListener } from './useVisibilityListener' // 1. Importa o detector de aba ativa

export function useHourEntries(driverId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, profile } = useAuth()
  
  // 2. Escuta se a aba do navegador está visível ou em segundo plano
  const isVisible = useVisibilityListener()

  useEffect(() => {
    // Se não houver driverId ou a aba estiver em segundo plano, cancela o listener!
    if (!driverId || !isVisible) {
      if (!driverId) {
        setEntries([])
        setLoading(false)
      }
      return
    }

    setLoading(true)

    const ref = collection(db, 'drivers', driverId, 'entries')
    const q = query(ref, orderBy('date', 'desc'))

    // 3. O onSnapshot só se mantém ativo enquanto a aba estiver visível
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

    // Desconecta o Firebase ao desmontar o componente ou ao ocultar a aba
    return () => unsubscribe()
  }, [driverId, isVisible])

  async function addEntry({ date, hours, note }) {
    if (!driverId) return

    const ref = collection(db, 'drivers', driverId, 'entries')

    return addDoc(ref, {
      date,
      hours: Number(hours) || 0,
      note: note?.trim() || '',
      createdAt: serverTimestamp(),
      createdById: user?.uid || 'sistema',
      createdByEmail: user?.email || 'sistema',
      createdByName: profile?.name || 'sistema'
    })
  }

  async function deleteEntry(entryId) {
    if (!driverId) return

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