import { useEffect, useState } from 'react'
import {
  collection,
  query,
  orderBy,
  limit,
  getDocs
} from 'firebase/firestore'
import { db } from '../firebase'

export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadLastEntries() {
      if (!drivers || drivers.length === 0) {
        setEntriesByDriver({})
        setLoading(false)
        return
      }

      setLoading(true)

      const result = {}

      await Promise.all(
        drivers.map(async (driver) => {
          const ref = collection(
            db,
            'drivers',
            driver.id,
            'entries'
          )

          const q = query(
            ref,
            orderBy('date', 'desc'),
            limit(1)
          )

          const snapshot = await getDocs(q)

          result[driver.id] = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data()
          }))
        })
      )

      setEntriesByDriver(result)
      setLoading(false)
    }

    loadLastEntries()
  }, [drivers])

  return {
    entriesByDriver,
    loading
  }
}