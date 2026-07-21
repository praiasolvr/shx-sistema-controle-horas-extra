import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { LayoutDashboard, FileClock, Users, UserCog, LogOut, FileText, X } from "lucide-react";

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const { user, logout } = useAuth();
  const [role, setRole] = useState(null);

  // Buscar o perfil do usuário logado para saber se exibe o menu de controle
  useEffect(() => {
    async function getUserRole() {
      if (user?.uid) {
        try {
          const docSnap = await getDoc(doc(db, "users", user.uid));
          if (docSnap.exists()) {
            setRole(docSnap.data().role);
          }
        } catch (error) {
          console.error("Erro ao buscar permissões do usuário no sidebar:", error);
        }
      }
    }
    getUserRole();
  }, [user]);

  // Função modificada para incluir a cor customizada e a barrinha lateral esquerda
  const linkClass = ({ isActive }) =>
    `relative flex items-center gap-2 px-3 py-2 text-sm font-medium transition pl-5 ${
      isActive
        ? "bg-white/10 text-[#6BFE9C]" 
        : "text-white/60 hover:text-white hover:bg-white/5"
    }`;

  // Elemento da barrinha verde que aparece apenas no link ativo
  const activeIndicator = (isActive) => 
    isActive && <span className="absolute left-0 top-0 bottom-0 w-1 bg-[#6BFE9C] rounded-r" />;

  return (
    <>
      {/* Overlay escuro atrás do menu, visível apenas em mobile quando aberto */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          aria-hidden="true"
        />
      )}

      <aside
        className={`w-64 shrink-0 bg-ink text-white flex flex-col h-screen fixed lg:sticky top-0 z-50 transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } lg:translate-x-0`}
      >
        <div className="px-5 py-6 flex items-center justify-between">
          <div>
            <p className="text-xs font-mono tracking-wide text-amber uppercase mb-1">
              Painel De Hora Extra
            </p>
            <h1 className="font-display text-2xl font-semibold leading-none">
              TRÁFEGO
            </h1>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white p-1"
            aria-label="Fechar menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          <NavLink to="/" end className={linkClass} onClick={onClose}>
            {({ isActive }) => (
              <>
                {activeIndicator(isActive)}
                <LayoutDashboard className="w-5 h-5" />
                <span>Painel geral</span>
              </>
            )}
          </NavLink>

          <NavLink to="/lancar-horas" className={linkClass} onClick={onClose}>
            {({ isActive }) => (
              <>
                {activeIndicator(isActive)}
                <FileClock className="w-5 h-5" />
                <span>Lançar horas</span>
              </>
            )}
          </NavLink>

          <NavLink to="/motoristas" className={linkClass} onClick={onClose}>
            {({ isActive }) => (
              <>
                {activeIndicator(isActive)}
                <Users className="w-5 h-5" />
                <span>Motoristas</span>
              </>
            )}
          </NavLink>

          <NavLink to="/reports" className={linkClass} onClick={onClose}>
            {({ isActive }) => (
              <>
                {activeIndicator(isActive)}
                <FileText className="w-5 h-5" />
                <span>Relatórios</span>
              </>
            )}
          </NavLink>

          {/* EXCLUSIVO: Exibir Gestão de Usuários apenas se o logado for Supervisor */}
          {role === "supervisor" && (
            <NavLink to="/usuarios" className={linkClass} onClick={onClose}>
              {({ isActive }) => (
                <>
                  {activeIndicator(isActive)}
                  {/* Mantive o text-amber original aqui caso não queira sobrescrever, 
                      mas se quiser que fique verde também, basta remover a classe 'text-amber' abaixo */}
                  <UserCog className={`w-5 h-5 ${isActive ? "text-[#6BFE9C]" : "text-amber"}`} />
                  <span className={isActive ? "text-[#6BFE9C]" : "text-amber"}>Gerenciar Usuários</span>
                </>
              )}
            </NavLink>
          )}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <p className="px-3 text-xs text-white/50 mb-2 truncate">
            {user?.email}
          </p>
          <button
            onClick={logout}
            className="w-full flex flex-row items-center gap-2 px-3 py-2 rounded-lg text-sm text-white/70 hover:bg-white/5 hover:text-white transition"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span>Sair</span>  
          </button>
        </div>
      </aside>
    </>
  );
}