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

  { label: "Mapa", link: "/mapa" },

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
      { label: "Rankings",          link: "#",  external: false },
      { label: "Recordes Estaduais",link: "#",  external: false },
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

/**
 * ADMIN_NAV — Navegação do painel admin.
 *
 * minLevel: nível mínimo para ver o item (master > admin > editor > viewer)
 * section:  para editors, item só aparece se section estiver em user.permissions[]
 *           admins e masters veem tudo independentemente de section.
 */
/**
 * ADMIN_NAV — Navegação do painel admin.
 *
 * minLevel: nível mínimo para ver o item (master > admin > editor > viewer)
 * section:  para editors, item só aparece se section estiver em user.permissions[]
 * group:    label de separação visual no sidebar (exibido antes do primeiro item do grupo)
 */
export const ADMIN_NAV = [
  // ── Visão geral ──
  { label: "Dashboard",              icon: "BarChart3", path: "/admin",                   minLevel: "viewer" },

  // ── Conteúdo editorial ──
  { label: "Notícias",               icon: "Newspaper", path: "/admin/noticias",          minLevel: "editor", section: "noticias",       group: "Conteúdo" },
  { label: "Calendário",             icon: "Calendar", path: "/admin/calendario",        minLevel: "editor", section: "calendario" },
  { label: "Resultados",             icon: "Trophy", path: "/admin/resultados",        minLevel: "editor", section: "resultados" },
  { label: "Galeria",                icon: "Camera", path: "/admin/galeria",           minLevel: "editor", section: "galeria" },
  { label: "Documentos",             icon: "FileText", path: "/admin/documentos",        minLevel: "editor", section: "documentos" },
  { label: "Páginas Institucionais", icon: "Landmark", path: "/admin/institucional",     minLevel: "editor", section: "institucional" },
  { label: "Equipes",                icon: "PersonStanding", path: "/admin/equipes",           minLevel: "editor", section: "equipes" },
  { label: "Banners",                icon: "Image", path: "/admin/banners",           minLevel: "editor", section: "banners" },
  { label: "Pistas Homologadas",     icon: "MapPinned", path: "/admin/pistas",            minLevel: "editor", section: "pistas" },
  { label: "Conteúdo de Atletas",    icon: "Footprints", path: "/admin/atletas",           minLevel: "editor", section: "atletas" },
  { label: "Conteúdo de Árbitros",   icon: "Scale", path: "/admin/arbitros-conteudo", minLevel: "editor", section: "arbitros" },

  // ── Site ──
  { label: "Parceiros",              icon: "Handshake", path: "/admin/parceiros",         minLevel: "editor", section: "parceiros",      group: "Site" },
  { label: "Redes Sociais",          icon: "Smartphone", path: "/admin/redes-sociais",     minLevel: "editor", section: "redes" },
  { label: "Rodapé",                 icon: "Settings", path: "/admin/rodape",            minLevel: "editor", section: "rodape" },
  { label: "Importar Calendário",    icon: "Download", path: "/admin/importar",          minLevel: "editor", section: "calendario" },

  // ── Portal (solicitações / organizadores) ──
  { label: "Solicitações",           icon: "ClipboardList", path: "/admin/solicitacoes",      minLevel: "admin",                             group: "Portal" },
  { label: "Organizadores",          icon: "Building2", path: "/admin/organizadores",     minLevel: "admin" },
  { label: "Financeiro",             icon: "CircleDollarSign", path: "/admin/financeiro",        minLevel: "admin" },

  // ── Intranet ──
  { label: "Árbitros",               icon: "Scale", path: "/admin/arbitros",          minLevel: "admin",                             group: "Intranet" },
  { label: "Anuidades",              icon: "CreditCard", path: "/admin/anuidades",         minLevel: "admin" },
  { label: "Mensagens",              icon: "Mail", path: "/admin/mensagens",        minLevel: "admin" },
  { label: "Escalas",                icon: "CalendarDays", path: "/admin/escalas",           minLevel: "admin" },

  // ── Gestão ──
  { label: "Usuários",               icon: "UserCog", path: "/admin/usuarios",          minLevel: "admin",                             group: "Gestão" },
  { label: "Formulários",            icon: "Settings", path: "/admin/formularios",       minLevel: "master" },
  { label: "Taxas",                  icon: "Banknote", path: "/admin/taxas",             minLevel: "admin" },
  { label: "Limpeza do Storage",     icon: "Trash2", path: "/admin/storage-cleanup",   minLevel: "master" },
];

export const QUICK_ACCESS = [
  { label: "Notícias",         to: "/noticias" },
  { label: "Calendário",       to: "/calendario" },
  { label: "Mapa FMA",          to: "/mapa" },
  { label: "Resultados",        to: "/resultados/corridas" },
  // { label: "Rankings",          to: "/ranking" },  // desativado temporariamente
  { label: "Atletas Federados", to: "/atletas" },
  { label: "Árbitros",          to: "/arbitros" },
];

// ─── Categorias ───────────────────────────────────────────────────────────────

export const NEWS_CATEGORIES = [
  { value: "",              label: "Todas",           color: "#6b7280", icon: "Newspaper" },
  { value: "arbitragem",   label: "Arbitragem",      color: "#cc0000", icon: "Scale" },
  { value: "competicao",   label: "Competição",      color: "#0066cc", icon: "Trophy" },
  { value: "atletismo",    label: "Atletismo",       color: "#007733", icon: "PersonStanding" },
  { value: "corrida",      label: "Corrida de Rua",  color: "#884400", icon: "Medal" },
  { value: "institucional",label: "Institucional",   color: "#5a3e8a", icon: "Landmark" },
  { value: "geral",        label: "Geral",           color: "#374151", icon: "ClipboardList" },
];

export const CALENDAR_CATEGORIES = [
  { value: "",        label: "Todos os Tipos" },
  { value: "corrida", label: "Corrida de Rua Homologada", color: "#cc0000" },
  { value: "pista",   label: "Pista e Campo",              color: "#0066cc" },
  { value: "trail",   label: "Trail / Montanha",           color: "#007733" },
  { value: "marcha",  label: "Marcha Atlética",            color: "#884400" },
  { value: "cross",   label: "Cross Country",              color: "#5a3e00" },
  { value: "treinao", label: "Treinão",                    color: "#e67e22" },
  { value: "outros",  label: "Outros",                     color: "#6b7280" },
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
  { value: "",              label: "Todos",               color: "#6b7280", icon: "ClipboardList" },
  { value: "cadastro",      label: "Cadastro",            color: "#cc0000", icon: "Pencil" },
  { value: "disponibilidade",label: "Disponibilidade",   color: "#0066cc", icon: "CalendarDays" },
  { value: "formulario",    label: "Formulários",         color: "#007733", icon: "FileText" },
  { value: "documento",     label: "Documentos",          color: "#5a3e00", icon: "FolderOpen" },
  { value: "comunicado",    label: "Comunicados",         color: "#7c3aed", icon: "Megaphone" },
  { value: "orientacao",    label: "Orientações",         color: "#884400", icon: "Flag" },
  { value: "material",      label: "Materiais e Relatórios", color: "#0891b2", icon: "BarChart3" },
];

export const REFEREE_CATEGORIES = [
  { value: "A",   label: "Nível A", color: "#cc0000" },
  { value: "B",   label: "Nível B", color: "#0066cc" },
  { value: "C",   label: "Nível C", color: "#007733" },
  { value: "NI",  label: "NAR",     color: "#884400" },
];

export const REFEREE_LEVELS = REFEREE_CATEGORIES;

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
  { value: "chefe",          label: "Árbitro Chefe" },
  { value: "auxiliar",       label: "Árbitro Auxiliar" },
  { value: "coordenador_ev", label: "Coordenador" },
  { value: "representante",  label: "Representante da FMA", restrito: true },
];

export const INTRANET_NAV_ARBITRO = [
  { label: "Inicio",                icon: "LayoutDashboard", path: "/intranet" },
  { label: "Disponibilidade",       icon: "CalendarCheck", path: "/intranet/disponibilidade",  group: "Minha Arbitragem" },
  { label: "Minhas Escalas",        icon: "ListChecks", path: "/intranet/escalas" },
  { label: "Historico",             icon: "History", path: "/intranet/historico" },
  { label: "Mapa",                  icon: "MapPin", path: "/intranet/mapa" },
  { label: "Calendario",            icon: "Calendar", path: "/intranet/calendario" },
  { label: "Meus Reembolsos",       icon: "Receipt", path: "/intranet/reembolsos" },
  { label: "Mensagens",             icon: "Mail", path: "/intranet/mensagens",        group: "Comunicacao" },
  { label: "Documentos",            icon: "FolderOpen", path: "/intranet/documentos" },
  { label: "Meus Dados",            icon: "User", path: "/intranet/perfil",           group: "Minha Conta" },
  { label: "Minha Anuidade",        icon: "CreditCard", path: "/intranet/anuidade" },
  { label: "Privacidade (LGPD)",    icon: "ShieldCheck", path: "/intranet/lgpd" },
];

export const INTRANET_NAV_ADMIN = [
  { label: "Inicio",                icon: "LayoutDashboard", path: "/intranet" },
  { label: "Disponibilidade",       icon: "CalendarCheck", path: "/intranet/disponibilidade",  group: "Minha Arbitragem" },
  { label: "Minhas Escalas",        icon: "ListChecks", path: "/intranet/escalas" },
  { label: "Meus Reembolsos",       icon: "Receipt", path: "/intranet/reembolsos" },
  { label: "Eventos",               icon: "Calendar", path: "/intranet/admin/eventos",    group: "Gestao" },
  { label: "Escalacao",             icon: "UserCheck", path: "/intranet/admin/escalacao" },
  { label: "Historico",             icon: "History", path: "/intranet/admin/historico" },
  { label: "Arbitros",              icon: "Users", path: "/intranet/admin/arbitros",    group: "Arbitros" },
  { label: "Avaliacoes",            icon: "Star", path: "/intranet/admin/avaliacoes" },
  { label: "Financeiro",            icon: "DollarSign", path: "/intranet/admin/financeiro",  group: "Financeiro" },
  { label: "Pagamentos",            icon: "Wallet", path: "/intranet/admin/pagamentos" },
  { label: "Anuidades",             icon: "CreditCard", path: "/intranet/admin/anuidades" },
  { label: "Relatorios Arbitragem", icon: "FileText", path: "/intranet/admin/relatorios-arbitragem", group: "Relatorios" },
  { label: "Relatorio Arbitros",    icon: "FileSpreadsheet", path: "/intranet/admin/relatorio" },
  { label: "Indicadores",           icon: "TrendingUp", path: "/intranet/admin/indicadores" },
  { label: "Mensagens",             icon: "Mail", path: "/intranet/mensagens",        group: "Comunicacao" },
  { label: "Mural de Avisos",       icon: "Megaphone", path: "/intranet/admin/mural" },
  { label: "Documentos",            icon: "FolderOpen", path: "/intranet/documentos" },
  { label: "Meus Dados",            icon: "User", path: "/intranet/perfil",           group: "Minha Conta" },
  { label: "Minha Anuidade",        icon: "CreditCard", path: "/intranet/anuidade" },
  { label: "Privacidade (LGPD)",    icon: "ShieldCheck", path: "/intranet/lgpd" },
];

export const ATHLETE_CONTENT_CATEGORIES = [
  { value: "",             label: "Todos",                  color: "#6b7280", icon: "ClipboardList" },
  { value: "cadastro",     label: "Cadastro de Atletas",    color: "#cc0000", icon: "Pencil" },
  { value: "cancelamento", label: "Cancelamento",           color: "#884400", icon: "CircleX" },
  { value: "lista",        label: "Lista de Atletas",       color: "#0066cc", icon: "Users" },
  { value: "orientacao",   label: "Orientações",            color: "#007733", icon: "Flag" },
  { value: "documento",    label: "Documentos",             color: "#5a3e00", icon: "FileText" },
  { value: "comunicado",   label: "Comunicados",            color: "#7c3aed", icon: "Megaphone" },
  { value: "link",         label: "Links Úteis",            color: "#0891b2", icon: "Link2" },
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
  { value: "instagram", label: "Instagram",  icon: "Camera" },
  { value: "facebook",  label: "Facebook",   icon: "Heart" },
  { value: "youtube",   label: "YouTube",    icon: "Play" },
  { value: "whatsapp",  label: "WhatsApp",   icon: "MessageSquare" },
  { value: "twitter",   label: "X (Twitter)",icon: "X" },
  { value: "tiktok",    label: "TikTok",     icon: "Play" },
  { value: "linkedin",  label: "LinkedIn",   icon: "Building" },
  { value: "outro",     label: "Outro",      icon: "Globe" },
];

// ─── Portal de Solicitações ───────────────────────────────────────────────────

export const SOLICITACAO_STATUS = [
  { value: "rascunho",    label: "Rascunho",    color: "#6b7280", bg: "#f3f4f6", icon: "" },
  { value: "enviada",     label: "Enviada",     color: "#0066cc", bg: "#eff6ff", icon: "" },
  { value: "em_analise",  label: "Em análise",  color: "#d97706", bg: "#fffbeb", icon: "" },
  { value: "pendencia",   label: "Pendência",   color: "#b45309", bg: "#fef3c7", icon: "" },
  { value: "aprovada",    label: "Aprovada",    color: "#15803d", bg: "#f0fdf4", icon: "" },
  { value: "indeferida",  label: "Indeferida",  color: "#cc0000", bg: "#fff5f5", icon: "" },
  { value: "concluida",   label: "Concluída",   color: "#0891b2", bg: "#f0f9ff", icon: "" },
];

export const SOLICITACAO_TIPOS = [
  { value: "permit",   label: "Permit",   icon: "", desc: "Reconhecimento e homologação de corridas de rua e ultramaratonas, conforme Norma 07 da CBAt. Inclui arbitragem, medição de percurso e cronometragem oficial." },
  { value: "chancela", label: "Chancela", icon: "", desc: "Reconhecimento e homologação de corridas em montanha e corridas em trilha, conforme Norma 15 da CBAt. Inclui Delegado Técnico e requisitos de segurança." },
];

export const MOVIMENTACAO_TIPOS = {
  criada:              { label: "Solicitação criada",         icon: "", color: "#6b7280" },
  enviada:             { label: "Enviada para análise",       icon: "", color: "#0066cc" },
  status_alterado:     { label: "Status alterado",            icon: "", color: "#d97706" },
  pendencia_aberta:    { label: "Pendência aberta",           icon: "", color: "#b45309" },
  arquivo_enviado:     { label: "Arquivo enviado",            icon: "", color: "#7c3aed" },
  comentario:          { label: "Comentário adicionado",      icon: "", color: "#0891b2" },
  protocolo_gerado:    { label: "Protocolo gerado",           icon: "", color: "#15803d" },
  evento_vinculado:    { label: "Evento vinculado",           icon: "", color: "#0066cc" },
  evento_desvinculado: { label: "Evento desvinculado",        icon: "", color: "#6b7280" },
  aprovada:            { label: "Solicitação aprovada",       icon: "", color: "#15803d" },
  indeferida:          { label: "Solicitação indeferida",     icon: "", color: "#cc0000" },
  concluida:           { label: "Processo concluído",         icon: "", color: "#0891b2" },
  anotacao_interna:    { label: "Anotação interna",           icon: "", color: "#9ca3af" },
  permit_gerado:       { label: "Permit/Chancela gerado",     icon: "", color: "#15803d" },
  resultado_enviado:   { label: "Resultado enviado",          icon: "", color: "#7c3aed" },
  resultado_aprovado:  { label: "Resultado aprovado",         icon: "", color: "#15803d" },
  resultado_rejeitado: { label: "Resultado rejeitado",        icon: "", color: "#cc0000" },
  taxa_calculada:      { label: "Taxa calculada",             icon: "", color: "#d97706" },
  pagamento_anexado:   { label: "Comprovante anexado",        icon: "", color: "#0066cc" },
  pagamento_confirmado:{ label: "Pagamento confirmado",       icon: "", color: "#15803d" },
  pagamento_cobrado:   { label: "Cobrança enviada",           icon: "", color: "#b45309" },
};

export const PAGAMENTO_STATUS = [
  { value: "pendente",            label: "Pendente",            color: "#d97706", bg: "#fffbeb", icon: "" },
  { value: "comprovante_anexado", label: "Comprovante anexado", color: "#0066cc", bg: "#eff6ff", icon: "" },
  { value: "confirmado",         label: "Confirmado",          color: "#15803d", bg: "#f0fdf4", icon: "" },
  { value: "isento",             label: "Isento",              color: "#6b7280", bg: "#f3f4f6", icon: "" },
];

export const ANUIDADE_STATUS = [
  { value: "pendente", label: "Pendente",  color: "#d97706", bg: "#fffbeb" },
  { value: "pago",     label: "Pago",      color: "#15803d", bg: "#f0fdf4" },
  { value: "vencido",  label: "Vencido",   color: "#dc2626", bg: "#fef2f2" },
  { value: "isento",   label: "Isento",    color: "#6b7280", bg: "#f3f4f6" },
];

export const PORTAL_NAV = [
  { label: "Inicio",              icon: "LayoutDashboard", path: "/portal" },
  { label: "Nova Solicitacao",    icon: "FilePlus", path: "/portal/nova-solicitacao" },
  { label: "Minhas Solicitacoes", icon: "ClipboardList", path: "/portal/solicitacoes" },
  { label: "Meus Dados",         icon: "User", path: "/portal/meus-dados" },
];

// ── LGPD — Versões dos documentos legais ─────────────────────────────────────
export const LGPD_VERSIONS = {
  privacidade: "2026-04-11",   // Data da última revisão da Política de Privacidade
  termos:      "2026-04-11",   // Data da última revisão dos Termos de Uso
};

// ── LGPD — Política de retenção (em dias) ────────────────────────────────────
export const LGPD_RETENCAO = {
  arbitroInativo:     5 * 365,  // 5 anos após inativação (obrigação CBAt)
  dadosBancarios:     30,       // 30 dias após solicitação/inativação
  dadosSensiveis:     0,        // imediato (cor/raça, tipo sanguíneo)
  organizadorInativo: 5 * 365,  // 5 anos (histórico de solicitações)
  navegacao:          365,      // 12 meses
  prazoExclusao:      15,       // prazo para processar solicitação do titular
};

export const ARQUIVO_CATEGORIAS = [
  { value: "obrigatorio",   label: "Documento Obrigatório", icon: "Flag", color: "#cc0000" },
  { value: "complementar",  label: "Documento Complementar", icon: "FileUp", color: "#6b7280" },
  { value: "resposta_fma",  label: "Documento FMA",          icon: "Landmark", color: "#0066cc" },
  { value: "resultado",    label: "Resultado",              icon: "BarChart3", color: "#7c3aed" },
];
