import { useEffect, useState } from 'react'
import { collection, query, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Se não houver motoristas, não há o que escutar
    if (!drivers || drivers.length === 0) {
      setEntriesByDriver({})
      setLoading(false)
      return
    }

    setLoading(true)
    
    // Lista para guardar a função de "limpeza" de cada escutador ativo
    const unsubscribes = []
    
    // Objeto temporário para unificar as atualizações reais de cada motorista
    const currentEntriesMap = {}

    drivers.forEach((driver) => {
      // Aponta para a subcoleção de lançamentos de cada motorista específico
      const ref = collection(db, 'drivers', driver.id, 'entries')
      
      // Removido o limit(1) para trazer TODOS os lançamentos necessários para o cálculo mensal
      const q = query(ref)

      // Criamos um escutador em tempo real (onSnapshot) para este motorista
      const unsub = onSnapshot(q, (snapshot) => {
        // Mapeia todos os documentos/lançamentos deste motorista
        currentEntriesMap[driver.id] = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))

        // Atualiza o estado do React. Usar a desestruturação {...currentEntriesMap} 
        // força o React a notar a mudança de referência e atualizar a tela na hora!
        setEntriesByDriver({ ...currentEntriesMap })
        setLoading(false)
      }, (error) => {
        console.error(`Erro ao escutar lançamentos do motorista ${driver.id}:`, error)
      })

      // Guarda a função de cancelamento deste escutador
      unsubscribes.push(unsub)
    })

    // Função de limpeza do useEffect: desliga todos os escutadores 
    // se o usuário sair do Dashboard, evitando vazamento de memória.
    return () => {
      unsubscribes.forEach((unsub) => unsub())
    }
  }, [drivers])

  return {
    entriesByDriver,
    loading
  }
}