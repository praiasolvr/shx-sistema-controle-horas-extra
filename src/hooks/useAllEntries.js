import { useEffect, useRef, useState } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

// Em vez de uma única consulta "collectionGroup" (que depende de um índice
// composto criado manualmente no console do Firebase e, até isso acontecer,
// falha silenciosamente e nunca atualiza), este hook assina em tempo real a
// subcoleção "entries" de CADA motorista individualmente. Isso garante que o
// painel geral atualiza instantaneamente assim que uma hora é lançada,
// editada ou excluída, sem depender de nenhuma configuração extra.
export function useAllEntries(drivers) {
  const [entriesByDriver, setEntriesByDriver] = useState({})
  const [loading, setLoading] = useState(true)
  const unsubsRef = useRef({})

  const ids = drivers.map((d) => d.id)
  const idsKey = [...ids].sort().join(',')

  useEffect(() => {
    const currentIds = new Set(ids)

    // remove assinaturas de motoristas que não existem mais
    Object.keys(unsubsRef.current).forEach((id) => {
      if (!currentIds.has(id)) {
        unsubsRef.current[id]()
        delete unsubsRef.current[id]
        setEntriesByDriver((prev) => {
          if (!(id in prev)) return prev
          const next = { ...prev }
          delete next[id]
          return next
        })
      }
    })

    // cria assinaturas para motoristas novos
    currentIds.forEach((id) => {
      if (unsubsRef.current[id]) return
      const ref = collection(db, 'drivers', id, 'entries')
      unsubsRef.current[id] = onSnapshot(ref, (snapshot) => {
        setEntriesByDriver((prev) => ({
          ...prev,
          [id]: snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        }))
      })
    })

    setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey])

  useEffect(() => {
    return () => {
      Object.values(unsubsRef.current).forEach((unsub) => unsub())
      unsubsRef.current = {}
    }
  }, [])

  return { entriesByDriver, loading }
}
