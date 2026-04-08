/**
 * MinhaAnuidade.jsx — Página do árbitro para ver status e enviar comprovante da anuidade.
 * Rota: /intranet/anuidade
 */
import { useState, useEffect, useRef } from "react";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { AnuidadesService, TaxasConfigService } from "../../../services/index";
import { uploadFile } from "../../../services/storageService";
import { COLORS, FONTS } from "../../../styles/colors";
import { ANUIDADE_STATUS } from "../../../config/navigation";

const statusMap = Object.fromEntries(ANUIDADE_STATUS.map(s => [s.value, s]));

function formatMoeda(v) {
  return (v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default function MinhaAnuidade() {
  const { refereeId, name } = useIntranet();
  const [anuidade, setAnuidade] = useState(null);
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [msg, setMsg] = useState("");
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const fileRef = useRef(null);
  const ano = new Date().getFullYear();

  useEffect(() => {
    if (!refereeId) return;
    Promise.all([
      AnuidadesService.getByRefereeAno(refereeId, ano),
      TaxasConfigService.get(),
    ]).then(([aRes, cRes]) => {
      setAnuidade(aRes.data);
      setConfig(cRes.data);
      setLoading(false);
    });
  }, [refereeId, ano]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) { setMsg("Selecione o comprovante."); return; }
    if (!dataPagamento) { setMsg("Informe a data do pagamento."); return; }
    setUploading(true); setMsg("");
    const result = await uploadFile(file, `anuidades/${ano}/${refereeId}`);
    if (result.error) {
      setMsg(`Erro ao enviar: ${result.error}`);
      setUploading(false);
      return;
    }
    await AnuidadesService.update(anuidade.id, {
      comprovanteUrl: result.url,
      comprovantePath: result.path,
      pagamentoEm: dataPagamento,
    });
    setAnuidade(prev => ({ ...prev, comprovanteUrl: result.url, pagamentoEm: dataPagamento }));
    setUploading(false);
    setMsg("Comprovante enviado com sucesso! Aguarde a confirmacao do admin.");
    fileRef.current.value = "";
  };

  const card = { background: "#fff", borderRadius: 12, padding: "24px 28px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
  const st = statusMap[anuidade?.status] || statusMap.pendente;

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 700, margin: "0 auto" }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 6px" }}>
          Anuidade {ano}
        </h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: "0 0 28px" }}>
          Acompanhe o status da sua anuidade de arbitragem.
        </p>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : !anuidade ? (
          <div style={card}>
            <p style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.gray, margin: 0 }}>
              Nenhuma anuidade registrada para {ano}. A coordenacao ainda nao gerou as anuidades deste ano.
            </p>
          </div>
        ) : (
          <>
            {/* Status card */}
            <div style={{ ...card, borderLeft: `4px solid ${st.color}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>Status</div>
                  <span style={{
                    display: "inline-block", padding: "5px 14px", borderRadius: 20,
                    fontSize: 13, fontFamily: FONTS.heading, fontWeight: 700,
                    color: st.color, background: st.bg,
                  }}>{st.label}</span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, marginBottom: 4 }}>Valor</div>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 24, fontWeight: 900, color: COLORS.dark }}>{formatMoeda(anuidade.valor)}</div>
                </div>
              </div>

              {config?.anuidade?.vencimento && (
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>
                  Vencimento: <strong>{config.anuidade.vencimento}/{ano}</strong>
                </div>
              )}

              {anuidade.confirmadoEm && (
                <div style={{ fontFamily: FONTS.body, fontSize: 13, color: "#15803d", marginTop: 8 }}>
                  Pagamento confirmado em {new Date(anuidade.confirmadoEm).toLocaleDateString("pt-BR")}
                </div>
              )}

              {anuidade.observacao && (
                <div style={{ marginTop: 12, padding: "8px 12px", background: COLORS.offWhite, borderRadius: 8, fontSize: 13, fontFamily: FONTS.body }}>
                  <strong>Observacao:</strong> {anuidade.observacao}
                </div>
              )}
            </div>

            {/* Dados bancários */}
            {anuidade.status !== "pago" && anuidade.status !== "isento" && config?.dadosBancarios && (
              <div style={card}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 12px" }}>
                  Dados para Pagamento
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 13, fontFamily: FONTS.body }}>
                  <div><strong>Favorecido:</strong> {config.dadosBancarios.favorecido}</div>
                  <div><strong>CNPJ:</strong> {config.dadosBancarios.cnpj}</div>
                  <div><strong>Banco:</strong> {config.dadosBancarios.banco}</div>
                  <div><strong>Agencia:</strong> {config.dadosBancarios.agencia}</div>
                  <div><strong>Conta:</strong> {config.dadosBancarios.conta}</div>
                  <div><strong>PIX:</strong> {config.dadosBancarios.pix}</div>
                </div>
              </div>
            )}

            {/* Upload de comprovante */}
            {anuidade.status !== "pago" && anuidade.status !== "isento" && (
              <div style={card}>
                <h3 style={{ fontFamily: FONTS.heading, fontSize: 14, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, margin: "0 0 12px" }}>
                  Enviar Comprovante
                </h3>

                {anuidade.comprovanteUrl && (
                  <div style={{ marginBottom: 12, padding: "8px 12px", background: "#eff6ff", borderRadius: 8, fontSize: 13, fontFamily: FONTS.body, color: "#0066cc" }}>
                    Comprovante ja enviado. <a href={anuidade.comprovanteUrl} target="_blank" rel="noreferrer" style={{ color: "#0066cc" }}>Ver arquivo</a>
                    {" "}— Voce pode enviar novamente se necessario.
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark, marginBottom: 4 }}>Data do pagamento *</div>
                  <input type="date" value={dataPagamento} onChange={e => setDataPagamento(e.target.value)}
                    style={{ padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body }} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <input type="file" ref={fileRef} accept="image/*,.pdf"
                    style={{ flex: 1, fontSize: 13, fontFamily: FONTS.body }} />
                  <button onClick={handleUpload} disabled={uploading}
                    style={{
                      padding: "9px 20px", borderRadius: 8, border: "none",
                      background: COLORS.primary, color: "#fff",
                      fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700,
                      cursor: uploading ? "not-allowed" : "pointer",
                    }}>{uploading ? "Enviando..." : "Enviar"}</button>
                </div>
              </div>
            )}

            {msg && (
              <div style={{
                padding: "10px 14px", borderRadius: 8, fontSize: 13, fontFamily: FONTS.body,
                background: msg.startsWith("Erro") ? "#fef2f2" : "#f0fdf4",
                color: msg.startsWith("Erro") ? "#dc2626" : "#15803d",
              }}>{msg}</div>
            )}
          </>
        )}
      </div>
    </IntranetLayout>
  );
}
