/**
 * ConfirmModal.jsx — Modal de confirmacao in-app para substituir window.confirm().
 *
 * Uso com hook:
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   ...
 *   const ok = await confirm("Excluir este item?");
 *   if (!ok) return;
 *   ...
 *   return <>{ConfirmDialog}</>
 */
import { useState, useCallback, useRef } from "react";
import { COLORS, FONTS } from "../../styles/colors";

export default function ConfirmModal({ message, confirmLabel = "Confirmar", cancelLabel = "Cancelar", danger = false, onConfirm, onCancel }) {
  if (!message) return null;
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, padding: "28px 32px", maxWidth: 440, width: "100%", boxShadow: "0 8px 32px rgba(0,0,0,0.18)" }}>
        <div style={{ fontFamily: FONTS.body, fontSize: 15, color: COLORS.dark, lineHeight: 1.6, whiteSpace: "pre-line", marginBottom: 24 }}>
          {message}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, background: "#fff", color: COLORS.grayDark, cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {cancelLabel}
          </button>
          <button onClick={onConfirm}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: danger ? "#dc2626" : COLORS.primary, color: "#fff", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Hook que retorna uma funcao `confirm(msg, opts?)` que abre o modal
 * e retorna uma Promise<boolean>.
 *
 * @returns {{ confirm: (msg, opts?) => Promise<boolean>, ConfirmDialog: JSX.Element }}
 */
export function useConfirm() {
  const [state, setState] = useState(null);
  const resolveRef = useRef(null);

  const confirm = useCallback((message, opts = {}) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setState({ message, ...opts });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    resolveRef.current?.(true);
    setState(null);
  }, []);

  const handleCancel = useCallback(() => {
    resolveRef.current?.(false);
    setState(null);
  }, []);

  const ConfirmDialog = state ? (
    <ConfirmModal
      message={state.message}
      confirmLabel={state.confirmLabel}
      cancelLabel={state.cancelLabel}
      danger={state.danger}
      onConfirm={handleConfirm}
      onCancel={handleCancel}
    />
  ) : null;

  return { confirm, ConfirmDialog };
}
