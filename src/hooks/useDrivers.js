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
  where,
  getDocs,
  getDoc,
  writeBatch
} from 'firebase/firestore'
import { db, auth } from '../firebase'

const driversRef = collection(db, 'drivers')
const IMPORT_CHUNK_SIZE = 400 // limite seguro abaixo do máximo de 500 operações por batch

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Estados locais para controlar permissões do usuário logado no hook
  const [userRole, setUserRole] = useState(null)
  const [userEmpresa, setUserEmpresa] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  // 1. Busca perfil do usuário logado para saber as permissões
  useEffect(() => {
    let active = true
    async function fetchUserRole() {
      const currentUser = auth.currentUser
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid)
          const docSnap = await getDoc(docRef)
          if (docSnap.exists() && active) {
            const userData = docSnap.data()
            setUserRole(userData.role || 'colaborador')
            setUserEmpresa(userData.empresa || '')
          }
        } catch (err) {
          console.error('Erro ao ler permissões no useDrivers:', err)
          if (active) setError('Erro ao ler permissões de usuário.')
        } finally {
          if (active) setLoadingUser(false)
        }
      } else {
        if (active) setLoadingUser(false)
      }
    }
    fetchUserRole()

    return () => {
      active = false
    }
  }, [])

  // 2. Escuta os motoristas com base no papel e empresa do usuário logado
  // 2. Escuta os motoristas com base no papel e empresa do usuário logado
  useEffect(() => {
    if (loadingUser) return

    let q

    // Se NÃO for supervisor e pertencer a uma empresa específica, aplica APENAS o filtro no Firestore (sem orderBy)
    if (userRole !== 'supervisor' && userEmpresa) {
      q = query(
        driversRef, 
        where('empresa', '==', userEmpresa)
      )
    } else {
      // Supervisores visualizam todos os motoristas
      q = query(driversRef)
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedDrivers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        
        // Ordena por nome diretamente no JavaScript (evita necessidade de índices compostos no Firebase)
        loadedDrivers.sort((a, b) => a.name.localeCompare(b.name))

        setDrivers(loadedDrivers)
        setLoading(false)
      },
      (err) => {
        console.error("Erro na busca de motoristas:", err)
        setError(err.message)
        setLoading(false)
      }
    )

    return () => unsubscribe()
  }, [userRole, userEmpresa, loadingUser])

  async function addDriver({ name, matricula, empresa, role, phone, maxHours }) {
    // Se o usuário não for supervisor, força o cadastro do motorista sob a mesma empresa do usuário logado
    const empresaFinal = userRole !== 'supervisor' && userEmpresa ? userEmpresa : empresa

    return addDoc(driversRef, {
      name: name.trim(),
      matricula: matricula?.trim() || '',
      empresa: empresaFinal || '',
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
    
    // Proteção adicional: colaboradores comuns não podem alterar a empresa de um motorista
    if (userRole !== 'supervisor') {
      delete payload.empresa
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
        
        // Se não for supervisor, força o cadastro do lote inteiro na sua empresa
        const empresaFinal = userRole !== 'supervisor' && userEmpresa ? userEmpresa : row.empresa

        batch.set(ref, {
          name: row.name.trim(),
          matricula: row.matricula?.trim() || '',
          empresa: empresaFinal?.trim() || '',
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

  return { 
    drivers, 
    loading: loading || loadingUser, 
    error, 
    addDriver, 
    updateDriver, 
    deleteDriver, 
    bulkImportDrivers 
  }
}