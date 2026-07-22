import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; // Ajuste o caminho se necessário

/**
 * Hook para monitorar inatividade e disparar warning/logout
 * @param {number} idleTimeMs - Tempo em ms até exibir o alerta (ex: 15 min = 900000)
 * @param {number} warningTimeMs - Tempo em ms de tolerância no alerta antes do logout (ex: 1 min = 60000)
 */
export function useIdleTimer(idleTimeMs = 15 * 60 * 1000, warningTimeMs = 60 * 1000) {
  const { logout, currentUser } = useAuth();
  const [isWarningOpen, setIsWarningOpen] = useState(false);
  const [countdown, setCountdown] = useState(Math.ceil(warningTimeMs / 1000));

  const idleTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  // Reseta os cronômetros e oculta o aviso
  const resetTimer = () => {
    setIsWarningOpen(false);
    setCountdown(Math.ceil(warningTimeMs / 1000));

    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    if (currentUser) {
      idleTimerRef.current = setTimeout(startWarningCountdown, idleTimeMs);
    }
  };

  // Inicia a contagem regressiva visual no modal
  const startWarningCountdown = () => {
    setIsWarningOpen(true);
    setCountdown(Math.ceil(warningTimeMs / 1000));

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
  };

  const handleForceLogout = () => {
    setIsWarningOpen(false);
    if (logout) logout();
  };

  useEffect(() => {
    if (!currentUser) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    const handleUserActivity = () => {
      // Só reseta se o modal de aviso NÃO estiver aberto
      if (!isWarningOpen) {
        resetTimer();
      }
    };

    events.forEach((event) => window.addEventListener(event, handleUserActivity));
    resetTimer(); // Inicia no mount

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity));
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [currentUser, isWarningOpen]);

  return { isWarningOpen, countdown, resetTimer, handleForceLogout };
}