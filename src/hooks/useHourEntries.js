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

export function useHourEntries(driverId) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!driverId) {
      setEntries([])
      setLoading(false)
      return
    }

    const ref = collection(
      db,
      'drivers',
      driverId,
      'entries'
    )

    const q = query(
      ref,
      orderBy('date', 'desc')
    )

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
    const ref = collection(
      db,
      'drivers',
      driverId,
      'entries'
    )

    return addDoc(ref, {
      date,
      hours: Number(hours) || 0,
      note: note?.trim() || '',
      createdAt: serverTimestamp()
    })
  }

  async function deleteEntry(entryId) {
    const ref = doc(
      db,
      'drivers',
      driverId,
      'entries',
      entryId
    )

    return deleteDoc(ref)
  }

  return {
    entries,
    loading,
    addEntry,
    deleteEntry
  }
}