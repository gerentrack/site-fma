/**
 * PixModal.jsx — Modal de pagamento PIX com QR Code e copia-e-cola.
 * Exibe o PIX do arbitro, permite copiar o codigo e confirmar pagamento.
 */
import { useState, useEffect, useRef } from "react";
import { COLORS, FONTS } from "../../styles/colors";
import { gerarPixPayload } from "../../utils/pixGenerator";

/**
 * @param {Object} props
 * @param {Object} props.referee     - Dados do arbitro { name, chavePix, chavePixTipo, city }
 * @param {number} props.valor       - Valor a pagar (R$)
 * @param {string} props.descricao   - Descricao do pagamento (ex: "Diaria - Evento X")
 * @param {Function} props.onConfirm - Callback com a data de pagamento (string ISO)
 * @param {Function} props.onClose   - Fechar modal
 * @param {boolean} [props.loading]  - Loading do botao confirmar
 */
export default function PixModal({ referee, valor, descricao, onConfirm, onClose, loading }) {
  const [dataPgto, setDataPgto] = useState(new Date().toISOString().slice(0, 10));
  const [copiado, setCopiado] = useState(false);
  const [qrUrl, setQrUrl] = useState("");
  const canvasRef = useRef(null);

  const pixPayload = gerarPixPayload({
    chavePix: referee?.chavePix || "",
    chavePixTipo: referee?.chavePixTipo || "cpf",
    nome: referee?.name || "ARBITRO",
    cidade: referee?.city || "BELO HORIZONTE",
    valor: valor || 0,
    descricao: descricao || "",
  });

  // Gerar QR Code via canvas (simples, sem lib externa)
  useEffect(() => {
    if (!pixPayload) return;
    // Usar API publica para QR (fallback se quiser offline, pode trocar por lib)
    setQrUrl(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(pixPayload)}`);
  }, [pixPayload]);

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(pixPayload);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    } catch {
      // Fallback
      const ta = document.createElement("textarea");
      ta.value = pixPayload;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 3000);
    }
  };

  const temPix = !!(referee?.chavePix);
  const tipoLabel = { cpf: "CPF", email: "E-mail", telefone: "Telefone", aleatoria: "Chave aleatoria" };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "28px 28px 24px", width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto" }}
        onClick={e => e.stopPropagation()}>

        <h3 style={{ fontFamily: FONTS.heading, fontSize: 18, fontWeight: 800, color: COLORS.dark, margin: "0 0 4px" }}>
          Pagamento via PIX
        </h3>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>
          {referee?.name || "Arbitro"} — <strong style={{ color: "#15803d" }}>
            {(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </strong>
        </p>

        {!temPix ? (
          <div style={{ padding: "16px 20px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a", marginBottom: 20 }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: "#92400e", marginBottom: 4 }}>
              Chave PIX nao cadastrada
            </div>
            <div style={{ fontFamily: FONTS.body, fontSize: 12, color: "#a16207" }}>
              Este arbitro nao possui chave PIX no cadastro. Solicite que atualize os dados bancarios no perfil da intranet.
            </div>
          </div>
        ) : (
          <>
            {/* Dados PIX */}
            <div style={{ padding: "14px 16px", borderRadius: 10, background: "#f0fdf4", border: "1px solid #bbf7d0", marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: "#15803d", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Dados PIX do arbitro</div>
              <div style={{ fontSize: 13, color: COLORS.dark }}>
                <div><strong>{tipoLabel[referee.chavePixTipo] || "Chave"}:</strong> {referee.chavePix}</div>
                <div><strong>Nome:</strong> {referee.name}</div>
              </div>
            </div>

            {/* QR Code */}
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              {qrUrl && <img src={qrUrl} alt="QR Code PIX" style={{ width: 180, height: 180, borderRadius: 8, border: `1px solid ${COLORS.grayLight}` }} />}
            </div>

            {/* Codigo copia-e-cola */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 }}>
                PIX Copia e Cola
              </label>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="text" readOnly value={pixPayload}
                  style={{ flex: 1, padding: "10px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 11, fontFamily: "monospace", background: "#f9fafb", overflow: "hidden", textOverflow: "ellipsis" }} />
                <button onClick={copiar}
                  style={{ padding: "10px 16px", borderRadius: 8, border: "none",
                    background: copiado ? "#15803d" : "#0066cc", color: "#fff",
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, cursor: "pointer",
                    whiteSpace: "nowrap", transition: "background 0.2s" }}>
                  {copiado ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          </>
        )}

        {/* Separador */}
        <div style={{ height: 1, background: COLORS.grayLight, margin: "16px 0" }} />

        {/* Data do pagamento */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 4 }}>
            Data do pagamento
          </label>
          <input type="date" value={dataPgto} onChange={e => setDataPgto(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, boxSizing: "border-box" }} />
        </div>

        {/* Botoes */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose}
            style={{ padding: "10px 20px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer", fontFamily: FONTS.heading }}>
            Cancelar
          </button>
          <button onClick={() => onConfirm(dataPgto)} disabled={loading}
            style={{ padding: "10px 20px", borderRadius: 8, border: "none", background: "#15803d", color: "#fff",
              fontSize: 13, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", fontFamily: FONTS.heading }}>
            {loading ? "Salvando..." : "Confirmar Pagamento"}
          </button>
        </div>
      </div>
    </div>
  );
}
