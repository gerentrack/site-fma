/**
 * FMA — Camada de API
 * Usa localStorage como persistência local.
 * Para produção: substitua cada função por fetch() ao backend real.
 * Padrão de retorno: Promise<{ data, error }>
 */

import { garantirProtocolo } from "../utils/protocolo";

import {
  SEED_NEWS, SEED_GALLERY, SEED_CALENDAR, SEED_DOCUMENTS,
  SEED_BANNERS, SEED_ADMIN_USER, SEED_PARTNERS,
  SEED_SOCIAL_LINKS, SEED_FOOTER_CONFIG,
  SEED_INSTITUTIONAL_PAGES, SEED_INSTITUTIONAL_SECTIONS,
  SEED_ATHLETE_CONTENT,
  SEED_REFEREE_CONTENT, SEED_REFEREES, SEED_REFEREE_EVENTS,
  SEED_REFEREE_AVAILABILITY, SEED_REFEREE_ASSIGNMENTS,
  SEED_ORGANIZERS, SEED_SOLICITACOES,
  SEED_SOLICITACAO_ARQUIVOS, SEED_MOVIMENTACOES,
  SEED_RESULTADOS, SEED_EQUIPES,
} from "./mockData";

const KEYS = {
  news:                  "fma_news",
  gallery:               "fma_gallery",
  calendar:              "fma_calendar",
  documents:             "fma_documents",
  banners:               "fma_banners",
  partners:              "fma_partners",
  socialLinks:           "fma_social_links",
  footerConfig:          "fma_footer_config",
  institutionalPages:    "fma_institutional_pages",
  institutionalSections: "fma_institutional_sections",
  athleteContent:        "fma_athlete_content",
  refereeContent:        "fma_referee_content",
  referees:              "fma_referees",
  refereeEvents:         "fma_referee_events",
  refereeAvailability:   "fma_referee_availability",
  refereeAssignments:    "fma_referee_assignments",
  intranetSession:       "fma_intranet_session",
  adminUser:             "fma_admin_user",
  authToken:             "fma_auth_token",
  // Portal de Solicitações
  organizers:            "fma_organizers",
  organizerSession:      "fma_organizer_session",
  solicitacoes:          "fma_solicitacoes",
  solicitacaoArquivos:   "fma_solicitacao_arquivos",
  movimentacoes:         "fma_movimentacoes",
  resultados:            "fma_resultados",
  equipes:               "fma_equipes",
  // Contador de protocolo — chave base; sufixo _{ano} adicionado por protocolo.js
  // ex: "fma_protocolo_seq_2026" → gerenciado exclusivamente por src/utils/protocolo.js
};

function seed(key, data) {
  if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(data));
}

export function initializeData() {
  seed(KEYS.news, SEED_NEWS);
  seed(KEYS.gallery, SEED_GALLERY);
  seed(KEYS.calendar, SEED_CALENDAR);
  seed(KEYS.documents, SEED_DOCUMENTS);
  seed(KEYS.banners, SEED_BANNERS);
  seed(KEYS.partners, SEED_PARTNERS);
  seed(KEYS.socialLinks, SEED_SOCIAL_LINKS);
  seed(KEYS.footerConfig, SEED_FOOTER_CONFIG);
  seed(KEYS.institutionalPages, SEED_INSTITUTIONAL_PAGES);
  seed(KEYS.institutionalSections, SEED_INSTITUTIONAL_SECTIONS);
  seed(KEYS.athleteContent, SEED_ATHLETE_CONTENT);
  seed(KEYS.refereeContent, SEED_REFEREE_CONTENT);
  seed(KEYS.referees, SEED_REFEREES);
  seed(KEYS.refereeEvents, SEED_REFEREE_EVENTS);
  seed(KEYS.refereeAvailability, SEED_REFEREE_AVAILABILITY);
  seed(KEYS.refereeAssignments, SEED_REFEREE_ASSIGNMENTS);
  seed(KEYS.adminUser, SEED_ADMIN_USER);
  // Portal de Solicitações
  seed(KEYS.organizers, SEED_ORGANIZERS);
  seed(KEYS.solicitacoes, SEED_SOLICITACOES);
  seed(KEYS.solicitacaoArquivos, SEED_SOLICITACAO_ARQUIVOS);
  seed(KEYS.movimentacoes, SEED_MOVIMENTACOES);
  seed(KEYS.resultados, SEED_RESULTADOS);
  seed(KEYS.equipes, SEED_EQUIPES);
}

function read(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch { return []; }
}
function readObject(key, fallback = {}) {
  try { return JSON.parse(localStorage.getItem(key)) || fallback; } catch { return fallback; }
}
function write(key, data) { localStorage.setItem(key, JSON.stringify(data)); }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function ok(data) { return { data, error: null }; }
function err(msg) { return { data: null, error: msg }; }

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authAPI = {
  login: async ({ email, password }) => {
    const user = read(KEYS.adminUser);
    if (user.email === email && user.password === password) {
      const token = btoa(`${email}:${Date.now()}`);
      localStorage.setItem(KEYS.authToken, token);
      return ok({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
    }
    return err("Credenciais inválidas.");
  },
  logout: async () => { localStorage.removeItem(KEYS.authToken); return ok(true); },
  check: () => !!localStorage.getItem(KEYS.authToken),
  getUser: () => { const u = read(KEYS.adminUser); return u ? { id: u.id, name: u.name, email: u.email, role: u.role } : null; },
};

// ─── Notícias ─────────────────────────────────────────────────────────────────

export const newsAPI = {
  list: async ({ publishedOnly = true } = {}) => {
    let items = read(KEYS.news);
    if (publishedOnly) items = items.filter(n => n.published);
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.news).find(n => n.id === id || n.slug === id);
    return item ? ok(item) : err("Notícia não encontrada.");
  },
  // Retorna até `limit` notícias publicadas da mesma categoria ou com tags em comum,
  // excluindo a notícia atual (excludeId). Ordena por relevância (mesma cat > tag comum).
  getRelated: async ({ excludeId, category, tags = [], limit = 3 }) => {
    let items = read(KEYS.news).filter(n => n.published && n.id !== excludeId);
    const score = (item) => {
      let s = 0;
      if (item.category === category) s += 10;
      const itemTags = Array.isArray(item.tags) ? item.tags : [];
      const queryTags = Array.isArray(tags) ? tags : [];
      queryTags.forEach(t => { if (itemTags.includes(t)) s += 2; });
      return s;
    };
    items = items
      .map(item => ({ item, score: score(item) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score || new Date(b.item.date) - new Date(a.item.date))
      .map(({ item }) => item)
      .slice(0, limit);
    // Se não há relacionadas por categoria/tag, retorna as mais recentes
    if (items.length === 0) {
      items = read(KEYS.news)
        .filter(n => n.published && n.id !== excludeId)
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .slice(0, limit);
    }
    return ok(items);
  },
  create: async (data) => {
    const items = read(KEYS.news);
    const newItem = {
      ...data,
      id: generateId(),
      date: data.date || new Date().toISOString().slice(0, 10),
      tags: Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : []),
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
    };
    write(KEYS.news, [...items, newItem]);
    return ok(newItem);
  },
  update: async (id, data) => {
    const items = read(KEYS.news);
    const idx = items.findIndex(n => n.id === id);
    if (idx === -1) return err("Não encontrado.");
    const updated = {
      ...items[idx],
      ...data,
      tags: Array.isArray(data.tags) ? data.tags : (typeof data.tags === "string" ? data.tags.split(",").map(t => t.trim()).filter(Boolean) : items[idx].tags || []),
      gallery: Array.isArray(data.gallery) ? data.gallery : (items[idx].gallery || []),
    };
    items[idx] = updated;
    write(KEYS.news, items);
    return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.news, read(KEYS.news).filter(n => n.id !== id)); return ok(true); },
};

// ─── Galeria ──────────────────────────────────────────────────────────────────

export const galleryAPI = {
  list: async ({ publishedOnly = true, category = null, busca = null } = {}) => {
    let items = read(KEYS.gallery);
    if (publishedOnly) items = items.filter(g => g.published);
    if (category)      items = items.filter(g => g.category === category);
    if (busca) {
      const q = busca.toLowerCase();
      items = items.filter(g =>
        g.title.toLowerCase().includes(q) ||
        (g.description || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return ok(items);
  },
  get: async (id) => { const item = read(KEYS.gallery).find(g => g.id === id); return item ? ok(item) : err("Não encontrado."); },
  create: async (data) => {
    const items = read(KEYS.gallery);
    const n = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    write(KEYS.gallery, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.gallery); const idx = items.findIndex(g => g.id === id);
    if (idx === -1) return err("Não encontrado."); items[idx] = { ...items[idx], ...data }; write(KEYS.gallery, items); return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.gallery, read(KEYS.gallery).filter(g => g.id !== id)); return ok(true); },
  getCategorias: async () => {
    const items = read(KEYS.gallery).filter(g => g.published);
    const cats = [...new Set(items.map(g => g.category).filter(Boolean))].sort();
    return ok(cats);
  },
};

// ─── Calendário ───────────────────────────────────────────────────────────────

export const calendarAPI = {
  list: async ({ publishedOnly = true, category = null, year = null, month = null, city = null, featuredOnly = false } = {}) => {
    let items = read(KEYS.calendar);
    if (publishedOnly) items = items.filter(e => e.published);
    if (category) items = items.filter(e => e.category === category);
    if (year) items = items.filter(e => e.date && e.date.startsWith(String(year)));
    if (month) items = items.filter(e => {
      if (!e.date) return false;
      const m = parseInt(e.date.split("-")[1]);
      return m === parseInt(month);
    });
    if (city) items = items.filter(e => e.city && e.city.toLowerCase().includes(city.toLowerCase()));
    if (featuredOnly) items = items.filter(e => e.featured);
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.calendar).find(e => e.id === id);
    return item ? ok(item) : err("Evento não encontrado.");
  },
  create: async (data) => {
    const items = read(KEYS.calendar);
    const n = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    write(KEYS.calendar, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.calendar);
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data };
    write(KEYS.calendar, items);
    return ok(items[idx]);
  },
  delete: async (id) => {
    write(KEYS.calendar, read(KEYS.calendar).filter(e => e.id !== id));
    return ok(true);
  },
  // Retorna lista de cidades únicas para filtro
  getCities: async () => {
    const items = read(KEYS.calendar);
    const cities = [...new Set(items.filter(e => e.city).map(e => e.city))].sort();
    return ok(cities);
  },
  // Retorna anos disponíveis para filtro
  getYears: async () => {
    const items = read(KEYS.calendar);
    const years = [...new Set(items.filter(e => e.date).map(e => parseInt(e.date.split("-")[0])))].sort((a,b) => b-a);
    return ok(years);
  },
};

// ─── Documentos ──────────────────────────────────────────────────────────────

export const documentsAPI = {
  /**
   * Lista documentos com filtros opcionais.
   * @param {{ publishedOnly, category, busca, ordenacao }} opts
   *   ordenacao: "data_desc" | "data_asc" | "titulo_asc" | "titulo_desc"
   */
  list: async ({ publishedOnly = true, category = null, busca = null, ordenacao = "data_desc" } = {}) => {
    let items = read(KEYS.documents);
    if (publishedOnly) items = items.filter(d => d.published);
    if (category)      items = items.filter(d => d.category === category);
    if (busca) {
      const q = busca.toLowerCase();
      items = items.filter(d =>
        d.title.toLowerCase().includes(q) ||
        (d.description || "").toLowerCase().includes(q)
      );
    }
    // Ordenação
    items.sort((a, b) => {
      if (ordenacao === "data_asc")    return new Date(a.date) - new Date(b.date);
      if (ordenacao === "titulo_asc")  return a.title.localeCompare(b.title, "pt-BR");
      if (ordenacao === "titulo_desc") return b.title.localeCompare(a.title, "pt-BR");
      // data_desc (default)
      return new Date(b.date) - new Date(a.date);
    });
    return ok(items);
  },
  get: async (id) => { const item = read(KEYS.documents).find(d => d.id === id); return item ? ok(item) : err("Não encontrado."); },
  create: async (data) => { const items = read(KEYS.documents); const n = { ...data, id: generateId(), createdAt: new Date().toISOString() }; write(KEYS.documents, [...items, n]); return ok(n); },
  update: async (id, data) => {
    const items = read(KEYS.documents); const idx = items.findIndex(d => d.id === id);
    if (idx === -1) return err("Não encontrado."); items[idx] = { ...items[idx], ...data }; write(KEYS.documents, items); return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.documents, read(KEYS.documents).filter(d => d.id !== id)); return ok(true); },
};

// ─── Banners ─────────────────────────────────────────────────────────────────

export const bannersAPI = {
  list: async ({ activeOnly = true } = {}) => {
    let items = read(KEYS.banners);
    if (activeOnly) items = items.filter(b => b.active);
    items.sort((a, b) => a.order - b.order);
    return ok(items);
  },
  create: async (data) => { const items = read(KEYS.banners); const n = { ...data, id: generateId() }; write(KEYS.banners, [...items, n]); return ok(n); },
  update: async (id, data) => {
    const items = read(KEYS.banners); const idx = items.findIndex(b => b.id === id);
    if (idx === -1) return err("Não encontrado."); items[idx] = { ...items[idx], ...data }; write(KEYS.banners, items); return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.banners, read(KEYS.banners).filter(b => b.id !== id)); return ok(true); },
};

// ─── Parceiros ────────────────────────────────────────────────────────────────

export const partnersAPI = {
  list: async ({ activeOnly = true } = {}) => {
    let items = read(KEYS.partners);
    if (activeOnly) items = items.filter(p => p.active);
    items.sort((a, b) => a.order - b.order);
    return ok(items);
  },
  get: async (id) => { const item = read(KEYS.partners).find(p => p.id === id); return item ? ok(item) : err("Não encontrado."); },
  create: async (data) => {
    const items = read(KEYS.partners);
    const maxOrder = items.reduce((m, p) => Math.max(m, p.order || 0), 0);
    const n = { ...data, id: generateId(), order: data.order || maxOrder + 1 };
    write(KEYS.partners, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.partners); const idx = items.findIndex(p => p.id === id);
    if (idx === -1) return err("Não encontrado."); items[idx] = { ...items[idx], ...data }; write(KEYS.partners, items); return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.partners, read(KEYS.partners).filter(p => p.id !== id)); return ok(true); },
};

// ─── Redes Sociais ────────────────────────────────────────────────────────────

export const socialLinksAPI = {
  list: async ({ activeOnly = true } = {}) => {
    let items = read(KEYS.socialLinks);
    if (activeOnly) items = items.filter(s => s.active);
    items.sort((a, b) => a.order - b.order);
    return ok(items);
  },
  get: async (id) => { const item = read(KEYS.socialLinks).find(s => s.id === id); return item ? ok(item) : err("Não encontrado."); },
  create: async (data) => {
    const items = read(KEYS.socialLinks);
    const maxOrder = items.reduce((m, s) => Math.max(m, s.order || 0), 0);
    const n = { ...data, id: generateId(), order: data.order || maxOrder + 1 };
    write(KEYS.socialLinks, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.socialLinks); const idx = items.findIndex(s => s.id === id);
    if (idx === -1) return err("Não encontrado."); items[idx] = { ...items[idx], ...data }; write(KEYS.socialLinks, items); return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.socialLinks, read(KEYS.socialLinks).filter(s => s.id !== id)); return ok(true); },
};

// ─── Configuração do Rodapé ───────────────────────────────────────────────────

export const footerConfigAPI = {
  get: async () => ok(readObject(KEYS.footerConfig, SEED_FOOTER_CONFIG)),
  update: async (data) => {
    const current = readObject(KEYS.footerConfig, SEED_FOOTER_CONFIG);
    const updated = { ...current, ...data };
    write(KEYS.footerConfig, updated);
    return ok(updated);
  },
};

// ─── Páginas Institucionais ───────────────────────────────────────────────────

export const institutionalPagesAPI = {
  list: async ({ publishedOnly = true } = {}) => {
    let items = read(KEYS.institutionalPages);
    if (publishedOnly) items = items.filter(p => p.published);
    items.sort((a, b) => a.order - b.order);
    return ok(items);
  },
  get: async (idOrSlug) => {
    const item = read(KEYS.institutionalPages).find(p => p.id === idOrSlug || p.slug === idOrSlug);
    return item ? ok(item) : err("Página não encontrada.");
  },
  create: async (data) => {
    const items = read(KEYS.institutionalPages);
    const maxOrder = items.reduce((m, p) => Math.max(m, p.order || 0), 0);
    const newItem = { ...data, id: generateId(), order: data.order || maxOrder + 1, createdAt: new Date().toISOString() };
    write(KEYS.institutionalPages, [...items, newItem]);
    return ok(newItem);
  },
  update: async (id, data) => {
    const items = read(KEYS.institutionalPages);
    const idx = items.findIndex(p => p.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.institutionalPages, items);
    return ok(items[idx]);
  },
  delete: async (id) => {
    write(KEYS.institutionalPages, read(KEYS.institutionalPages).filter(p => p.id !== id));
    write(KEYS.institutionalSections, read(KEYS.institutionalSections).filter(s => s.pageId !== id));
    return ok(true);
  },
  reorder: async (orderedIds) => {
    const items = read(KEYS.institutionalPages);
    orderedIds.forEach((id, index) => {
      const idx = items.findIndex(p => p.id === id);
      if (idx !== -1) items[idx].order = index + 1;
    });
    write(KEYS.institutionalPages, items);
    return ok(true);
  },
};

// ─── Seções Institucionais ────────────────────────────────────────────────────

export const institutionalSectionsAPI = {
  list: async ({ pageId, publishedOnly = true } = {}) => {
    let items = read(KEYS.institutionalSections);
    if (pageId) items = items.filter(s => s.pageId === pageId);
    if (publishedOnly) items = items.filter(s => s.published);
    items.sort((a, b) => a.order - b.order);
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.institutionalSections).find(s => s.id === id);
    return item ? ok(item) : err("Seção não encontrada.");
  },
  create: async (data) => {
    const items = read(KEYS.institutionalSections);
    const pageSections = items.filter(s => s.pageId === data.pageId);
    const maxOrder = pageSections.reduce((m, s) => Math.max(m, s.order || 0), 0);
    const newItem = { ...data, id: generateId(), order: data.order || maxOrder + 1 };
    write(KEYS.institutionalSections, [...items, newItem]);
    return ok(newItem);
  },
  update: async (id, data) => {
    const items = read(KEYS.institutionalSections);
    const idx = items.findIndex(s => s.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data };
    write(KEYS.institutionalSections, items);
    return ok(items[idx]);
  },
  delete: async (id) => {
    write(KEYS.institutionalSections, read(KEYS.institutionalSections).filter(s => s.id !== id));
    return ok(true);
  },
  reorder: async (pageId, orderedIds) => {
    const items = read(KEYS.institutionalSections);
    orderedIds.forEach((id, index) => {
      const idx = items.findIndex(s => s.id === id);
      if (idx !== -1) items[idx].order = index + 1;
    });
    write(KEYS.institutionalSections, items);
    return ok(true);
  },
};

// ─── Conteúdo de Atletas ──────────────────────────────────────────────────────

export const athleteContentAPI = {
  list: async ({ publishedOnly = true, category = null, featuredOnly = false } = {}) => {
    let items = read(KEYS.athleteContent);
    if (publishedOnly) items = items.filter(i => i.status === "published");
    if (category) items = items.filter(i => i.category === category);
    if (featuredOnly) items = items.filter(i => i.featured);
    items.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.order || 0) - (b.order || 0) || new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.athleteContent).find(i => i.id === id);
    return item ? ok(item) : err("Conteúdo não encontrado.");
  },
  create: async (data) => {
    const items = read(KEYS.athleteContent);
    const catItems = items.filter(i => i.category === data.category);
    const maxOrder = catItems.reduce((m, i) => Math.max(m, i.order || 0), 0);
    const newItem = {
      ...data,
      id: generateId(),
      order: data.order || maxOrder + 1,
      publishedAt: data.publishedAt || new Date().toISOString().slice(0, 10),
      createdAt: new Date().toISOString(),
    };
    write(KEYS.athleteContent, [...items, newItem]);
    return ok(newItem);
  },
  update: async (id, data) => {
    const items = read(KEYS.athleteContent);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.athleteContent, items);
    return ok(items[idx]);
  },
  delete: async (id) => {
    write(KEYS.athleteContent, read(KEYS.athleteContent).filter(i => i.id !== id));
    return ok(true);
  },
  getCategories: async () => {
    const items = read(KEYS.athleteContent);
    const cats = [...new Set(items.map(i => i.category))];
    return ok(cats);
  },
};

// ─── Conteúdo Público de Árbitros ─────────────────────────────────────────────

export const refereeContentAPI = {
  list: async ({ publishedOnly = true, category = null, featuredOnly = false } = {}) => {
    let items = read(KEYS.refereeContent);
    if (publishedOnly) items = items.filter(i => i.status === "published");
    if (category) items = items.filter(i => i.category === category);
    if (featuredOnly) items = items.filter(i => i.featured);
    items.sort((a, b) => {
      if (a.featured && !b.featured) return -1;
      if (!a.featured && b.featured) return 1;
      return (a.order || 0) - (b.order || 0) || new Date(b.publishedAt) - new Date(a.publishedAt);
    });
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.refereeContent).find(i => i.id === id);
    return item ? ok(item) : err("Conteúdo não encontrado.");
  },
  create: async (data) => {
    const items = read(KEYS.refereeContent);
    const n = { ...data, id: generateId(), publishedAt: data.publishedAt || new Date().toISOString().slice(0, 10), createdAt: new Date().toISOString() };
    write(KEYS.refereeContent, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.refereeContent);
    const idx = items.findIndex(i => i.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.refereeContent, items);
    return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.refereeContent, read(KEYS.refereeContent).filter(i => i.id !== id)); return ok(true); },
};

// ─── Intranet — Auth de Árbitros ──────────────────────────────────────────────

export const intranetAuthAPI = {
  login: async ({ email, password }) => {
    const referees = read(KEYS.referees);
    const referee = referees.find(r => r.email === email && r.password === password && r.status === "ativo");
    if (!referee) return err("Credenciais inválidas ou árbitro inativo.");
    const session = { refereeId: referee.id, email: referee.email, name: referee.name, role: referee.role, loginAt: new Date().toISOString() };
    localStorage.setItem(KEYS.intranetSession, JSON.stringify(session));
    return ok({ session, referee: { id: referee.id, name: referee.name, email: referee.email, role: referee.role, category: referee.category, city: referee.city } });
  },
  logout: async () => { localStorage.removeItem(KEYS.intranetSession); return ok(true); },
  check: () => { try { const s = JSON.parse(localStorage.getItem(KEYS.intranetSession)); return s?.refereeId ? s : null; } catch { return null; } },
  getSession: () => { try { return JSON.parse(localStorage.getItem(KEYS.intranetSession)); } catch { return null; } },
};

// ─── Intranet — Árbitros CRUD ─────────────────────────────────────────────────

export const refereesAPI = {
  list: async ({ status = null, category = null } = {}) => {
    let items = read(KEYS.referees);
    if (status) items = items.filter(r => r.status === status);
    if (category) items = items.filter(r => r.category === category);
    items.sort((a, b) => a.name.localeCompare(b.name));
    // Nunca expõe senha na listagem
    return ok(items.map(r => { const { password, ...safe } = r; return safe; }));
  },
  get: async (id, { includePassword = false } = {}) => {
    const item = read(KEYS.referees).find(r => r.id === id);
    if (!item) return err("Árbitro não encontrado.");
    if (!includePassword) { const { password, ...safe } = item; return ok(safe); }
    return ok(item);
  },
  create: async (data) => {
    const items = read(KEYS.referees);
    if (items.find(r => r.email === data.email)) return err("E-mail já cadastrado.");
    const n = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    write(KEYS.referees, [...items, n]);
    const { password, ...safe } = n;
    return ok(safe);
  },
  update: async (id, data) => {
    const items = read(KEYS.referees);
    const idx = items.findIndex(r => r.id === id);
    if (idx === -1) return err("Não encontrado.");
    // Se password vier em branco, não altera
    if (!data.password) delete data.password;
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.referees, items);
    const { password, ...safe } = items[idx];
    return ok(safe);
  },
  delete: async (id) => { write(KEYS.referees, read(KEYS.referees).filter(r => r.id !== id)); return ok(true); },
  updatePassword: async (id, newPassword) => {
    const items = read(KEYS.referees);
    const idx = items.findIndex(r => r.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx].password = newPassword;
    write(KEYS.referees, items);
    return ok(true);
  },
};

// ─── Intranet — Eventos de Árbitros ───────────────────────────────────────────

export const refereeEventsAPI = {
  list: async ({ status = null, upcoming = false } = {}) => {
    let items = read(KEYS.refereeEvents);
    if (status) items = items.filter(e => e.status === status);
    if (upcoming) {
      const today = new Date().toISOString().slice(0, 10);
      items = items.filter(e => e.date >= today);
    }
    items.sort((a, b) => new Date(a.date) - new Date(b.date));
    return ok(items);
  },
  get: async (id) => {
    const item = read(KEYS.refereeEvents).find(e => e.id === id);
    return item ? ok(item) : err("Evento não encontrado.");
  },
  create: async (data) => {
    const items = read(KEYS.refereeEvents);
    const n = { ...data, id: generateId(), source: data.source || "manual", createdAt: new Date().toISOString() };
    write(KEYS.refereeEvents, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.refereeEvents);
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data };
    write(KEYS.refereeEvents, items);
    return ok(items[idx]);
  },
  delete: async (id) => { write(KEYS.refereeEvents, read(KEYS.refereeEvents).filter(e => e.id !== id)); return ok(true); },
  // Importa todos os eventos futuros do calendário público que ainda não foram importados
  importFromCalendar: async () => {
    const calEvents = read(KEYS.calendar).filter(e => e.published);
    const refEvents = read(KEYS.refereeEvents);
    const alreadyImported = new Set(refEvents.filter(e => e.source === "calendar").map(e => e.calendarRef));
    const today = new Date().toISOString().slice(0, 10);
    const toImport = calEvents.filter(e => e.date >= today && !alreadyImported.has(e.id));
    const newItems = toImport.map(e => ({
      id: generateId(),
      source: "calendar",
      calendarRef: e.id,
      title: e.title,
      date: e.date,
      time: e.time || "",
      city: e.city || "",
      location: e.location || "",
      category: e.category || "corrida",
      organizer: e.organizer || "",
      refereesNeeded: 3,
      notes: e.shortDescription || "",
      status: "aberto",
      createdAt: new Date().toISOString(),
    }));
    if (newItems.length > 0) write(KEYS.refereeEvents, [...refEvents, ...newItems]);
    return ok({ imported: newItems.length, items: newItems });
  },
};

// ─── Intranet — Disponibilidade ───────────────────────────────────────────────

export const refereeAvailabilityAPI = {
  list: async ({ refereeId = null, eventId = null } = {}) => {
    let items = read(KEYS.refereeAvailability);
    if (refereeId) items = items.filter(a => a.refereeId === refereeId);
    if (eventId) items = items.filter(a => a.eventId === eventId);
    return ok(items);
  },
  // Árbitro define disponibilidade para um evento (upsert)
  setAvailability: async ({ refereeId, eventId, available, notes = "" }) => {
    const items = read(KEYS.refereeAvailability);
    const idx = items.findIndex(a => a.refereeId === refereeId && a.eventId === eventId);
    if (idx !== -1) {
      items[idx] = { ...items[idx], available, notes, updatedAt: new Date().toISOString() };
      write(KEYS.refereeAvailability, items);
      return ok(items[idx]);
    }
    const n = { id: generateId(), refereeId, eventId, available, notes, createdAt: new Date().toISOString() };
    write(KEYS.refereeAvailability, [...items, n]);
    return ok(n);
  },
  // Retorna disponibilidade de árbitro para um evento específico
  getForEvent: async (refereeId, eventId) => {
    const item = read(KEYS.refereeAvailability).find(a => a.refereeId === refereeId && a.eventId === eventId);
    return ok(item || null);
  },
  // Retorna árbitros disponíveis para um evento (com perfil)
  getAvailableForEvent: async (eventId) => {
    const avail = read(KEYS.refereeAvailability).filter(a => a.eventId === eventId && a.available);
    const referees = read(KEYS.referees);
    const result = avail.map(a => {
      const ref = referees.find(r => r.id === a.refereeId);
      if (!ref) return null;
      const { password, ...safe } = ref;
      return { ...safe, availability: a };
    }).filter(Boolean);
    return ok(result);
  },
};

// ─── Intranet — Escalações ────────────────────────────────────────────────────

export const refereeAssignmentsAPI = {
  list: async ({ eventId = null, refereeId = null } = {}) => {
    let items = read(KEYS.refereeAssignments);
    if (eventId) items = items.filter(a => a.eventId === eventId);
    if (refereeId) items = items.filter(a => a.refereeId === refereeId);
    return ok(items);
  },
  // Retorna escalação de evento com perfil dos árbitros
  getByEvent: async (eventId) => {
    const assignments = read(KEYS.refereeAssignments).filter(a => a.eventId === eventId);
    const referees = read(KEYS.referees);
    const result = assignments.map(a => {
      const ref = referees.find(r => r.id === a.refereeId);
      if (!ref) return a;
      const { password, ...safe } = ref;
      return { ...a, referee: safe };
    });
    return ok(result);
  },
  // Retorna escalações de um árbitro com dados do evento
  getByReferee: async (refereeId) => {
    const assignments = read(KEYS.refereeAssignments).filter(a => a.refereeId === refereeId);
    const events = read(KEYS.refereeEvents);
    const result = assignments.map(a => {
      const evt = events.find(e => e.id === a.eventId);
      return { ...a, event: evt || null };
    });
    result.sort((a, b) => new Date(a.event?.date || 0) - new Date(b.event?.date || 0));
    return ok(result);
  },
  assign: async (data) => {
    const items = read(KEYS.refereeAssignments);
    // Evita duplicata árbitro+evento
    const existing = items.find(a => a.refereeId === data.refereeId && a.eventId === data.eventId);
    if (existing) {
      // Atualiza função
      const idx = items.indexOf(existing);
      items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
      write(KEYS.refereeAssignments, items);
      return ok(items[idx]);
    }
    const n = { ...data, id: generateId(), createdAt: new Date().toISOString() };
    write(KEYS.refereeAssignments, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.refereeAssignments);
    const idx = items.findIndex(a => a.id === id);
    if (idx === -1) return err("Escalação não encontrada.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.refereeAssignments, items);
    return ok(items[idx]);
  },
  remove: async (id) => { write(KEYS.refereeAssignments, read(KEYS.refereeAssignments).filter(a => a.id !== id)); return ok(true); },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Portal de Solicitações — Organizadores, Solicitações, Arquivos, Movimentações
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Organizadores — Auth ─────────────────────────────────────────────────────

export const organizerAuthAPI = {
  /** Login do organizador. Cria sessão em fma_organizer_session. */
  login: async ({ email, password }) => {
    const organizers = read(KEYS.organizers);
    const found = organizers.find(
      o => o.email.toLowerCase() === email.toLowerCase() && o.password === password
    );
    if (!found) return err("E-mail ou senha inválidos.");
    if (!found.active) return err("Conta desativada. Contate a FMA.");
    const session = {
      organizerId: found.id,
      name: found.name,
      organization: found.organization,
      email: found.email,
      loginAt: new Date().toISOString(),
    };
    localStorage.setItem(KEYS.organizerSession, JSON.stringify(session));
    // Não expor senha na sessão
    const { password: _pw, ...safeData } = found;
    return ok({ session, organizer: safeData });
  },

  logout: async () => {
    localStorage.removeItem(KEYS.organizerSession);
    return ok(true);
  },

  check: () => {
    try {
      const raw = localStorage.getItem(KEYS.organizerSession);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },

  getSession: () => {
    try {
      const raw = localStorage.getItem(KEYS.organizerSession);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  },
};

// ─── Organizadores — CRUD ─────────────────────────────────────────────────────

export const organizersAPI = {
  list: async ({ activeOnly = false } = {}) => {
    let items = read(KEYS.organizers);
    if (activeOnly) items = items.filter(o => o.active);
    // Nunca expor senha na listagem
    items = items.map(({ password: _pw, ...o }) => o);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },

  get: async (id, { includePassword = false } = {}) => {
    const found = read(KEYS.organizers).find(o => o.id === id);
    if (!found) return err("Organizador não encontrado.");
    if (!includePassword) {
      const { password: _pw, ...safe } = found;
      return ok(safe);
    }
    return ok(found);
  },

  findByEmail: async (email) => {
    const found = read(KEYS.organizers).find(
      o => o.email.toLowerCase() === email.toLowerCase()
    );
    if (!found) return err("Não encontrado.");
    const { password: _pw, ...safe } = found;
    return ok(safe);
  },

  register: async (data) => {
    const existing = read(KEYS.organizers).find(
      o => o.email.toLowerCase() === data.email.toLowerCase()
    );
    if (existing) return err("Este e-mail já está cadastrado.");
    const items = read(KEYS.organizers);
    const newOrg = {
      ...data,
      id: generateId(),
      active: true,
      emailVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    write(KEYS.organizers, [...items, newOrg]);
    const { password: _pw, ...safe } = newOrg;
    return ok(safe);
  },

  update: async (id, data) => {
    const items = read(KEYS.organizers);
    const idx = items.findIndex(o => o.id === id);
    if (idx === -1) return err("Organizador não encontrado.");
    // Não atualizar e-mail e senha via este endpoint (endpoints separados)
    const { email: _e, password: _pw, ...safeData } = data;
    items[idx] = { ...items[idx], ...safeData, updatedAt: new Date().toISOString() };
    write(KEYS.organizers, items);
    const { password: _p, ...safe } = items[idx];
    return ok(safe);
  },

  updatePassword: async (id, { currentPassword, newPassword }) => {
    const items = read(KEYS.organizers);
    const idx = items.findIndex(o => o.id === id);
    if (idx === -1) return err("Organizador não encontrado.");
    if (items[idx].password !== currentPassword) return err("Senha atual incorreta.");
    items[idx] = { ...items[idx], password: newPassword, updatedAt: new Date().toISOString() };
    write(KEYS.organizers, items);
    return ok(true);
  },

  setActive: async (id, active) => {
    const items = read(KEYS.organizers);
    const idx = items.findIndex(o => o.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], active, updatedAt: new Date().toISOString() };
    write(KEYS.organizers, items);
    return ok(items[idx]);
  },

  delete: async (id) => {
    write(KEYS.organizers, read(KEYS.organizers).filter(o => o.id !== id));
    return ok(true);
  },
};

// ─── Solicitações ─────────────────────────────────────────────────────────────

export const solicitacoesAPI = {
  list: async ({ organizerId = null, status = null, tipo = null } = {}) => {
    let items = read(KEYS.solicitacoes);
    if (organizerId) items = items.filter(s => s.organizerId === organizerId);
    if (status) items = items.filter(s => s.status === status);
    if (tipo) items = items.filter(s => s.tipo === tipo);
    items.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
    return ok(items);
  },

  get: async (id) => {
    const item = read(KEYS.solicitacoes).find(s => s.id === id);
    return item ? ok(item) : err("Solicitação não encontrada.");
  },

  create: async (data) => {
    const items = read(KEYS.solicitacoes);
    const now = new Date().toISOString();
    const newItem = {
      ...data,
      id: generateId(),
      status: "rascunho",
      campos: data.campos || {},
      responsavelFMA: "",
      observacaoFMA: "",
      parecerFMA: "",
      protocoloFMA: "",
      criadoEm: now,
      atualizadoEm: now,
      enviadoEm: "",
      analisadoEm: "",
      encerradoEm: "",
    };
    write(KEYS.solicitacoes, [...items, newItem]);
    return ok(newItem);
  },

  update: async (id, data) => {
    const items = read(KEYS.solicitacoes);
    const idx = items.findIndex(s => s.id === id);
    if (idx === -1) return err("Solicitação não encontrada.");
    const now = new Date().toISOString();
    items[idx] = { ...items[idx], ...data, atualizadoEm: now };
    write(KEYS.solicitacoes, items);
    return ok(items[idx]);
  },

  /**
   * Altera o status da solicitação, atualizando datas de ciclo de vida.
   *
   * Geração automática de protocolo:
   *   Quando novoStatus === "em_analise" E a solicitação ainda NÃO tem
   *   protocoloFMA, chama garantirProtocolo() e salva o protocolo gerado.
   *   Se a solicitação já tiver protocolo, ele NÃO é alterado.
   *
   * @returns {Promise<{data: object}>} — objeto solicitação atualizado,
   *   com campo `_protocoloGerado: true` quando um protocolo foi criado
   *   nesta chamada (útil para a camada de serviço registrar movimentação).
   */
  changeStatus: async (id, novoStatus, extra = {}) => {
    const items = read(KEYS.solicitacoes);
    const idx = items.findIndex(s => s.id === id);
    if (idx === -1) return err("Solicitação não encontrada.");
    const now = new Date().toISOString();
    const update = { status: novoStatus, atualizadoEm: now, ...extra };

    // Datas de ciclo de vida
    if (novoStatus === "enviada"    && !items[idx].enviadoEm)   update.enviadoEm   = now;
    if (novoStatus === "em_analise" && !items[idx].analisadoEm) update.analisadoEm = now;
    if (["aprovada", "indeferida", "concluida"].includes(novoStatus)) update.encerradoEm = now;

    // ── Protocolo automático ──────────────────────────────────────────────────
    // Só gera quando entra em "em_analise". Se já tiver protocolo, preserva.
    let protocoloGerado = false;
    if (novoStatus === "em_analise") {
      const anoEvento = items[idx].dataEvento
        ? new Date(items[idx].dataEvento + "T12:00:00").getFullYear()
        : new Date().getFullYear();
      const { protocolo, gerado } = garantirProtocolo(items[idx], anoEvento);
      update.protocoloFMA = protocolo;
      protocoloGerado = gerado;
    }

    items[idx] = { ...items[idx], ...update };
    write(KEYS.solicitacoes, items);

    // _protocoloGerado é campo temporário para uso da camada de serviço
    // (registrar movimentação com protocolo). Não persiste no localStorage.
    return ok({ ...items[idx], _protocoloGerado: protocoloGerado });
  },

  delete: async (id) => {
    const sol = read(KEYS.solicitacoes).find(s => s.id === id);
    if (sol && sol.status !== "rascunho") return err("Apenas rascunhos podem ser excluídos.");
    write(KEYS.solicitacoes, read(KEYS.solicitacoes).filter(s => s.id !== id));
    return ok(true);
  },

  /**
   * Vincula um evento de calendário existente à solicitação.
   * Salva eventoCalendarioId na solicitação e solicitacaoId no evento.
   *
   * @param {string} solicitacaoId
   * @param {string} eventoId — ID de um EventoCalendario já existente
   */
  vincularEvento: async (solicitacaoId, eventoId) => {
    // Atualiza solicitação
    const sols = read(KEYS.solicitacoes);
    const sidx = sols.findIndex(s => s.id === solicitacaoId);
    if (sidx === -1) return err("Solicitação não encontrada.");

    // Atualiza evento (FK reversa)
    const eventos = read(KEYS.calendar);
    const eidx = eventos.findIndex(e => e.id === eventoId);
    if (eidx === -1) return err("Evento não encontrado.");

    const now = new Date().toISOString();
    sols[sidx] = { ...sols[sidx], eventoCalendarioId: eventoId, atualizadoEm: now };
    eventos[eidx] = { ...eventos[eidx], solicitacaoId, updatedAt: now };

    write(KEYS.solicitacoes, sols);
    write(KEYS.calendar, eventos);
    return ok({ solicitacao: sols[sidx], evento: eventos[eidx] });
  },

  /**
   * Desvincula o evento de calendário da solicitação.
   * Limpa eventoCalendarioId na solicitação e solicitacaoId no evento.
   *
   * NÃO exclui o evento — apenas remove a associação.
   *
   * @param {string} solicitacaoId
   */
  desvincularEvento: async (solicitacaoId) => {
    const sols = read(KEYS.solicitacoes);
    const sidx = sols.findIndex(s => s.id === solicitacaoId);
    if (sidx === -1) return err("Solicitação não encontrada.");

    const eventoId = sols[sidx].eventoCalendarioId;
    const now = new Date().toISOString();

    // Limpa FK na solicitação
    sols[sidx] = { ...sols[sidx], eventoCalendarioId: "", atualizadoEm: now };
    write(KEYS.solicitacoes, sols);

    // Limpa FK reversa no evento (se ainda existir)
    if (eventoId) {
      const eventos = read(KEYS.calendar);
      const eidx = eventos.findIndex(e => e.id === eventoId);
      if (eidx !== -1) {
        eventos[eidx] = { ...eventos[eidx], solicitacaoId: "", updatedAt: now };
        write(KEYS.calendar, eventos);
      }
    }

    return ok(sols[sidx]);
  },

  /** Contagem de solicitações por status — usado no dashboard admin. */
  countByStatus: async () => {
    const items = read(KEYS.solicitacoes);
    const counts = {};
    ["rascunho","enviada","em_analise","pendencia","aprovada","indeferida","concluida"].forEach(s => {
      counts[s] = items.filter(i => i.status === s).length;
    });
    counts.total = items.length;
    return ok(counts);
  },
};

// ─── Arquivos de Solicitações ─────────────────────────────────────────────────

export const solicitacaoArquivosAPI = {
  listBySolicitacao: async (solicitacaoId) => {
    const items = read(KEYS.solicitacaoArquivos)
      .filter(a => a.solicitacaoId === solicitacaoId)
      .sort((a, b) => new Date(a.uploadedAt) - new Date(b.uploadedAt));
    return ok(items);
  },

  /**
   * Upload de arquivo.
   * Em produção: data.dataUrl seria substituído por upload real ao servidor.
   * Demo: base64 armazenado no localStorage (max ~1MB por arquivo recomendado).
   */
  upload: async (data) => {
    const items = read(KEYS.solicitacaoArquivos);
    const newArq = {
      ...data,
      id: generateId(),
      uploadedAt: new Date().toISOString(),
    };
    write(KEYS.solicitacaoArquivos, [...items, newArq]);
    return ok(newArq);
  },

  delete: async (id) => {
    write(KEYS.solicitacaoArquivos, read(KEYS.solicitacaoArquivos).filter(a => a.id !== id));
    return ok(true);
  },
};

// ─── Movimentações ────────────────────────────────────────────────────────────

export const movimentacoesAPI = {
  listBySolicitacao: async (solicitacaoId, { apenasVisiveis = true } = {}) => {
    let items = read(KEYS.movimentacoes)
      .filter(m => m.solicitacaoId === solicitacaoId);
    if (apenasVisiveis) items = items.filter(m => m.visivel);
    items.sort((a, b) => new Date(a.criadoEm) - new Date(b.criadoEm));
    return ok(items);
  },

  /** Registra uma movimentação. Operação append-only — não há update/delete. */
  registrar: async (data) => {
    const items = read(KEYS.movimentacoes);
    const newMov = {
      ...data,
      id: generateId(),
      criadoEm: new Date().toISOString(),
    };
    write(KEYS.movimentacoes, [...items, newMov]);
    return ok(newMov);
  },
};

// ─── Resultados ───────────────────────────────────────────────────────────────

export const resultadosAPI = {
  /**
   * Lista resultados com filtros opcionais.
   * @param {{ publishedOnly, categoria, ano, cidade, busca, limit }} opts
   */
  list: async ({
    publishedOnly = true,
    categoria     = null,
    ano           = null,
    cidade        = null,
    busca         = null,
  } = {}) => {
    let items = read(KEYS.resultados);
    if (publishedOnly) items = items.filter(r => r.published);
    if (categoria)     items = items.filter(r => r.categoria === categoria);
    if (ano)           items = items.filter(r => r.anoCompetitivo === parseInt(ano));
    if (cidade)        items = items.filter(r => r.cidade && r.cidade.toLowerCase().includes(cidade.toLowerCase()));
    if (busca) {
      const q = busca.toLowerCase();
      items = items.filter(r =>
        r.nomeEvento.toLowerCase().includes(q) ||
        r.cidade.toLowerCase().includes(q)     ||
        (r.modalidade || "").toLowerCase().includes(q) ||
        (r.descricao  || "").toLowerCase().includes(q)
      );
    }
    // Mais recentes primeiro
    items.sort((a, b) => new Date(b.dataEvento) - new Date(a.dataEvento));
    return ok(items);
  },

  get: async (id) => {
    const item = read(KEYS.resultados).find(r => r.id === id);
    return item ? ok(item) : err("Resultado não encontrado.");
  },

  create: async (data) => {
    const items = read(KEYS.resultados);
    const n = { ...data, id: generateId(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    write(KEYS.resultados, [...items, n]);
    return ok(n);
  },

  update: async (id, data) => {
    const items = read(KEYS.resultados);
    const idx = items.findIndex(r => r.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.resultados, items);
    return ok(items[idx]);
  },

  delete: async (id) => {
    write(KEYS.resultados, read(KEYS.resultados).filter(r => r.id !== id));
    return ok(true);
  },

  /** Anos únicos disponíveis para o filtro (desc). */
  getAnos: async (categoria = null) => {
    let items = read(KEYS.resultados).filter(r => r.published);
    if (categoria) items = items.filter(r => r.categoria === categoria);
    const anos = [...new Set(items.map(r => r.anoCompetitivo).filter(Boolean))].sort((a, b) => b - a);
    return ok(anos);
  },

  /** Cidades únicas disponíveis para o filtro (asc). */
  getCidades: async (categoria = null) => {
    let items = read(KEYS.resultados).filter(r => r.published);
    if (categoria) items = items.filter(r => r.categoria === categoria);
    const cidades = [...new Set(items.map(r => r.cidade).filter(Boolean))].sort();
    return ok(cidades);
  },
};

// ─── Equipes ──────────────────────────────────────────────────────────────────

export const equipesAPI = {
  list: async ({ publishedOnly = true, busca = null } = {}) => {
    let items = read(KEYS.equipes);
    if (publishedOnly) items = items.filter(e => e.published);
    if (busca) {
      const q = busca.toLowerCase();
      items = items.filter(e =>
        e.title.toLowerCase().includes(q) ||
        (e.cidade || "").toLowerCase().includes(q) ||
        (e.excerpt || "").toLowerCase().includes(q)
      );
    }
    items.sort((a, b) => (a.order || 0) - (b.order || 0));
    return ok(items);
  },
  get: async (idOrSlug) => {
    const item = read(KEYS.equipes).find(e => e.id === idOrSlug || e.slug === idOrSlug);
    return item ? ok(item) : err("Equipe não encontrada.");
  },
  create: async (data) => {
    const items = read(KEYS.equipes);
    const maxOrder = items.reduce((m, e) => Math.max(m, e.order || 0), 0);
    const n = { ...data, id: generateId(), order: data.order || maxOrder + 1, createdAt: new Date().toISOString() };
    write(KEYS.equipes, [...items, n]);
    return ok(n);
  },
  update: async (id, data) => {
    const items = read(KEYS.equipes);
    const idx = items.findIndex(e => e.id === id);
    if (idx === -1) return err("Não encontrado.");
    items[idx] = { ...items[idx], ...data, updatedAt: new Date().toISOString() };
    write(KEYS.equipes, items);
    return ok(items[idx]);
  },
  delete: async (id) => {
    write(KEYS.equipes, read(KEYS.equipes).filter(e => e.id !== id));
    return ok(true);
  },
};
