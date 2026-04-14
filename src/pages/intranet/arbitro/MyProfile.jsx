/**
 * MyProfile.jsx — Perfil completo do árbitro com edição de todos os campos.
 * Rota: /intranet/perfil
 */
import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import IntranetLayout from "../IntranetLayout";
import { useIntranet } from "../../../context/IntranetContext";
import { RefereesService } from "../../../services/index";
import { intranetAuthAPI } from "../../../data/api";
import { useCep } from "../../../hooks/useCep";
import { uploadFile, deleteFile } from "../../../services/storageService";
import ImageCropper from "../../../components/ui/ImageCropper";
import { gerarCredencialPdf } from "../../../services/credencialArbitroPdf";
import { TaxasConfigService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";
import { REFEREE_CATEGORIES, REFEREE_ROLES, REFEREE_STATUS } from "../../../config/navigation";
import { validarCPF, validarNisPis, cpfJaExisteArbitro } from "../../../utils/cpfCnpj";

const roleMap = Object.fromEntries((REFEREE_ROLES || []).map(r => [r.value, r]));
const statusMap = Object.fromEntries((REFEREE_STATUS || []).map(s => [s.value, s]));

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
const SEXO = [{ value: "masculino", label: "Masculino" }, { value: "feminino", label: "Feminino" }];
const ESTADO_CIVIL = [{ value: "solteiro", label: "Solteiro(a)" }, { value: "casado", label: "Casado(a)" }, { value: "divorciado", label: "Divorciado(a)" }, { value: "viuvo", label: "Viúvo(a)" }, { value: "uniao_estavel", label: "União Estável" }];
const COR = [{ value: "branca", label: "Branca" }, { value: "preta", label: "Preta" }, { value: "parda", label: "Parda" }, { value: "amarela", label: "Amarela" }, { value: "indigena", label: "Indígena" }, { value: "nao_informar", label: "Prefiro não informar" }];
const ESCOLARIDADE = [{ value: "fundamental", label: "Ensino Fundamental" }, { value: "medio", label: "Ensino Médio" }, { value: "superior", label: "Ensino Superior" }, { value: "pos_graduacao", label: "Pós-Graduação" }, { value: "mestrado", label: "Mestrado" }, { value: "doutorado", label: "Doutorado" }, { value: "pos_doutorado", label: "Pós-Doutorado" }];
const TIPO_CONTA = [{ value: "corrente", label: "Corrente" }, { value: "poupanca", label: "Poupança" }, { value: "pagamento", label: "Pagamento" }];
const CHAVE_PIX_TIPO = [{ value: "cpf", label: "CPF" }, { value: "email", label: "E-mail" }, { value: "telefone", label: "Telefone" }, { value: "aleatoria", label: "Aleatória" }];
const CAMISA = [{ value: "P", label: "P" }, { value: "M", label: "M" }, { value: "G", label: "G" }, { value: "GG", label: "GG" }, { value: "XG", label: "XG" }];
const SANGUE = ["A+","A-","B+","B-","AB+","AB-","O+","O-"].map(v => ({ value: v, label: v }));
const DESLOCAMENTO = [{ value: "local", label: "Apenas minha cidade" }, { value: "metropolitana", label: "Região metropolitana" }, { value: "estadual", label: "Todo o estado" }, { value: "nacional", label: "Nacional" }];
const BANCOS = [
  { value: "001", label: "001 - Banco do Brasil" }, { value: "033", label: "033 - Santander" },
  { value: "104", label: "104 - Caixa Econômica" }, { value: "237", label: "237 - Bradesco" },
  { value: "341", label: "341 - Itaú Unibanco" }, { value: "077", label: "077 - Banco Inter" },
  { value: "260", label: "260 - Nubank" }, { value: "336", label: "336 - C6 Bank" },
  { value: "748", label: "748 - Sicredi" }, { value: "756", label: "756 - Sicoob" },
  { value: "212", label: "212 - Banco Original" }, { value: "422", label: "422 - Safra" },
  { value: "000", label: "Outro" },
];

function maskCpf(v) {
  return (v || "").replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}
function maskNis(v) {
  return (v || "").replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5})(\d)/, "$1.$2").replace(/(\d{3}\.\d{5}\.\d{2})(\d)/, "$1-$2");
}
function maskPhone(v) {
  const d = (v || "").replace(/\D/g, "").replace(/^55/, "").slice(0, 11);
  if (d.length <= 10) return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2");
  return d.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2");
}
function maskAgencia(v) {
  return (v || "").replace(/\D/g, "").slice(0, 5);
}
function maskContaDigito(v) {
  const d = (v || "").replace(/[^\d-]/g, "");
  return d.slice(0, 13);
}
const PREPS = new Set(["da", "de", "do", "dos", "das", "e"]);
function capitalize(v) {
  if (!v) return "";
  return v.toLowerCase().split(/\s+/).map((w, i) => {
    if (!w) return w;
    if (i > 0 && PREPS.has(w)) return w;
    return w.charAt(0).toUpperCase() + w.slice(1);
  }).join(" ");
}
function lowercase(v) { return (v || "").toLowerCase(); }

const inp = { width: "100%", padding: "10px 13px", borderRadius: 8, border: `1.5px solid #e8e8e8`, fontFamily: "'Barlow',sans-serif", fontSize: 14, outline: "none", boxSizing: "border-box" };
const sel = { ...inp, cursor: "pointer" };
const card = { background: "#fff", borderRadius: 12, padding: "24px 26px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)", marginBottom: 20 };
const sectionTitle = (txt) => <h2 style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 800, textTransform: "uppercase", letterSpacing: 2, color: COLORS.primary, margin: "0 0 16px", paddingBottom: 10, borderBottom: `1px solid ${COLORS.grayLight}` }}>{txt}</h2>;
const label = (txt) => <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{txt}</label>;

export default function MyProfile() {
  const { refereeId } = useIntranet();
  const [data, setData] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [cropSrc, setCropSrc] = useState(null);
  const [credencialUrl, setCredencialUrl] = useState(null);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  const { setCep: setCepHook, loading: cepLoading } = useCep((result) => {
    setData(prev => ({
      ...prev,
      logradouro: result.logradouro || prev.logradouro,
      bairro: result.bairro || prev.bairro,
      city: result.cidade || prev.city,
      state: result.estado || prev.state,
    }));
  });

  useEffect(() => {
    RefereesService.get(refereeId).then(r => { if (r.data) setData(r.data); });
  }, [refereeId]);

  const set = (k, v) => setData(prev => ({ ...prev, [k]: v }));

  const handleCep = (v) => {
    const digits = v.replace(/\D/g, "").slice(0, 8);
    const masked = digits.length > 5 ? `${digits.slice(0,5)}-${digits.slice(5)}` : digits;
    set("cep", masked);
    setCepHook(v);
  };

  const saveProfile = async () => {
    setSaving(true); setMsg("");
    const cpfRaw = (data.cpf || "").replace(/\D/g, "");
    if (cpfRaw && !validarCPF(cpfRaw)) {
      setSaving(false); setMsg("CPF inválido. Verifique os dígitos."); return;
    }
    if (cpfRaw && await cpfJaExisteArbitro(cpfRaw, refereeId)) {
      setSaving(false); setMsg("Este CPF já está cadastrado por outro árbitro."); return;
    }
    const nisRaw = (data.nisPis || "").replace(/\D/g, "");
    if (nisRaw && !validarNisPis(nisRaw)) {
      setSaving(false); setMsg("NIS/PIS/NIT inválido. Verifique os dígitos."); return;
    }
    const { id, password, email, ...payload } = data;
    const bancoInfo = BANCOS.find(b => b.value === payload.banco);
    if (bancoInfo) payload.bancoNome = bancoInfo.label.split(" - ")[1] || bancoInfo.label;
    payload.cpf = cpfRaw;
    const r = await RefereesService.update(refereeId, payload);
    setSaving(false);
    setMsg(r.error ? `Erro: ${r.error}` : "Dados atualizados com sucesso!");
  };

  const savePassword = async () => {
    if (!pw.current || !pw.next) { setPwMsg("Preencha todos os campos."); return; }
    if (pw.next !== pw.confirm) { setPwMsg("A nova senha e a confirmação não coincidem."); return; }
    if (pw.next.length < 6) { setPwMsg("A senha deve ter pelo menos 6 caracteres."); return; }
    setPwSaving(true); setPwMsg("");
    const r = await intranetAuthAPI.updatePassword(pw.current, pw.next, refereeId);
    setPwSaving(false);
    setPwMsg(r.error || "Senha alterada com sucesso!");
    if (!r.error) setPw({ current: "", next: "", confirm: "" });
  };

  if (!data) return <IntranetLayout><div style={{ padding: 40, fontFamily: FONTS.body, color: COLORS.gray }}>Carregando...</div></IntranetLayout>;

  const role = roleMap[data.role] || { label: data.role, color: COLORS.gray };
  const status = statusMap[data.status] || { label: data.status, color: COLORS.gray };
  const nivel = REFEREE_CATEGORIES.find(c => c.value === data.nivel);

  // Calcular % de completude do perfil
  const camposObrigatorios = ["name","email","phone","cpf","rg","dataNascimento","sexo","cep","logradouro","city","state","banco","agencia","contaDigito","chavePix","nivel","foto"];
  const preenchidos = camposObrigatorios.filter(k => data[k] && String(data[k]).trim() !== "").length;
  const completude = Math.round((preenchidos / camposObrigatorios.length) * 100);

  return (
    <IntranetLayout>
      <div style={{ padding: 36, maxWidth: 800 }}>
        <h1 style={{ fontFamily: FONTS.heading, fontSize: 26, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: "0 0 8px" }}>Meus Dados</h1>
        <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "0 0 20px" }}>Mantenha seus dados sempre atualizados.</p>

        {/* Barra de completude */}
        {completude < 100 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
              <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: COLORS.gray }}>Completude do perfil</span>
              <span style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, color: completude >= 80 ? "#15803d" : "#d97706" }}>{completude}%</span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: COLORS.grayLight, overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: 3, width: `${completude}%`, background: completude >= 80 ? "#15803d" : completude >= 50 ? "#d97706" : "#dc2626", transition: "width 0.5s" }} />
            </div>
          </div>
        )}

        {/* Status badges */}
        <div style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${role.color}15`, color: role.color }}>{role.label}</span>
          <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${status.color}15`, color: status.color }}>{status.label}</span>
          {nivel && <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: `${nivel.color}15`, color: nivel.color }}>{nivel.label}</span>}
          {completude < 100 && (
            <span style={{ padding: "4px 12px", borderRadius: 20, fontSize: 11, fontFamily: FONTS.heading, fontWeight: 700, background: completude >= 80 ? "#f0fdf4" : "#fef3c7", color: completude >= 80 ? "#15803d" : "#92400e" }}>
              Perfil {completude}% completo
            </span>
          )}
          <button onClick={async () => {
            setMsg("Gerando credencial...");
            const cRes = await TaxasConfigService.get();
            const cfg = cRes.data || {};
            const result = await gerarCredencialPdf({
              nome: data.name, cpf: data.cpf, rg: data.rg, nivel: data.nivel,
              registroCbat: data.registroCbat, fotoUrl: data.foto || "",
              refereeId, siteUrl: window.location.origin,
              validadeAno: new Date().getFullYear(),
              assinaturaUrl: cfg.assinaturaPresidenteUrl || "",
              presidenteNome: cfg.presidenteNome || "",
            });
            setCredencialUrl(URL.createObjectURL(result.blob));
            setMsg("");
          }} style={{ padding: "4px 12px", borderRadius: 20, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading }}>
            Minha Credencial
          </button>
        </div>

        {/* Modal credencial */}
        {credencialUrl && (
          <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center" }}
            onClick={() => { URL.revokeObjectURL(credencialUrl); setCredencialUrl(null); }}>
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, maxWidth: 720, width: "95%", maxHeight: "90vh", overflow: "auto" }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span style={{ fontFamily: FONTS.heading, fontSize: 16, fontWeight: 800, color: COLORS.dark }}>Minha Credencial</span>
                <button onClick={() => { URL.revokeObjectURL(credencialUrl); setCredencialUrl(null); }}
                  style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: COLORS.gray }}>X</button>
              </div>
              <iframe src={`${credencialUrl}#zoom=page-width`} style={{ width: "100%", height: 220, border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, background: "#f4f4f4" }} />
              <p style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray, textAlign: "center", margin: "10px 0 14px" }}>
                Imprima, recorte pela borda, dobre na linha tracejada e plastifique.
              </p>
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                <button onClick={() => { URL.revokeObjectURL(credencialUrl); setCredencialUrl(null); }}
                  style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Fechar</button>
                <button onClick={() => {
                  const win = window.open(credencialUrl);
                  if (win) { win.onload = () => { win.focus(); win.print(); }; }
                }}
                  style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: FONTS.heading }}>Imprimir</button>
                <a href={credencialUrl} download={`Credencial_${data.name?.replace(/\s+/g, "_")}.pdf`}
                  style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", fontFamily: FONTS.heading }}>Baixar PDF</a>
              </div>
            </div>
          </div>
        )}

        {/* Foto 3x4 */}
        {cropSrc && (
          <ImageCropper
            imageSrc={cropSrc}
            aspect={3 / 4}
            onCancel={() => setCropSrc(null)}
            onCropDone={async (blob) => {
              setCropSrc(null);
              setMsg("Enviando foto...");
              // Apagar foto anterior se existir
              if (data.foto) await deleteFile(data.foto);
              // Nome do arquivo com nome do árbitro
              const nomeArquivo = (data.name || "foto").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
              const file = new File([blob], `${nomeArquivo}.jpg`, { type: "image/jpeg" });
              const sanitizeName = (s) => (s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9\s-]/g, "").trim().replace(/\s+/g, "_").slice(0, 60);
              const r = await uploadFile(file, `arbitros/${sanitizeName(data.name) || refereeId}/foto`);
              if (r.url) {
                await RefereesService.update(refereeId, { foto: r.url, fotoPath: r.path });
                set("foto", r.url);
                set("fotoPath", r.path);
                setMsg("Foto atualizada!");
              } else setMsg("Erro ao enviar foto.");
            }}
          />
        )}
        <div style={{ ...card, display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 90, height: 120, borderRadius: 8, overflow: "hidden", background: COLORS.offWhite, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", border: `1px solid ${COLORS.grayLight}` }}>
            {data.foto ? (
              <img src={data.foto} alt="Foto" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: 11, color: COLORS.gray, textAlign: "center", fontFamily: FONTS.body }}>Sem foto</span>
            )}
          </div>
          <div>
            <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.dark, marginBottom: 6 }}>Foto 3x4</div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
              <label style={{ padding: "5px 14px", borderRadius: 6, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.heading }}>
                {data.foto ? "Trocar foto" : "Enviar foto"}
                <input type="file" accept="image/*" onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  if (file.size > 5 * 1024 * 1024) { setMsg("Imagem deve ter no maximo 5MB."); return; }
                  const reader = new FileReader();
                  reader.onload = () => setCropSrc(reader.result);
                  reader.readAsDataURL(file);
                  e.target.value = "";
                }} style={{ display: "none" }} />
              </label>
              {data.foto && (
                <button onClick={async () => {
                  if (!confirm("Excluir a foto?")) return;
                  setMsg("Excluindo foto...");
                  await deleteFile(data.foto);
                  await RefereesService.update(refereeId, { foto: "", fotoPath: "" });
                  set("foto", "");
                  set("fotoPath", "");
                  setMsg("Foto excluida.");
                }}
                  style={{ padding: "5px 14px", borderRadius: 6, border: "1px solid #dc2626", background: "transparent", color: "#dc2626", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: FONTS.heading }}>
                  Excluir
                </button>
              )}
            </div>
            <div style={{ fontSize: 11, color: COLORS.gray }}>JPG ou PNG, max 5MB. A imagem sera recortada no formato 3x4.</div>
          </div>
        </div>

        {/* Dados Pessoais */}
        <div style={card}>
          {sectionTitle("Dados Pessoais")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>{label("Nome completo")}<input value={data.name || ""} onBlur={e => set("name", capitalize(e.target.value))} onChange={e => set("name", e.target.value)} placeholder="Ex: Joao Carlos de Oliveira" style={inp} /></div>
            <div>{label("Data de Nascimento")}<input type="date" value={data.dataNascimento || ""} onChange={e => set("dataNascimento", e.target.value)} style={inp} /></div>
            <div>{label("Sexo")}<select value={data.sexo || ""} onChange={e => set("sexo", e.target.value)} style={sel}><option value="">Selecione...</option>{SEXO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Estado Civil")}<select value={data.estadoCivil || ""} onChange={e => set("estadoCivil", e.target.value)} style={sel}><option value="">Selecione...</option>{ESTADO_CIVIL.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Escolaridade")}<select value={data.escolaridade || ""} onChange={e => set("escolaridade", e.target.value)} style={sel}><option value="">Selecione...</option>{ESCOLARIDADE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Municipio de Nascimento")}<input value={data.municipioNascimento || ""} onBlur={e => set("municipioNascimento", capitalize(e.target.value))} onChange={e => set("municipioNascimento", e.target.value)} placeholder="Ex: Governador Valadares" style={inp} /></div>
            <div>{label("UF de Nascimento")}<select value={data.ufNascimento || ""} onChange={e => set("ufNascimento", e.target.value)} style={sel}><option value="">Selecione...</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div>{label("Nome do Pai")}<input value={data.nomePai || ""} onBlur={e => set("nomePai", capitalize(e.target.value))} onChange={e => set("nomePai", e.target.value)} placeholder="Ex: Carlos Alberto de Oliveira" style={inp} /></div>
            <div>{label("Nome da Mae")}<input value={data.nomeMae || ""} onBlur={e => set("nomeMae", capitalize(e.target.value))} onChange={e => set("nomeMae", e.target.value)} placeholder="Ex: Maria Aparecida Santos" style={inp} /></div>
            <div>{label("Telefone")}<input value={maskPhone(data.phone)} onChange={e => set("phone", maskPhone(e.target.value))} placeholder="(31) 99999-9999" style={inp} /></div>
            <div>{label("E-mail")}<input value={lowercase(data.email)} disabled style={{ ...inp, opacity: 0.6 }} /></div>
          </div>
        </div>

        {/* Documentos */}
        <div style={card}>
          {sectionTitle("Documentos")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{label("CPF")}<input value={maskCpf(data.cpf)} onChange={e => set("cpf", maskCpf(e.target.value))} placeholder="000.000.000-00" style={inp} /></div>
            <div>{label("RG")}<input value={data.rg || ""} onChange={e => set("rg", e.target.value.toUpperCase())} placeholder="Ex: MG-12.345.678" style={inp} /></div>
            <div>{label("Orgao Expedidor")}<input value={data.rgOrgao || ""} onChange={e => set("rgOrgao", e.target.value.toUpperCase())} placeholder="Ex: SSP/MG" style={inp} /></div>
            <div>{label("UF do RG")}<select value={data.rgUf || ""} onChange={e => set("rgUf", e.target.value)} style={sel}><option value="">Selecione...</option>{UFS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
            <div>{label("Data de Expedição")}<input type="date" value={data.rgDataExpedicao || ""} onChange={e => set("rgDataExpedicao", e.target.value)} style={inp} /></div>
            <div>{label("NIS/PIS/NIT")}<input value={maskNis(data.nisPis)} onChange={e => set("nisPis", maskNis(e.target.value))} placeholder="000.00000.00-0" style={inp} /></div>
          </div>
        </div>

        {/* Endereço */}
        <div style={card}>
          {sectionTitle("Endereco")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              {label("CEP")}<input value={data.cep || ""} onChange={e => handleCep(e.target.value)} placeholder="00000-000" style={inp} />
              {cepLoading && <span style={{ fontSize: 11, color: COLORS.primary }}>Buscando endereco...</span>}
              {!data.logradouro && !cepLoading && (data.cep || "").replace(/\D/g, "").length < 8 && (
                <span style={{ fontSize: 11, color: COLORS.gray }}>Digite o CEP para preencher o endereco automaticamente.</span>
              )}
            </div>
            <div />
            {(data.logradouro || (data.cep || "").replace(/\D/g, "").length >= 8) && (
              <>
                <div style={{ gridColumn: "1 / -1" }}>{label("Logradouro")}<input value={data.logradouro || ""} readOnly style={{ ...inp, background: "#f5f5f5", color: "#666" }} /></div>
                <div>{label("Numero")}<input value={data.numero || ""} onChange={e => set("numero", e.target.value)} placeholder="Ex: 311" style={inp} /></div>
                <div>{label("Complemento")}<input value={data.complemento || ""} onBlur={e => set("complemento", capitalize(e.target.value))} onChange={e => set("complemento", e.target.value)} placeholder="Ex: Sala 205, Bloco B" style={inp} /></div>
                <div>{label("Bairro")}<input value={data.bairro || ""} readOnly style={{ ...inp, background: "#f5f5f5", color: "#666" }} /></div>
                <div>{label("Cidade")}<input value={data.city || ""} readOnly style={{ ...inp, background: "#f5f5f5", color: "#666" }} /></div>
                <div>{label("UF")}<input value={data.state || ""} readOnly style={{ ...inp, background: "#f5f5f5", color: "#666" }} /></div>
              </>
            )}
          </div>
        </div>

        {/* Dados Bancários */}
        <div style={card}>
          {sectionTitle("Dados Bancários")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>{label("Banco")}<select value={data.banco || ""} onChange={e => set("banco", e.target.value)} style={sel}><option value="">Selecione...</option>{BANCOS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}</select></div>
            <div>{label("Tipo de Conta")}<select value={data.tipoConta || ""} onChange={e => set("tipoConta", e.target.value)} style={sel}><option value="">Selecione...</option>{TIPO_CONTA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Agencia (somente numeros, sem digito)")}<input value={maskAgencia(data.agencia)} onChange={e => set("agencia", maskAgencia(e.target.value))} placeholder="1234" style={inp} /></div>
            <div>{label("Conta com Digito")}<input value={maskContaDigito(data.contaDigito)} onChange={e => set("contaDigito", maskContaDigito(e.target.value))} placeholder="12345-6" style={inp} /></div>
            <div />
            <div>{label("Tipo da Chave PIX")}<select value={data.chavePixTipo || ""} onChange={e => set("chavePixTipo", e.target.value)} style={sel}><option value="">Selecione...</option>{CHAVE_PIX_TIPO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Chave PIX")}<input value={data.chavePix || ""} onChange={e => set("chavePix", e.target.value)} placeholder="Ex: 123.456.789-00 ou email@exemplo.com" style={inp} /></div>
          </div>
        </div>

        {/* Profissional + Emergência */}
        <div style={card}>
          {sectionTitle("Profissional e Emergência")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>{label("Nível")}<select value={data.nivel || ""} onChange={e => set("nivel", e.target.value)} style={sel}><option value="">Selecione...</option>{REFEREE_CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}</select></div>
            <div>{label("Registro CBAT")}<input value={data.registroCbat || ""} onChange={e => set("registroCbat", e.target.value)} placeholder="Ex: 12345" style={inp} /></div>
            <div>{label("Tamanho de Camisa")}<select value={data.tamanhoCamisa || ""} onChange={e => set("tamanhoCamisa", e.target.value)} style={sel}><option value="">Selecione...</option>{CAMISA.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Tipo Sanguíneo (opcional)")}<select value={data.tipoSanguineo || ""} onChange={e => set("tipoSanguineo", e.target.value)} style={sel}><option value="">Selecione...</option>{SANGUE.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Cor/Raça")}<select value={data.cor || ""} onChange={e => set("cor", e.target.value)} style={sel}><option value="">Selecione...</option>{COR.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Disponibilidade de Deslocamento")}<select value={data.disponibilidadeDeslocamento || ""} onChange={e => set("disponibilidadeDeslocamento", e.target.value)} style={sel}><option value="">Selecione...</option>{DESLOCAMENTO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select></div>
            <div>{label("Contato de Emergencia — Nome (opcional)")}<input value={data.contatoEmergenciaNome || ""} onBlur={e => set("contatoEmergenciaNome", capitalize(e.target.value))} onChange={e => set("contatoEmergenciaNome", e.target.value)} placeholder="Ex: Maria Santos (esposa)" style={inp} /></div>
            <div>{label("Contato de Emergencia — Telefone (opcional)")}<input value={maskPhone(data.contatoEmergenciaTelefone)} onChange={e => set("contatoEmergenciaTelefone", maskPhone(e.target.value))} placeholder="(31) 99999-9999" style={inp} /></div>
          </div>
        </div>

        {/* Salvar */}
        {msg && <div style={{ marginBottom: 16, padding: "10px 14px", borderRadius: 8, background: msg.startsWith("Erro") ? "#fff0f0" : "#f0fdf4", fontFamily: FONTS.body, fontSize: 13, color: msg.startsWith("Erro") ? "#cc0000" : "#007733" }}>{msg}</div>}
        <button onClick={saveProfile} disabled={saving}
          style={{ padding: "12px 28px", borderRadius: 8, background: saving ? COLORS.gray : COLORS.primary, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 14, fontWeight: 700, textTransform: "uppercase", marginBottom: 32 }}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </button>

        {/* Alterar senha */}
        <div style={card}>
          {sectionTitle("Alterar Senha")}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
            {[{ key: "current", label: "Senha atual" }, { key: "next", label: "Nova senha" }, { key: "confirm", label: "Confirmar" }].map(f => (
              <div key={f.key}>
                <label style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray, display: "block", marginBottom: 6 }}>{f.label}</label>
                <input type="password" value={pw[f.key]} onChange={e => setPw(p => ({ ...p, [f.key]: e.target.value }))} style={inp} placeholder="••••••••" />
              </div>
            ))}
          </div>
          {pwMsg && <div style={{ marginBottom: 12, fontFamily: FONTS.body, fontSize: 13, color: pwMsg.startsWith("Senha alterada") ? "#007733" : "#cc0000" }}>{pwMsg}</div>}
          <button onClick={savePassword} disabled={pwSaving}
            style={{ padding: "10px 24px", borderRadius: 8, background: pwSaving ? COLORS.gray : COLORS.dark, color: "#fff", border: "none", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700 }}>
            {pwSaving ? "Salvando..." : "Alterar Senha"}
          </button>
        </div>

        {/* Consentimentos LGPD */}
        <div style={card}>
          {sectionTitle("Privacidade e Consentimentos")}
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Política de Privacidade e Termos de Uso</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  Aceito em {data.lgpdConsentAt ? new Date(data.lgpdConsentAt).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>
              <Link to="/privacidade" target="_blank" style={{ fontFamily: FONTS.heading, fontSize: 11, color: COLORS.primary, textDecoration: "underline" }}>Ver política</Link>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: data.lgpdSensitiveConsentAt ? "#f0fdf4" : "#fff0f0", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Dados sensíveis (cor/raça e tipo sanguíneo)</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  {data.lgpdSensitiveConsentAt
                    ? `Consentimento ativo desde ${new Date(data.lgpdSensitiveConsentAt).toLocaleDateString("pt-BR")}`
                    : "Consentimento revogado"}
                </div>
              </div>
              {data.lgpdSensitiveConsentAt && (
                <button onClick={async () => {
                  if (!confirm("Ao revogar, os campos cor/raça e tipo sanguíneo serão apagados. Deseja continuar?")) return;
                  await RefereesService.update(refereeId, { cor: "", tipoSanguineo: "", lgpdSensitiveConsentAt: "" });
                  setData(prev => ({ ...prev, cor: "", tipoSanguineo: "", lgpdSensitiveConsentAt: "" }));
                  setMsg("Consentimento de dados sensíveis revogado.");
                }} style={{ padding: "5px 12px", borderRadius: 6, border: "1px solid #fca5a5", background: "#fff5f5", color: "#cc0000", cursor: "pointer", fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700 }}>
                  Revogar
                </button>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "#f9fafb", borderRadius: 8 }}>
              <div>
                <div style={{ fontFamily: FONTS.heading, fontSize: 12, fontWeight: 700, color: COLORS.dark }}>Termo de Sigilo e Confidencialidade</div>
                <div style={{ fontFamily: FONTS.body, fontSize: 11, color: COLORS.gray }}>
                  Aceito em {data.confidentialityConsentAt ? new Date(data.confidentialityConsentAt).toLocaleDateString("pt-BR") : "—"}
                </div>
              </div>
              <Link to="/termos" target="_blank" style={{ fontFamily: FONTS.heading, fontSize: 11, color: COLORS.primary, textDecoration: "underline" }}>Ver termos</Link>
            </div>
          </div>
        </div>
      </div>
    </IntranetLayout>
  );
}
