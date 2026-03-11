/**
 * FMA — Modelos de dados do sistema.
 *
 * Cada modelo define a estrutura base (campos e defaults) de cada entidade.
 * Serve como referência canônica para criação, validação e migração futura.
 *
 * Convenções:
 *   - id:        string UUID (gerado via crypto.randomUUID() ou nanoid)
 *   - *At:       string ISO 8601 datetime (new Date().toISOString())
 *   - FKs:       campo com sufixo Id → referência fraca (sem integridade no localStorage)
 *   - enums:     documentados inline com os valores possíveis
 *   - passwords: texto simples no demo → bcrypt/argon2 em produção
 */

// ─── 1. AdminUser ─────────────────────────────────────────────────────────────
/**
 * Usuário com acesso ao painel /admin.
 *
 * Roles:
 *   super  → acesso total: cria admins, configura rodapé, parceiros, tudo
 *   editor → notícias, calendário, documentos, páginas, análise de solicitações
 *   viewer → somente leitura (relatórios e listagens)
 *
 * No demo existe um único admin (singleton). Em produção: tabela de usuários.
 */
export const adminUserModel = {
  id: "",
  name: "",
  email: "",           // único no sistema admin
  password: "",        // bcrypt em produção
  role: "editor",      // "super" | "editor" | "viewer"
  active: true,        // false → login bloqueado
  createdAt: "",
  updatedAt: "",
  lastLoginAt: "",     // auditoria de acesso
};

// ─── 2. Noticia ───────────────────────────────────────────────────────────────
/**
 * Artigo publicado no site. Sistema completo com SEO, galeria e relacionadas.
 * Rota pública: /noticias e /noticias/:slug
 * Admin: /admin/noticias
 */
export const newsModel = {
  id: "",
  title: "",
  slug: "",               // único — gerado do título, verificado antes de salvar
  excerpt: "",            // resumo ≤ 280 chars — cards + fallback meta description
  metaDescription: "",    // meta description explícita (usa excerpt se vazio)
  content: "",            // HTML completo do artigo
  image: "",              // URL da imagem de capa
  gallery: [],            // array de URLs de imagens internas
  author: "",
  date: "",               // data de publicação YYYY-MM-DD — controla ordenação
  category: "geral",      // arbitragem|competicao|institucional|corrida|atletismo|geral
  tags: [],               // ex: ["corrida", "bh", "fma"] — usado em relacionadas
  published: false,
  featured: false,        // destaque na home — a mais recente com featured=true
  createdAt: "",
  updatedAt: "",
};

// ─── 3. GaleriaAlbum ──────────────────────────────────────────────────────────
export const galleryAlbumModel = {
  id: "",
  title: "",
  description: "",       // descrição resumida do álbum (nova)
  images: [],            // array de { url, caption } — ou strings simples (retrocompat)
  cover: "",             // URL da imagem de capa do álbum
  category: "outro",     // corrida|pista|trail|institucional|outro
  date: "",
  published: false,
  createdAt: "",
};

// ─── 4. EventoCalendario ──────────────────────────────────────────────────────
/**
 * Evento esportivo no calendário público.
 * Entidade central — relaciona-se com Resultado, Solicitacao e EventoArbitro.
 *
 * Campos marcados [árbitros] são lidos também pelo módulo de intranet.
 */
export const calendarEventModel = {
  id: "",
  title: "",                   // [árbitros] nome oficial do evento
  date: "",                    // [árbitros] data principal YYYY-MM-DD
  time: "",                    // horário de largada/início HH:MM
  location: "",                // endereço completo
  city: "",                    // [árbitros] cidade
  state: "MG",                 // UF
  category: "corrida",         // [árbitros] corrida|pista|trail|marcha|cross|outros
  status: "confirmado",        // confirmado|adiado|cancelado|realizado
  shortDescription: "",        // ≤ 200 chars — cards e listagem
  fullDescription: "",         // HTML rico — página de detalhe
  organizer: "",               // nome texto livre (mantido para compatibilidade)
  organizerId: "",             // FK → Organizador.id (quando originado do portal)
  solicitacaoId: "",           // FK → Solicitacao.id (quando aprovado via portal)
  modalities: [],              // ex: ["10km", "5km", "Sub-18"]
  externalLink: "",            // site do evento ou inscrições
  coverImage: "",
  permitFileUrl: "",           // PDF do permit aprovado (gerado após aprovação)
  chancelaFileUrl: "",         // PDF da chancela FMA (gerado após aprovação)
  resultsFileUrl: "",          // PDF/XLS de resultados — pode ser preenchido depois
  featured: false,
  published: false,
  createdAt: "",
  updatedAt: "",
};

// ─── 5. Resultado ─────────────────────────────────────────────────────────────
/**
 * Resultado de prova vinculado a um evento.
 * Um evento pode ter múltiplos resultados (ex: 5km + 10km separados).
 *
 * Campos nomeEvento/dataEvento/cidade são DESNORMALIZADOS intencionalmente:
 * histórico não deve mudar se o evento for editado posteriormente.
 *
 * Rota pública: /resultados/corridas, /resultados/pista, /resultados/trail
 * Admin: /admin/resultados (PENDENTE implementação)
 */
export const resultadoModel = {
  id: "",
  eventoId: "",          // FK → EventoCalendario.id (null para resultados históricos)
  nomeEvento: "",        // desnormalizado — cópia imutável
  dataEvento: "",        // desnormalizado — cópia imutável YYYY-MM-DD
  cidade: "",            // desnormalizado — cópia imutável
  categoria: "corrida",  // corrida|pista|trail|marcha|cross — define a rota de exibição
  modalidade: "",        // ex: "10km", "Sub-18 100m rasos", "Maratona"
  tipoArquivo: "pdf",    // "pdf" | "xlsx" | "link"
  fileUrl: "",           // URL do arquivo de resultado
  externalLink: "",      // link externo (cronometragem, plataforma de resultados)
  descricao: "",         // observações ou destaques
  anoCompetitivo: 0,     // ano da temporada ex: 2026 — para filtro por ano
  published: false,
  createdAt: "",
  updatedAt: "",
};

// ─── 6. Documento ─────────────────────────────────────────────────────────────
/**
 * Documentos institucionais para download.
 * Rota pública: /documentos
 * Admin: /admin/documentos
 */
export const documentModel = {
  id: "",
  title: "",
  category: "outro",    // estatuto|nota|regimento|formulario|outro
  fileUrl: "",          // URL do arquivo (PDF, DOCX, XLS)
  description: "",      // observação ou contexto
  date: "",             // data do documento YYYY-MM-DD — controla ordenação
  published: false,
  createdAt: "",
};

// ─── 7. Banner ────────────────────────────────────────────────────────────────
export const bannerModel = {
  id: "", title: "", subtitle: "", cta: "", ctaLink: "#",
  bg: "linear-gradient(135deg, #990000 0%, #cc0000 100%)",
  icon: "🏃", order: 0, active: true,
};

// ─── 8. Parceiro ──────────────────────────────────────────────────────────────
/**
 * Patrocinadores e parceiros institucionais — exibidos no rodapé.
 * Admin: /admin/parceiros
 */
export const partnerModel = {
  id: "",
  name: "",
  logo: "",             // URL da logomarca
  link: "",             // site do parceiro
  category: "apoio",    // "patrocinador" | "apoio" | "realizacao"
  order: 0,
  active: true,
};

// ─── 9. RedeSocial ────────────────────────────────────────────────────────────
/**
 * Links de redes sociais — exibidos no TopBar (header) e rodapé.
 * Admin: /admin/redes-sociais
 */
export const socialLinkModel = {
  id: "",
  network: "",          // instagram|facebook|youtube|whatsapp|twitter|tiktok|linkedin|outro
  label: "",            // ex: "Instagram FMA" — texto alternativo
  url: "",
  icon: "",             // emoji ou nome de ícone
  order: 0,
  active: true,
};

// ─── 10. ConfiguracaoRodape ───────────────────────────────────────────────────
/**
 * Singleton — existe sempre exatamente 1 registro, nunca criado, somente atualizado.
 * Admin: /admin/rodape
 */
export const footerConfigModel = {
  institutionalText: "",
  copyrightText: "",
  developerCredit: "",
  developerLink: "",
  phone: "",
  phoneLink: "",         // "tel:+5531..."
  whatsapp: "",
  whatsappLink: "",      // "https://wa.me/5531..."
  email: "",
  emailLink: "",         // "mailto:..."
  address: "",
  city: "",
  hours: "",             // ex: "Seg–Sex, 9h–18h"
  usefulLinks: [],       // [{label, url}] — máx. 8 recomendado
  newsletterEnabled: true,
  newsletterTitle: "Newsletter",
  newsletterPlaceholder: "Seu e-mail",
  newsletterButtonLabel: "OK",
  showPartners: true,
  showSocialLinks: true,
  showNewsletter: true,
  showUsefulLinks: true,
};

// ─── 11. AthleteModel (stub público) ─────────────────────────────────────────
/**
 * Registro básico de atleta federado — exibido na listagem pública.
 * Não tem login; é gerenciado pelo admin.
 */
export const athleteModel = {
  id: "",
  name: "",
  club: "",
  category: "absoluto",  // sub-14|sub-16|sub-18|sub-20|sub-23|absoluto|master
  registration: "",       // número de registro na CBAT/FMA
  active: true,
};

// ─── 12. AthleteContent ───────────────────────────────────────────────────────
/**
 * Blocos de conteúdo informativo da Central do Atleta (/atletas).
 * Admin: /admin/atletas
 *
 * Categorias:
 *   cadastro     → Como se Federar
 *   cancelamento → Cancelamento de Registro
 *   lista        → Lista de Atletas
 *   orientacao   → Orientações gerais
 *   documento    → Documentos para download
 *   comunicado   → Comunicados e avisos
 *   link         → Links úteis (CBAT, COB, etc.)
 */
export const athleteContentModel = {
  id: "",
  title: "",
  summary: "",           // resumo para cards (≤ 200 chars)
  content: "",           // HTML rico — página interna
  category: "orientacao",
  fileUrl: "",
  fileLabel: "",
  externalLink: "",
  image: "",
  publishedAt: "",       // YYYY-MM-DD
  status: "draft",       // "published" | "draft"
  featured: false,
  order: 0,
};

// ─── 13. RefereeContent ───────────────────────────────────────────────────────
/**
 * Blocos de conteúdo informativo da Central do Árbitro (/arbitros).
 * Admin: /admin/arbitros-conteudo
 *
 * Categorias:
 *   cadastro       → Como se tornar árbitro
 *   disponibilidade→ Informações sobre disponibilidade (NÃO é a declaração — isso é intranet)
 *   formulario     → Formulários para download
 *   documento      → Regulamentos e documentos
 *   comunicado     → Comunicados e avisos
 *   orientacao     → Orientações técnicas
 *   material       → Materiais e relatórios
 */
export const refereeContentModel = {
  id: "",
  title: "",
  summary: "",
  content: "",           // HTML
  category: "orientacao",
  fileUrl: "",
  fileLabel: "",
  externalLink: "",
  image: "",
  publishedAt: "",
  status: "draft",       // "published" | "draft"
  featured: false,
  order: 0,
};

// ─── 14. PaginaInstitucional ──────────────────────────────────────────────────
/**
 * Página do sub-menu "A FMA" — gerado dinamicamente no header.
 * Admin: /admin/institucional
 * Rota pública: /institucional/:slug
 */
export const institutionalPageModel = {
  id: "",
  slug: "",              // único — segmento da URL /institucional/{slug}
  title: "",             // H1 da página
  menuLabel: "",         // texto no sub-menu do header
  description: "",       // meta description da página
  order: 0,
  published: false,
  showInNav: true,       // false → página existe mas não aparece no menu
  createdAt: "",
  updatedAt: "",
};

// ─── 15. SecaoPagina ──────────────────────────────────────────────────────────
/**
 * Seção de conteúdo dentro de uma PaginaInstitucional.
 * FK: pageId → PaginaInstitucional.id (cascade delete lógico)
 *
 * Layouts disponíveis:
 *   text       → somente texto HTML
 *   text-image → texto + imagem lado a lado (imagePosition: left|right)
 *   text-file  → texto + botão de download de arquivo
 *   full-image → imagem ocupando largura total
 */
export const institutionalSectionModel = {
  id: "",
  pageId: "",            // FK → PaginaInstitucional.id
  title: "",
  subtitle: "",
  content: "",           // HTML rico
  image: "",
  imagePosition: "right",// "left" | "right" | "top" | "none"
  fileUrl: "",
  fileLabel: "",
  layout: "text",        // "text" | "text-image" | "text-file" | "full-image"
  bgColor: "",           // hex — ex: "#f7f7f7"
  order: 0,
  published: true,
};

// ─── 16. Arbitro (Intranet — Perfil + Auth) ───────────────────────────────────
/**
 * Árbitro cadastrado na intranet. Entidade dual:
 *   - É usuário da intranet (login, role, status)
 *   - Tem perfil profissional (categoria, cidade, certificação)
 *
 * Roles:
 *   admin       → acesso total à intranet admin (mesmo que coordenador + gerencia árbitros)
 *   coordenador → escala árbitros, gerencia eventos na intranet
 *   arbitro     → declara disponibilidade, vê próprias escalas
 */
export const refereeModel = {
  id: "",
  name: "",
  email: "",             // login da intranet — único
  password: "",          // bcrypt em produção
  phone: "",
  cpf: "",               // CPF somente dígitos — para emissão de documentos futuros
  category: "corrida-rua", // corrida-rua|pista-campo|trail|marcha|todos
  city: "",
  state: "MG",
  role: "arbitro",       // "admin" | "coordenador" | "arbitro"
  status: "ativo",       // "ativo" | "inativo" | "suspenso"
  certificationLevel: "", // nível CBAT — futuro
  notes: "",             // anotações internas da coordenação
  createdAt: "",
  updatedAt: "",
};

// ─── 17. EventoArbitro (Intranet) ────────────────────────────────────────────
/**
 * Evento dentro da intranet de arbitragem.
 * Pode espelhar um EventoCalendario público (source="calendar")
 * ou ser criado diretamente na intranet (source="manual").
 *
 * FK calendarRef → EventoCalendario.id quando source="calendar"
 */
export const refereeEventModel = {
  id: "",
  source: "manual",      // "calendar" | "manual"
  calendarRef: null,     // FK → EventoCalendario.id
  title: "",
  date: "",
  time: "",
  city: "",
  location: "",
  category: "corrida",   // mesma enum de EventoCalendario
  organizer: "",
  refereesNeeded: 1,     // quantidade de árbitros necessários
  notes: "",             // instruções internas da coordenação
  status: "aberto",      // "aberto" | "escalado" | "realizado" | "cancelado"
  createdAt: "",
  updatedAt: "",
};

// ─── 18. DisponibilidadeArbitro ───────────────────────────────────────────────
/**
 * Declaração de disponibilidade de um árbitro para um EventoArbitro.
 *
 * Unicidade: par (refereeId, eventId) é único — atualização sobrescreve.
 * Árbitro inativo/suspenso NÃO pode declarar disponibilidade.
 * Disponibilidade só pode ser declarada para eventos com status="aberto".
 */
export const refereeAvailabilityModel = {
  id: "",
  refereeId: "",         // FK → Arbitro.id
  eventId: "",           // FK → EventoArbitro.id
  available: true,       // true = disponível | false = indisponível
  notes: "",             // observação do árbitro (ex: "posso chegar às 8h")
  createdAt: "",
  updatedAt: "",
};

// ─── 19. EscalacaoArbitro ─────────────────────────────────────────────────────
/**
 * Atribuição formal de um árbitro a uma função em um evento.
 *
 * Restrições de unicidade:
 *   - (eventId, refereeId) → único (árbitro não pode ser escalado 2x no mesmo evento)
 *   - (eventId, refereeFunction) → único EXCETO para funções "juiz" e "percurso"
 *     que admitem múltiplos árbitros
 *
 * Árbitro só deve ser escalado se tiver DisponibilidadeArbitro.available = true
 * para o mesmo eventId.
 */
export const refereeAssignmentModel = {
  id: "",
  eventId: "",           // FK → EventoArbitro.id
  refereeId: "",         // FK → Arbitro.id
  refereeFunction: "percurso", // chefe|largada|chegada|percurso|pista|aferidor|juiz
  status: "confirmado",  // "confirmado" | "pendente" | "cancelado"
  notes: "",
  createdAt: "",
  updatedAt: "",
};

// ─── 20. Organizador ─────────────────────────────────────────────────────────
/**
 * Pessoa física (CPF) ou jurídica (CNPJ) que usa o portal
 * para solicitar Permit ou Chancela.
 *
 * Sistema de autenticação separado do admin e da intranet.
 * E-mail único no universo do portal.
 */
export const organizerModel = {
  id: "",
  name: "",              // nome completo (PF) ou razão social (PJ)
  email: "",             // login — único no portal
  password: "",          // bcrypt em produção
  tipoPessoa: "pf",      // "pf" | "pj"
  cpfCnpj: "",           // somente dígitos (11=CPF, 14=CNPJ)
  phone: "",
  organization: "",      // nome fantasia / empresa
  address: "",
  city: "",
  state: "MG",
  website: "",
  active: true,          // false → admin bloqueou; login retorna erro
  emailVerified: false,  // PENDENTE: token de verificação por e-mail
  createdAt: "",
  updatedAt: "",
};

// ─── 21. Solicitacao (Permit / Chancela) ─────────────────────────────────────
/**
 * Solicitação de Permit ou Chancela feita via portal do organizador.
 *
 * Campo `campos` é intencionalmente livre (objeto JSON) para acomodar
 * os campos específicos dos formulários de Permit e Chancela que serão
 * implementados na próxima etapa.
 *
 * Fluxo de status:
 *   rascunho → enviada → em_analise → pendencia | aprovada | indeferida → concluida
 *
 * Separação de visibilidade FMA:
 *   observacaoFMA → NUNCA visível ao organizador (nota interna)
 *   parecerFMA    → visível ao organizador (decisão formal)
 */
export const solicitacaoModel = {
  id: "",
  tipo: "",              // "permit" | "chancela"
  organizerId: "",       // FK → Organizador.id

  // dados básicos do evento — obrigatórios para qualquer tipo
  nomeEvento: "",
  dataEvento: "",        // YYYY-MM-DD
  cidadeEvento: "",
  localEvento: "",
  descricaoEvento: "",

  // ── campos técnicos estruturados ─────────────────────────────────────────
  // Schema por tipo, gerenciado por src/utils/permitDefaults.js
  //
  // Permit (camposTecnicos._tipo === "permit"):
  //   dataEncerramentoInscricoes, horarioLargada,
  //   modalidades: [{ id, distancia, estimativaInscritos }],
  //   valorInscricao, premiacaoDinheiro, valorPremiacaoTotal,
  //   sistemaApuracao, empresaCronometragem, formaMedicaoPercurso,
  //   postoMedico, quantidadeAmbulancias, apoliceSeguros, leiIncentivo,
  //   objetivoEvento, patrocinadores, kitAtleta, empresasServicos,
  //   regulamento: { temArquivo, nomeArquivo, arquivoId },
  //   mapaPercurso:  { temArquivo, nomeArquivo, arquivoId }
  //
  // Use normalizarCamposTecnicos(sol) para obter sempre o schema completo.
  camposTecnicos: {},

  // campos legado — mantido para compatibilidade com registros antigos
  // Novos registros NÃO devem usar este campo; usar camposTecnicos.
  campos: {},

  status: "rascunho",    // rascunho|enviada|em_analise|pendencia|aprovada|indeferida|concluida

  // gestão FMA
  responsavelFMA: "",
  observacaoFMA: "",     // INTERNO — nunca expor ao organizador
  parecerFMA: "",        // PÚBLICO para o organizador
  protocoloFMA: "",      // ex: "FMA-2026-0042" — gerado ao mudar para em_analise

  // FK para o evento criado após aprovação
  eventoCalendarioId: "", // FK → EventoCalendario.id

  // datas de ciclo de vida
  criadoEm: "",
  atualizadoEm: "",
  enviadoEm: "",         // quando status → "enviada"
  analisadoEm: "",       // quando status → "em_analise"
  encerradoEm: "",       // quando status → aprovada|indeferida|concluida
};

// ─── 22. ArquivoSolicitacao ───────────────────────────────────────────────────
/**
 * Arquivo vinculado a uma solicitação.
 *
 * Demo:  fileUrl = base64 data URL (limite ~1MB por arquivo)
 * Prod:  fileUrl = URL real em S3 / Cloudflare R2
 *
 * Categorias:
 *   obrigatorio  → documento exigido pela FMA para análise
 *   complementar → documento adicional enviado pelo organizador
 *   resposta_fma → documento enviado pela FMA (ex: permit assinado)
 */
export const solicitacaoArquivoModel = {
  id: "",
  solicitacaoId: "",     // FK → Solicitacao.id
  nome: "",              // nome original do arquivo
  tamanho: 0,            // bytes
  tipo: "",              // MIME type
  descricao: "",
  categoria: "complementar", // "obrigatorio" | "complementar" | "resposta_fma"
  enviadoPor: "organizador", // "organizador" | "fma"
  enviadoById: "",
  enviadoPorNome: "",
  fileUrl: "",           // base64 no demo → URL real em produção
  uploadedAt: "",
};

// ─── 23. Movimentacao ─────────────────────────────────────────────────────────
/**
 * Trilha de auditoria IMUTÁVEL de uma solicitação.
 * Todo evento significativo gera um registro — sem UPDATE ou DELETE.
 *
 * visivel = false → somente FMA vê (aparece no admin com badge "🔒 Interno")
 * visivel = true  → organizador também vê na aba Histórico
 *
 * Geração automática:
 *   - Toda mudança de status → tipoEvento="status_alterado"
 *   - Upload de arquivo      → tipoEvento="arquivo_enviado"
 *   - Abertura de pendência  → tipoEvento="pendencia_aberta"
 */
export const movimentacaoModel = {
  id: "",
  solicitacaoId: "",     // FK → Solicitacao.id
  tipoEvento: "",        // ver MOVIMENTACAO_TIPOS em navigation.js
  statusAnterior: "",    // vazio na criação
  statusNovo: "",
  descricao: "",
  autor: "organizador",  // "organizador" | "fma"
  autorNome: "",
  autorId: "",
  visivel: true,         // false = anotação interna
  criadoEm: "",
};

// ─── 24. Equipe ───────────────────────────────────────────────────────────────
/**
 * Clube / equipe filiada à FMA.
 * Gerenciada em /admin/equipes.
 * Rota pública: /equipes/:slug
 */
export const equipeModel = {
  id: "",
  title: "",            // nome da equipe/clube
  slug: "",             // URL amigável — gerado do título
  excerpt: "",          // resumo curto (cards)
  content: "",          // HTML completo da página da equipe
  coverImage: "",       // imagem de capa/banner
  logo: "",             // logo da equipe
  cidade: "",
  fundacao: "",         // YYYY ou texto livre ex: "1985"
  contato: "",          // e-mail ou site público
  redesSociais: [],     // array de { rede, url } ex: [{rede:"instagram",url:"..."}]
  order: 0,
  showInNav: false,
  published: false,
  createdAt: "",
  updatedAt: "",
};
