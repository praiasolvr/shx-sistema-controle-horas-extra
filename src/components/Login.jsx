import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default function Login() {
  const { login, error } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    await login(email, password);
    setSubmitting(false);
  }

  return (
    <div className="min-h-screen w-full flex bg-slate-50 font-sans antialiased">
      {/* SEÇÃO ESQUERDA - PAINEL INSTITUCIONAL (Oculto em telas de celular) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-between p-12 relative overflow-hidden">
        {/* Luzes / Gradientes de fundo */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* Marca / Logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Clock className="h-6 w-6 text-white" />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tight text-white leading-none block">
              SHX<span className="text-blue-400">+</span>
            </span>
            <span className="text-[10px] font-bold tracking-widest text-slate-400 uppercase">
              Controle de Horas Extras
            </span>
          </div>
        </div>

        {/* Informações centrais */}
        <div className="relative z-10 my-auto max-w-lg space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-semibold">
            <ShieldCheck className="h-4 w-4 text-blue-400" />
            Painel Corporativo & Auditado
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl leading-tight">
            Gestão precisa de jornada e fechamento mensal.
          </h1>

          <p className="text-slate-300 text-base leading-relaxed">
            Acompanhe lançamentos, controle limites diários de 75% e 100% e gere
            relatórios consolidados com facilidade.
          </p>

          <div className="space-y-3 pt-2">
            {[
              "Cálculo automático de fechamento mensal",
              "Relatórios divididos por empresa e matrícula",
              "Auditoria visual e controle centralizado",
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex items-center gap-3 text-sm text-slate-200"
              >
                <CheckCircle2 className="h-5 w-5 text-blue-400 shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div className="relative z-10 text-xs text-slate-500">
          © {new Date().getFullYear()} SHX — Sistema de Controle de Hora Extra.
        </div>
      </div>

      {/* SEÇÃO DIREITA - FORMULÁRIO DE LOGIN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Cabeçalho do Formulário */}
          <div className="text-center lg:text-left space-y-2">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md">
                <Clock className="h-5 w-5 text-white" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-800">
                SHX<span className="text-blue-600">+</span>
              </span>
            </div>

            <p className="text-xs font-mono tracking-wide text-blue-600 uppercase font-semibold">
              SHX — Controle de Hora Extra
            </p>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              Bem-vindo de volta!
            </h2>
            <p className="text-sm text-slate-500">
              Insira suas credenciais abaixo para entrar no sistema.
            </p>
          </div>

          {/* Banner de Erro (Consumindo do useAuth) */}
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-start gap-3 animate-in fade-in duration-200">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm font-medium text-red-700">
                {error}
              </p>
            </div>
          )}

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                E-mail
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-5 w-5" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Insira seu e-mail"
                  className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                Senha
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 bg-white border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Botão de Submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-none"
            >
              {submitting ? (
                <>
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Entrando…</span>
                </>
              ) : (
                <>
                  <span>Entrar</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Rodapé do Form */}
          <div className="pt-4 text-center border-t border-slate-200/60">
            <p className="text-xs text-slate-400">
              Sistema de Acesso Restrito SHX. Em caso de dúvidas, contate o
              administrador.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


