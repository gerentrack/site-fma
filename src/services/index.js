/**
 * FMA — Camada de Serviços
 * Separa lógica de negócio da camada de dados.
 * Quando houver backend real, só esta camada muda.
 */

import {
  newsAPI, galleryAPI, calendarAPI, documentsAPI,
  bannersAPI, authAPI, partnersAPI, socialLinksAPI, footerConfigAPI,
  institutionalPagesAPI, institutionalSectionsAPI,
  athleteContentAPI,
  refereeContentAPI, intranetAuthAPI, refereesAPI,
  refereeEventsAPI, refereeAvailabilityAPI, refereeAssignmentsAPI,
  organizerAuthAPI, organizersAPI, solicitacoesAPI,
  solicitacaoArquivosAPI, movimentacoesAPI, pagamentosAPI,
  resultadosAPI, equipesAPI,
  taxasConfigAPI, anuidadesAPI, envioDocumentosAPI, avaliacoesAPI,
  diariasAPI, muralAvisosAPI, reembolsosAPI, relatoriosAPI,
} from "../data/api";
import { notificarFmaSolicitacaoEnviada } from "./emailService";

function slugify(str = "") {
  return str.toLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim().replace(/\s+/g, "-");
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const AuthService = {
  login: (credentials) => authAPI.login(credentials),
  logout: () => authAPI.logout(),
  isAuthenticated: () => authAPI.check(),
  getCurrentUser: () => authAPI.getUser(),
};

// ─── News ─────────────────────────────────────────────────────────────────────
export const NewsService = {
  list: async (opts = {}) => {
    const result = await newsAPI.list({ publishedOnly: opts.publishedOnly ?? true });
    if (result.error) return result;
    let items = result.data;
    if (opts.category) items = items.filter(n => n.category === opts.category);
    if (opts.tag) items = items.filter(n => Array.isArray(n.tags) && n.tags.includes(opts.tag));
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.excerpt?.toLowerCase().includes(q) ||
        n.author?.toLowerCase().includes(q) ||
        (Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    if (opts.featured !== undefined) items = items.filter(n => n.featured === opts.featured);
    if (opts.limit) items = items.slice(0, opts.limit);
    if (opts.offset) items = items.slice(opts.offset);
    if (opts.page && opts.perPage) {
      const start = (opts.page - 1) * opts.perPage;
      items = items.slice(start, start + opts.perPage);
    }
    return { data: items, error: null };
  },
  get: (idOrSlug) => newsAPI.get(idOrSlug),
  getRelated: ({ excludeId, category, tags, limit = 3 }) =>
    newsAPI.getRelated({ excludeId, category, tags, limit }),
  count: async (opts = {}) => {
    const result = await newsAPI.list({ publishedOnly: opts.publishedOnly ?? true });
    if (result.error) return result;
    let items = result.data;
    if (opts.category) items = items.filter(n => n.category === opts.category);
    if (opts.search) {
      const q = opts.search.toLowerCase();
      items = items.filter(n =>
        n.title?.toLowerCase().includes(q) ||
        n.excerpt?.toLowerCase().includes(q) ||
        (Array.isArray(n.tags) && n.tags.some(t => t.toLowerCase().includes(q)))
      );
    }
    return { data: items.length, error: null };
  },
  create: (data) => {
    const slug = data.slug || slugify(data.title);
    return newsAPI.create({ ...data, slug });
  },
  update: (id, data) => newsAPI.update(id, data),
  delete: (id) => newsAPI.delete(id),
  publish: (id) => newsAPI.update(id, { published: true }),
  unpublish: (id) => newsAPI.update(id, { published: false }),
  toggleFeatured: async (id) => {
    const item = await newsAPI.get(id);
    if (item.error) return item;
    return newsAPI.update(id, { featured: !item.data.featured });
  },
};

// ─── Gallery ──────────────────────────────────────────────────────────────────
export const GalleryService = {
  list: (opts = {}) => galleryAPI.list({
    publishedOnly: opts.publishedOnly ?? true,
    category: opts.category || null,
    busca:    opts.busca    || null,
  }),
  get:    (id)         => galleryAPI.get(id),
  create: (data)       => galleryAPI.create(data),
  update: (id, data)   => galleryAPI.update(id, data),
  delete: (id)         => galleryAPI.delete(id),
  publish:   (id)      => galleryAPI.update(id, { published: true }),
  unpublish: (id)      => galleryAPI.update(id, { published: false }),
  getCategorias:  ()   => galleryAPI.getCategorias(),
  addImage: async (albumId, imageUrl) => {
    const result = await galleryAPI.get(albumId);
    if (result.error) return result;
    const images = [...(result.data.images || []), imageUrl];
    return galleryAPI.update(albumId, { images });
  },
  removeImage: async (albumId, imageUrl) => {
    const result = await galleryAPI.get(albumId);
    if (result.error) return result;
    const images = result.data.images.filter(img => img !== imageUrl);
    return galleryAPI.update(albumId, { images });
  },
};

// ─── Calendar ─────────────────────────────────────────────────────────────────
export const CalendarService = {
  list: async (opts = {}) => {
    const result = await calendarAPI.list({
      publishedOnly: opts.publishedOnly ?? true,
      category: opts.category || null,
      year: opts.year || null,
      month: opts.month || null,
      city: opts.city || null,
      featuredOnly: opts.featuredOnly || false,
    });
    if (result.error) return result;
    let items = result.data;
    if (opts.upcomingOnly) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter(e => e.date >= today);
    }
    if (opts.limit) items = items.slice(0, opts.limit);
    return { data: items, error: null };
  },
  get: (id) => calendarAPI.get(id),
  create: (data) => calendarAPI.create(data),
  update: (id, data) => calendarAPI.update(id, data),
  delete: (id) => calendarAPI.delete(id),
  publish: (id) => calendarAPI.update(id, { published: true }),
  unpublish: (id) => calendarAPI.update(id, { published: false }),
  getCities: () => calendarAPI.getCities(),
  getYears: () => calendarAPI.getYears(),
  // Usado pelo módulo de árbitros: lista eventos futuros de uma cidade/categoria
  listForArbitros: async (opts = {}) => {
    const today = new Date().toISOString().slice(0, 10);
    const result = await calendarAPI.list({
      publishedOnly: true,
      category: opts.category || null,
      city: opts.city || null,
    });
    if (result.error) return result;
    const upcoming = result.data.filter(e => e.date >= today && e.status !== "cancelado");
    return { data: upcoming, error: null };
  },
};

// ─── Documents ────────────────────────────────────────────────────────────────
export const DocumentsService = {
  list: (opts = {}) => documentsAPI.list({
    publishedOnly: opts.publishedOnly ?? true,
    category:  opts.category  || null,
    busca:     opts.busca     || null,
    ordenacao: opts.ordenacao || "data_desc",
  }),
  get: (id) => documentsAPI.get(id),
  create: (data) => documentsAPI.create(data),
  update: (id, data) => documentsAPI.update(id, data),
  delete: (id) => documentsAPI.delete(id),
  publish:   (id) => documentsAPI.update(id, { published: true }),
  unpublish: (id) => documentsAPI.update(id, { published: false }),
};

// ─── Banners ─────────────────────────────────────────────────────────────────
export const BannersService = {
  list: (opts = {}) => bannersAPI.list({ activeOnly: opts.activeOnly ?? true }),
  create: (data) => bannersAPI.create(data),
  update: (id, data) => bannersAPI.update(id, data),
  delete: (id) => bannersAPI.delete(id),
  activate: (id) => bannersAPI.update(id, { active: true }),
  deactivate: (id) => bannersAPI.update(id, { active: false }),
};

// ─── Partners ─────────────────────────────────────────────────────────────────
export const PartnersService = {
  list: (opts = {}) => partnersAPI.list({ activeOnly: opts.activeOnly ?? true }),
  get: (id) => partnersAPI.get(id),
  create: (data) => partnersAPI.create(data),
  update: (id, data) => partnersAPI.update(id, data),
  delete: (id) => partnersAPI.delete(id),
  activate: (id) => partnersAPI.update(id, { active: true }),
  deactivate: (id) => partnersAPI.update(id, { active: false }),
};

// ─── Social Links ─────────────────────────────────────────────────────────────
export const SocialLinksService = {
  list: (opts = {}) => socialLinksAPI.list({ activeOnly: opts.activeOnly ?? true }),
  get: (id) => socialLinksAPI.get(id),
  create: (data) => socialLinksAPI.create(data),
  update: (id, data) => socialLinksAPI.update(id, data),
  delete: (id) => socialLinksAPI.delete(id),
};

// ─── Footer Config ────────────────────────────────────────────────────────────
export const FooterConfigService = {
  get: () => footerConfigAPI.get(),
  update: (data) => footerConfigAPI.update(data),
};

// ─── Páginas Institucionais ───────────────────────────────────────────────────

export const InstitutionalPagesService = {
  list: (opts = {}) => institutionalPagesAPI.list({ publishedOnly: opts.publishedOnly ?? true }),
  get: (idOrSlug) => institutionalPagesAPI.get(idOrSlug),
  create: (data) => {
    const slug = data.slug || data.title?.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "").trim().replace(/\s+/g, "-");
    return institutionalPagesAPI.create({ ...data, slug });
  },
  update: (id, data) => institutionalPagesAPI.update(id, data),
  delete: (id) => institutionalPagesAPI.delete(id),
  publish: (id) => institutionalPagesAPI.update(id, { published: true }),
  unpublish: (id) => institutionalPagesAPI.update(id, { published: false }),
  reorder: (orderedIds) => institutionalPagesAPI.reorder(orderedIds),
};

export const InstitutionalSectionsService = {
  list: (opts = {}) => institutionalSectionsAPI.list({
    pageId: opts.pageId || undefined,
    publishedOnly: opts.publishedOnly ?? true,
  }),
  get: (id) => institutionalSectionsAPI.get(id),
  create: (data) => institutionalSectionsAPI.create(data),
  update: (id, data) => institutionalSectionsAPI.update(id, data),
  delete: (id) => institutionalSectionsAPI.delete(id),
  publish: (id) => institutionalSectionsAPI.update(id, { published: true }),
  unpublish: (id) => institutionalSectionsAPI.update(id, { published: false }),
  reorder: (pageId, orderedIds) => institutionalSectionsAPI.reorder(pageId, orderedIds),
};

// ─── Conteúdo de Atletas ──────────────────────────────────────────────────────
export const AthleteContentService = {
  list: (opts = {}) => athleteContentAPI.list({
    publishedOnly: opts.publishedOnly ?? true,
    category: opts.category || null,
    featuredOnly: opts.featuredOnly || false,
  }),
  get: (id) => athleteContentAPI.get(id),
  create: (data) => athleteContentAPI.create(data),
  update: (id, data) => athleteContentAPI.update(id, data),
  delete: (id) => athleteContentAPI.delete(id),
  publish: (id) => athleteContentAPI.update(id, { status: "published" }),
  unpublish: (id) => athleteContentAPI.update(id, { status: "draft" }),
  toggleFeatured: async (id) => {
    const r = await athleteContentAPI.get(id);
    if (r.error) return r;
    return athleteContentAPI.update(id, { featured: !r.data.featured });
  },
  getCategories: () => athleteContentAPI.getCategories(),
};

// ─── Conteúdo Público de Árbitros ─────────────────────────────────────────────
export const RefereeContentService = {
  list: (opts = {}) => refereeContentAPI.list({ publishedOnly: opts.publishedOnly ?? true, category: opts.category || null, featuredOnly: opts.featuredOnly || false }),
  get: (id) => refereeContentAPI.get(id),
  create: (data) => refereeContentAPI.create(data),
  update: (id, data) => refereeContentAPI.update(id, data),
  delete: (id) => refereeContentAPI.delete(id),
  publish: (id) => refereeContentAPI.update(id, { status: "published" }),
  unpublish: (id) => refereeContentAPI.update(id, { status: "draft" }),
  toggleFeatured: async (id) => {
    const r = await refereeContentAPI.get(id);
    if (r.error) return r;
    return refereeContentAPI.update(id, { featured: !r.data.featured });
  },
};

// ─── Intranet — Auth ──────────────────────────────────────────────────────────
export const IntranetAuthService = {
  login: (credentials) => intranetAuthAPI.login(credentials),
  logout: () => intranetAuthAPI.logout(),
  getSession: () => intranetAuthAPI.getSession(),
  isAuthenticated: () => !!intranetAuthAPI.check(),
};

// ─── Intranet — Árbitros ──────────────────────────────────────────────────────
export const RefereesService = {
  list: (opts = {}) => refereesAPI.list(opts),
  get: (id) => refereesAPI.get(id),
  create: (data) => refereesAPI.create(data),
  update: (id, data) => refereesAPI.update(id, data),
  delete: (id) => refereesAPI.delete(id),
  updatePassword: (id, pw) => refereesAPI.updatePassword(id, pw),
  activate: (id) => refereesAPI.update(id, { status: "ativo" }),
  deactivate: (id) => refereesAPI.update(id, { status: "inativo" }),
};

// ─── Intranet — Eventos ───────────────────────────────────────────────────────
export const RefereeEventsService = {
  list: (opts = {}) => refereeEventsAPI.list(opts),
  get: (id) => refereeEventsAPI.get(id),
  create: (data) => refereeEventsAPI.create(data),
  update: (id, data) => refereeEventsAPI.update(id, data),
  delete: (id) => refereeEventsAPI.delete(id),
  importFromCalendar: () => refereeEventsAPI.importFromCalendar(),
};

// ─── Intranet — Disponibilidade ───────────────────────────────────────────────
export const RefereeAvailabilityService = {
  list: (opts = {}) => refereeAvailabilityAPI.list(opts),
  setAvailability: (data) => refereeAvailabilityAPI.setAvailability(data),
  getForEvent: (refereeId, eventId) => refereeAvailabilityAPI.getForEvent(refereeId, eventId),
  getAvailableForEvent: (eventId) => refereeAvailabilityAPI.getAvailableForEvent(eventId),
};

// ─── Intranet — Escalações ────────────────────────────────────────────────────
export const RefereeAssignmentsService = {
  list: (opts = {}) => refereeAssignmentsAPI.list(opts),
  getByEvent: (eventId) => refereeAssignmentsAPI.getByEvent(eventId),
  getByReferee: (refereeId) => refereeAssignmentsAPI.getByReferee(refereeId),
  assign: (data) => refereeAssignmentsAPI.assign(data),
  update: (id, data) => refereeAssignmentsAPI.update(id, data),
  remove: (id) => refereeAssignmentsAPI.delete(id),
};

// ═══════════════════════════════════════════════════════════════════════════════
// Portal de Solicitações — Services
// ═══════════════════════════════════════════════════════════════════════════════

export const OrganizerAuthService = {
  login: (credentials) => organizerAuthAPI.login(credentials),
  logout: () => organizerAuthAPI.logout(),
  check: () => organizerAuthAPI.check(),
  getSession: () => organizerAuthAPI.getSession(),
  isAuthenticated: () => !!organizerAuthAPI.check(),
};

export const OrganizersService = {
  list: (opts) => organizersAPI.list(opts),
  get: (id, opts) => organizersAPI.get(id, opts),
  findByEmail: (email) => organizersAPI.findByEmail(email),
  register: (data) => organizersAPI.register(data),
  update: (id, data) => organizersAPI.update(id, data),
  updatePassword: (id, opts) => organizersAPI.updatePassword(id, opts),
  updateEmail: (id, newEmail, currentPassword) => organizersAPI.updateEmail(id, newEmail, currentPassword),
  setActive: (id, active, motivo) => organizersAPI.setActive(id, active, motivo),
  delete: (id) => organizersAPI.delete(id),
};

import {
  garantirProtocolo,
  gerarProtocolo,
  lerSequencial,
  totalProtocolosAno,
  anosComProtocolo,
  isProtocoloValido,
} from "../utils/protocolo";
import { solicitacaoParaEvento } from "../utils/eventoConverter";

export const SolicitacoesService = {
  list: (opts) => solicitacoesAPI.list(opts),
  get: (id) => solicitacoesAPI.get(id),
  create: (data) => solicitacoesAPI.create(data),
  update: (id, data) => solicitacoesAPI.update(id, data),

  /**
   * Muda o status da solicitação.
   * Se o novo status for "em_analise" e a solicitação não tiver protocolo,
   * a API gera um automaticamente e marca `_protocoloGerado = true` na resposta.
   * Neste caso, este método registra uma movimentação específica de protocolo.
   */
  changeStatus: async (id, status, extra) => {
    const r = await solicitacoesAPI.changeStatus(id, status, extra);
    if (r.error) return r;

    // Quando aprovado → atualiza evento vinculado para "confirmado"
    if (status === "aprovado") {
      const sol = await solicitacoesAPI.get(id);
      const eventoId = sol.data?.eventoId || sol.data?.eventoVinculado?.id;
      if (eventoId) {
        await calendarAPI.update(eventoId, { status: "confirmado" });
        await movimentacoesAPI.registrar({
          solicitacaoId: id,
          tipoEvento: "status_alterado",
          statusAnterior: "previsto",
          statusNovo: "confirmado",
          descricao: "Evento no calendário atualizado automaticamente para Confirmado após aprovação do permit.",
          autor: "fma",
          autorNome: "Sistema FMA",
          autorId: "admin",
          visivel: true,
        });
      }
    }

    // Registrar movimentação de protocolo gerado automaticamente
    if (status === "em_analise" && r.data._protocoloGerado) {
      await movimentacoesAPI.registrar({
        solicitacaoId: id,
        tipoEvento: "protocolo_gerado",
        statusAnterior: "",
        statusNovo: status,
        descricao: `Protocolo ${r.data.protocoloFMA} gerado automaticamente pelo sistema.`,
        autor: "fma",
        autorNome: "Sistema FMA",
        autorId: "sistema",
        visivel: true,
      });
    }

    return r;
  },

  delete: (id) => solicitacoesAPI.delete(id),
  countByStatus: () => solicitacoesAPI.countByStatus(),

  /** Envia uma solicitação: gera protocolo, muda status rascunho → enviada e registra movimentação. */
  enviar: async (id, organizerId, organizerName) => {
    // Gerar protocolo no envio
    const solAntes = await solicitacoesAPI.get(id);
    if (solAntes.error) return solAntes;
    const { protocolo, gerado } = garantirProtocolo(solAntes.data);
    const agora = new Date().toISOString();
    const updateData = { enviadoEm: agora, analisadoEm: agora };
    if (gerado) updateData.protocoloFMA = protocolo;
    await solicitacoesAPI.update(id, updateData);

    const r = await solicitacoesAPI.changeStatus(id, "em_analise");
    if (r.error) return r;

    // Movimentação de envio
    await movimentacoesAPI.registrar({
      solicitacaoId: id, tipoEvento: "enviada",
      statusAnterior: "rascunho", statusNovo: "em_analise",
      descricao: `Solicitação enviada e em análise.${gerado ? ` Protocolo ${protocolo} gerado.` : ""}`,
      autor: "organizador", autorNome: organizerName, autorId: organizerId, visivel: true,
    });

    // Movimentação de protocolo gerado
    if (gerado) {
      await movimentacoesAPI.registrar({
        solicitacaoId: id, tipoEvento: "protocolo_gerado",
        statusAnterior: "", statusNovo: "em_analise",
        descricao: `Protocolo ${protocolo} gerado automaticamente no envio.`,
        autor: "sistema", autorNome: "Sistema FMA", autorId: "sistema", visivel: true,
      });
    }

    // Notificar FMA por e-mail
    const solRes = await solicitacoesAPI.get(id);
    if (solRes.data) {
      const sol = solRes.data;
      const orgRes = await organizersAPI.get(organizerId);
      notificarFmaSolicitacaoEnviada({
        organizadorNome: organizerName,
        organizacao: orgRes.data?.organization || orgRes.data?.name || "",
        evento: sol.nomeEvento || "",
        cidade: sol.cidadeEvento || "",
        dataEvento: sol.dataEvento || "",
        tipo: sol.tipo || "permit",
        solicitacaoId: id,
      }).catch(() => {});
    }
    return { ...r, data: { ...r.data, protocoloFMA: protocolo, _protocoloGerado: gerado } };
  },

  /**
   * Cria um evento de calendário a partir dos dados da solicitação e
   * vincula automaticamente (salva IDs cruzados em ambos os registros).
   *
   * Fluxo:
   *   1. Converte solicitacao → eventoData via solicitacaoParaEvento()
   *   2. Cria o evento via calendarAPI.create()
   *   3. Vincula via solicitacoesAPI.vincularEvento()
   *   4. Registra movimentação visível ao organizador
   *
   * @param {object} solicitacao — objeto Solicitacao completo
   * @param {string} [organizerName] — nome do organizador para display
   * @param {object} [overrides] — campos que o admin quer sobrescrever antes de criar
   * @returns {Promise<{data: {solicitacao, evento}}>}
   */
  criarEVincularEvento: async (solicitacao, organizerName = "", overrides = {}) => {
    // 1. Converter
    const eventoBase = solicitacaoParaEvento(solicitacao, { organizerName });
    // Evento criado a partir de solicitação começa sempre como "previsto"
    const eventoData = { ...eventoBase, status: "previsto", published: false, ...overrides };

    // 2. Criar evento no calendário
    const rEvento = await calendarAPI.create(eventoData);
    if (rEvento.error) return rEvento;

    // 3. Vincular (salva IDs nos dois registros)
    const rVinculo = await solicitacoesAPI.vincularEvento(solicitacao.id, rEvento.data.id, rEvento.data.title || "");
    if (rVinculo.error) return rVinculo;

    // 4. Movimentação
    await movimentacoesAPI.registrar({
      solicitacaoId: solicitacao.id,
      tipoEvento: "evento_vinculado",
      statusAnterior: solicitacao.status,
      statusNovo: solicitacao.status,
      descricao: `Evento de calendário criado e vinculado: "${rEvento.data.title}".`,
      autor: "fma",
      autorNome: "Equipe FMA",
      autorId: "admin",
      visivel: true,
    });

    return rVinculo;
  },

  /**
   * Vincula a solicitação a um evento de calendário já existente.
   * Registra movimentação.
   *
   * @param {string} solicitacaoId
   * @param {string} eventoId
   * @param {string} eventoTitulo — título do evento para log
   * @param {string} [statusAtual]
   */
  vincularEvento: async (solicitacaoId, eventoId, eventoTitulo = "", statusAtual = "") => {
    const r = await solicitacoesAPI.vincularEvento(solicitacaoId, eventoId);
    if (r.error) return r;

    await movimentacoesAPI.registrar({
      solicitacaoId,
      tipoEvento: "evento_vinculado",
      statusAnterior: statusAtual,
      statusNovo: statusAtual,
      descricao: `Evento de calendário vinculado: "${eventoTitulo || eventoId}".`,
      autor: "fma",
      autorNome: "Equipe FMA",
      autorId: "admin",
      visivel: true,
    });

    return r;
  },

  /**
   * Remove o vínculo entre solicitação e evento de calendário.
   * O evento NÃO é excluído — apenas a associação é removida.
   *
   * @param {string} solicitacaoId
   * @param {string} eventoTitulo — título para log
   * @param {string} [statusAtual]
   */
  desvincularEvento: async (solicitacaoId, eventoTitulo = "", statusAtual = "") => {
    const r = await solicitacoesAPI.desvincularEvento(solicitacaoId);
    if (r.error) return r;

    await movimentacoesAPI.registrar({
      solicitacaoId,
      tipoEvento: "evento_desvinculado",
      statusAnterior: statusAtual,
      statusNovo: statusAtual,
      descricao: `Vínculo com evento de calendário removido${eventoTitulo ? ` ("${eventoTitulo}")` : ""}.`,
      autor: "fma",
      autorNome: "Equipe FMA",
      autorId: "admin",
      visivel: false, // anotação interna — organizador não precisa ver
    });

    return r;
  },
};

// ─── Serviço de Protocolo ─────────────────────────────────────────────────────
/**
 * ProtocoloService — interface de alto nível para operações de protocolo.
 * Todas as funções delegam para src/utils/protocolo.js.
 */
export const ProtocoloService = {
  /**
   * Garante protocolo para uma solicitação, gerando um novo se necessário.
   * Idempotente: se a solicitação já tem protocolo, retorna o existente.
   * @param {object} solicitacao
   * @param {number} [ano]
   * @returns {{ protocolo: string, gerado: boolean }}
   */
  garantir: (solicitacao, ano) => garantirProtocolo(solicitacao, ano),

  /**
   * Gera um protocolo consumindo o próximo sequencial (tem efeito colateral).
   * Prefira `garantir()` para uso em solicitações.
   * @param {number} [ano]
   * @returns {string}
   */
  gerar: (ano) => gerarProtocolo(ano),

  /** Retorna o sequencial atual do ano (sem incrementar). */
  sequencialAtual: (ano) => lerSequencial(ano ?? new Date().getFullYear()),

  /** Total de protocolos emitidos no ano. */
  totalAno: (ano) => totalProtocolosAno(ano),

  /** Lista todos os anos com protocolos emitidos. */
  anosAtivos: () => anosComProtocolo(),

  /** Valida formato "FMA-YYYY-NNNN". */
  isValido: (str) => isProtocoloValido(str),
};

export const ArquivosService = {
  listBySolicitacao: (id) => solicitacaoArquivosAPI.listBySolicitacao(id),
  get: (id) => solicitacaoArquivosAPI.get(id),
  create: (data) => solicitacaoArquivosAPI.create(data),
  update: (id, data) => solicitacaoArquivosAPI.update(id, data),
  delete: (id) => solicitacaoArquivosAPI.delete(id),
  upload: (data) => solicitacaoArquivosAPI.create(data),
};

export const MovimentacoesService = {
  listBySolicitacao: (id, opts) => movimentacoesAPI.listBySolicitacao(id, opts),
  registrar: (data) => movimentacoesAPI.registrar(data),
  delete: (id) => movimentacoesAPI.delete(id),
  deleteBySolicitacao: (solId) => movimentacoesAPI.deleteBySolicitacao(solId),
};

// ─── Resultados ───────────────────────────────────────────────────────────────

export const ResultadosService = {
  /** Lista resultados. `publishedOnly` default true para o portal público. */
  list: (opts = {}) => resultadosAPI.list({ publishedOnly: true, ...opts }),

  get: (id) => resultadosAPI.get(id),

  /** Todas as combinações de filtro para a listagem admin (sem filtro published). */
  listAdmin: (opts = {}) => resultadosAPI.list({ publishedOnly: false, ...opts }),

  create:  (data)       => resultadosAPI.create(data),
  update:  (id, data)   => resultadosAPI.update(id, data),
  delete:  (id)         => resultadosAPI.delete(id),
  publish: (id)         => resultadosAPI.update(id, { published: true }),
  unpublish: (id)       => resultadosAPI.update(id, { published: false }),

  getAnos:    (cat)     => resultadosAPI.getAnos(cat),
  getCidades: (cat)     => resultadosAPI.getCidades(cat),
};

// ─── Equipes ──────────────────────────────────────────────────────────────────
export const EquipesService = {
  list:      (opts = {}) => equipesAPI.list({ publishedOnly: opts.publishedOnly ?? true, busca: opts.busca }),
  listAdmin: (opts = {}) => equipesAPI.list({ publishedOnly: false, ...opts }),
  get:       (idOrSlug)  => equipesAPI.get(idOrSlug),
  create:    (data)      => equipesAPI.create(data),
  update:    (id, data)  => equipesAPI.update(id, data),
  delete:    (id)        => equipesAPI.delete(id),
  publish:   (id)        => equipesAPI.update(id, { published: true }),
  unpublish: (id)        => equipesAPI.update(id, { published: false }),
};

// ─── Pagamentos ──────────────────────────────────────────────────────────────
export const PagamentosService = {
  listBySolicitacao: (solId) => pagamentosAPI.listBySolicitacao(solId),
  list: (filtros) => pagamentosAPI.list(filtros),
  get: (id) => pagamentosAPI.get(id),
  create: (data) => pagamentosAPI.create(data),
  update: (id, data) => pagamentosAPI.update(id, data),
  delete: (id) => pagamentosAPI.delete(id),
  deleteBySolicitacao: (solId) => pagamentosAPI.deleteBySolicitacao(solId),
};

// ─── Configuração de Taxas ───────────────────────────────────────────────────

const TAXAS_CONFIG_DEFAULT = {
  bloqueioEnvioSemPagamento: true,
  dadosBancarios: {
    banco: "336 – C6 S.A.",
    agencia: "0001",
    conta: "39896016-0",
    pix: "16.681.223/0001-00",
    favorecido: "Federação Mineira de Atletismo",
    cnpj: "16.681.223/0001-00",
  },
};

export const TaxasConfigService = {
  get: async () => {
    const r = await taxasConfigAPI.get();
    return { data: { ...TAXAS_CONFIG_DEFAULT, ...r.data }, error: null };
  },
  update: (data) => taxasConfigAPI.update(data),
};

// ─── Anuidades ──────────────────────────────────────────────────────────────

export const AnuidadesService = {
  list: (filtros) => anuidadesAPI.list(filtros),
  get: (id) => anuidadesAPI.get(id),
  getByRefereeAno: (refereeId, ano) => anuidadesAPI.getByRefereeAno(refereeId, ano),
  create: (data) => anuidadesAPI.create(data),
  update: (id, data) => anuidadesAPI.update(id, data),
  delete: (id) => anuidadesAPI.delete(id),

  /** Gera anuidades para todos os árbitros ativos de um ano. */
  gerarAnuidades: async (ano, config) => {
    const refResult = await refereesAPI.list();
    if (refResult.error) return refResult;
    const ativos = (refResult.data || []).filter(r => r.status === "ativo" && r.profileComplete);
    const existentes = await anuidadesAPI.list({ ano });
    const jaGerados = new Set((existentes.data || []).map(a => a.refereeId));
    const novos = [];
    for (const ref of ativos) {
      if (jaGerados.has(ref.id)) continue;
      const valorNivel = config?.valoresPorNivel?.[ref.nivel];
      const valor = valorNivel ?? config?.valorPadrao ?? 0;
      const item = await anuidadesAPI.create({
        refereeId: ref.id,
        refereeName: ref.name,
        refereeNivel: ref.nivel || "",
        ano,
        valor,
        status: "pendente",
      });
      novos.push(item.data);
    }
    return { data: novos, error: null };
  },
};

// ─── Envio de Documentos ────────────────────────────────────────────────────

export const EnvioDocumentosService = {
  list: () => envioDocumentosAPI.list(),
  get: (id) => envioDocumentosAPI.get(id),
  create: (data) => envioDocumentosAPI.create(data),
  update: (id, data) => envioDocumentosAPI.update(id, data),
  delete: (id) => envioDocumentosAPI.delete(id),
  listByReferee: (refereeId, nivel) => envioDocumentosAPI.listByReferee(refereeId, nivel),
  listEnviados: (remetenteId) => envioDocumentosAPI.listEnviados(remetenteId),
  marcarLido: (docId, refereeId, nome) => envioDocumentosAPI.marcarLido(docId, refereeId, nome),
};

// ─── Avaliações ─────────────────────────────────────────────────────────────

export const AvaliacoesService = {
  list: (filtros) => avaliacoesAPI.list(filtros),
  get: (id) => avaliacoesAPI.get(id),
  create: (data) => avaliacoesAPI.create(data),
  update: (id, data) => avaliacoesAPI.update(id, data),
  delete: (id) => avaliacoesAPI.delete(id),
};

// ─── Diárias ────────────────────────────────────────────────────────────────

export const RelatoriosService = {
  list: (filtros) => relatoriosAPI.list(filtros),
  get: (id) => relatoriosAPI.get(id),
  getByAssignment: (assignmentId) => relatoriosAPI.getByAssignment(assignmentId),
  create: (data) => relatoriosAPI.create(data),
  update: (id, data) => relatoriosAPI.update(id, data),
  delete: (id) => relatoriosAPI.delete(id),
};

export const ReembolsosService = {
  list: (filtros) => reembolsosAPI.list(filtros),
  get: (id) => reembolsosAPI.get(id),
  create: (data) => reembolsosAPI.create(data),
  update: (id, data) => reembolsosAPI.update(id, data),
  delete: (id) => reembolsosAPI.delete(id),
};

export const DiariasService = {
  list: (filtros) => diariasAPI.list(filtros),
  get: (id) => diariasAPI.get(id),
  create: (data) => diariasAPI.create(data),
  update: (id, data) => diariasAPI.update(id, data),
  delete: (id) => diariasAPI.delete(id),
};

// ─── Mural de Avisos ────────────────────────────────────────────────────────

export const MuralAvisosService = {
  list: (opts) => muralAvisosAPI.list(opts),
  get: (id) => muralAvisosAPI.get(id),
  create: (data) => muralAvisosAPI.create(data),
  update: (id, data) => muralAvisosAPI.update(id, data),
  delete: (id) => muralAvisosAPI.delete(id),
};
