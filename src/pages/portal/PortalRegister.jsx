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

const ESTADOS = ["AC","AL","AP","AM","BA","CE","DF","ES","GO","MA","MT","MS","MG","PA","PB","PR","PE","PI","RJ","RN","RS","RO","RR","SC","SP","SE","TO"];

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

  const [tipoPessoa, setTipoPessoa] = useState("pf");
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    cpfCnpj: "", phone: "", organization: "",
    city: "", state: "MG", address: "", website: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    useEffect(() => {
    if (isAuthenticated) navigate("/portal", { replace: true });
  }, [isAuthenticated, navigate]);
  }, [isAuthenticated, navigate]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const inp = (focused) => ({
    width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1.5px solid ${focused ? "#60a5fa" : COLORS.grayLight}`,
    fontFamily: FONTS.body, fontSize: 14, outline: "none",
    boxSizing: "border-box", background: "#fff", transition: "border-color 0.15s",
  });

  const Field = ({ label, required, children }) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700,
        textTransform: "uppercase", letterSpacing: 1, color: COLORS.grayDark }}>
        {label}{required && <span style={{ color: COLORS.primary }}> *</span>}
      </label>
      {children}
    </div>
  );

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Nome obrigatório";
    if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "E-mail inválido";
    if (form.password.length < 6) e.password = "Mínimo 6 caracteres";
    if (form.password !== form.confirmPassword) e.confirmPassword = "Senhas não coincidem";
    const cpfCnpjRaw = form.cpfCnpj.replace(/\D/g, "");
    if (tipoPessoa === "pf" && cpfCnpjRaw.length !== 11) e.cpfCnpj = "CPF inválido";
    if (tipoPessoa === "pj" && cpfCnpjRaw.length !== 14) e.cpfCnpj = "CNPJ inválido";
    if (!form.city.trim()) e.city = "Cidade obrigatória";
    return e;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    const v = validate();
    if (Object.keys(v).length > 0) { setErrors(v); return; }
    setErrors({});
    setLoading(true);
    const result = await register({
      ...form,
      tipoPessoa,
      cpfCnpj: form.cpfCnpj.replace(/\D/g, ""),
      phone: form.phone.replace(/\D/g, ""),
      organization: form.organization || form.name,
    });
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    navigate("/portal", { replace: true });
  };

  const errStyle = { fontFamily: FONTS.body, fontSize: 11, color: "#dc2626", marginTop: 2 };

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
            {/* Tipo de pessoa */}
            <div style={{ display: "flex", gap: 0, border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, overflow: "hidden" }}>
              {[{ v: "pf", l: "Pessoa Física" }, { v: "pj", l: "Pessoa Jurídica" }].map(opt => (
                <button key={opt.v} type="button" onClick={() => setTipoPessoa(opt.v)}
                  style={{ flex: 1, padding: "10px", border: "none", cursor: "pointer",
                    background: tipoPessoa === opt.v ? "#0066cc" : "#fff",
                    color: tipoPessoa === opt.v ? "#fff" : COLORS.gray,
                    fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700 }}>
                  {opt.l}
                </button>
              ))}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label={tipoPessoa === "pf" ? "Nome completo" : "Razão social"} required>
                  <input value={form.name} onChange={e => set("name", e.target.value)}
                    placeholder="Nome completo" style={inp()} />
                  {errors.name && <div style={errStyle}>{errors.name}</div>}
                </Field>
              </div>
              <Field label={tipoPessoa === "pf" ? "CPF" : "CNPJ"} required>
                <input value={mask(form.cpfCnpj, tipoPessoa)}
                  onChange={e => set("cpfCnpj", e.target.value.replace(/\D/g, ""))}
                  placeholder={tipoPessoa === "pf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  style={inp()} />
                {errors.cpfCnpj && <div style={errStyle}>{errors.cpfCnpj}</div>}
              </Field>
              <Field label="Telefone / WhatsApp">
                <input value={maskPhone(form.phone)}
                  onChange={e => set("phone", e.target.value.replace(/\D/g, ""))}
                  placeholder="(31) 99999-9999" style={inp()} />
              </Field>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label={tipoPessoa === "pf" ? "Nome do evento / organização" : "Nome fantasia"}>
                  <input value={form.organization} onChange={e => set("organization", e.target.value)}
                    placeholder="Ex: Correia Sports Eventos" style={inp()} />
                </Field>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <Field label="E-mail" required>
                  <input type="email" value={form.email} onChange={e => set("email", e.target.value)}
                    placeholder="seu@email.com" style={inp()} />
                  {errors.email && <div style={errStyle}>{errors.email}</div>}
                </Field>
              </div>
              <Field label="Senha" required>
                <input type="password" value={form.password} onChange={e => set("password", e.target.value)}
                  placeholder="Mínimo 6 caracteres" style={inp()} />
                {errors.password && <div style={errStyle}>{errors.password}</div>}
              </Field>
              <Field label="Confirmar senha" required>
                <input type="password" value={form.confirmPassword}
                  onChange={e => set("confirmPassword", e.target.value)}
                  placeholder="Repita a senha" style={inp()} />
                {errors.confirmPassword && <div style={errStyle}>{errors.confirmPassword}</div>}
              </Field>
              <Field label="Cidade" required>
                <input value={form.city} onChange={e => set("city", e.target.value)}
                  placeholder="Belo Horizonte" style={inp()} />
                {errors.city && <div style={errStyle}>{errors.city}</div>}
              </Field>
              <Field label="Estado">
                <select value={form.state} onChange={e => set("state", e.target.value)} style={inp()}>
                  {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </Field>
            </div>

            <button type="submit" disabled={loading}
              style={{ marginTop: 8, padding: "14px", borderRadius: 8, border: "none",
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
    </div>
  );
}
