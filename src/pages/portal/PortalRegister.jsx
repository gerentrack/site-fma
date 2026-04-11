/**
 * PortalRegister.jsx — Cadastro de novo organizador.
 * Rota: /portal/cadastro
 * - Validação de e-mail único (via API)
 * - CPF/CNPJ com tipo pessoa selecionável
 * - Auto-login após cadastro bem-sucedido
 */
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrganizer } from "../../context/OrganizerContext";
import { COLORS, FONTS } from "../../styles/colors";
import PoliticaPrivacidade from "../public/PoliticaPrivacidade";
import TermosUso from "../public/TermosUso";
import { enviarBoasVindasOrganizador } from "../../services/emailService";
import { validarCPF, validarCNPJ, cpfCnpjJaExisteOrganizador } from "../../utils/cpfCnpj";
import { LGPD_VERSIONS } from "../../config/navigation";
import { useCep } from "../../hooks/useCep";

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

const inpStyle = {
  width: "100%", padding: "10px 12px", borderRadius: 8,
  border: `1.5px solid ${COLORS.grayLight}`,
  fontFamily: FONTS.body, fontSize: 14, outline: "none",
  boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s",
};

const readOnlyStyle = { ...inpStyle, background: "#f3f4f6", color: COLORS.gray, cursor: "not-allowed" };

const errStyle = { fontFamily: FONTS.body, fontSize: 11, color: "#dc2626", marginTop: 2 };

function Field({ label, required, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark }}>
        {label}{required && <span style={{ color: COLORS.primary }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function mask(val = "", tipo) {
  const d = val.replace(/\D/g, "");
  if (tipo === "pf") return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/,"$1.$2.$3-$4").slice(0, 14);
  return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,"$1.$2.$3/$4-$5").slice(0, 18);
}
function maskPhone(v = "") {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d{4})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/,"($1) $2-$3").replace(/-$/,"");
}

export default function PortalRegister() {
  const { register, isAuthenticated } = useOrganizer();
  const navigate = useNavigate();

  const [tipoPessoa, setTipoPessoa] = useState("pj");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    cpfCnpj: "", phone: "", organization: "",
    city: "", state: "MG", address: "", website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjMsg, setCnpjMsg] = useState("");
  const [cnpjValidated, setCnpjValidated] = useState(false);
  const [cnpjFound, setCnpjFound] = useState(false);
  const [legalModal, setLegalModal] = useState(null); // "privacidade" | "termos" | null

  const [cepFound, setCepFound] = useState(false);
  const { setCep: setCepHook, loading: cepLoading } = useCep((result) => {
    setForm(f => ({
      ...f,
      address: [result.logradouro, result.bairro].filter(Boolean).join(", ") || f.address,
      city: result.cidade || f.city,
      state: result.estado || f.state,
    }));
    setCepFound(true);
  });

  useEffect(() => {
    if (isAuthenticated) navigate("/portal", { replace: true });
  }, [isAuthenticated, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const buscarCnpj = async (cnpjRaw) => {
    if (cnpjRaw.length !== 14) return;
    if (!validarCNPJ(cnpjRaw)) { setCnpjMsg("CNPJ inválido. Verifique os dígitos."); setCnpjValidated(false); return; }
    setCnpjLoading(true);
    setCnpjMsg("");
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjRaw}`);
      if (!res.ok) { setCnpjMsg("CNPJ não encontrado na Receita Federal. Preencha os dados manualmente."); setCnpjFound(false); setCnpjLoading(false); setCnpjValidated(true); return; }
      const data = await res.json();
      setForm(f => ({
        ...f,
        name: data.razao_social || f.name,
        organization: data.nome_fantasia || f.organization,
        phone: data.ddd_telefone_1 ? data.ddd_telefone_1.replace(/\D/g, "") : f.phone,
        city: data.municipio || f.city,
        state: data.uf || f.state,
        address: [data.logradouro, data.numero, data.complemento, data.bairro].filter(Boolean).join(", ") || f.address,
      }));
      setCnpjFound(true);
      setCnpjMsg("Dados preenchidos automaticamente via Receita Federal.");
    } catch {
      setCnpjFound(false);
      setCnpjMsg("Não foi possível consultar o CNPJ. Preencha os dados manualmente.");
    }
    setCnpjLoading(false);
    setCnpjValidated(true);
  };


  const validate = async () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não coincidem";
    const cpfCnpjRaw = form.cpfCnpj.replace(/\D/g, "");
    if (tipoPessoa === "pf") {
      if (!validarCPF(cpfCnpjRaw)) {
        e.cpfCnpj = "CPF inválido";
      } else {
        try { if (await cpfCnpjJaExisteOrganizador(cpfCnpjRaw)) e.cpfCnpj = "Este CPF já está cadastrado"; } catch {}
      }
    } else {
      if (!validarCNPJ(cpfCnpjRaw)) {
        e.cpfCnpj = "CNPJ inválido";
      } else {
        try { if (await cpfCnpjJaExisteOrganizador(cpfCnpjRaw)) e.cpfCnpj = "Este CNPJ já está cadastrado"; } catch {}
      }
    }
    if (!form.city.trim()) e.city = "Cidade obrigatória";
    if (!cnpjFound && !form.numero?.trim()) e.numero = "Número obrigatório";
    if (!lgpdConsent) e.lgpd = "Você deve aceitar a Política de Privacidade e os Termos de Uso";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = await validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    setLoading(true);
    let website = (form.website || "").trim();
    if (website && !website.match(/^https?:\/\//)) website = "https://" + website;
    const result = await register({
      ...form,
      tipoPessoa,
      cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
      phone: form.phone.replace(/\D/g, ""),
      organization: form.organization || form.name,
      website,
      emailVerified: false,
      lgpdConsentAt: new Date().toISOString(),
      lgpdConsentVersion: LGPD_VERSIONS.privacidade,
      termosConsentVersion: LGPD_VERSIONS.termos,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    enviarBoasVindasOrganizador({
      email: form.email,
      nome: form.name,
      organizacao: form.organization || form.name,
    }).catch(e => console.warn("Email boas-vindas:", e));
    navigate("/portal", { replace: true });
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 100%)",
      display: "flex", alignItems: "center", justifyContent: "center", padding: "32px 24px" }}>
      <div style={{ width: "100%", maxWidth: 540 }}>
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <Link to="/" style={{ textDecoration: "none" }}>
            <div style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900,
              letterSpacing: 4, color: "#60a5fa" }}>FMA</div>
          </Link>
          <h1 style={{ fontFamily: FONTS.heading, fontSize: 20, fontWeight: 800,
            textTransform: "uppercase", color: "#fff", margin: "8px 0 4px", letterSpacing: 1 }}>
            Cadastro de Organizador
          </h1>
          <p style={{ fontFamily: FONTS.body, fontSize: 13, color: "rgba(255,255,255,0.5)", margin: 0 }}>
            Permit &amp; Chancela — FMA
          </p>
        </div>

        <div style={{ background: "#fff", borderRadius: 16, padding: "32px 28px",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          <h2 style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark,
            textTransform: "uppercase", margin: "0 0 22px", letterSpacing: 0.5 }}>
            Criar conta
          </h2>

          {error && (
            <div style={{ background: "#fff5f5", border: "1px solid #fca5a5", borderRadius: 8,
              padding: "10px 14px", marginBottom: 18, fontFamily: FONTS.body, fontSize: 13, color: "#dc2626" }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* CNPJ primeiro */}
            <Field label="CNPJ" required>
              <div style={{ position: "relative" }}>
                <input value={mask(form.cpfCnpj, "pj")}
                  onChange={e => {
                    const raw = e.target.value.replace(/\D/g, "");
                    set("cpfCnpj", raw);
                    if (raw.length < 14) { setCnpjValidated(false); setCnpjMsg(""); }
                    if (raw.length === 14) buscarCnpj(raw);
                  }}
                  placeholder="00.000.000/0000-00"
                  style={inpStyle} autoFocus />
                {cnpjLoading && <span style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14 }}>⏳</span>}
              </div>
              {errors.cpfCnpj && <div style={errStyle}>{errors.cpfCnpj}</div>}
              {cnpjMsg && <div style={{ fontFamily: FONTS.body, fontSize: 11, color: cnpjMsg.includes("preenchidos") ? "#15803d" : "#b45309", marginTop: 2 }}>{cnpjMsg}</div>}
              {!cnpjValidated && !cnpjLoading && (
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                  Digite o CNPJ para desbloquear os demais campos.
                </div>
              )}
            </Field>

            {/* Demais campos — ocultos até consulta do CNPJ */}
            <div style={{ display: cnpjValidated ? "grid" : "none", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Razão social" required>
                  <input value={form.name} readOnly={cnpjFound}
                    onChange={cnpjFound ? undefined : e => set("name", e.target.value)}
                    placeholder="Razão social da empresa"
                    style={cnpjFound ? readOnlyStyle : inpStyle} />
                  {errors.name && <div style={errStyle}>{errors.name}</div>}
                </Field>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Nome fantasia">
                  <input value={cnpjFound ? (form.organization || "Não cadastrado na Receita Federal") : form.organization}
                    readOnly={cnpjFound}
                    onChange={cnpjFound ? undefined : e => set("organization", e.target.value)}
                    placeholder="Nome fantasia (opcional)"
                    style={cnpjFound ? { ...readOnlyStyle, color: form.organization ? COLORS.gray : "#9ca3af", fontStyle: form.organization ? "normal" : "italic" } : inpStyle} />
                </Field>
              </div>
              <Field label="Telefone / WhatsApp">
                <input value={maskPhone(form.phone)}
                  onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="(31) 99999-9999" style={inpStyle} />
              </Field>
              <div />

              {/* Endereço — via Receita ou via CEP */}
              {cnpjFound ? (
                <>
                  <div style={{ gridColumn: "1/-1" }}>
                    <Field label="Endereço">
                      <input value={form.address || "—"} readOnly style={readOnlyStyle} />
                    </Field>
                  </div>
                  <Field label="Cidade" required>
                    <input value={form.city} readOnly style={readOnlyStyle} />
                  </Field>
                  <Field label="Estado">
                    <input value={form.state} readOnly style={readOnlyStyle} />
                  </Field>
                </>
              ) : (
                <>
                  <div style={{ gridColumn: "1/-1" }}>
                    <Field label="CEP" required>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <input value={form.cep || ""}
                          onChange={e => { const v = e.target.value; set("cep", v); setCepHook(v); if (v.replace(/\D/g, "").length < 8) setCepFound(false); }}
                          placeholder="00000-000" maxLength={9}
                          style={{ ...inpStyle, maxWidth: 160 }} />
                        {cepLoading && <span style={{ fontSize: 12, color: COLORS.gray }}>Buscando...</span>}
                        <a href="https://buscacepinter.correios.com.br/app/endereco/index.php" target="_blank" rel="noreferrer"
                          style={{ fontSize: 12, color: COLORS.primary, textDecoration: "underline", whiteSpace: "nowrap" }}>
                          Nao sei meu CEP
                        </a>
                      </div>
                    </Field>
                  </div>
                  {cepFound && (
                    <>
                      <div style={{ gridColumn: "1/-1" }}>
                        <Field label="Endereço">
                          <input value={form.address || ""} readOnly style={readOnlyStyle} />
                        </Field>
                      </div>
                      <Field label="Número" required>
                        <input value={form.numero || ""}
                          onChange={e => set("numero", e.target.value)}
                          placeholder="Nº" style={inpStyle} />
                        {errors.numero && <div style={errStyle}>{errors.numero}</div>}
                      </Field>
                      <Field label="Complemento">
                        <input value={form.complemento || ""}
                          onChange={e => set("complemento", e.target.value)}
                          placeholder="Sala, andar, bloco (opcional)" style={inpStyle} />
                      </Field>
                      <Field label="Cidade" required>
                        <input value={form.city} readOnly style={readOnlyStyle} />
                        {errors.city && <div style={errStyle}>{errors.city}</div>}
                      </Field>
                      <Field label="Estado">
                        <input value={form.state} readOnly style={readOnlyStyle} />
                      </Field>
                    </>
                  )}
                </>
              )}

              {/* Site — opcional, com modelo e preview */}
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="Site (opcional)">
                  <input value={form.website || ""}
                    onChange={e => set("website", e.target.value)}
                    placeholder="www.seusite.com.br"
                    style={inpStyle} />
                  <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, marginTop: 4 }}>
                    Modelo: www.seusite.com.br
                  </div>
                  {form.website && /\..+/.test(form.website) && (
                    <div style={{ marginTop: 8, padding: "10px 14px", borderRadius: 8, background: "#f0f9ff", border: "1px solid #bae6fd" }}>
                      <div style={{ fontFamily: FONTS.heading, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: "#0284c7", marginBottom: 4 }}>Preview</div>
                      <a href={form.website.match(/^https?:\/\//) ? form.website : "https://" + form.website}
                        target="_blank" rel="noreferrer"
                        style={{ fontFamily: FONTS.body, fontSize: 13, color: "#0066cc", textDecoration: "underline", wordBreak: "break-all" }}>
                        {form.website.match(/^https?:\/\//) ? form.website : "https://" + form.website}
                      </a>
                    </div>
                  )}
                </Field>
              </div>

              {/* E-mail e senha */}
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="E-mail" required>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="seu@email.com" style={inpStyle} />
                  {errors.email && <div style={errStyle}>{errors.email}</div>}
                </Field>
              </div>
              <Field label="Senha" required>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres" style={inpStyle} />
                {errors.password && <div style={errStyle}>{errors.password}</div>}
              </Field>
              <Field label="Confirmar senha" required>
                <input type="password" value={form.confirmPassword}
                  onChange={e => set("confirmPassword", e.target.value)}
                  placeholder="Repita a senha" style={inpStyle} />
                {errors.confirmPassword && <div style={errStyle}>{errors.confirmPassword}</div>}
              </Field>
            </div>

            {/* Consentimento LGPD */}
            <div style={{ marginTop: 8, display: cnpjValidated ? "block" : "none" }}>
              <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
                <input type="checkbox" checked={lgpdConsent} onChange={e => setLgpdConsent(e.target.checked)}
                  style={{ marginTop: 3, width: 16, height: 16, cursor: "pointer", flexShrink: 0 }} />
                <span style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.grayDark, lineHeight: 1.5 }}>
                  Li e concordo com a{" "}
                  <button type="button" onClick={() => setLegalModal("privacidade")}
                    style={{ background: "none", border: "none", padding: 0, color: "#0066cc", textDecoration: "underline", cursor: "pointer", fontFamily: FONTS.body, fontSize: 13 }}>
                    Política de Privacidade
                  </button>{" "}e os{" "}
                  <button type="button" onClick={() => setLegalModal("termos")}
                    style={{ background: "none", border: "none", padding: 0, color: "#0066cc", textDecoration: "underline", cursor: "pointer", fontFamily: FONTS.body, fontSize: 13 }}>
                    Termos de Uso
                  </button>{" "}da FMA.
                </span>
              </label>
              {errors.lgpd && <div style={errStyle}>{errors.lgpd}</div>}
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop: 8, padding: "14px", borderRadius: 8, border: "none", display: cnpjValidated ? "block" : "none",
                background: loading ? COLORS.gray : "#0066cc", color: "#fff",
                fontFamily: FONTS.heading, fontSize: 15, fontWeight: 800,
                cursor: loading ? "not-allowed" : "pointer", textTransform: "uppercase",
                letterSpacing: 1 }}>
              {loading ? "Criando conta..." : "Criar conta e entrar"}
            </button>
          </form>

          <div style={{ marginTop: 18, textAlign: "center", fontFamily: FONTS.body, fontSize: 13 }}>
            <span style={{ color: COLORS.gray }}>Já tem conta? </span>
            <Link to="/portal/login" style={{ color: "#0066cc", fontWeight: 700, textDecoration: "none" }}>
              Entrar
            </Link>
          </div>
        </div>

        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/" style={{ fontFamily: FONTS.body, fontSize: 12,
            color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
            ← Voltar ao site da FMA
          </Link>
        </div>
      </div>

      {/* Modal de Política / Termos */}
      {legalModal && (
        <div onClick={() => setLegalModal(null)}
          style={{ position: "fixed", inset: 0, zIndex: 99999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "#fff", borderRadius: 16, width: "100%", maxWidth: 700, maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px", borderBottom: `1px solid ${COLORS.grayLight}`, flexShrink: 0 }}>
              <span style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 15, color: COLORS.dark, textTransform: "uppercase" }}>
                {legalModal === "privacidade" ? "Política de Privacidade" : "Termos de Uso"}
              </span>
              <button onClick={() => setLegalModal(null)}
                style={{ padding: "6px 14px", borderRadius: 6, background: COLORS.grayLight, border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>
                Fechar
              </button>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: 0 }}>
              {legalModal === "privacidade"
                ? <PoliticaPrivacidade />
                : <TermosUso />}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
