/**
 * FMA — Configuração central de navegação.
 *
 * ATENÇÃO: O sub-menu "A FMA" é construído dinamicamente a partir das
 * páginas cadastradas no admin com showInNav=true. A constante PUBLIC_NAV
 * mantém a entrada "A FMA" como placeholder — o Header carrega o sub-menu
 * via InstitutionalPagesService em tempo de execução.
 */

/**
 * PUBLIC_NAV — Menu principal do site FMA
 *
 * Estrutura:
 *  1. Início
 *  2. A FMA              — sub-menu fixo (gerenciado no admin por slug)
 *  3. Portal da Transparência — documentos públicos por categoria + Eleições + Ouvidoria
 *  4. Atletismo          — páginas editoriais sobre o esporte (slugs fixos)
 *  5. Calendário         — /calendario (com busca)
 *  6. Resultados         — corridas / pista / trail
 *  7. Estatísticas       — links externos (ranking e recordes)
 *  8. Notícias
 *  9. Atletas
 * 10. Árbitros
 * 11. Equipes            — dinâmico como institucional
 * 12. Antidopagem
 * 13. Contato
 */
export const PUBLIC_NAV = [
  { label: "Início", link: "/" },

  {
    label: "A FMA",
    sub: [
      { label: "História da FMA",  link: "/institucional/historia" },
      { label: "Clubes e Equipes", link: "/equipes" },
      { label: "Galeria de Fotos", link: "/galeria" },
    ],
  },

  {
    label: "Portal da Transparência",
    sub: [
      { label: "Assembleia Geral",      link: "/documentos?categoria=assembleia" },
      { label: "Conselho Fiscal",       link: "/documentos?categoria=conselho-fiscal" },
      { label: "Comissão de Atletas",   link: "/documentos?categoria=comissao-atletas" },
      { label: "Certidões FMA",         link: "/documentos?categoria=certidao" },
      { label: "Eleições",              link: "/transparencia/eleicoes" },
      { label: "Notas Oficiais",        link: "/documentos?categoria=nota" },
      { label: "Portaria",              link: "/documentos?categoria=portaria" },
      { label: "Ouvidoria",             link: "/transparencia/ouvidoria" },
    ],
  },

  {
    label: "Atletismo",
    sub: [
      { label: "O Atletismo",         link: "/atletismo/historia" },
      { label: "Pistas Oficiais",     link: "/atletismo/pistas" },
      { label: "Regras Oficiais",     link: "/atletismo/regras" },
      { label: "Normas Oficiais",     link: "/atletismo/normas" },
      { label: "Tabelas de Pontuação",link: "/atletismo/tabelas" },
    ],
  },

  { label: "Calendário", link: "/calendario" },

  {
    label: "Resultados",
    sub: [
      { label: "Corridas de Rua", link: "/resultados/corridas" },
      { label: "Pista e Campo",   link: "/resultados/pista" },
      { label: "Trail Run",       link: "/resultados/trail" },
    ],
  },

  {
    label: "Estatísticas",
    sub: [
      { label: "Rankings",          link: "/ranking",          external: false },
      { label: "Recordes Estaduais",link: "/ranking/recordes", external: false },
    ],
  },

  { label: "Notícias", link: "/noticias" },

  {
    label: "Atletas",
    sub: [
      { label: "Central do Atleta",        link: "/atletas" },
      { label: "Como se Federar",          link: "/atletas?categoria=cadastro" },
      { label: "Cancelamento de Registro", link: "/atletas?categoria=cancelamento" },
    ],
  },

  {
    label: "Árbitros",
    sub: [
      { label: "Central do Árbitro",       link: "/arbitros" },
      { label: "Cadastro de Árbitro",      link: "/arbitros?categoria=cadastro" },
      { label: "Documentos e Formulários", link: "/arbitros?categoria=formulario" },
      { label: "Intranet – Área Restrita", link: "/intranet" },
    ],
  },

  {
    label: "Equipes",
    sub: [
      { label: "Equipes Filiadas", link: "/equipes" },
      { label: "Como se Filiar",   link: "/equipes/como-se-filiar" },
    ],
  },

  { label: "Antidopagem", link: "/antidopagem" },

  { label: "Contato", link: "/contato" },
];

export const ADMIN_NAV = [
  { label: "Dashboard",             icon: "📊", path: "/admin" },
  { label: "Banners",               icon: "🖼️", path: "/admin/banners" },
  { label: "Notícias",              icon: "📰", path: "/admin/noticias" },
  { label: "Páginas Institucionais",icon: "🏛️", path: "/admin/institucional" },
  { label: "Galeria",               icon: "📷", path: "/admin/galeria" },
  { label: "Resultados",            icon: "🏆", path: "/admin/resultados" },
  { label: "Calendário",            icon: "🗓️", path: "/admin/calendario" },
  { label: "Conteúdo de Árbitros",   icon: "⚖️", path: "/admin/arbitros-conteudo" },
  { label: "Conteúdo de Atletas",   icon: "👟", path: "/admin/atletas" },
  { label: "Documentos",            icon: "📄", path: "/admin/documentos" },
  { label: "Parceiros",             icon: "🤝", path: "/admin/parceiros" },
  { label: "Redes Sociais",         icon: "📱", path: "/admin/redes-sociais" },
  { label: "Rodapé",                icon: "⚙️", path: "/admin/rodape" },
  { label: "Solicitações",          icon: "📋", path: "/admin/solicitacoes" },
  { label: "Organizadores",         icon: "🏢", path: "/admin/organizadores" },
  { label: "Equipes",              icon: "🏃", path: "/admin/equipes" },
  { label: "Formulários",           icon: "🔧", path: "/admin/formularios" },
];

export const QUICK_ACCESS = [
  { icon: "📰", label: "Notícias",         to: "/noticias" },
  { icon: "🗓️", label: "Calendário",       to: "/calendario" },
  { icon: "🏆", label: "Resultados",        to: "/resultados/corridas" },
  { icon: "📊", label: "Rankings",          to: "/ranking" },
  { icon: "👥", label: "Atletas Federados", to: "/atletas" },
  { icon: "⚖️", label: "Árbitros",          to: "/arbitros" },
];

// ─── Categorias ───────────────────────────────────────────────────────────────

export const NEWS_CATEGORIES = [
  { value: "",              label: "Todas",           color: "#6b7280", icon: "📰" },
  { value: "arbitragem",   label: "Arbitragem",      color: "#cc0000", icon: "⚖️" },
  { value: "competicao",   label: "Competição",      color: "#0066cc", icon: "🏆" },
  { value: "atletismo",    label: "Atletismo",       color: "#007733", icon: "🏃" },
  { value: "corrida",      label: "Corrida de Rua",  color: "#884400", icon: "🏅" },
  { value: "institucional",label: "Institucional",   color: "#5a3e8a", icon: "🏛️" },
  { value: "geral",        label: "Geral",           color: "#374151", icon: "📋" },
];

export const CALENDAR_CATEGORIES = [
  { value: "",        label: "Todos os Tipos" },
  { value: "corrida", label: "Corrida de Rua Homologada", color: "#cc0000", icon: "🏃" },
  { value: "pista",   label: "Pista e Campo",              color: "#0066cc", icon: "🏟️" },
  { value: "trail",   label: "Trail / Montanha",           color: "#007733", icon: "🏔️" },
  { value: "marcha",  label: "Marcha Atlética",            color: "#884400", icon: "🚶" },
  { value: "cross",   label: "Cross Country",              color: "#5a3e00", icon: "🌿" },
  { value: "outros",  label: "Outros",                     color: "#6b7280", icon: "🎽" },
];

export const EVENT_STATUS = [
  { value: "confirmado", label: "Confirmado", color: "#007733" },
  { value: "adiado",     label: "Adiado",     color: "#884400" },
  { value: "cancelado",  label: "Cancelado",  color: "#cc0000" },
  { value: "realizado",  label: "Realizado",  color: "#3a3a3a" },
];

export const DOCUMENT_CATEGORIES = [
  { value: "",                label: "Todos" },
  { value: "estatuto",        label: "Estatuto" },
  { value: "regimento",       label: "Regimento" },
  { value: "nota",            label: "Nota Oficial" },
  { value: "portaria",        label: "Portaria" },
  { value: "formulario",      label: "Formulário" },
  { value: "assembleia",      label: "Assembleia Geral" },
  { value: "conselho-fiscal", label: "Conselho Fiscal" },
  { value: "comissao-atletas",label: "Comissão de Atletas" },
  { value: "certidao",        label: "Certidão" },
  { value: "eleicao",         label: "Eleições" },
  { value: "antidopagem",     label: "Antidopagem" },
  { value: "outro",           label: "Outro" },
];

export const REFEREE_CONTENT_CATEGORIES = [
  { value: "",              label: "Todos",               color: "#6b7280", icon: "📋" },
  { value: "cadastro",      label: "Cadastro",            color: "#cc0000", icon: "📝" },
  { value: "disponibilidade",label: "Disponibilidade",   color: "#0066cc", icon: "📅" },
  { value: "formulario",    label: "Formulários",         color: "#007733", icon: "📄" },
  { value: "documento",     label: "Documentos",          color: "#5a3e00", icon: "🗂️" },
  { value: "comunicado",    label: "Comunicados",         color: "#7c3aed", icon: "📢" },
  { value: "orientacao",    label: "Orientações",         color: "#884400", icon: "📌" },
  { value: "material",      label: "Materiais e Relatórios", color: "#0891b2", icon: "📊" },
];

export const REFEREE_CATEGORIES = [
  { value: "corrida-rua",  label: "Corrida de Rua",  color: "#cc0000" },
  { value: "pista-campo",  label: "Pista e Campo",   color: "#0066cc" },
  { value: "trail",        label: "Trail Run",        color: "#007733" },
  { value: "marcha",       label: "Marcha Atlética", color: "#884400" },
  { value: "todos",        label: "Todas as Provas", color: "#6b7280" },
];

export const REFEREE_ROLES = [
  { value: "admin",       label: "Administrador",  color: "#cc0000" },
  { value: "coordenador", label: "Coordenador",    color: "#0066cc" },
  { value: "arbitro",     label: "Árbitro",        color: "#007733" },
];

export const REFEREE_STATUS = [
  { value: "ativo",     label: "Ativo",     color: "#007733" },
  { value: "inativo",   label: "Inativo",   color: "#6b7280" },
  { value: "suspenso",  label: "Suspenso",  color: "#cc0000" },
];

export const REFEREE_FUNCTIONS = [
  { value: "chefe",     label: "Árbitro Chefe" },
  { value: "largada",   label: "Árbitro de Largada" },
  { value: "chegada",   label: "Árbitro de Chegada" },
  { value: "percurso",  label: "Árbitro de Percurso" },
  { value: "pista",     label: "Árbitro de Pista" },
  { value: "aferidor",  label: "Aferidor de Cronômetro" },
  { value: "juiz",      label: "Juiz de Prova" },
];

export const INTRANET_NAV_ARBITRO = [
  { label: "Início",              icon: "🏠", path: "/intranet" },
  { label: "Minha Disponibilidade", icon: "📅", path: "/intranet/disponibilidade" },
  { label: "Minhas Escalas",      icon: "📋", path: "/intranet/escalas" },
  { label: "Meus Dados",          icon: "👤", path: "/intranet/perfil" },
  { label: "Documentos",          icon: "📄", path: "/intranet/documentos" },
];

export const INTRANET_NAV_ADMIN = [
  { label: "Início",              icon: "🏠", path: "/intranet" },
  { label: "Árbitros",            icon: "👥", path: "/intranet/admin/arbitros" },
  { label: "Eventos",             icon: "🗓️", path: "/intranet/admin/eventos" },
  { label: "Escalação",           icon: "📋", path: "/intranet/admin/escalacao" },
  { label: "Meus Dados",          icon: "👤", path: "/intranet/perfil" },
  { label: "Documentos",          icon: "📄", path: "/intranet/documentos" },
];

export const ATHLETE_CONTENT_CATEGORIES = [
  { value: "",             label: "Todos",                  color: "#6b7280", icon: "📋" },
  { value: "cadastro",     label: "Cadastro de Atletas",    color: "#cc0000", icon: "📝" },
  { value: "cancelamento", label: "Cancelamento",           color: "#884400", icon: "❌" },
  { value: "lista",        label: "Lista de Atletas",       color: "#0066cc", icon: "👥" },
  { value: "orientacao",   label: "Orientações",            color: "#007733", icon: "📌" },
  { value: "documento",    label: "Documentos",             color: "#5a3e00", icon: "📄" },
  { value: "comunicado",   label: "Comunicados",            color: "#7c3aed", icon: "📢" },
  { value: "link",         label: "Links Úteis",            color: "#0891b2", icon: "🔗" },
];

export const ATHLETE_CATEGORIES = [
  { value: "sub-14",   label: "Sub-14" },
  { value: "sub-16",   label: "Sub-16" },
  { value: "sub-18",   label: "Sub-18" },
  { value: "sub-20",   label: "Sub-20" },
  { value: "sub-23",   label: "Sub-23" },
  { value: "absoluto", label: "Absoluto" },
  { value: "master",   label: "Master" },
];

export const SOCIAL_NETWORKS = [
  { value: "instagram", label: "Instagram",  icon: "📸" },
  { value: "facebook",  label: "Facebook",   icon: "👍" },
  { value: "youtube",   label: "YouTube",    icon: "▶️" },
  { value: "whatsapp",  label: "WhatsApp",   icon: "💬" },
  { value: "twitter",   label: "X (Twitter)",icon: "✖️" },
  { value: "tiktok",    label: "TikTok",     icon: "🎵" },
  { value: "linkedin",  label: "LinkedIn",   icon: "💼" },
  { value: "outro",     label: "Outro",      icon: "🔗" },
];

// ─── Portal de Solicitações ───────────────────────────────────────────────────

export const SOLICITACAO_STATUS = [
  { value: "rascunho",    label: "Rascunho",    color: "#6b7280", bg: "#f3f4f6", icon: "📝" },
  { value: "enviada",     label: "Enviada",     color: "#0066cc", bg: "#eff6ff", icon: "📤" },
  { value: "em_analise",  label: "Em análise",  color: "#d97706", bg: "#fffbeb", icon: "🔍" },
  { value: "pendencia",   label: "Pendência",   color: "#b45309", bg: "#fef3c7", icon: "⚠️" },
  { value: "aprovada",    label: "Aprovada",    color: "#15803d", bg: "#f0fdf4", icon: "✅" },
  { value: "indeferida",  label: "Indeferida",  color: "#cc0000", bg: "#fff5f5", icon: "❌" },
  { value: "concluida",   label: "Concluída",   color: "#0891b2", bg: "#f0f9ff", icon: "🏁" },
];

export const SOLICITACAO_TIPOS = [
  { value: "permit",   label: "Permit",   icon: "🏃", desc: "Para eventos que necessitam de homologação de percurso e arbitragem oficial da FMA." },
  { value: "chancela", label: "Chancela", icon: "🏅", desc: "Para eventos que buscam reconhecimento e apoio institucional da FMA sem arbitragem obrigatória." },
];

export const MOVIMENTACAO_TIPOS = {
  criada:              { label: "Solicitação criada",         icon: "📝", color: "#6b7280" },
  enviada:             { label: "Enviada para análise",       icon: "📤", color: "#0066cc" },
  status_alterado:     { label: "Status alterado",            icon: "🔄", color: "#d97706" },
  pendencia_aberta:    { label: "Pendência aberta",           icon: "⚠️", color: "#b45309" },
  arquivo_enviado:     { label: "Arquivo enviado",            icon: "📎", color: "#7c3aed" },
  comentario:          { label: "Comentário adicionado",      icon: "💬", color: "#0891b2" },
  protocolo_gerado:    { label: "Protocolo gerado",           icon: "🔖", color: "#15803d" },
  evento_vinculado:    { label: "Evento vinculado",           icon: "📅", color: "#0066cc" },
  evento_desvinculado: { label: "Evento desvinculado",        icon: "🔗", color: "#6b7280" },
  aprovada:            { label: "Solicitação aprovada",       icon: "✅", color: "#15803d" },
  indeferida:          { label: "Solicitação indeferida",     icon: "❌", color: "#cc0000" },
  concluida:           { label: "Processo concluído",         icon: "🏁", color: "#0891b2" },
  anotacao_interna:    { label: "Anotação interna",           icon: "🔒", color: "#9ca3af" },
};

export const PORTAL_NAV = [
  { label: "Início",            icon: "🏠", path: "/portal" },
  { label: "Nova Solicitação",  icon: "➕", path: "/portal/nova-solicitacao" },
  { label: "Minhas Solicitações", icon: "📋", path: "/portal/solicitacoes" },
  { label: "Meus Dados",        icon: "👤", path: "/portal/meus-dados" },
];

export const ARQUIVO_CATEGORIAS = [
  { value: "obrigatorio",   label: "Documento Obrigatório", icon: "📌", color: "#cc0000" },
  { value: "complementar",  label: "Documento Complementar", icon: "📎", color: "#6b7280" },
  { value: "resposta_fma",  label: "Documento FMA",          icon: "🏛️", color: "#0066cc" },
];
