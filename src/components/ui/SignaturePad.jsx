/**
 * SignaturePad.jsx — Campo de assinatura digital (canvas touch).
 * Gera assinatura manuscrita + registro de evidência (Lei 14.063/2020).
 *
 * Props:
 *  - value: string (dataURL da assinatura ou "")
 *  - onChange: (dataURL: string) => void
 *  - disabled: boolean
 *  - label: string
 */
import { useRef, useState, useEffect, useCallback } from "react";
import { COLORS, FONTS } from "../../styles/colors";

export default function SignaturePad({ value, onChange, disabled = false, label = "Assinatura" }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasStrokes, setHasStrokes] = useState(false);

  // Restaurar assinatura existente
  useEffect(() => {
    if (!value || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      ctx.drawImage(img, 0, 0);
      setHasStrokes(true);
    };
    img.src = value;
  }, []);

  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return {
      x: (touch.clientX - rect.left) * (canvasRef.current.width / rect.width),
      y: (touch.clientY - rect.top) * (canvasRef.current.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e) => {
    if (disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setDrawing(true);
    setHasStrokes(true);
  }, [disabled, getPos]);

  const draw = useCallback((e) => {
    if (!drawing || disabled) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext("2d");
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.stroke();
  }, [drawing, disabled, getPos]);

  const endDraw = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    if (canvasRef.current && onChange) {
      onChange(canvasRef.current.toDataURL("image/png"));
    }
  }, [drawing, onChange]);

  const clear = () => {
    if (disabled) return;
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHasStrokes(false);
    if (onChange) onChange("");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>
          {label}
        </label>
        {hasStrokes && !disabled && (
          <button onClick={clear} type="button"
            style={{ background: "none", border: "none", fontSize: 11, color: "#dc2626", cursor: "pointer", fontFamily: FONTS.heading, fontWeight: 700 }}>
            Limpar
          </button>
        )}
      </div>
      <div style={{
        border: `2px ${disabled ? "solid" : "dashed"} ${hasStrokes ? "#15803d" : COLORS.grayLight}`,
        borderRadius: 10, overflow: "hidden", background: disabled ? "#f9fafb" : "#fff",
        position: "relative", touchAction: "none",
      }}>
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          style={{ width: "100%", height: 120, cursor: disabled ? "default" : "crosshair", display: "block" }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
        {!hasStrokes && !disabled && (
          <div style={{
            position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
            pointerEvents: "none", color: COLORS.grayLight, fontFamily: FONTS.body, fontSize: 14,
          }}>
            Assine aqui com o dedo ou mouse
          </div>
        )}
      </div>
      <div style={{ fontSize: 10, color: COLORS.gray, fontFamily: FONTS.body, marginTop: 4 }}>
        Assinatura eletronica simples conforme Lei 14.063/2020, Art. 4.
      </div>
    </div>
  );
}

/**
 * Gera o registro de evidência da assinatura digital.
 * Deve ser chamado no momento do envio do relatório.
 */
export function gerarEvidenciaAssinatura({ uid, refereeId, refereeName, documentoId }) {
  return {
    uid,
    refereeId,
    refereeName,
    assinadoEm: new Date().toISOString(),
    ip: "", // preenchido pelo servidor se disponível
    userAgent: navigator.userAgent,
    documentoId,
    metodo: "assinatura_eletronica_simples",
    baseLegal: "Lei 14.063/2020, Art. 4 — Assinatura eletronica simples",
  };
}
