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
  where,
  getDocs,
  getDoc,
  getDocFromCache,
  writeBatch
} from 'firebase/firestore'
import { db, auth } from '../firebase'
import { useVisibilityListener } from './useVisibilityListener' // 1. Importa o detector de aba ativa

const driversRef = collection(db, 'drivers')
const IMPORT_CHUNK_SIZE = 400

export function useDrivers() {
  const [drivers, setDrivers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [userRole, setUserRole] = useState(null)
  const [userEmpresa, setUserEmpresa] = useState('')
  const [loadingUser, setLoadingUser] = useState(true)

  // 2. Monitora se a aba do navegador está visível ou em segundo plano
  const isVisible = useVisibilityListener()

  // 1. Busca perfil do usuário (Tenta no Cache primeiro para Economizar 1 Leitura)
  useEffect(() => {
    let active = true

    async function fetchUserRole() {
      const currentUser = auth.currentUser
      if (currentUser) {
        try {
          const docRef = doc(db, 'users', currentUser.uid)
          let docSnap

          // Tenta ler primeiro do cache offline (custo zero no servidor)
          try {
            docSnap = await getDocFromCache(docRef)
          } catch (e) {
            // Se não estiver em cache, faz o fetch normal no servidor
            docSnap = await getDoc(docRef)
          }

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

  // 2. Escuta os motoristas (Cancelado automaticamente se a aba ficar oculta)
  useEffect(() => {
    // Se estiver carregando o usuário ou a aba estiver em segundo plano, para o listener
    if (loadingUser || !isVisible) return

    let q

    if (userRole !== 'supervisor' && userEmpresa) {
      q = query(
        driversRef, 
        where('empresa', '==', userEmpresa)
      )
    } else {
      q = query(driversRef)
    }

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loadedDrivers = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        
        loadedDrivers.sort((a, b) => (a.name || '').localeCompare(b.name || ''))

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
  }, [userRole, userEmpresa, loadingUser, isVisible])

  async function addDriver({ name, matricula, empresa, role, phone, maxHours }) {
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
    
    if (userRole !== 'supervisor') {
      delete payload.empresa
    }

    return updateDoc(ref, payload)
  }

  async function deleteDriver(id) {
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

  async function bulkImportDrivers(rows) {
    const validRows = rows.filter((r) => r.name && r.name.trim())
    for (let i = 0; i < validRows.length; i += IMPORT_CHUNK_SIZE) {
      const chunk = validRows.slice(i, i + IMPORT_CHUNK_SIZE)
      const batch = writeBatch(db)
      chunk.forEach((row) => {
        const ref = doc(driversRef)
        
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