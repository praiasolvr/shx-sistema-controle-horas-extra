import React from 'react';
import { AlertTriangle, Clock, LogOut } from 'lucide-react';

export default function IdleModal({ isOpen, countdown, onContinue, onLogout }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3.5 rounded-xl border border-amber-100">
          <AlertTriangle className="h-6 w-6 shrink-0" />
          <h3 className="font-bold text-slate-800 text-lg">Sessão por Inatividade</h3>
        </div>

        <p className="text-slate-600 text-sm leading-relaxed">
          Você está inativo há algum tempo. Por motivos de segurança e otimização do sistema, sua sessão será encerrada em:
        </p>

        <div className="flex items-center justify-center gap-2 py-3 bg-slate-50 rounded-xl border border-slate-100">
          <Clock className="h-5 w-5 text-blue-600 animate-pulse" />
          <span className="text-2xl font-black text-slate-800">{countdown} segundos</span>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onLogout}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Sair agora</span>
          </button>

          <button
            onClick={onContinue}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors shadow-md shadow-blue-500/20"
          >
            Continuar conectado
          </button>
        </div>
      </div>
    </div>
  );
}