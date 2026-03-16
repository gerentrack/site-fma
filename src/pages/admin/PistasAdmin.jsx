/**
 * PistasAdmin.jsx — Gerenciamento de Pistas Homologadas
 * Exporta: PistasList, PistasEditor
 * Rotas: /admin/pistas · /admin/pistas/novo · /admin/pistas/:id
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import { COLORS, FONTS } from "../../styles/colors";

const TIPOS = ["Pista de Atletismo", "Percurso de Corrida de Rua", "Percurso de Trail", "Percurso de Marcha Atlética"];
const SUPERFICIES = ["Sintética (tartan)", "Cimento", "Asfalto", "Terra", "Mista"];

const empty = {
  nome: "", cidade: "", estado: "MG", tipo: "Pista de Atletismo",
  comprimento: "", superficie: "Sintética (tartan)",
  endereco: "", lat: "", lng: "",
  homologacaoFMA: "", homologacaoCBAT: "",
  observacoes: "", published: true,
};

// ── Lista ──────────────────────────────────────────────────────────────────────
export function PistasList() {
  const navigate = useNavigate();
  const [items, setItems]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { pistasHomologadasAPI } = await import("../../data/api");
    const r = await pistasHomologadasAPI.list({});
    if (r.data) setItems(r.data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = items.filter(p =>
    p.nome?.toLowerCase().includes(search.toLowerCase()) ||
    p.cidade?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm("Excluir esta pista?")) return;
    const { pistasHomologadasAPI } = await import("../../data/api");
    await pistasHomologadasAPI.delete(id);
    load();
  };

  const s = { fontFamily: FONTS.body };

  return (
    <AdminLayout>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 26, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
              🔵 Pistas Homologadas
            </h1>
            <p style={{ color: COLORS.gray, fontSize: 13, margin: "4px 0 0" }}>Gerenciar pistas e percursos homologados pela FMA</p>
          </div>
          <button onClick={() => navigate("/admin/pistas/novo")}
            style={{ padding: "10px 20px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, cursor: "pointer", textTransform: "uppercase" }}>
            + Nova Pista
          </button>
        </div>

        <input
          placeholder="Buscar por nome ou cidade…"
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ ...s, width: "100%", padding: "10px 14px", borderRadius: 8, border: `1.5px solid ${COLORS.grayLight}`, fontSize: 14, marginBottom: 20, boxSizing: "border-box" }}
        />

        {loading ? (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.gray }}>Carregando…</div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: COLORS.gray }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔵</div>
            <div>Nenhuma pista cadastrada ainda.</div>
            <button onClick={() => navigate("/admin/pistas/novo")}
              style={{ marginTop: 16, padding: "8px 20px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, cursor: "pointer" }}>
              Cadastrar primeira pista
            </button>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9f9f9", borderBottom: `2px solid ${COLORS.grayLight}` }}>
                  {["Nome", "Cidade", "Tipo", "Comprimento", "Publicada", "Ações"].map(h => (
                    <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: COLORS.gray, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((p, i) => (
                  <tr key={p.id} style={{ borderBottom: `1px solid ${COLORS.grayLight}`, background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                    <td style={{ padding: "12px 16px", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, color: COLORS.dark }}>{p.nome}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.dark }}>{p.cidade}/{p.estado}</td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: COLORS.gray }}>{p.tipo}</td>
                    <td style={{ padding: "12px 16px", fontSize: 13, color: COLORS.dark }}>{p.comprimento ? `${p.comprimento}m` : "—"}</td>
                    <td style={{ padding: "12px 16px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 12, fontSize: 11, fontWeight: 700, background: p.published ? "#dcfce7" : "#fee2e2", color: p.published ? "#166534" : "#991b1b" }}>
                        {p.published ? "Sim" : "Não"}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => navigate(`/admin/pistas/${p.id}`)}
                          style={{ padding: "4px 12px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Editar
                        </button>
                        <button onClick={() => handleDelete(p.id)}
                          style={{ padding: "4px 12px", background: "#fff", color: "#cc0000", border: "1px solid #cc0000", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Editor ─────────────────────────────────────────────────────────────────────
export function PistasEditor() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const isNew = !id || id === "novo";

  const [form, setForm]   = useState(empty);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState({ text: "", type: "" });

  useEffect(() => {
    if (isNew) return;
    (async () => {
      const { pistasHomologadasAPI } = await import("../../data/api");
      const r = await pistasHomologadasAPI.get(id);
      if (r.data) setForm(r.data);
      setLoading(false);
    })();
  }, [id, isNew]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const flash = (text, type) => { setMsg({ text, type }); setTimeout(() => setMsg({ text: "", type: "" }), 3500); };

  const handleSubmit = async () => {
    if (!form.nome)   return flash("Nome é obrigatório.", "err");
    if (!form.cidade) return flash("Cidade é obrigatória.", "err");
    if (!form.lat || !form.lng) return flash("Coordenadas (lat/lng) são obrigatórias para exibir no mapa.", "err");
    setSaving(true);
    const { pistasHomologadasAPI } = await import("../../data/api");
    const data = { ...form, lat: parseFloat(form.lat), lng: parseFloat(form.lng) };
    const r = isNew ? await pistasHomologadasAPI.create(data) : await pistasHomologadasAPI.update(id, data);
    setSaving(false);
    if (r.error) return flash(r.error, "err");
    flash("Salvo com sucesso!", "ok");
    setTimeout(() => navigate("/admin/pistas"), 900);
  };

  const s = (extra={}) => ({
    fontFamily: FONTS.body, width: "100%", padding: "10px 12px", borderRadius: 8,
    border: `1.5px solid ${COLORS.grayLight}`, fontSize: 14,
    outline: "none", boxSizing: "border-box", background: "#fff", ...extra,
  });
  const lbl = (text, req=false) => (
    <label style={{ display: "block", fontFamily: FONTS.heading, fontWeight: 700, fontSize: 12, color: COLORS.dark, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 5 }}>
      {text}{req && <span style={{ color: COLORS.primary }}>*</span>}
    </label>
  );
  const field = (children) => <div style={{ marginBottom: 18 }}>{children}</div>;

  if (loading) return <AdminLayout><div style={{ textAlign: "center", padding: 60 }}>Carregando…</div></AdminLayout>;

  return (
    <AdminLayout>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
          <Link to="/admin/pistas" style={{ color: COLORS.primary, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 13, textDecoration: "none" }}>← Pistas</Link>
          <h1 style={{ fontFamily: FONTS.heading, fontWeight: 800, fontSize: 22, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>
            {isNew ? "Nova Pista" : "Editar Pista"}
          </h1>
        </div>

        {msg.text && (
          <div style={{ padding: "10px 16px", borderRadius: 8, marginBottom: 20, background: msg.type === "ok" ? "#dcfce7" : "#fee2e2", color: msg.type === "ok" ? "#166534" : "#991b1b", fontSize: 13 }}>
            {msg.text}
          </div>
        )}

        <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 2px 8px rgba(0,0,0,0.06)", padding: 28 }}>
          {field(<>{lbl("Nome da pista/percurso", true)}<input style={s()} value={form.nome} onChange={e => set("nome", e.target.value)} placeholder="Ex: Pista de Atletismo do Mineirão" /></>)}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>{lbl("Cidade", true)}<input style={s()} value={form.cidade} onChange={e => set("cidade", e.target.value)} placeholder="Belo Horizonte" /></div>
            <div>{lbl("Estado")}<input style={s()} value={form.estado} onChange={e => set("estado", e.target.value)} placeholder="MG" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>
              {lbl("Tipo")}
              <select style={s()} value={form.tipo} onChange={e => set("tipo", e.target.value)}>
                {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              {lbl("Superfície")}
              <select style={s()} value={form.superficie} onChange={e => set("superficie", e.target.value)}>
                {SUPERFICIES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {field(<>{lbl("Comprimento (metros)")} <input style={s()} type="number" value={form.comprimento} onChange={e => set("comprimento", e.target.value)} placeholder="400" /></>)}
          {field(<>{lbl("Endereço")}<input style={s()} value={form.endereco} onChange={e => set("endereco", e.target.value)} placeholder="Av. Antônio Abrahão Caram, Pampulha" /></>)}

          <div style={{ background: "#fef3c7", borderRadius: 8, padding: "12px 16px", marginBottom: 18, fontSize: 13, color: "#92400e" }}>
            <strong>📍 Coordenadas necessárias para o mapa.</strong> Para obter as coordenadas, acesse{" "}
            <a href="https://maps.google.com" target="_blank" rel="noreferrer" style={{ color: "#cc0000" }}>Google Maps</a>{" "}
            → clique com botão direito no local → copie as coordenadas.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>{lbl("Latitude", true)}<input style={s()} type="number" step="any" value={form.lat} onChange={e => set("lat", e.target.value)} placeholder="-19.9167" /></div>
            <div>{lbl("Longitude", true)}<input style={s()} type="number" step="any" value={form.lng} onChange={e => set("lng", e.target.value)} placeholder="-43.9345" /></div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
            <div>{lbl("Nº homologação FMA")}<input style={s()} value={form.homologacaoFMA} onChange={e => set("homologacaoFMA", e.target.value)} placeholder="FMA-2024-001" /></div>
            <div>{lbl("Nº homologação CBAT")}<input style={s()} value={form.homologacaoCBAT} onChange={e => set("homologacaoCBAT", e.target.value)} placeholder="CBAT-2024-001" /></div>
          </div>

          {field(<>{lbl("Observações")}<textarea style={{ ...s(), minHeight: 80, resize: "vertical" }} value={form.observacoes} onChange={e => set("observacoes", e.target.value)} placeholder="Informações adicionais sobre a pista…" /></>)}

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
            <input type="checkbox" id="pub" checked={!!form.published} onChange={e => set("published", e.target.checked)} />
            <label htmlFor="pub" style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, cursor: "pointer" }}>
              Publicado (visível no mapa público)
            </label>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button onClick={handleSubmit} disabled={saving}
              style={{ flex: 1, padding: "12px", background: COLORS.primary, color: "#fff", border: "none", borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 800, fontSize: 14, textTransform: "uppercase", cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1 }}>
              {saving ? "Salvando…" : isNew ? "Cadastrar Pista" : "Salvar Alterações"}
            </button>
            <button onClick={() => navigate("/admin/pistas")}
              style={{ padding: "12px 24px", background: "#fff", color: COLORS.dark, border: `1.5px solid ${COLORS.grayLight}`, borderRadius: 8, fontFamily: FONTS.heading, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
