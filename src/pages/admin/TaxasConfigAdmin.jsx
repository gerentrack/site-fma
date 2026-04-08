/**
 * TaxasConfigAdmin.jsx — Configuração global de taxas (Regimento 2026).
 * Rota: /admin/taxas
 *
 * Permite ao admin:
 *   - Toggle "Bloquear envio sem comprovante de pagamento"
 *   - Editar dados bancários (PIX, conta) exibidos ao organizador
 *   - Visualizar tabela padrão de taxas (Art. 7)
 *   - Visualizar tabela de arbitragem (Art. 6, informativa)
 */
import { useState, useEffect, useRef } from "react";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";
import { TaxasConfigService } from "../../services";
import { TABELA_PADRAO, PRAZOS, TABELA_ARBITRAGEM, formatarMoeda, calcularTaxaModalidade } from "../../utils/taxaCalculator";
import { uploadFile } from "../../services/storageService";

export default function TaxasConfigAdmin() {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [simInscritos, setSimInscritos] = useState(500);
  const [uploadingAssinatura, setUploadingAssinatura] = useState(false);
  const assinaturaRef = useRef(null);

  useEffect(() => {
    TaxasConfigService.get().then(r => {
      setConfig(r.data);
      setLoading(false);
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await TaxasConfigService.update(config);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const updateConfig = (patch) => {
    setConfig(c => ({ ...c, ...patch }));
    setSaved(false);
  };

  const updateBancarios = (patch) => {
    setConfig(c => ({ ...c, dadosBancarios: { ...c.dadosBancarios, ...patch } }));
    setSaved(false);
  };

  if (loading) {
    return (
      <AdminLayout title="Configuração de Taxas">
        <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
      </AdminLayout>
    );
  }

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 20 };
  const label = { display: "block", fontWeight: 600, fontSize: 13, marginBottom: 4, color: COLORS.grayDark };
  const input = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };
  const simResult = calcularTaxaModalidade(simInscritos);

  return (
    <AdminLayout title="Configuracao de Taxas">
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── Bloqueio de envio ────────────────────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Controle de Pagamento
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={config.bloqueioEnvioSemPagamento ?? true}
                onChange={e => updateConfig({ bloqueioEnvioSemPagamento: e.target.checked })}
                style={{ width: 18, height: 18, accentColor: COLORS.primary }}
              />
              <span style={{ fontWeight: 600 }}>Bloquear envio de solicitacao sem comprovante de pagamento</span>
            </label>
          </div>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "4px 0 0" }}>
            Quando ativado, o organizador so podera enviar a solicitacao apos anexar o comprovante de pagamento.
            Quando desativado, o envio e liberado com aviso de pagamento pendente, e o admin pode cobrar na analise.
          </p>
        </div>

        {/* ── Dados bancários ─────────────────────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Dados Bancarios para Pagamento
          </h3>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 16px" }}>
            Estes dados serao exibidos ao organizador no momento do pagamento da taxa.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <span style={label}>Favorecido</span>
              <input style={input} value={config.dadosBancarios?.favorecido || ""} onChange={e => updateBancarios({ favorecido: e.target.value })} />
            </div>
            <div>
              <span style={label}>CNPJ</span>
              <input style={input} value={config.dadosBancarios?.cnpj || ""} onChange={e => updateBancarios({ cnpj: e.target.value })} />
            </div>
            <div>
              <span style={label}>Banco</span>
              <input style={input} value={config.dadosBancarios?.banco || ""} onChange={e => updateBancarios({ banco: e.target.value })} placeholder="Ex: Caixa Economica Federal" />
            </div>
            <div>
              <span style={label}>Agencia</span>
              <input style={input} value={config.dadosBancarios?.agencia || ""} onChange={e => updateBancarios({ agencia: e.target.value })} />
            </div>
            <div>
              <span style={label}>Conta</span>
              <input style={input} value={config.dadosBancarios?.conta || ""} onChange={e => updateBancarios({ conta: e.target.value })} />
            </div>
            <div>
              <span style={label}>Chave PIX</span>
              <input style={input} value={config.dadosBancarios?.pix || ""} onChange={e => updateBancarios({ pix: e.target.value })} placeholder="CPF, CNPJ, e-mail ou chave aleatoria" />
            </div>
          </div>
        </div>

        {/* ── Anuidade de Arbitragem ──────────────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Anuidade de Arbitragem
          </h3>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 16px" }}>
            Configuracao do valor da anuidade cobrada dos arbitros. Pode ser valor unico ou diferenciado por nivel.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div>
              <span style={label}>Valor padrao (R$)</span>
              <input type="number" min="0" step="0.01" style={input}
                value={config.anuidade?.valorPadrao ?? ""}
                onChange={e => setConfig(c => ({ ...c, anuidade: { ...c.anuidade, valorPadrao: Number(e.target.value) || 0 } }))} />
            </div>
            <div>
              <span style={label}>Vencimento (dia/mes)</span>
              <input style={input} placeholder="31/03"
                value={config.anuidade?.vencimento ?? ""}
                onChange={e => setConfig(c => ({ ...c, anuidade: { ...c.anuidade, vencimento: e.target.value } }))} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 14 }}>
              <input type="checkbox"
                checked={config.anuidade?.diferenciadoPorNivel ?? false}
                onChange={e => setConfig(c => ({ ...c, anuidade: { ...c.anuidade, diferenciadoPorNivel: e.target.checked } }))}
                style={{ width: 18, height: 18, accentColor: COLORS.primary }} />
              <span style={{ fontWeight: 600 }}>Valor diferenciado por nivel</span>
            </label>
          </div>

          {config.anuidade?.diferenciadoPorNivel && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              {["A", "B", "C", "NI"].map(nivel => (
                <div key={nivel}>
                  <span style={label}>Nivel {nivel} (R$)</span>
                  <input type="number" min="0" step="0.01" style={input}
                    value={config.anuidade?.valoresPorNivel?.[nivel] ?? ""}
                    onChange={e => setConfig(c => ({
                      ...c,
                      anuidade: {
                        ...c.anuidade,
                        valoresPorNivel: { ...c.anuidade?.valoresPorNivel, [nivel]: Number(e.target.value) || 0 },
                      },
                    }))} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Tabela de taxas (Art. 7) ────────────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 4px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Tabela de Taxas — Art. 7 (Solicitacao de Permit/Chancela)
          </h3>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 16px" }}>
            Valores definidos pelo Regimento de Taxas 2026. Aplicam-se a Permit e Chancela.
          </p>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: COLORS.offWhite }}>
                <th style={th}>Faixa de inscritos</th>
                <th style={th}>Valor por inscrito</th>
              </tr>
            </thead>
            <tbody>
              {TABELA_PADRAO.faixas.map((f, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  <td style={td}>
                    {i === 0 ? `Ate ${f.ate}` : i === TABELA_PADRAO.faixas.length - 1 ? `Acima de ${TABELA_PADRAO.faixas[i - 1].ate + 1}` : `${TABELA_PADRAO.faixas[i - 1].ate + 1} a ${f.ate}`}
                  </td>
                  <td style={td}>{formatarMoeda(f.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 12 }}>
            <div style={infoBox}>
              <span style={{ fontSize: 11, color: COLORS.gray }}>Minimo/modalidade</span>
              <strong>{formatarMoeda(TABELA_PADRAO.minimo)}</strong>
            </div>
            <div style={infoBox}>
              <span style={{ fontSize: 11, color: COLORS.gray }}>Maximo/modalidade</span>
              <strong>{formatarMoeda(TABELA_PADRAO.maximo)}</strong>
            </div>
            <div style={infoBox}>
              <span style={{ fontSize: 11, color: COLORS.gray }}>Taxa de urgencia</span>
              <strong>{formatarMoeda(TABELA_PADRAO.taxaUrgencia)}</strong>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
            <div style={infoBox}>
              <span style={{ fontSize: 11, color: COLORS.gray }}>Permit: urgencia &lt; {PRAZOS.permit.urgenciaDias} dias | minimo &lt; {PRAZOS.permit.minimoDias} dias uteis</span>
            </div>
            <div style={infoBox}>
              <span style={{ fontSize: 11, color: COLORS.gray }}>Chancela: urgencia &lt; {PRAZOS.chancela.urgenciaDias} dias | minimo &lt; {PRAZOS.chancela.minimoDias} dias</span>
            </div>
          </div>

          {/* Simulador */}
          <div style={{ marginTop: 16, padding: 12, background: "#f0fdf4", borderRadius: 8, border: "1px solid #bbf7d0" }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: "#15803d" }}>Simulador</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <input
                type="number" min="0" value={simInscritos}
                onChange={e => setSimInscritos(Number(e.target.value) || 0)}
                style={{ ...input, width: 120 }}
              />
              <span style={{ fontSize: 13 }}>inscritos = </span>
              <strong style={{ fontSize: 15, color: "#15803d" }}>{formatarMoeda(simResult.valorFinal)}</strong>
              {simResult.valorBruto !== simResult.valorFinal && (
                <span style={{ fontSize: 11, color: COLORS.gray }}>(bruto: {formatarMoeda(simResult.valorBruto)})</span>
              )}
            </div>
          </div>
        </div>

        {/* ── Tabela de arbitragem (Art. 6) ───────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 4px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Tabela de Arbitragem — Art. 6 (Referencia)
          </h3>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 12px" }}>
            Valores de referencia. Despesas de arbitragem sao de custeio integral do organizador (Art. 8),
            acrescidas de transporte, hospedagem e alimentacao.
          </p>

          {/* Corridas de Rua — até 6h */}
          <h4 style={subheading}>Corridas de Rua — ate 6 horas</h4>
          <table style={tableStyle}>
            <thead><tr style={{ background: COLORS.offWhite }}><th style={th}>Funcao</th><th style={th}>Diaria</th></tr></thead>
            <tbody>
              {TABELA_ARBITRAGEM.corridaDeRua6h.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  <td style={td}>{r.funcao}</td><td style={td}>{formatarMoeda(r.diaria)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Corridas de Rua — até 12h */}
          <h4 style={subheading}>Corridas de Rua — ate 12 horas</h4>
          <table style={tableStyle}>
            <thead><tr style={{ background: COLORS.offWhite }}><th style={th}>Funcao</th><th style={th}>Diaria</th></tr></thead>
            <tbody>
              {TABELA_ARBITRAGEM.corridaDeRua12h.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  <td style={td}>{r.funcao}</td><td style={td}>{formatarMoeda(r.diaria)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pista e Campo — por nível */}
          <h4 style={subheading}>Pista e Campo — por nivel</h4>
          <table style={tableStyle}>
            <thead><tr style={{ background: COLORS.offWhite }}><th style={th}>Nivel</th><th style={th}>Diaria</th></tr></thead>
            <tbody>
              {TABELA_ARBITRAGEM.pistaECampo.porNivel.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  <td style={td}>Nivel {r.nivel}</td><td style={td}>{formatarMoeda(r.diaria)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Pista e Campo — por função */}
          <h4 style={subheading}>Pista e Campo — por funcao</h4>
          <table style={tableStyle}>
            <thead><tr style={{ background: COLORS.offWhite }}><th style={th}>Funcao</th><th style={th}>Diaria</th><th style={th}>Obs.</th></tr></thead>
            <tbody>
              {TABELA_ARBITRAGEM.pistaECampo.porFuncao.map((r, i) => (
                <tr key={i} style={{ borderBottom: `1px solid ${COLORS.grayLight}` }}>
                  <td style={td}>{r.funcao}</td><td style={td}>{formatarMoeda(r.diaria)}</td><td style={td}>{r.obs || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── Assinatura do Presidente ─────────────────────────────── */}
        <div style={card}>
          <h3 style={{ margin: "0 0 12px", fontFamily: FONTS.heading, fontSize: 18, color: COLORS.primary }}>
            Assinatura do Presidente
          </h3>
          <p style={{ fontSize: 12, color: COLORS.gray, margin: "0 0 16px" }}>
            Imagem da assinatura utilizada em recibos, permits e demais documentos oficiais.
            Recomendado: PNG com fundo transparente, resolucao minima 300x100px.
          </p>

          {config?.assinaturaPresidenteUrl && (
            <div style={{ marginBottom: 12, padding: 12, background: COLORS.offWhite, borderRadius: 8, textAlign: "center" }}>
              <img src={config.assinaturaPresidenteUrl} alt="Assinatura" style={{ maxHeight: 80, maxWidth: 300 }} />
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <span style={label}>Nome do Presidente</span>
              <input style={input}
                value={config?.presidenteNome || ""}
                onChange={e => updateConfig({ presidenteNome: e.target.value })}
                placeholder="Nome completo" />
            </div>
            <div>
              <span style={label}>Cargo / Titulo</span>
              <input style={input}
                value={config?.presidenteCargo || "Presidente"}
                onChange={e => updateConfig({ presidenteCargo: e.target.value })} />
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="file" ref={assinaturaRef} accept="image/png,image/jpeg" style={{ fontSize: 13 }} />
            <button
              disabled={uploadingAssinatura}
              onClick={async () => {
                const file = assinaturaRef.current?.files?.[0];
                if (!file) return;
                setUploadingAssinatura(true);
                const r = await uploadFile(file, "config/assinatura");
                setUploadingAssinatura(false);
                if (r.url) {
                  updateConfig({ assinaturaPresidenteUrl: r.url, assinaturaPresidentePath: r.path });
                }
                assinaturaRef.current.value = "";
              }}
              style={{
                padding: "8px 18px", borderRadius: 8, border: "none",
                background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 600,
                cursor: uploadingAssinatura ? "not-allowed" : "pointer",
              }}>
              {uploadingAssinatura ? "Enviando..." : "Enviar Assinatura"}
            </button>
          </div>
        </div>

        {/* ── Botão salvar ────────────────────────────────────────── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginBottom: 40 }}>
          {saved && <span style={{ color: "#15803d", fontSize: 14, alignSelf: "center" }}>Salvo com sucesso!</span>}
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "10px 24px", background: COLORS.primary, color: "#fff", border: "none",
              borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: saving ? "wait" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? "Salvando..." : "Salvar Configuracoes"}
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}

// ── Estilos auxiliares ──────────────────────────────────────────────────────

const th = { textAlign: "left", padding: "8px 12px", fontSize: 12, fontWeight: 700, color: COLORS.grayDark };
const td = { padding: "8px 12px", fontSize: 13 };
const tableStyle = { width: "100%", borderCollapse: "collapse", fontSize: 14, marginBottom: 16 };
const subheading = { fontSize: 14, fontWeight: 600, color: COLORS.grayDark, margin: "16px 0 6px" };
const infoBox = { padding: "8px 12px", background: COLORS.offWhite, borderRadius: 8, display: "flex", flexDirection: "column", gap: 2, fontSize: 14 };
