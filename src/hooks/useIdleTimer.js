import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Hook para monitorar inatividade e disparar warning/logout
 * @param {number} idleTimeMs - Tempo em ms até exibir o alerta (ex: 1 min = 60000)
 * @param {number} warningTimeMs - Tempo em ms de tolerância no alerta antes do logout (ex: 15 seg = 15000)
 */
export function useIdleTimer(idleTimeMs = 15 * 60 * 1000, warningTimeMs = 60 * 1000) {
  const { logout, user } = useAuth(); // Usando 'user' conforme o AuthContext
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(warningTimeMs / 1000));

  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Força o logout e limpa os timers
  const handleForceLogout = useCallback(() => {
    setIsWarningOpen(false);
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (logout) logout();
  }, [logout]);

  // Inicia a contagem regressiva visual no modal
  const startWarningCountdown = useCallback(() => {
    setIsWarningOpen(true);
    setCountdown(Math.ceil(warningTimeMs / 1000));

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current);
          handleForceLogout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [warningTimeMs, handleForceLogout]);

  // Reseta os cronômetros e oculta o aviso
  const resetTimer = useCallback(() => {
    setIsWarningOpen(false);
    setCountdown(Math.ceil(warningTimeMs / 1000));

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (user) {
      idleTimerRef.current = setTimeout(startWarningCountdown, idleTimeMs);
    }
  }, [user, idleTimeMs, warningTimeMs, startWarningCountdown]);

  useEffect(() => {
    // Se não houver usuário logado, não ativa o monitoramento
    if (!user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

    const handleUserActivity = () => {
      // Só reseta a contagem se o modal de aviso NÃO estiver visível na tela
      setIsWarningOpen((currentlyOpen) => {
        if (!currentlyOpen) {
          resetTimer();
        }
        return currentlyOpen;
      });
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity));
    
    // Inicia o temporizador inicial
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [user, resetTimer]);

  return { isWarningOpen, countdown, resetTimer, handleForceLogout };
}