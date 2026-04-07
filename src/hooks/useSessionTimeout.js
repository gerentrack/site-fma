import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Hook de timeout por inatividade.
 *
 * Monitora atividade do usuário (mouse, teclado, toque, scroll, navegação).
 * Quando o tempo de inatividade atinge o limite, chama onTimeout (logout).
 * Exibe aviso X minutos antes da expiração via warningSecondsLeft.
 *
 * Uso:
 *   const { warningSecondsLeft, dismiss } = useSessionTimeout({
 *     timeoutMinutes: 120,
 *     warningMinutes: 5,
 *     onTimeout: logout,
 *     enabled: isAuthenticated,
 *   });
 *
 *   {warningSecondsLeft > 0 && <SessionWarning seconds={warningSecondsLeft} onDismiss={dismiss} />}
 */
const ACTIVITY_EVENTS = ["mousedown", "keydown", "touchstart", "scroll"];

export function useSessionTimeout({
  timeoutMinutes = 120,
  warningMinutes = 5,
  onTimeout,
  enabled = true,
}) {
  const [warningSecondsLeft, setWarningSecondsLeft] = useState(0);
  const lastActivityRef = useRef(Date.now());
  const warningDismissedRef = useRef(false);

  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = warningMinutes * 60 * 1000;
  const warningStartMs = timeoutMs - warningMs;

  const resetActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningDismissedRef.current = false;
    setWarningSecondsLeft(0);
  }, []);

  const dismiss = useCallback(() => {
    // Dismiss = reset — conta do zero
    resetActivity();
  }, [resetActivity]);

  useEffect(() => {
    if (!enabled) return;

    // Registrar atividade
    ACTIVITY_EVENTS.forEach(ev => window.addEventListener(ev, resetActivity, { passive: true }));

    // Checar a cada segundo
    const interval = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;

      if (elapsed >= timeoutMs) {
        // Timeout — forçar logout
        clearInterval(interval);
        onTimeout?.();
        return;
      }

      if (elapsed >= warningStartMs && !warningDismissedRef.current) {
        const remaining = Math.ceil((timeoutMs - elapsed) / 1000);
        setWarningSecondsLeft(remaining);
      } else {
        setWarningSecondsLeft(0);
      }
    }, 1000);

    return () => {
      ACTIVITY_EVENTS.forEach(ev => window.removeEventListener(ev, resetActivity));
      clearInterval(interval);
    };
  }, [enabled, timeoutMs, warningStartMs, onTimeout, resetActivity]);

  return { warningSecondsLeft, dismiss, resetActivity };
}
