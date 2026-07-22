import { useState, useEffect } from 'react'
import { db, auth } from '../firebase' 
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { initializeApp, getApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { useAuth } from '../context/AuthContext'
import { EMPRESAS } from '../utils/constants'
import EmpresaBadge from '../components/EmpresaBadge'

export default function UsersManagement() {
  // ✅ Puxamos 'profile' que é onde a role/empresa estão no seu AuthContext
  const { user, profile, loading: authLoading } = useAuth()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const navigate = useNavigate()

  // Estados do Formulário
  const [isEditing, setIsEditing] = useState(false)
  const [editingId, setEditingId] = useState('')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [matricula, setMatricula] = useState('')
  const [role, setRole] = useState('lancador')
  const [empresa, setEmpresa] = useState('')
  const [password, setPassword] = useState('')

  // Carrega a lista de usuários baseando-se no 'profile'
  useEffect(() => {
    // Se o AuthContext ainda estiver carregando, aguarda
    if (authLoading) return

    if (profile?.role === 'supervisor') {
      fetchUsers()
    } else {
      setLoading(false)
    }
  }, [profile, authLoading])

  async function fetchUsers() {
    setLoading(true)
    setError('')
    try {
      const querySnapshot = await getDocs(collection(db, 'users'))
      const usersList = []
      querySnapshot.forEach((docSnap) => {
        usersList.push({ id: docSnap.id, ...docSnap.data() })
      })
      setUsers(usersList)
    } catch (err) {
      console.error(err)
      setError('Erro ao carregar lista de usuários: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Salvar (Criar ou Editar)
  async function handleSave(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!nome.trim() || !email.trim()) {
      setError('Nome e E-mail são obrigatórios.')
      return
    }

    if (!isEditing && password.length < 6) {
      setError('A senha deve ter no mínimo 6 caracteres.')
      return
    }

    try {
      if (isEditing) {
        // Atualizar Usuário Existente no Firestore
        const userRef = doc(db, 'users', editingId)
        await updateDoc(userRef, {
          name: nome,
          email: email,
          matricula: matricula.trim(),
          role: role,
          empresa: empresa
        })
        setSuccess('Usuário atualizado com sucesso!')
      } else {
        // Criar Novo Usuário no Firebase Auth usando App Secundário
        const currentConfig = getApp().options
        const secondaryApp = initializeApp(currentConfig, 'SecondaryAuth')
        const secondaryAuth = getAuth(secondaryApp)

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          password
        )
        const newUid = userCredential.user.uid

        // Salvar no Firestore com ID idêntico
        await setDoc(doc(db, 'users', newUid), {
          name: nome,
          email: email,
          matricula: matricula.trim(),
          role: role,
          empresa: empresa,
          createdAt: new Date().toISOString()
        })

        await deleteApp(secondaryApp)
        setSuccess('Usuário criado com sucesso!')
      }

      resetForm()
      fetchUsers()
    } catch (err) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este e-mail já está em uso por outro usuário.')
      } else {
        setError('Erro ao salvar as alterações: ' + err.message)
      }
    }
  }

  function handleStartEdit(userData) {
    setIsEditing(true)
    setEditingId(userData.id)
    setNome(userData.name || '')
    setEmail(userData.email || '')
    setMatricula(userData.matricula || '')
    setRole(userData.role || 'lancador')
    setEmpresa(userData.empresa || '')
    setPassword('')
  }

  async function handleDelete(id) {
    if (!window.confirm('Tem certeza que deseja excluir este usuário do banco?')) return
    setError('')
    setSuccess('')
    try {
      await deleteDoc(doc(db, 'users', id))
      setSuccess('Usuário removido com sucesso!')
      fetchUsers()
    } catch (err) {
      setError('Erro ao excluir usuário.')
    }
  }

  function resetForm() {
    setIsEditing(false)
    setEditingId('')
    setNome('')
    setEmail('')
    setMatricula('')
    setRole('lancador')
    setEmpresa('')
    setPassword('')
  }

  if (authLoading || loading) {
    return (
      <div className="p-8 text-center text-slate-500 font-medium">
        Carregando gerenciador de usuários...
      </div>
    )
  }

  // ✅ Verificação corrigida para usar 'profile.role'
  if (profile?.role !== 'supervisor') {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="text-red-500 font-semibold mb-4">
          Acesso Restrito. Apenas supervisores podem acessar esta página.
        </p>
        <button
          onClick={() => navigate('/')}
          className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          Voltar ao Painel
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold">Controle de Acessos</h1>
          <p className="text-sm text-slate-500">Gerencie quem pode acessar, lançar e alterar dados no sistema.</p>
        </div>
        <button 
          onClick={() => navigate('/')} 
          className="border border-slate-200 rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-100 transition"
        >
          Voltar ao Painel
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário lateral */}
        <div className="bg-white p-5 border border-slate-200 rounded-xl h-fit shadow-sm">
          <h2 className="font-semibold text-lg mb-4">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@empresa.com"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                required
                disabled={isEditing}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Matrícula</label>
              <input
                type="text"
                value={matricula}
                onChange={(e) => setMatricula(e.target.value)}
                placeholder="Ex: MTR-9984"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-400"
              />
            </div>

            {!isEditing && (
              <div>
                <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Perfil de Acesso</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="lancador">Lançador (Lança e edita horas)</option>
                <option value="supervisor">Supervisor (Permissão total)</option>
                <option value="rh">RH (Visualiza relatórios e exporta)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 uppercase mb-1">Empresa Designada</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">Sem empresa designada (Vê todas / Supervisor global)</option>
                {EMPRESAS && EMPRESAS.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-slate-900 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-slate-800 transition"
              >
                {isEditing ? 'Salvar Alterações' : 'Criar Conta'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium hover:bg-slate-100 transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabela de Usuários */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="font-semibold text-lg">Usuários Cadastrados ({users.length})</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-500 border-b border-slate-200">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Perfil & Empresa</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-slate-800">{u.name || 'Sem nome'}</p>
                      <div className="text-xs text-slate-400 space-y-0.5">
                        <p>{u.email}</p>
                        {u.matricula && (
                          <p className="font-mono text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded w-fit">
                            Matrícula: {u.matricula}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                          u.role === 'supervisor' 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : u.role === 'rh' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {u.role === 'supervisor' ? 'Supervisor' : u.role === 'rh' ? 'RH' : 'Lançador'}
                        </span>
                        {u.empresa && (
                          <EmpresaBadge empresa={u.empresa} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleStartEdit(u)}
                        className="text-xs font-medium text-blue-600 hover:underline"
                      >
                        Editar
                      </button>
                      {auth.currentUser?.uid !== u.id && (
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="text-xs font-medium text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}