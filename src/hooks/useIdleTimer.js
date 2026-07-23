import { useState, useEffect, useRef, useCallback } from 'react'
import { useAuth } from '../context/AuthContext'


// 15 * 60 * 1000 = 900.000 ms (15 minutos)
// 60 * 1000 = 60.000 ms (60 segundos / 1 minuto)
export function useIdleTimer(idleTimeMs = 15 * 60 * 1000, warningTimeMs = 60 * 1000) {
  const { logout } = useAuth()
  
  const [isWarningOpen, setIsWarningOpen] = useState(false)
  const [countdown, setCountdown] = useState(Math.ceil(warningTimeMs / 1000))

  const idleTimerRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const isWarningOpenRef = useRef(false)

  useEffect(() => {
    isWarningOpenRef.current = isWarningOpen
  }, [isWarningOpen])

  const handleForceLogout = useCallback(async () => {
    clearInterval(countdownIntervalRef.current)
    clearTimeout(idleTimerRef.current)
    setIsWarningOpen(false)
    if (logout) {
      await logout()
    }
  }, [logout])

  const startCountdown = useCallback(() => {
    setCountdown(Math.ceil(warningTimeMs / 1000))
    
    clearInterval(countdownIntervalRef.current)
    countdownIntervalRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          handleForceLogout()
          return 0
        }
        return prev - 1
      })
    }, 1000)
  }, [warningTimeMs, handleForceLogout])

  const resetTimer = useCallback(() => {
    setIsWarningOpen(false)
    clearInterval(countdownIntervalRef.current)
    clearTimeout(idleTimerRef.current)

    idleTimerRef.current = setTimeout(() => {
      setIsWarningOpen(true)
      startCountdown()
    }, idleTimeMs)
  }, [idleTimeMs, startCountdown])

  useEffect(() => {
    const handleUserActivity = () => {
      if (isWarningOpenRef.current) return
      resetTimer()
    }

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart']
    events.forEach((event) => window.addEventListener(event, handleUserActivity))

    resetTimer()

    return () => {
      events.forEach((event) => window.removeEventListener(event, handleUserActivity))
      clearTimeout(idleTimerRef.current)
      clearInterval(countdownIntervalRef.current)
    }
  }, [idleTimeMs])

  return {
    isWarningOpen,
    countdown,
    resetTimer,
    handleForceLogout
  }
}