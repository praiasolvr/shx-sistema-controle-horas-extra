import { useState, useEffect } from 'react'
import { db, auth } from '../firebase' 
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'
import { initializeApp, getApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { EMPRESAS } from '../utils/constants'
import EmpresaBadge from '../components/EmpresaBadge'

export default function UsersManagement() {
  const [currentUserRole, setCurrentUserRole] = useState(null)
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
  const [role, setRole] = useState('lancador')
  const [empresa, setEmpresa] = useState('') // Estado da empresa destinada
  const [password, setPassword] = useState('') // Estado da Senha

  // Validar se o usuário atual é Supervisor
  useEffect(() => {
    async function checkPermission() {
      const user = auth.currentUser
      if (!user) {
        navigate('/login')
        return
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          const role = userDoc.data().role
          setCurrentUserRole(role)
          if (role !== 'supervisor') {
            setError('Acesso negado. Apenas supervisores podem gerenciar usuários.')
            setLoading(false)
          } else {
            fetchUsers()
          }
        } else {
          navigate('/login')
        }
      } catch (err) {
        setError('Erro ao verificar permissões.')
        setLoading(false)
      }
    }
    checkPermission()
  }, [navigate])

  async function fetchUsers() {
    setLoading(true)
    try {
      const querySnapshot = await getDocs(collection(db, 'users'))
      const usersList = []
      querySnapshot.forEach((doc) => {
        usersList.push({ id: doc.id, ...doc.data() })
      })
      setUsers(usersList)
    } catch (err) {
      setError('Erro ao carregar lista de usuários.')
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
          role: role,
          empresa: empresa // Salva a alteração da empresa
        })
        setSuccess('Usuário atualizado com sucesso!')
      } else {
        // Criar Novo Usuário no Firebase Auth usando App Secundário
        // Isso evita deslogar o supervisor atual
        const currentConfig = getApp().options
        const secondaryApp = initializeApp(currentConfig, 'SecondaryAuth')
        const secondaryAuth = getAuth(secondaryApp)

        const userCredential = await createUserWithEmailAndPassword(
          secondaryAuth,
          email,
          password
        )
        const newUid = userCredential.user.uid

        // Salvar os detalhes dele no Firestore com o ID idêntico do Auth
        await setDoc(doc(db, 'users', newUid), {
          name: nome,
          email: email,
          role: role,
          empresa: empresa, // Salva a empresa selecionada
          createdAt: new Date().toISOString()
        })

        // Finaliza a instância secundária para não sujar a memória
        await deleteApp(secondaryApp)
        setSuccess('Usuário criado com sucesso no banco e na autenticação!')
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

  function handleStartEdit(user) {
    setIsEditing(true)
    setEditingId(user.id)
    setNome(user.name)
    setEmail(user.email)
    setRole(user.role || 'lancador')
    setEmpresa(user.empresa || '') // Carrega a empresa atual no form
    setPassword('') // Limpa o campo de senha durante a edição
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
    setRole('lancador')
    setEmpresa('')
    setPassword('')
  }

  if (loading) {
    return <div className="p-8 text-center text-slate">Verificando credenciais e carregando dados...</div>
  }

  if (currentUserRole !== 'supervisor') {
    return (
      <div className="p-8 max-w-md mx-auto text-center">
        <p className="text-red-500 font-semibold mb-4">{error || 'Acesso Restrito'}</p>
        <button onClick={() => navigate(-1)} className="bg-ink text-white px-4 py-2 rounded-lg text-sm">
          Voltar
        </button>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-3xl font-semibold">Controle de Acessos</h1>
          <p className="text-sm text-slate">Gerencie quem pode acessar, lançar e alterar dados no sistema.</p>
        </div>
        <button 
          onClick={() => navigate(-1)} 
          className="border border-line rounded-lg px-4 py-2 text-sm font-medium hover:bg-cloud transition"
        >
          Voltar ao Painel
        </button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg mb-4 text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-600 p-3 rounded-lg mb-4 text-sm">{success}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Formulário lateral */}
        <div className="bg-white p-5 border border-line rounded-xl h-fit">
          <h2 className="font-semibold text-lg mb-4">{isEditing ? 'Editar Usuário' : 'Novo Usuário'}</h2>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate uppercase mb-1">Nome Completo</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Carlos Silva"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate uppercase mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@empresa.com"
                className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                required
                disabled={isEditing}
              />
            </div>

            {/* Campo de Senha - Visível apenas ao criar um novo usuário */}
            {!isEditing && (
              <div>
                <label className="block text-xs font-medium text-slate uppercase mb-1">Senha de Acesso</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full rounded-lg border border-line px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink/20"
                  required
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate uppercase mb-1">Perfil de Acesso</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="lancador">Lançador (Lança e edita horas)</option>
                <option value="supervisor">Supervisor (Permissão total)</option>
                <option value="rh">RH (Visualiza relatórios e exporta)</option>
              </select>
            </div>

            {/* Campo corrigido: Destinação de Empresa chamando setEmpresa */}
            <div>
              <label className="block text-xs font-medium text-slate uppercase mb-1">Empresa Designada</label>
              <select
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                className="w-full rounded-lg border border-line px-3 py-2 text-sm bg-white focus:outline-none"
              >
                <option value="">Sem empresa designada (Vê todas / Supervisor global)</option>
                {EMPRESAS.map((emp) => (
                  <option key={emp} value={emp}>
                    {emp}
                  </option>
                ))}
              </select>
            </div>

            <div className="pt-2 flex gap-2">
              <button
                type="submit"
                className="flex-1 bg-ink text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-ink/90 transition"
              >
                {isEditing ? 'Salvar Alterações' : 'Criar Conta'}
              </button>
              {isEditing && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="border border-line rounded-lg px-3 py-2 text-sm font-medium hover:bg-cloud transition"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Tabela de Usuários */}
        <div className="lg:col-span-2 bg-white border border-line rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h2 className="font-semibold text-lg">Usuários Cadastrados</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-cloud text-left text-slate border-b border-line">
                  <th className="px-5 py-3 font-medium">Nome</th>
                  <th className="px-5 py-3 font-medium">Perfil & Empresa</th>
                  <th className="px-5 py-3 font-medium text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-line last:border-0 hover:bg-cloud/30">
                    <td className="px-5 py-3">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-slate">{user.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold w-fit ${
                          user.role === 'supervisor' 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : user.role === 'rh' 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-green-50 text-green-700 border border-green-200'
                        }`}>
                          {user.role === 'supervisor' ? 'Supervisor' : user.role === 'rh' ? 'RH' : 'Lançador'}
                        </span>
                        {user.empresa && (
                          <EmpresaBadge empresa={user.empresa} />
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right space-x-2">
                      <button
                        onClick={() => handleStartEdit(user)}
                        className="text-xs font-medium text-ink hover:underline"
                      >
                        Editar
                      </button>
                      {auth.currentUser.uid !== user.id && (
                        <button
                          onClick={() => handleDelete(user.id)}
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