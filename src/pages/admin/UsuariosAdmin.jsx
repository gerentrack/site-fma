import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/admin/AdminLayout";
import PageHeader from "../../components/ui/PageHeader";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { FormField, TextInput, SelectInput, CheckboxInput } from "../../components/ui/FormField";
import { useAuth } from "../../hooks/useAuth";
import { adminUsersAPI } from "../../data/api";
import { COLORS, FONTS } from "../../styles/colors";

// ── Constantes ───────────────────────────────────────────────────────────────

const LEVEL_OPTIONS_MASTER = [
  { value: "admin",  label: "Administrador" },
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" },
];

const LEVEL_OPTIONS_ADMIN = [
  { value: "editor", label: "Editor" },
  { value: "viewer", label: "Visualizador" },
];

const LEVEL_LABEL = { master: "Master", admin: "Administrador", editor: "Editor", viewer: "Visualizador" };
const LEVEL_COLOR = {
  master: { bg: "#fef3c7", color: "#92400e" },
  admin:  { bg: "#dbeafe", color: "#1e40af" },
  editor: { bg: "#e6f9ee", color: "#007733" },
  viewer: { bg: "#f5f5f5", color: "#6b7280" },
};

const SECTION_OPTIONS = [
  { value: "noticias",       label: "Notícias" },
  { value: "calendario",     label: "Calendário" },
  { value: "galeria",        label: "Galeria" },
  { value: "resultados",     label: "Resultados" },
  { value: "institucional",  label: "Páginas Institucionais" },
  { value: "documentos",     label: "Documentos" },
  { value: "banners",        label: "Banners" },
  { value: "parceiros",      label: "Parceiros" },
  { value: "redes",          label: "Redes Sociais" },
  { value: "rodape",         label: "Rodapé" },
  { value: "equipes",        label: "Equipes" },
  { value: "atletas",        label: "Conteúdo Atletas" },
  { value: "arbitros",       label: "Conteúdo Árbitros" },
  { value: "pistas",         label: "Pistas Homologadas" },
];

// ── Lista ────────────────────────────────────────────────────────────────────

export function UsuariosList() {
  const navigate = useNavigate();
  const { user, isMaster, isAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const result = await adminUsersAPI.list();
    if (result.data) {
      let list = result.data;
      // Admin comum vê apenas seus funcionários + a si mesmo
      if (!isMaster) {
        list = list.filter(u => u.uid === user.uid || u.createdBy === user.uid);
      }
      setUsers(list);
    }
    setLoading(false);
  }, [user, isMaster]);

  useEffect(() => { load(); }, [load]);

  const handleToggle = async (u) => {
    if (u.level === "master") return; // nunca desativar master
    if (u.uid === user?.uid) return;   // nunca desativar a si mesmo
    const fn = u.active === false ? adminUsersAPI.activate : adminUsersAPI.deactivate;
    await fn(u.uid);
    load();
  };

  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40 }}>
        <PageHeader
          title="Usuários"
          subtitle={`${users.length} usuários no painel`}
          action={{ label: "+ Novo Usuário", onClick: () => navigate("/admin/usuarios/novo") }}
        />

        {loading ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
            Carregando...
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center", fontFamily: FONTS.body, color: COLORS.gray }}>
            Nenhum usuário cadastrado.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            {/* Header */}
            <div style={{
              display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
              padding: "12px 24px", background: COLORS.offWhite, borderBottom: `1px solid ${COLORS.grayLight}`,
            }}>
              {["Nome", "Email", "Nível", "Seções", "Status", ""].map(h => (
                <div key={h} style={{ fontFamily: FONTS.heading, fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, color: COLORS.gray }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {users.map(u => {
              const lc = LEVEL_COLOR[u.level] || LEVEL_COLOR.viewer;
              const isSelf = u.uid === user?.uid;
              return (
                <div key={u.uid} style={{
                  display: "grid", gridTemplateColumns: "2fr 2fr 1fr 1fr 1fr 120px",
                  padding: "14px 24px", borderBottom: `1px solid ${COLORS.grayLight}`,
                  alignItems: "center", opacity: u.active === false ? 0.55 : 1,
                }}>
                  <div style={{ fontFamily: FONTS.body, fontSize: 14, color: COLORS.dark, fontWeight: 500 }}>
                    {u.name}{isSelf && <span style={{ fontSize: 11, color: COLORS.gray, marginLeft: 6 }}>(você)</span>}
                    {u.roles?.length > 1 && (
                      <div style={{ fontSize: 10, color: COLORS.gray, marginTop: 2 }}>
                        Acesso: {u.roles.map(r => r === "admin" ? "Admin" : r === "referee" ? "Intranet" : r === "organizer" ? "Portal" : r).join(" + ")}
                      </div>
                    )}
                  </div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 13, color: COLORS.gray }}>{u.email}</div>
                  <div><Badge label={LEVEL_LABEL[u.level] || u.level} bg={lc.bg} color={lc.color} /></div>
                  <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray }}>
                    {u.level === "editor" && u.permissions?.length > 0
                      ? u.permissions.length + " seções"
                      : u.level === "editor" ? "Nenhuma" : "Todas"}
                  </div>
                  <div><Badge preset={u.active !== false ? "active" : "inactive"} /></div>
                  <div style={{ display: "flex", gap: 6 }}>
                    {!isSelf && u.level !== "master" && (
                      <>
                        <button
                          onClick={() => navigate(`/admin/usuarios/${u.uid}`)}
                          title="Editar"
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px" }}
                        >✏️</button>
                        <button
                          onClick={() => handleToggle(u)}
                          title={u.active !== false ? "Desativar" : "Reativar"}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "4px" }}
                        >{u.active !== false ? "🔒" : "🔓"}</button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

// ── Editor ───────────────────────────────────────────────────────────────────

const emptyUser = { name: "", email: "", password: "", level: "editor", permissions: [], active: true };

export function UsuariosEditor() {
  const navigate = useNavigate();
  const { user: currentUser, isMaster } = useAuth();
  const uid = window.location.pathname.split("/").pop();
  const isNew = uid === "novo";

  const [values, setValues] = useState({ ...emptyUser });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [loadError, setLoadError] = useState(null);

  const levelOptions = isMaster ? LEVEL_OPTIONS_MASTER : LEVEL_OPTIONS_ADMIN;

  useEffect(() => {
    if (isNew) return;
    adminUsersAPI.get(uid).then(r => {
      if (r.data) setValues({ ...emptyUser, ...r.data, password: "" });
      else setLoadError(r.error);
    });
  }, [uid, isNew]);

  const set = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errors[key]) setErrors(prev => ({ ...prev, [key]: null }));
  };

  const togglePermission = (section) => {
    setValues(prev => ({
      ...prev,
      permissions: prev.permissions.includes(section)
        ? prev.permissions.filter(s => s !== section)
        : [...prev.permissions, section],
    }));
  };

  const validate = () => {
    const e = {};
    if (!values.name.trim()) e.name = "Nome é obrigatório.";
    if (!values.email.trim()) e.email = "E-mail é obrigatório.";
    // Senha só é obrigatória para contas novas (email que não existe no sistema)
    if (isNew && values.password && values.password.length < 6) e.password = "Mínimo 6 caracteres.";
    if (!values.level) e.level = "Selecione um nível.";
    if (!isMaster && values.level === "admin") e.level = "Você não tem permissão para criar administradores.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      if (isNew) {
        const result = await adminUsersAPI.create({
          name: values.name,
          email: values.email,
          password: values.password || undefined,
          level: values.level,
          permissions: values.level === "editor" ? values.permissions : [],
        }, currentUser.uid);
        if (result.error) {
          setErrors({ _form: result.error });
          setSubmitting(false);
          return;
        }
        navigate("/admin/usuarios");
      } else {
        const result = await adminUsersAPI.update(uid, {
          name: values.name,
          level: values.level,
          permissions: values.level === "editor" ? values.permissions : [],
        });
        if (result.error) {
          setErrors({ _form: result.error });
          setSubmitting(false);
          return;
        }
        navigate("/admin/usuarios");
      }
    } catch (e) {
      setErrors({ _form: e.message });
    }
    setSubmitting(false);
  };

  if (loadError) {
    return <AdminLayout minLevel="admin"><div style={{ padding: 40, color: COLORS.primary, fontFamily: FONTS.body }}>{loadError}</div></AdminLayout>;
  }


  return (
    <AdminLayout minLevel="admin">
      <div style={{ padding: 40, maxWidth: 600 }}>
        <PageHeader
          title={isNew ? "Novo Usuário" : "Editar Usuário"}
          backTo="/admin/usuarios"
        />
        <div style={{ background: "#fff", borderRadius: 12, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.06)", display: "grid", gap: 20 }}>

          {errors._form && (
            <div style={{ background: "#fff0f0", padding: "10px 14px", borderRadius: 8, fontFamily: FONTS.body, fontSize: 13, color: COLORS.primary }}>
              {errors._form}
            </div>
          )}

          <FormField label="Nome completo" required error={errors.name}>
            <TextInput value={values.name} onChange={v => set("name", v)} error={errors.name} placeholder="Ex: Maria Silva" />
          </FormField>

          <FormField label="E-mail" required error={errors.email}>
            <TextInput
              value={values.email}
              onChange={v => set("email", v)}
              error={errors.email}
              placeholder="Ex: maria@fma.org.br"
              disabled={!isNew}
              type="email"
            />
          </FormField>

          {isNew && (
            <FormField label="Senha" error={errors.password} hint="Obrigatória apenas para contas novas. Se o e-mail já pertence a um árbitro ou organizador, deixe em branco — o acesso admin será adicionado à conta existente.">
              <TextInput value={values.password} onChange={v => set("password", v)} error={errors.password} placeholder="Mínimo 6 caracteres (vazio se conta existente)" type="password" />
            </FormField>
          )}

          <FormField label="Nível de acesso" required error={errors.level}>
            <SelectInput value={values.level} onChange={v => set("level", v)} options={levelOptions} error={errors.level} />
          </FormField>

          {/* Explicação do nível */}
          <div style={{ fontFamily: FONTS.body, fontSize: 12, color: COLORS.gray, background: COLORS.offWhite, padding: "10px 14px", borderRadius: 8 }}>
            {values.level === "admin" && "Administrador: acesso total ao conteúdo, solicitações, organizadores, financeiro e criação de funcionários."}
            {values.level === "editor" && "Editor: acesso apenas às seções selecionadas abaixo. Não gerencia usuários nem solicitações."}
            {values.level === "viewer" && "Visualizador: acesso somente-leitura ao painel. Não pode editar nenhum conteúdo."}
          </div>

          {/* Seleção de seções (apenas para editor) */}
          {values.level === "editor" && (
            <FormField label="Seções permitidas" hint="Selecione as áreas que este editor poderá gerenciar.">
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 4 }}>
                {SECTION_OPTIONS.map(opt => (
                  <CheckboxInput
                    key={opt.value}
                    checked={values.permissions.includes(opt.value)}
                    onChange={() => togglePermission(opt.value)}
                    label={opt.label}
                  />
                ))}
              </div>
            </FormField>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <Button variant="primary" onClick={handleSubmit} loading={submitting}>
              {isNew ? "Criar Usuário" : "Salvar Alterações"}
            </Button>
            <Button variant="ghost" onClick={() => navigate("/admin/usuarios")}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
