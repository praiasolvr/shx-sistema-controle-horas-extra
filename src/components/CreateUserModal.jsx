import { useState } from 'react'
import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { getFirestore, doc, setDoc } from 'firebase/firestore'
import { EMPRESAS } from '../utils/constants'

// Pegamos as credenciais do seu próprio ambiente para criar a conexão temporária
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

export default function CreateUserModal({ isOpen, onClose }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState('supervisor') // Valor padrão
  const [empresa, setEmpresa] = useState(EMPRESAS[0] || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Inicializa um app secundário para registrar o usuário sem deslogar o Supervisor atual do app principal
    const tempApp = initializeApp(firebaseConfig, 'tempRegisterApp')
    const tempAuth = getAuth(tempApp)
    const tempDb = getFirestore(tempApp)

    try {
      // 1. Cria a credencial de login no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(tempAuth, email, password)
      const newUser = userCredential.user

      // 2. Cria o documento correspondente na coleção 'users' no Firestore
      await setDoc(doc(tempDb, 'users', newUser.uid), {
        uid: newUser.uid,
        name: name,
        email: email,
        role: role,
        empresa: role === 'lancador' || role === 'rh' ? 'Todas' : empresa,
        createdAt: new Date().toISOString()
      })

      // 3. Desloga a instância temporária imediatamente para limpar o cache
      await signOut(tempAuth)

      setSuccess(true)
      setName('')
      setEmail('')
      setPassword('')
      
      // Fecha o modal após 1.5 segundos em caso de sucesso
      setTimeout(() => {
        onClose()
        setSuccess(false)
      }, 1500)

    } catch (err) {
      console.error("Erro ao criar usuário: ", err)
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso por outro usuário.')
      } else if (err.code === 'auth/weak-password') {
        setError('A senha precisa ter pelo menos 6 caracteres.')
      } else {
        setError('Ocorreu um erro ao tentar criar o usuário. Tente novamente.')
      }
    } finally {
      // Deleta o app temporário para liberar memória
      await tempApp.automaticDataCollectionEnabled && tempApp.delete()
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-card max-w-md w-full overflow-hidden border border-line">
        
        {/* Cabeçalho */}
        <div className="px-6 py-4 border-b border-line flex justify-between items-center bg-cloud">
          <h3 className="font-display text-lg font-semibold text-ink">Criar Novo Usuário</h3>
          <button 
            onClick={onClose} 
            className="text-slate hover:text-ink text-xl font-medium"
            disabled={loading}
          >
            &times;
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleCreateUser} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded-lg text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 bg-green-50 border border-green-200 text-green-600 rounded-lg text-sm font-medium">
              🎉 Usuário criado com sucesso!
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate uppercase mb-1">Nome Completo</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Ex: João da Silva"
              disabled={loading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate uppercase mb-1">E-mail de Acesso</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="exemplo@empresa.com"
              disabled={loading || success}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate uppercase mb-1">Senha Inicial</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Mínimo 6 caracteres"
              disabled={loading || success}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate uppercase mb-1">Perfil / Cargo</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
                disabled={loading || success}
              >
                <option value="supervisor">Supervisor</option>
                <option value="lancador">Lançador</option>
                <option value="rh">RH (Apenas Leitura)</option>
              </select>
            </div>

            {/* Apenas mostra seleção de empresa se não for Lançador/RH (que leem todas) */}
            {role !== 'lancador' && role !== 'rh' && (
              <div>
                <label className="block text-xs font-semibold text-slate uppercase mb-1">Empresa</label>
                <select
                  value={empresa}
                  onChange={(e) => setEmpresa(e.target.value)}
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-ink/20"
                  disabled={loading || success}
                >
                  {EMPRESAS.map((emp) => (
                    <option key={emp} value={emp}>{emp}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="pt-4 border-t border-line flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 border border-line rounded-lg text-sm font-medium text-slate hover:bg-cloud transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || success}
              className="px-4 py-2 bg-ink text-white rounded-lg text-sm font-medium hover:bg-ink/90 transition disabled:opacity-50 flex items-center gap-2"
            >
              {loading ? 'Criando...' : 'Salvar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}