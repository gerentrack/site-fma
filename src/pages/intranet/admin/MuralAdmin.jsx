/**
 * MuralAdmin.jsx — Gerenciamento do mural de avisos.
 * Rota: /intranet/admin/mural
 */
import { useState, useEffect } from "react";
import IntranetLayout from "../IntranetLayout";
import { MuralAvisosService } from "../../../services/index";
import { COLORS, FONTS } from "../../../styles/colors";

const TIPOS = [
  { value: "info", label: "Informativo", color: "#0066cc", bg: "#eff6ff" },
  { value: "alerta", label: "Alerta", color: "#d97706", bg: "#fffbeb" },
  { value: "urgente", label: "Urgente", color: "#dc2626", bg: "#fef2f2" },
];
const tipoMap = Object.fromEntries(TIPOS.map(t => [t.value, t]));

export default function MuralAdmin() {
  const [avisos, setAvisos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | aviso obj | "novo"
  const [form, setForm] = useState({ titulo: "", mensagem: "", tipo: "info" });
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const r = await MuralAvisosService.list();
    setAvisos(r.data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const handleSave = async () => {
    if (!form.titulo.trim()) return;
    setSaving(true);
    if (editing === "novo") {
      await MuralAvisosService.create({ ...form, ativo: true, criadoPor: "Admin" });
    } else {
      await MuralAvisosService.update(editing.id, form);
    }
    setSaving(false);
    setEditing(null);
    fetchData();
  };

  const toggleAtivo = async (aviso) => {
    await MuralAvisosService.update(aviso.id, { ativo: !aviso.ativo });
    fetchData();
  };

  const handleDelete = async (id) => {
    if (!confirm("Excluir este aviso?")) return;
    await MuralAvisosService.delete(id);
    fetchData();
  };

  const card = { background: "#fff", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 8px rgba(0,0,0,0.07)", marginBottom: 16 };
  const inp = { width: "100%", padding: "8px 12px", border: `1px solid ${COLORS.grayLight}`, borderRadius: 8, fontSize: 14, fontFamily: FONTS.body, boxSizing: "border-box" };

  return (
    <IntranetLayout requireRole="canManage">
      <div style={{ padding: 36, maxWidth: 750, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: FONTS.heading, fontSize: 22, fontWeight: 900, textTransform: "uppercase", color: COLORS.dark, margin: 0 }}>Mural de Avisos</h1>
            <p style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>Avisos fixos exibidos no dashboard de todos os usuarios.</p>
          </div>
          <button onClick={() => { setForm({ titulo: "", mensagem: "", tipo: "info" }); setEditing("novo"); }}
            style={{ padding: "9px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontFamily: FONTS.heading, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            Novo Aviso
          </button>
        </div>

        {/* Formulário */}
        {editing && (
          <div style={{ ...card, border: `2px solid ${COLORS.primary}` }}>
            <div style={{ display: "grid", gap: 12 }}>
              <div>
                <span style={{ display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase" }}>Titulo *</span>
                <input style={inp} value={form.titulo} onChange={e => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div>
                <span style={{ display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase" }}>Mensagem</span>
                <textarea style={{ ...inp, minHeight: 50, resize: "vertical" }} value={form.mensagem} onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))} />
              </div>
              <div>
                <span style={{ display: "block", fontWeight: 600, fontSize: 11, marginBottom: 4, color: COLORS.grayDark, textTransform: "uppercase" }}>Tipo</span>
                <div style={{ display: "flex", gap: 12 }}>
                  {TIPOS.map(t => (
                    <label key={t.value} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                      <input type="radio" name="tipo" value={t.value} checked={form.tipo === t.value}
                        onChange={() => setForm(f => ({ ...f, tipo: t.value }))} style={{ accentColor: t.color }} />
                      <span style={{ color: t.color, fontWeight: 600 }}>{t.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16, justifyContent: "flex-end" }}>
              <button onClick={() => setEditing(null)}
                style={{ padding: "8px 18px", borderRadius: 8, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button onClick={handleSave} disabled={saving}
                style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: COLORS.primary, color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {saving ? "Salvando..." : editing === "novo" ? "Publicar" : "Atualizar"}
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: COLORS.gray }}>Carregando...</div>
        ) : avisos.length === 0 ? (
          <div style={{ ...card, textAlign: "center", color: COLORS.gray, fontSize: 14 }}>Nenhum aviso criado.</div>
        ) : avisos.map(aviso => {
          const tp = tipoMap[aviso.tipo] || tipoMap.info;
          return (
            <div key={aviso.id} style={{ ...card, borderLeft: `4px solid ${tp.color}`, opacity: aviso.ativo ? 1 : 0.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontFamily: FONTS.heading, fontSize: 15, fontWeight: 700, color: COLORS.dark }}>{aviso.titulo}</span>
                    <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: tp.color, background: tp.bg }}>{tp.label}</span>
                    {!aviso.ativo && <span style={{ padding: "2px 8px", borderRadius: 10, fontSize: 10, fontWeight: 700, color: COLORS.gray, background: "#f3f4f6" }}>Inativo</span>}
                  </div>
                  {aviso.mensagem && <p style={{ fontSize: 13, color: COLORS.gray, margin: "4px 0 0" }}>{aviso.mensagem}</p>}
                  <div style={{ fontSize: 11, color: COLORS.gray, marginTop: 6 }}>Criado em {new Date(aviso.createdAt).toLocaleDateString("pt-BR")}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => toggleAtivo(aviso)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.grayLight}`, background: "transparent", fontSize: 11, cursor: "pointer" }}>
                    {aviso.ativo ? "Desativar" : "Ativar"}
                  </button>
                  <button onClick={() => { setForm({ titulo: aviso.titulo, mensagem: aviso.mensagem, tipo: aviso.tipo }); setEditing(aviso); }}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid ${COLORS.primary}`, background: "transparent", color: COLORS.primary, fontSize: 11, cursor: "pointer" }}>
                    Editar
                  </button>
                  <button onClick={() => handleDelete(aviso.id)}
                    style={{ padding: "4px 10px", borderRadius: 6, border: `1px solid #dc2626`, background: "transparent", color: "#dc2626", fontSize: 11, cursor: "pointer" }}>
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </IntranetLayout>
  );
}
