import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { user, logout } = useAuth()

  const linkClass = ({ isActive }) =>
    `block px-3 py-2 rounded-lg text-sm font-medium transition ${
      isActive ? 'bg-white/10 text-white' : 'text-white/60 hover:text-white hover:bg-white/5'
    }`

  return (
    <aside className="w-60 shrink-0 bg-ink text-white flex flex-col h-screen sticky top-0">
      <div className="px-5 py-6">
        <p className="text-xs font-mono tracking-wide text-amber uppercase mb-1">Painel De Hora Extra</p>
        <h1 className="font-display text-2xl font-semibold leading-none">TRÁFEGO</h1>
      </div>
      <nav className="flex-1 px-3 space-y-1">
        <NavLink to="/" end className={linkClass}>
          Painel geral
        </NavLink>
        <NavLink to="/lancar-horas" className={linkClass}>
          Lançar horas
        </NavLink>
        <NavLink to="/motoristas" className={linkClass}>
          Motoristas
        </NavLink>
      </nav>
      <div className="px-3 py-4 border-t border-white/10">
        <p className="px-3 text-xs text-white/50 mb-2 truncate">{user?.email}</p>
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition"
        >
          Sair
        </button>
      </div>
    </aside>
  )
}
