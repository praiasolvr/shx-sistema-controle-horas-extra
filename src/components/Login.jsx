import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login, error } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    console.log ("handleSubmit")
    setSubmitting(true)
    await login(email, password)
    setSubmitting(false)
  }

  return (
    <div className="min-h-screen bg-ink flex items-center justify-center px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-card p-8">
        <div className="mb-6">
          <p className="text-xs font-mono tracking-wide text-amber-dark uppercase mb-1">
            SHX - SISTEMA DE CONTROLE DE HORA EXTRA
          </p>
          <h1 className="font-display text-3xl font-semibold leading-none">
            Bem-Vindo!
          </h1>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate mb-1">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="Insira seu email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate mb-1">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-line px-3 py-2 focus:outline-none focus:ring-2 focus:ring-ink/20"
              placeholder="••••••••"
            />
          </div>
          {error && <p className="text-sm text-alert">{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-ink text-white rounded-lg py-2.5 font-medium hover:bg-ink/90 transition disabled:opacity-60"
          >
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="text-xs text-slate mt-5">
          {/* Crie o usuário no Firebase Authentication (Email/Senha) do seu projeto para acessar. */}
        </p>
      </div>
    </div>
  )
}
