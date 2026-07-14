import { useEffect, useState } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)

  // Criamos uma string com todos os IDs juntos (Ex: "id1,id2,id3")
  // Essa string só vai mudar se um motorista for deletado ou adicionado de verdade!
  const driversIdsKey = (drivers || []).map(d => d.id).join(',')

  useEffect(() => {
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({})
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribes = []
    const currentEntriesMap = {}

    // Criamos uma função para gerenciar o estado sem causar concorrência
    let totalLoaded = 0

    drivers.forEach((driver) => {
      const ref = collection(db, 'drivers', driver.id, 'entries')
      const q = query(ref)

      const unsub = onSnapshot(q, (snapshot) => {
        currentEntriesMap[driver.id] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        // Controla o loading inicial de forma segura
        totalLoaded++
        if (totalLoaded >= drivers.length) {
          setLoading(false)
        }

        // Atualiza o estado de forma estável
        setEntriesByDriver({ ...currentEntriesMap })
      }, (error) => {
        console.error(`Erro ao escutar lançamentos do motorista ${driver.id}:`, error)
      })

      unsubscribes.push(unsub)
    })

    // Limpeza crucial: desliga todos ao sair da tela ou mudar os IDs
    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
    
  }, [driversIdsKey]) // USAMOS A STRING DE IDS AQUI! Adeus loops infinitos.

  return {
    entriesByDriver,
    loading
  }
}