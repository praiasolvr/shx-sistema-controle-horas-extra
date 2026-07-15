import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut
} from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore' // Importamos para ler o documento do usuário
import { auth, db } from '../firebase' // Importe o 'db' do seu arquivo de configuração do Firebase

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null) // Novo estado para guardar o papel (role) e empresa
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        
        try {
          // Busca os dados adicionais (role/empresa) na coleção 'users'
          const docRef = doc(db, 'users', firebaseUser.uid)
          const docSnap = await getDoc(docRef)
          
          if (docSnap.exists()) {
            setProfile(docSnap.data())
          } else {
            // Caso o usuário exista no Auth mas não tenha sido criado no Firestore ainda
            setProfile({ role: 'supervisor', empresa: 'Não Associada' })
          }
        } catch (err) {
          console.error('Erro ao buscar perfil do usuário no Firestore:', err)
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

  async function login(email, password) {
    setError(null)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      return true
    } catch (err) {
      setError(traduzErro(err.code))
      return false
    }
  }

  async function logout() {
    await signOut(auth)
  }

  // Adicionamos 'profile' no value do Provider para que qualquer componente do app tenha acesso
  return (
    <AuthContext.Provider value={{ user, profile, loading, error, login, logout }}>
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