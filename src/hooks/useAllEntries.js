import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query } from 'firebase/firestore'
import { db } from '../firebase'

export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)

  const driversIdsKey = (drivers || []).map(d => d.id).sort().join(',')

  const fetchEntries = useCallback(async () => {
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({})
      setLoading(false)
      return
    }

    setLoading(true)
    try {
      const results = await Promise.all(
        drivers.map(async (driver) => {
          const ref = collection(db, 'drivers', driver.id, 'entries')
          const snapshot = await getDocs(query(ref))
          const entries = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }))
          return { driverId: driver.id, entries }
        })
      )

      const newEntriesMap = {}
      results.forEach(({ driverId, entries }) => {
        newEntriesMap[driverId] = entries
      })

      setEntriesByDriver(newEntriesMap)
    } catch (error) {
      console.error("Erro ao buscar lançamentos via getDocs:", error)
    } finally {
      setLoading(false)
    }
  }, [driversIdsKey])

  useEffect(() => {
    fetchEntries()
  }, [fetchEntries])

  return {
    entriesByDriver,
    loading,
    refetch: fetchEntries // Permite recarregar manualmente via botão se necessário
  }
}