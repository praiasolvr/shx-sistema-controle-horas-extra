import { useEffect, useState } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)

  // Criamos uma string estável com todos os IDs juntos (Ex: "id1,id2,id3")
  const driversIdsKey = (drivers || []).map(d => d.id).sort().join(',')

  useEffect(() => {
    // Se não há motoristas para buscar, limpa o estado e para o loading
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({})
      setLoading(false)
      return
    }

    setLoading(true)
    const unsubscribes = []
    
    // Conjunto para rastrear quais motoristas já tiveram seu primeiro carregamento concluído
    const loadedDriversSet = new Set()

    drivers.forEach((driver) => {
      const ref = collection(db, 'drivers', driver.id, 'entries')
      const q = query(ref)

      const unsub = onSnapshot(
        q, 
        (snapshot) => {
          const driverEntries = snapshot.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          }))

          // Atualiza o estado de forma funcional e segura (preservando os dados antigos)
          setEntriesByDriver((prev) => ({
            ...prev,
            [driver.id]: driverEntries
          }))

          // Registra que este motorista carregou seus dados pela primeira vez
          loadedDriversSet.add(driver.id)

          // Só removemos o loading geral se TODOS os motoristas da lista atual carregaram
          if (loadedDriversSet.size >= drivers.length) {
            setLoading(false)
          }
        }, 
        (error) => {
          console.error(`Erro ao escutar lançamentos do motorista ${driver.id}:`, error)
          
          // Mesmo se der erro em um motorista específico, computa para não travar o loading geral
          loadedDriversSet.add(driver.id)
          if (loadedDriversSet.size >= drivers.length) {
            setLoading(false)
          }
        }
      )

      unsubscribes.push(unsub)
    })

    // Limpeza crucial ao desmontar ou quando a lista de motoristas mudar
    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
    
  }, [driversIdsKey]) // Roda apenas quando a lista real de IDs mudar

  return {
    entriesByDriver,
    loading
  }
}