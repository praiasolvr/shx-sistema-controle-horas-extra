import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../firebase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Busca os dados do perfil na coleção 'users'
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            const userData = docSnap.data()

            // ⛔ BLOQUEIO: Se o usuário estiver inativo, encerra a sessão antes de montar o estado
            if (userData.active === false) {
              await signOut(auth)
              setUser(null)
              setProfile(null)
              setError('Esta conta está desativada. Entre em contato com o administrador.')
              setLoading(false)
              return
            }

            setUser(firebaseUser)
            setProfile(userData)
          } else {
            setUser(firebaseUser)
            setProfile({ role: 'supervisor', empresa: 'Não Associada', active: true })
          }
        } catch (err) {
          console.error('Erro ao verificar perfil do usuário:', err)
          setUser(null)
          setProfile(null)
        }
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    
    return unsubscribe
  }, [])

  // FUNÇÃO DE LOGIN
  async function login(email, password) {
    setError(null)
    try {
      // 1. Tenta autenticar no Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      
      // 2. Consulta imediatamente a coleção 'users' no Firestore
      const docRef = doc(db, 'users', userCredential.user.uid)
      const docSnap = await getDoc(docRef)

      // 3. Se a conta existir e estiver desativada (active === false)
      if (docSnap.exists() && docSnap.data().active === false) {
        // Desconecta instantaneamente do Firebase Auth
        await signOut(auth)
        setUser(null)
        setProfile(null)
        
        // Define a mensagem de erro específica para exibir na Tela de Login
        setError('Esta conta está desativada. Entre em contato com o administrador.')
        return false
      }

      return true
    } catch (err) {
      setError(traduzErro(err.code))
      return false
    }
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, setError, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}

function traduzErro(code) {
  const mapa = {
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/too-many-requests': 'Muitas tentativas. Aguarde um momento e tente novamente.'
  }
  return mapa[code] || 'Não foi possível entrar. Tente novamente.'
}