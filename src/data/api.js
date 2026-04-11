/**
 * FMA — Camada de API (Firebase Firestore)
 * Padrão de retorno: Promise<{ data, error }>
 * Sessões permanecem em localStorage (ephemeral/por-browser).
 */

import {
  collection, doc, getDoc, getDocs, setDoc,
  updateDoc, deleteDoc, writeBatch,
} from "firebase/firestore";

import {
  signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword,
  updatePassword as fbUpdatePassword,
  updateEmail as fbUpdateEmail,
  EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged,
} from "firebase/auth";

import { db, auth, createAuthUserSafe } from "../firebase";
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
  SEED_RESULTADOS, SEED_EQUIPES, SEED_PISTAS_HOMOLOGADAS,
} from "./mockData";

function ok(data)  { return { data, error: null }; }
function err(msg)  { return { data: null, error: msg }; }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function now() { return new Date().toISOString(); }

/** Verifica se o users doc possui um role. Compatível com role (string legado) e roles (array). */
function hasRole(profile, role) {
  if (!profile) return false;
  if (Array.isArray(profile.roles)) return profile.roles.includes(role);
  return profile.role === role; // backward-compat com docs antigos
}

async function readCol(colName) {
  const snap = await getDocs(collection(db, colName));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function readDoc(colName, id) {
  const snap = await getDoc(doc(db, colName, id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function createDoc(colName, data) {
  const id   = data.id || generateId();
  const item = { ...data, id, createdAt: data.createdAt || now() };
  await setDoc(doc(db, colName, id), item);
  return item;
}

async function patchDoc(colName, id, data) {
  const ref = doc(db, colName, id);
  await updateDoc(ref, { ...data, updatedAt: now() });
  return readDoc(colName, id);
}

async function removeDoc(colName, id) {
  await deleteDoc(doc(db, colName, id));
  return true;
}

async function seedCollection(colName, items) {
  if (!items || items.length === 0) return;
  const snap = await getDocs(collection(db, colName));
  if (!snap.empty) return;
  const batch = writeBatch(db);
  items.forEach(item => {
    const id  = item.id || generateId();
    batch.set(doc(db, colName, id), { ...item, id });
  });
  await batch.commit();
}

async function seedSingleDoc(colName, docId, data) {
  const ref  = doc(db, colName, docId);
  const snap = await getDoc(ref);
  if (!snap.exists()) await setDoc(ref, data);
}

async function seedAuthUser(email, password, firestoreData) {
  const usersSnap = await getDocs(collection(db, "users"));
  if (usersSnap.docs.some(d => d.data().email === email)) return;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), { uid: cred.user.uid, email, ...firestoreData, createdAt: now() });
    await signOut(auth);
  } catch (e) {
    if (e.code !== "auth/email-already-in-use") console.warn("seedAuthUser:", e.message);
  }
}


export const pistasHomologadasAPI = {
  list: async ({ published=null }={}) => {
    let items = await readCol("pistasHomologadas");
    if (published !== null) items = items.filter(p => p.published === published);
    items.sort((a,b) => (a.nome||"").localeCompare(b.nome||""));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("pistasHomologadas",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("pistasHomologadas",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("pistasHomologadas",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("pistasHomologadas",id); return ok(true); },
};

export async function initializeData() {
  // Verifica se o seed já foi executado — evita re-popular coleções deletadas
  const flagRef  = doc(db, "config", "_seeded");
  const flagSnap = await getDoc(flagRef);
  if (flagSnap.exists()) return; // já rodou, nunca mais roda

  await Promise.all([
    seedCollection("news",                   SEED_NEWS),
    seedCollection("gallery",                SEED_GALLERY),
    seedCollection("calendar",               SEED_CALENDAR),
    seedCollection("documents",              SEED_DOCUMENTS),
    seedCollection("banners",                SEED_BANNERS),
    seedCollection("partners",               SEED_PARTNERS),
    seedCollection("socialLinks",            SEED_SOCIAL_LINKS),
    seedCollection("institutionalPages",     SEED_INSTITUTIONAL_PAGES),
    seedCollection("institutionalSections",  SEED_INSTITUTIONAL_SECTIONS),
    seedCollection("referees",               SEED_REFEREES),
    seedCollection("refereeEvents",          SEED_REFEREE_EVENTS),
    seedCollection("refereeAvailability",    SEED_REFEREE_AVAILABILITY),
    seedCollection("refereeAssignments",     SEED_REFEREE_ASSIGNMENTS),
    seedCollection("organizers",             SEED_ORGANIZERS),
    seedCollection("solicitacoes",           SEED_SOLICITACOES),
    seedCollection("solicitacaoArquivos",    SEED_SOLICITACAO_ARQUIVOS),
    seedCollection("movimentacoes",          SEED_MOVIMENTACOES),
    seedCollection("resultados",             SEED_RESULTADOS),
    seedCollection("equipes",                SEED_EQUIPES),
    seedCollection("pistasHomologadas",       SEED_PISTAS_HOMOLOGADAS),
    seedSingleDoc("config", "adminUser",      SEED_ADMIN_USER),
    seedSingleDoc("config", "footerConfig",   SEED_FOOTER_CONFIG),
    seedSingleDoc("config", "athleteContent", Array.isArray(SEED_ATHLETE_CONTENT) ? { items: SEED_ATHLETE_CONTENT } : SEED_ATHLETE_CONTENT),
    seedSingleDoc("config", "refereeContent", Array.isArray(SEED_REFEREE_CONTENT) ? { items: SEED_REFEREE_CONTENT } : SEED_REFEREE_CONTENT),
  ]);
  await seedAuthUser(SEED_ADMIN_USER.email, SEED_ADMIN_USER.password, { roles: ["admin"], level: SEED_ADMIN_USER.level || "master", name: SEED_ADMIN_USER.name, refId: SEED_ADMIN_USER.id, permissions: [], createdBy: null });
  for (const r of SEED_REFEREES) await seedAuthUser(r.email, r.password, { roles: ["referee"], name: r.name, refId: r.id });
  for (const o of SEED_ORGANIZERS) await seedAuthUser(o.email, o.password, { roles: ["organizer"], name: o.name, refId: o.id });
}


export const authAPI = {
  login: async ({ email, password }) => {
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const profile = await readDoc("users", cred.user.uid);
      if (!profile) return err("Perfil não encontrado.");
      if (!hasRole(profile, "admin")) { await signOut(auth); return err("Acesso restrito ao painel admin."); }
      if (profile.active === false) { await signOut(auth); return err("Conta desativada. Contate o administrador."); }
      return ok({ user: {
        id: profile.refId, uid: cred.user.uid, name: profile.name, email: profile.email,
        role: "admin", roles: profile.roles || [profile.role], level: profile.level || "admin",
        permissions: profile.permissions || [], createdBy: profile.createdBy || null,
        mustChangePassword: profile.mustChangePassword || false,
      }});
    } catch (e) {
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(e.code)) return err("Credenciais inválidas.");
      return err(e.message);
    }
  },
  logout:  async () => { await signOut(auth); return ok(true); },
  check:   ()       => !!auth.currentUser,
  getUser: async () => {
    const u = auth.currentUser;
    if (!u) return null;
    const profile = await readDoc("users", u.uid);
    if (!profile || !hasRole(profile, "admin")) return null;
    return {
      id: profile.refId, uid: u.uid, name: profile.name, email: profile.email,
      role: "admin", roles: profile.roles || [profile.role], level: profile.level || "admin",
      permissions: profile.permissions || [], createdBy: profile.createdBy || null,
      mustChangePassword: profile.mustChangePassword || false,
    };
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
  updatePassword: async (currentPassword, newPassword) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await fbUpdatePassword(u, newPassword);
      // Limpar flag de troca obrigatória
      await updateDoc(doc(db, "users", u.uid), { mustChangePassword: false, updatedAt: now() });
      return ok(true);
    } catch (e) { return err(e.message); }
  },
};

// ── Gestão de Usuários Admin ─────────────────────────────────────────────────
export const adminUsersAPI = {
  /** Lista todos os users que possuem role admin */
  list: async () => {
    const all = await readCol("users");
    const admins = all
      .filter(u => hasRole(u, "admin"))
      .map(({ password, ...safe }) => safe);
    admins.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    return ok(admins);
  },

  /** Busca um user admin pelo uid */
  get: async (uid) => {
    const item = await readDoc("users", uid);
    if (!item || !hasRole(item, "admin")) return err("Usuário não encontrado.");
    const { password, ...safe } = item;
    return ok(safe);
  },

  /** Cria um novo usuário admin (Firebase Auth + Firestore users doc).
   *  Se o email já existe no Firebase Auth (ex: árbitro/organizador), adiciona "admin" ao roles[].
   *  Se não existe, cria conta nova. */
  create: async (data, creatorUid) => {
    const all = await readCol("users");
    const existing = all.find(u => u.email === data.email);

    // Caso 1: email já tem users doc — adicionar role admin
    if (existing) {
      if (hasRole(existing, "admin")) return err("Este e-mail já possui acesso admin.");
      const currentRoles = existing.roles || (existing.role ? [existing.role] : []);
      const newRoles = [...new Set([...currentRoles, "admin"])];
      await updateDoc(doc(db, "users", existing.uid), {
        roles: newRoles, level: data.level || "editor",
        permissions: data.permissions || [], active: true,
        createdBy: creatorUid, updatedAt: now(),
      });
      const updated = await readDoc("users", existing.uid);
      const { password: _, ...safe } = updated;
      return ok(safe);
    }

    // Caso 2: email novo — criar Firebase Auth (sem deslogar admin) + users doc
    const { uid: newUid, error: authErr } = await createAuthUserSafe(data.email, data.password);
    if (authErr) {
      if (authErr.code === "auth/email-already-in-use") return err("E-mail já possui conta de autenticação mas não foi encontrado no sistema. Contate o suporte.");
      return err(authErr.message);
    }
    try {
      const userDoc = {
        uid: newUid, email: data.email, name: data.name,
        roles: ["admin"], level: data.level || "editor",
        permissions: data.permissions || [], active: true,
        mustChangePassword: true,
        createdBy: creatorUid, createdAt: now(),
      };
      await setDoc(doc(db, "users", newUid), userDoc);
      const { password: _, ...safe } = userDoc;
      return ok(safe);
    } catch (e) {
      return err(e.message);
    }
  },

  /** Atualiza dados do user (name, level, permissions, active) */
  update: async (uid, data) => {
    const existing = await readDoc("users", uid);
    if (!existing || !hasRole(existing, "admin")) return err("Usuário não encontrado.");
    const allowed = {};
    if (data.name !== undefined)        allowed.name = data.name;
    if (data.level !== undefined)       allowed.level = data.level;
    if (data.permissions !== undefined) allowed.permissions = data.permissions;
    if (data.active !== undefined)      allowed.active = data.active;
    allowed.updatedAt = now();
    await updateDoc(doc(db, "users", uid), allowed);
    const updated = await readDoc("users", uid);
    const { password, ...safe } = updated;
    return ok(safe);
  },

  /** Desativa um user admin (soft delete) */
  deactivate: async (uid) => {
    const existing = await readDoc("users", uid);
    if (!existing || !hasRole(existing, "admin")) return err("Usuário não encontrado.");
    await updateDoc(doc(db, "users", uid), { active: false, updatedAt: now() });
    return ok(true);
  },

  /** Reativa um user admin */
  activate: async (uid) => {
    const existing = await readDoc("users", uid);
    if (!existing || !hasRole(existing, "admin")) return err("Usuário não encontrado.");
    await updateDoc(doc(db, "users", uid), { active: true, updatedAt: now() });
    return ok(true);
  },
};

export const newsAPI = {
  list: async ({ publishedOnly = true } = {}) => {
    let items = await readCol("news");
    if (publishedOnly) items = items.filter(n => n.published);
    items.sort((a, b) => new Date(b.date) - new Date(a.date));
    return ok(items);
  },
  get: async (id) => {
    let item = await readDoc("news", id);
    if (!item) { const all = await readCol("news"); item = all.find(n => n.slug === id) || null; }
    return item ? ok(item) : err("Notícia não encontrada.");
  },
  getRelated: async ({ excludeId, category, tags = [], limit: lim = 3 }) => {
    let items = (await readCol("news")).filter(n => n.published && n.id !== excludeId);
    const score = (item) => {
      let s = 0;
      if (item.category === category) s += 10;
      (Array.isArray(tags) ? tags : []).forEach(t => { if ((item.tags||[]).includes(t)) s += 2; });
      return s;
    };
    let related = items.map(item => ({ item, score: score(item) })).filter(({score:s})=>s>0)
      .sort((a,b)=>b.score-a.score||new Date(b.item.date)-new Date(a.item.date))
      .map(({item})=>item).slice(0,lim);
    if (related.length===0) related = items.sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,lim);
    return ok(related);
  },
  create: async (data) => {
    const item = await createDoc("news", {
      ...data,
      date:    data.date    || now().slice(0,10),
      tags:    Array.isArray(data.tags) ? data.tags : (data.tags ? data.tags.split(",").map(t=>t.trim()).filter(Boolean) : []),
      gallery: Array.isArray(data.gallery) ? data.gallery : [],
    });
    return ok(item);
  },
  update: async (id, data) => {
    const item = await patchDoc("news", id, {
      ...data,
      tags:    Array.isArray(data.tags) ? data.tags : (typeof data.tags==="string" ? data.tags.split(",").map(t=>t.trim()).filter(Boolean) : data.tags),
      gallery: Array.isArray(data.gallery) ? data.gallery : undefined,
    });
    return item ? ok(item) : err("Não encontrado.");
  },
  delete: async (id) => { await removeDoc("news", id); return ok(true); },
};

export const galleryAPI = {
  list: async ({ publishedOnly=true, category=null, busca=null }={}) => {
    let items = await readCol("gallery");
    if (publishedOnly) items = items.filter(g=>g.published);
    if (category)      items = items.filter(g=>g.category===category);
    if (busca) { const q=busca.toLowerCase(); items=items.filter(g=>g.title.toLowerCase().includes(q)||(g.description||"").toLowerCase().includes(q)); }
    items.sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
    return ok(items);
  },
  get:    async (id)       => { const item=await readDoc("gallery",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)     => { const item=await createDoc("gallery",data); return ok(item); },
  update: async (id,data)  => { const item=await patchDoc("gallery",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)       => { await removeDoc("gallery",id); return ok(true); },
  getCategorias: async () => {
    const items = await readCol("gallery");
    return ok([...new Set(items.filter(g=>g.published).map(g=>g.category).filter(Boolean))].sort());
  },
  remove: async (id) => { await removeDoc("gallery", id); return ok(true); },
  setActive: async (id, active) => {
    const item = await patchDoc("gallery", id, { published: active });
    return item ? ok(item) : err("Não encontrado.");
  },
};

export const calendarAPI = {
  list: async ({ publishedOnly=true, category=null, year=null, city=null, upcoming=false }={}) => {
    let items = await readCol("calendar");
    if (publishedOnly) items=items.filter(e=>e.published);
    if (category)      items=items.filter(e=>e.category===category);
    if (year)          items=items.filter(e=>e.date?.startsWith(String(year)));
    if (city)          items=items.filter(e=>e.city===city);
    if (upcoming)      { const today=now().slice(0,10); items=items.filter(e=>e.date>=today); }
    items.sort((a,b)=>new Date(a.date)-new Date(b.date));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("calendar",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("calendar",data); await garantirProtocolo(item); return ok(item); },
  /** Grava array de eventos em lotes de 500 (limite do Firestore batch). Retorna array de itens criados. */
  createBatch: async (dataArray) => {
    const items = [];
    for (let i = 0; i < dataArray.length; i += 500) {
      const chunk = dataArray.slice(i, i + 500);
      const batch = writeBatch(db);
      const chunkItems = [];
      for (const data of chunk) {
        const id = data.id || generateId();
        const item = { ...data, id, createdAt: data.createdAt || now() };
        batch.set(doc(db, "calendar", id), item);
        chunkItems.push(item);
      }
      await batch.commit();
      // Gerar protocolo para cada item após commit
      for (const item of chunkItems) {
        await garantirProtocolo(item);
      }
      items.push(...chunkItems);
    }
    return ok(items);
  },
  update: async (id,data) => { const item=await patchDoc("calendar",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("calendar",id); return ok(true); },
  getYears: async () => {
    const items=await readCol("calendar");
    return ok([...new Set(items.map(e=>e.date?.slice(0,4)).filter(Boolean))].sort((a,b)=>b-a));
  },
  getCities: async () => {
    const items=await readCol("calendar");
    return ok([...new Set(items.filter(e=>e.published).map(e=>e.city).filter(Boolean))].sort());
  },
  getCategories: async () => {
    const items = await readCol("calendar");
    const cats = [...new Set(items.map(e=>e.category).filter(Boolean))].sort();
    return ok(cats);
  },
  setActive: async (id, active) => {
    const item = await patchDoc("calendar", id, { published: active });
    return item ? ok(item) : err("Não encontrado.");
  },
  remove: async (id) => { await removeDoc("calendar", id); return ok(true); },
  upload: async (id, fileData) => {
    const item = await patchDoc("calendar", id, { arquivo: fileData });
    return item ? ok(item) : err("Não encontrado.");
  },
};

export const documentsAPI = {
  list: async ({ publishedOnly=true, category=null }={}) => {
    let items=await readCol("documents");
    if (publishedOnly) items=items.filter(d=>d.published);
    if (category)      items=items.filter(d=>d.category===category);
    items.sort((a,b)=>new Date(b.date||b.createdAt)-new Date(a.date||a.createdAt));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("documents",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("documents",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("documents",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("documents",id); return ok(true); },
};

export const bannersAPI = {
  list: async ({ activeOnly=true }={}) => {
    let items=await readCol("banners");
    if (activeOnly) items=items.filter(b=>b.active);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("banners",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("banners",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("banners",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("banners",id); return ok(true); },
};

export const partnersAPI = {
  list: async ({ activeOnly=true }={}) => {
    let items=await readCol("partners");
    if (activeOnly) items=items.filter(p=>p.active);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("partners",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("partners",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("partners",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("partners",id); return ok(true); },
};

export const socialLinksAPI = {
  list: async () => { const items=await readCol("socialLinks"); items.sort((a,b)=>(a.order||0)-(b.order||0)); return ok(items); },
  get:    async (id)      => { const item=await readDoc("socialLinks",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("socialLinks",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("socialLinks",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("socialLinks",id); return ok(true); },
};

export const footerConfigAPI = {
  get:    async ()     => { const item=await readDoc("config","footerConfig"); return ok(item||{}); },
  update: async (data) => { await setDoc(doc(db,"config","footerConfig"),{...data,updatedAt:now()},{merge:true}); return ok(data); },
};

export const taxasConfigAPI = {
  get:    async ()     => { const item=await readDoc("config","taxas"); return ok(item||{}); },
  update: async (data) => { await setDoc(doc(db,"config","taxas"),{...data,updatedAt:now()},{merge:true}); return ok(data); },
};

export const institutionalPagesAPI = {
  list: async ({ publishedOnly=true }={}) => {
    let items=await readCol("institutionalPages");
    if (publishedOnly) items=items.filter(p=>p.published);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  get: async (idOrSlug) => {
    let item=await readDoc("institutionalPages",idOrSlug);
    if (!item) { const all=await readCol("institutionalPages"); item=all.find(p=>p.slug===idOrSlug)||null; }
    return item?ok(item):err("Página não encontrada.");
  },
  create: async (data) => {
    const all=await readCol("institutionalPages");
    const maxOrder=all.reduce((m,p)=>Math.max(m,p.order||0),0);
    const item=await createDoc("institutionalPages",{...data,order:data.order||maxOrder+1});
    return ok(item);
  },
  update: async (id,data) => { const item=await patchDoc("institutionalPages",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id) => {
    await removeDoc("institutionalPages",id);
    const sections=await readCol("institutionalSections");
    await Promise.all(sections.filter(s=>s.pageId===id).map(s=>removeDoc("institutionalSections",s.id)));
    return ok(true);
  },
  reorder: async (orderedIds) => {
    await Promise.all(orderedIds.map((id,i)=>patchDoc("institutionalPages",id,{order:i+1})));
    return ok(true);
  },
};

export const institutionalSectionsAPI = {
  list: async ({ pageId, publishedOnly=true }={}) => {
    let items=await readCol("institutionalSections");
    if (pageId)        items=items.filter(s=>s.pageId===pageId);
    if (publishedOnly) items=items.filter(s=>s.published);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("institutionalSections",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => {
    const all=await readCol("institutionalSections");
    const siblings=all.filter(s=>s.pageId===data.pageId);
    const maxOrder=siblings.reduce((m,s)=>Math.max(m,s.order||0),0);
    const item=await createDoc("institutionalSections",{...data,order:data.order||maxOrder+1});
    return ok(item);
  },
  update: async (id,data) => { const item=await patchDoc("institutionalSections",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("institutionalSections",id); return ok(true); },
  reorder: async (orderedIds) => {
    await Promise.all(orderedIds.map((id,i)=>patchDoc("institutionalSections",id,{order:i+1})));
    return ok(true);
  },
};

export const athleteContentAPI = {
  get:    async ()     => { const item=await readDoc("config","athleteContent"); return ok(item||{}); },
  list:   async ({ publishedOnly=true }={}) => {
    const content=await readDoc("config","athleteContent");
    if (!content) return ok([]);
    let items=content.items||[];
    if (publishedOnly) items=items.filter(i=>i.published);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  update: async (data) => { await setDoc(doc(db,"config","athleteContent"),{...data,updatedAt:now()},{merge:true}); return ok(data); },
  addItem: async (item) => {
    const content=await readDoc("config","athleteContent")||{};
    const items=[...(content.items||[]),{...item,id:generateId(),createdAt:now()}];
    await setDoc(doc(db,"config","athleteContent"),{...content,items,updatedAt:now()});
    return ok(items[items.length-1]);
  },
  updateItem: async (itemId,data) => {
    const content=await readDoc("config","athleteContent")||{};
    const items=(content.items||[]).map(i=>i.id===itemId?{...i,...data}:i);
    await setDoc(doc(db,"config","athleteContent"),{...content,items,updatedAt:now()});
    return ok(items.find(i=>i.id===itemId));
  },
  deleteItem: async (itemId) => {
    const content=await readDoc("config","athleteContent")||{};
    const items=(content.items||[]).filter(i=>i.id!==itemId);
    await setDoc(doc(db,"config","athleteContent"),{...content,items,updatedAt:now()});
    return ok(true);
  },
};

export const refereeContentAPI = {
  get:    async ()     => { const item=await readDoc("config","refereeContent"); return ok(item||{}); },
  list:   async ({ publishedOnly=true }={}) => {
    const content=await readDoc("config","refereeContent");
    if (!content) return ok([]);
    let items=content.items||[];
    if (publishedOnly) items=items.filter(i=>i.published);
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  update: async (data) => { await setDoc(doc(db,"config","refereeContent"),{...data,updatedAt:now()},{merge:true}); return ok(data); },
  addItem: async (item) => {
    const content=await readDoc("config","refereeContent")||{};
    const items=[...(content.items||[]),{...item,id:generateId(),createdAt:now()}];
    await setDoc(doc(db,"config","refereeContent"),{...content,items,updatedAt:now()});
    return ok(items[items.length-1]);
  },
  updateItem: async (itemId,data) => {
    const content=await readDoc("config","refereeContent")||{};
    const items=(content.items||[]).map(i=>i.id===itemId?{...i,...data}:i);
    await setDoc(doc(db,"config","refereeContent"),{...content,items,updatedAt:now()});
    return ok(items.find(i=>i.id===itemId));
  },
  deleteItem: async (itemId) => {
    const content=await readDoc("config","refereeContent")||{};
    const items=(content.items||[]).filter(i=>i.id!==itemId);
    await setDoc(doc(db,"config","refereeContent"),{...content,items,updatedAt:now()});
    return ok(true);
  },
};

export const intranetAuthAPI = {
  login: async ({ email, password }) => {
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const profile = await readDoc("users", cred.user.uid);
      if (!profile || !hasRole(profile, "referee")) { await signOut(auth); return err("Acesso restrito à intranet de árbitros."); }
      const referee = await readDoc("referees", profile.refId);
      if (!referee || referee.status !== "ativo") { await signOut(auth); return err("Árbitro inativo ou não encontrado."); }
      const session = {
        refereeId: referee.id, uid: cred.user.uid, email: referee.email, name: referee.name, role: referee.role, loginAt: now(),
        mustChangePassword: referee.mustChangePassword || false,
        profileComplete: referee.profileComplete || false,
        emailVerified: referee.emailVerified || false,
      };
      const { password: _, ...safe } = referee;
      return ok({ session, referee: safe });
    } catch (e) {
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(e.code)) return err("Credenciais inválidas.");
      return err(e.message);
    }
  },
  logout:            async () => { await signOut(auth); return ok(true); },
  check:             ()       => auth.currentUser ? { uid: auth.currentUser.uid } : null,
  getSession:        async () => {
    const u = auth.currentUser;
    if (!u) return null;
    const profile = await readDoc("users", u.uid);
    if (!profile || !hasRole(profile, "referee")) return null;
    const referee = await readDoc("referees", profile.refId);
    if (!referee) return null;
    return {
      refereeId: referee.id, uid: u.uid, email: referee.email, name: referee.name, role: referee.role,
      mustChangePassword: referee.mustChangePassword || false,
      profileComplete: referee.profileComplete || false,
      emailVerified: referee.emailVerified || false,
    };
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
  updatePassword: async (currentPassword, newPassword, refereeId) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await fbUpdatePassword(u, newPassword);
      // Limpar flag no referee doc
      await updateDoc(doc(db, "referees", refereeId), { mustChangePassword: false, updatedAt: now() });
      return ok(true);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") return err("Senha atual incorreta.");
      return err(e.message);
    }
  },
  updateEmail: async (refereeId, newEmail, currentPassword) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await fbUpdateEmail(u, newEmail);
      await updateDoc(doc(db, "referees", refereeId), { email: newEmail, updatedAt: now() });
      const usersSnap = await getDocs(collection(db, "users"));
      const userDoc = usersSnap.docs.find(d => { const dt = d.data(); return dt.refId === refereeId && hasRole(dt, "referee"); });
      if (userDoc) await updateDoc(doc(db, "users", userDoc.id), { email: newEmail });
      return ok(true);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") return err("Senha incorreta.");
      if (e.code === "auth/email-already-in-use") return err("Este e-mail já está em uso por outra conta.");
      if (e.code === "auth/invalid-email") return err("E-mail inválido.");
      return err(e.message);
    }
  },
};

export const refereesAPI = {
  list: async ({ status=null, category=null }={}) => {
    let items=await readCol("referees");
    if (status)   items=items.filter(r=>r.status===status);
    if (category) items=items.filter(r=>r.category===category);
    items.sort((a,b)=>a.name.localeCompare(b.name));
    return ok(items.map(({password,...safe})=>safe));
  },
  get: async (id) => {
    const item=await readDoc("referees",id);
    if (!item) return err("Árbitro não encontrado.");
    const {password,...safe}=item; // strip legacy password if still present
    return ok(safe);
  },
  create: async (data) => {
    const all=await readCol("referees");
    if (all.find(r=>r.email===data.email)) return err("E-mail já cadastrado.");

    // 1. Criar Firebase Auth user primeiro (sem deslogar admin)
    const { uid: newUid, error: authErr } = await createAuthUserSafe(data.email, data.password);
    if (!newUid && authErr?.code !== "auth/email-already-in-use") {
      return err(authErr?.message || "Erro ao criar conta de autenticação.");
    }

    // 2. Criar referee doc no Firestore (só se Auth ok) — NUNCA salvar senha
    const { password: _pw, ...dataWithoutPassword } = data;
    const item=await createDoc("referees",{ ...dataWithoutPassword, mustChangePassword: true, profileComplete: false });

    // 3. Criar/atualizar users doc
    if (newUid) {
      const usersSnap = await getDocs(collection(db, "users"));
      const existingUser = usersSnap.docs.find(d => d.id === newUid);
      if (existingUser) {
        const userData = existingUser.data();
        const currentRoles = userData.roles || (userData.role ? [userData.role] : []);
        await updateDoc(doc(db, "users", newUid), { roles: [...new Set([...currentRoles, "referee"])], refId: item.id, updatedAt: now() });
      } else {
        await setDoc(doc(db, "users", newUid), { uid: newUid, email: data.email, roles: ["referee"], name: data.name, refId: item.id, createdAt: now() });
      }
    }
    const {password,...safe}=item;
    return ok(safe);
  },
  update: async (id,data) => {
    delete data.password; // NUNCA salvar senha no Firestore
    const item=await patchDoc("referees",id,data);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item;
    return ok(safe);
  },
  delete:         async (id)      => { await removeDoc("referees",id); return ok(true); },
  updatePassword: async (id, pass) => {
    // Alterar senha APENAS no Firebase Auth (nunca salvar no Firestore)
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      await fbUpdatePassword(u, pass);
      return ok(true);
    } catch (e) {
      return err(e.message);
    }
  },
  findByEmail:    async (email)   => {
    const all = await readCol("referees");
    const item = all.find(r => r.email === email);
    return item ? ok(item) : err("Não encontrado.");
  },
};

export const refereeEventsAPI = {
  list: async ({ status=null, upcoming=false }={}) => {
    let items=await readCol("refereeEvents");
    if (status)  items=items.filter(e=>e.status===status);
    if (upcoming){const today=now().slice(0,10);items=items.filter(e=>e.date>=today);}
    items.sort((a,b)=>new Date(a.date)-new Date(b.date));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("refereeEvents",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("refereeEvents",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("refereeEvents",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("refereeEvents",id); return ok(true); },
  importFromCalendar: async (calendarEventId) => {
    // Importação em lote (sem argumento) ou individual
    if (!calendarEventId) {
      const today = new Date().toISOString().slice(0, 10);
      const calEvents = await readCol("calendar");
      const futureEvents = calEvents.filter(e => e.date >= today);
      const existing = await readCol("refereeEvents");
      const importedRefs = new Set(existing.map(e => e.calendarRef).filter(Boolean));
      let imported = 0;
      for (const cal of futureEvents) {
        if (importedRefs.has(cal.id)) continue;
        await createDoc("refereeEvents", {
          title: cal.title, date: cal.date, city: cal.city,
          location: cal.location || "", category: cal.category || "",
          organizer: cal.organizer || "", refereesNeeded: 3,
          status: "aberto", source: "calendar", calendarRef: cal.id,
          notes: cal.description || "",
        });
        imported++;
      }
      return ok({ imported });
    }
    const cal = await readDoc("calendar", calendarEventId);
    if (!cal) return err("Evento do calendário não encontrado.");
    const all = await readCol("refereeEvents");
    const existing = all.find(e => e.calendarRef === calendarEventId);
    if (existing) return ok(existing);
    const item = await createDoc("refereeEvents", {
      title: cal.title, date: cal.date, city: cal.city,
      location: cal.location || "", category: cal.category || "",
      organizer: cal.organizer || "", refereesNeeded: 3,
      status: "aberto", source: "calendar", calendarRef: calendarEventId,
      notes: cal.description || "",
    });
    return ok(item);
  },
  getAnos: async () => {
    const items = await readCol("refereeEvents");
    const anos = [...new Set(items.map(e => e.date?.slice(0,4)).filter(Boolean))].sort().reverse();
    return ok(anos);
  },
  getCidades: async () => {
    const items = await readCol("refereeEvents");
    const cidades = [...new Set(items.map(e => e.city).filter(Boolean))].sort();
    return ok(cidades);
  },
};

export const refereeAvailabilityAPI = {
  list: async ({ refereeId=null }={}) => {
    let items=await readCol("refereeAvailability");
    if (refereeId) items=items.filter(a=>a.refereeId===refereeId);
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("refereeAvailability",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("refereeAvailability",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("refereeAvailability",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("refereeAvailability",id); return ok(true); },
  setAvailability: async (data) => {
    const all = await readCol("refereeAvailability");
    const existing = all.find(a => a.refereeId === data.refereeId && a.eventId === data.eventId);
    if (existing) {
      const item = await patchDoc("refereeAvailability", existing.id, data);
      return ok(item);
    }
    const item = await createDoc("refereeAvailability", data);
    return ok(item);
  },
  getAvailableForEvent: async (eventId) => {
    const all = await readCol("refereeAvailability");
    const avail = all.filter(a => a.eventId === eventId && a.available !== false);
    return ok(avail);
  },
  getForEvent: async (eventId) => {
    const all = await readCol("refereeAvailability");
    return ok(all.filter(a => a.eventId === eventId));
  },
};

export const refereeAssignmentsAPI = {
  getByEvent: async (eventId) => {
    let items = await readCol("refereeAssignments");
    items = items.filter(a => a.eventId === eventId);
    // Popular referee
    const refs = await readCol("referees");
    const refMap = Object.fromEntries(refs.map(r => [r.id, r]));
    items = items.map(a => ({ ...a, referee: refMap[a.refereeId] || null }));
    return ok(items);
  },
  getByReferee: async (refereeId) => {
    let items = await readCol("refereeAssignments");
    items = items.filter(a => a.refereeId === refereeId);
    // Popular evento
    const events = await readCol("refereeEvents");
    const evtMap = Object.fromEntries(events.map(e => [e.id, e]));
    items = items.map(a => ({ ...a, event: evtMap[a.eventId] || null }));
    return ok(items);
  },
  assign: async (data) => {
    const item = await createDoc("refereeAssignments", data);
    return ok(item);
  },
  list: async ({ refereeId=null, eventId=null, status=null }={}) => {
    let items=await readCol("refereeAssignments");
    if (refereeId) items=items.filter(a=>a.refereeId===refereeId);
    if (eventId)   items=items.filter(a=>a.eventId===eventId);
    if (status)    items=items.filter(a=>a.status===status);
    // Popular evento e referee
    const [events, refs] = await Promise.all([readCol("refereeEvents"), readCol("referees")]);
    const evtMap = Object.fromEntries(events.map(e => [e.id, e]));
    const refMap = Object.fromEntries(refs.map(r => [r.id, r]));
    items = items.map(a => ({ ...a, event: evtMap[a.eventId] || null, referee: refMap[a.refereeId] || null }));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("refereeAssignments",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("refereeAssignments",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("refereeAssignments",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("refereeAssignments",id); return ok(true); },
};

export const organizerAuthAPI = {
  login: async ({ email, password }) => {
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const profile = await readDoc("users", cred.user.uid);
      if (!profile || !hasRole(profile, "organizer")) { await signOut(auth); return err("Acesso restrito ao portal de organizadores."); }
      const org = await readDoc("organizers", profile.refId);
      if (!org) { await signOut(auth); return err("Conta não encontrada."); }
      const orgAtivo = org.status === "ativo" || org.active === true;
      const session = { organizerId: org.id, uid: cred.user.uid, email: org.email, name: org.name, loginAt: now(), active: orgAtivo, motivoDesativacao: org.motivoDesativacao || "", emailVerified: org.emailVerified || false };
      const { password: _, ...safe } = org;
      return ok({ session, organizer: safe });
    } catch (e) {
      if (["auth/invalid-credential","auth/wrong-password","auth/user-not-found"].includes(e.code)) return err("Credenciais inválidas.");
      return err(e.message);
    }
  },
  logout:            async () => { await signOut(auth); return ok(true); },
  check:             ()       => auth.currentUser ? { uid: auth.currentUser.uid } : null,
  getSession:        async () => {
    const u = auth.currentUser;
    if (!u) return null;
    try {
      const profile = await readDoc("users", u.uid);
      if (!profile || !hasRole(profile, "organizer")) return null;
      if (!profile.refId) return null;
      const org = await readDoc("organizers", profile.refId);
      if (!org) return null;
      const orgAtivo = org.status === "ativo" || org.active === true;
      return { organizerId: org.id, uid: u.uid, email: org.email, name: org.name, active: orgAtivo, motivoDesativacao: org.motivoDesativacao || "", emailVerified: org.emailVerified || false };
    } catch { return null; }
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
  register: async (data) => {
    // Duplicidade de e-mail é verificada pelo Firebase Auth (createUserWithEmailAndPassword)
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const { password: _pw, ...dataWithoutPassword } = data;
      // Gerar ID do organizer antecipadamente para incluir no users doc
      const orgId = generateId();
      // Criar users doc ANTES do organizers (para que as rules reconheçam o role)
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: data.email,
        roles: ["organizer"], name: data.name, refId: orgId, createdAt: now(),
      });
      const item = await createDoc("organizers", { ...dataWithoutPassword, id: orgId, status: "ativo", active: true });
      await signOut(auth);
      const { password: _, ...safe } = item;
      return ok(safe);
    } catch (e) {
      if (e.code === "auth/email-already-in-use") return err("Este e-mail já está cadastrado.");
      return err(e.message);
    }
  },
};

// ── Verificação de e-mail único ──────────────────────────────────────────────
export async function emailJaExisteOrganizador(email) {
  const all = await readCol("organizers");
  return all.some(o => o.email === email);
}

export async function emailJaExisteArbitro(email) {
  const all = await readCol("referees");
  return all.some(r => r.email === email);
}

export const organizersAPI = {
  list: async ({ status=null }={}) => {
    let items=await readCol("organizers");
    if (status) items=items.filter(o=>o.status===status);
    items.sort((a,b)=>a.name.localeCompare(b.name));
    return ok(items.map(({password,...safe})=>safe));
  },
  get: async (id) => {
    const item=await readDoc("organizers",id);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item; // strip legacy password if still present
    return ok(safe);
  },
  create: async (data) => {
    const all=await readCol("organizers");
    if (all.find(o=>o.email===data.email)) return err("E-mail já cadastrado.");
    const { password: _pw, ...dataWithoutPassword } = data;
    const item=await createDoc("organizers",dataWithoutPassword);
    return ok(item);
  },
  update: async (id,data) => {
    delete data.password; // NUNCA salvar senha no Firestore
    const item=await patchDoc("organizers",id,data);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item;
    return ok(safe);
  },
  delete:         async (id)      => { await removeDoc("organizers",id); return ok(true); },
  setActive:      async (id, active, motivo = "") => {
    const data = { active: !!active };
    if (!active) data.motivoDesativacao = motivo || "";
    else { data.motivoDesativacao = ""; }
    await patchDoc("organizers", id, data);
    return ok(true);
  },
  updatePassword: async (id, { currentPassword, newPassword }) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await fbUpdatePassword(u, newPassword);
      return ok(true);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") return err("Senha atual incorreta.");
      return err(e.message);
    }
  },
  updateEmail: async (id, newEmail, currentPassword) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      // Reautenticar
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      // Atualizar no Firebase Auth
      await fbUpdateEmail(u, newEmail);
      // Atualizar no Firestore — organizers
      await patchDoc("organizers", id, { email: newEmail });
      // Atualizar no Firestore — users
      const usersSnap = await getDocs(collection(db, "users"));
      const userDoc = usersSnap.docs.find(d => { const dt = d.data(); return dt.refId === id && hasRole(dt, "organizer"); });
      if (userDoc) await updateDoc(doc(db, "users", userDoc.id), { email: newEmail });
      return ok(true);
    } catch (e) {
      if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") return err("Senha incorreta.");
      if (e.code === "auth/email-already-in-use") return err("Este e-mail já está em uso por outra conta.");
      if (e.code === "auth/invalid-email") return err("E-mail inválido.");
      return err(e.message);
    }
  },
  updateProfile:  async (id,data) => {
    const item=await patchDoc("organizers",id,data);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item;
    return ok(safe);
  },
};

export const solicitacoesAPI = {
  list: async ({ organizerId=null, status=null }={}) => {
    let items=await readCol("solicitacoes");
    items=items.map(s=>({ ...s, status: s.status || "rascunho" }));
    if (organizerId) items=items.filter(s=>s.organizerId===organizerId);
    if (status)      items=items.filter(s=>s.status===status);
    items.sort((a,b)=>new Date(b.criadoEm||b.createdAt)-new Date(a.criadoEm||a.createdAt));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("solicitacoes",id); return item?ok({ ...item, status: item.status || "rascunho" }):err("Solicitação não encontrada."); },
  create: async (data)    => { const item=await createDoc("solicitacoes",{...data,criadoEm:now()}); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("solicitacoes",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("solicitacoes",id); return ok(true); },
  updateStatus: async (id,status,extra={}) => {
    const item=await patchDoc("solicitacoes",id,{status,...extra});
    return item?ok(item):err("Não encontrado.");
  },
  changeStatus: async (id, status, extra={}) => {
    const item=await patchDoc("solicitacoes",id,{status,...extra});
    return item?ok(item):err("Não encontrado.");
  },
  getStats: async () => {
    const items=await readCol("solicitacoes");
    return ok({
      total:     items.length,
      rascunho:  items.filter(s=>s.status==="rascunho").length,
      submetido: items.filter(s=>s.status==="submetido").length,
      analise:   items.filter(s=>s.status==="em_analise").length,
      aprovado:  items.filter(s=>s.status==="aprovado").length,
      rejeitado: items.filter(s=>s.status==="rejeitado").length,
    });
  },
  countByStatus: async () => {
    const items = await readCol("solicitacoes");
    const counts = {};
    items.forEach(s => { counts[s.status] = (counts[s.status] || 0) + 1; });
    return ok(counts);
  },
  vincularEvento: async (id, eventoId, eventoTitulo = "", status) => {
    const item = await patchDoc("solicitacoes", id, { eventoId, eventoTitulo: eventoTitulo || "", eventoVinculado: { id: eventoId, title: eventoTitulo || "" } });
    return item ? ok(item) : err("Não encontrado.");
  },
  desvincularEvento: async (id) => {
    const item = await patchDoc("solicitacoes", id, { eventoId: null, eventoTitulo: null, eventoVinculado: null });
    return item ? ok(item) : err("Não encontrado.");
  },
  importFromCalendar: async (solId, calendarEventId) => {
    const cal = await readDoc("calendar", calendarEventId);
    if (!cal) return err("Evento não encontrado.");
    const item = await patchDoc("solicitacoes", solId, { eventoId: calendarEventId, eventoTitulo: cal.title, eventoVinculado: cal });
    return item ? ok(item) : err("Não encontrado.");
  },
};

export const solicitacaoArquivosAPI = {
  listBySolicitacao: async (id) => {
    let items = await readCol("solicitacaoArquivos");
    items = items.filter(a => a.solicitacaoId === id);
    items.sort((a,b) => new Date(b.enviadoEm||b.createdAt) - new Date(a.enviadoEm||a.createdAt));
    return { data: items, error: null };
  },
  list: async ({ solicitacaoId }={}) => {
    let items=await readCol("solicitacaoArquivos");
    if (solicitacaoId) items=items.filter(a=>a.solicitacaoId===solicitacaoId);
    items.sort((a,b)=>new Date(b.enviadoEm||b.createdAt)-new Date(a.enviadoEm||a.createdAt));
    return ok(items);
  },
  get:    async (id)   => { const item=await readDoc("solicitacaoArquivos",id); return item?ok(item):err("Arquivo não encontrado."); },
  create: async (data) => { const item=await createDoc("solicitacaoArquivos",{...data,enviadoEm:now()}); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("solicitacaoArquivos",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)   => { await removeDoc("solicitacaoArquivos",id); return ok(true); },
};

export const pagamentosAPI = {
  listBySolicitacao: async (solId) => {
    let items = await readCol("pagamentos");
    items = items.filter(p => p.solicitacaoId === solId);
    items.sort((a, b) => new Date(a.criadoEm || a.createdAt) - new Date(b.criadoEm || b.createdAt));
    return ok(items);
  },
  list: async (filtros = {}) => {
    let items = await readCol("pagamentos");
    if (filtros.organizerId) items = items.filter(p => p.organizerId === filtros.organizerId);
    if (filtros.status) items = items.filter(p => p.status === filtros.status);
    items.sort((a, b) => new Date(b.criadoEm || b.createdAt) - new Date(a.criadoEm || a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("pagamentos", id); return item ? ok(item) : err("Pagamento nao encontrado."); },
  create: async (data) => { const item = await createDoc("pagamentos", { ...data, criadoEm: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("pagamentos", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("pagamentos", id); return ok(true); },
  deleteBySolicitacao: async (solId) => {
    const items = await readCol("pagamentos");
    await Promise.all(items.filter(p => p.solicitacaoId === solId).map(p => removeDoc("pagamentos", p.id)));
    return ok(true);
  },
};

// ─── Envio de Documentos ────────────────────────────────────────────────────
export const envioDocumentosAPI = {
  list: async () => {
    let items = await readCol("envioDocumentos");
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("envioDocumentos", id); return item ? ok(item) : err("Nao encontrado."); },
  create: async (data) => { const item = await createDoc("envioDocumentos", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("envioDocumentos", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("envioDocumentos", id); return ok(true); },
  listByReferee: async (refereeId, nivel) => {
    let items = await readCol("envioDocumentos");
    items = items.filter(d => {
      if (d.destinatariosTipo === "todos") return true;
      if (d.destinatariosTipo === "nivel") return (d.destinatariosNiveis || []).includes(nivel);
      if (d.destinatariosTipo === "individual") return (d.destinatariosIds || []).includes(refereeId);
      return false;
    });
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  listEnviados: async (remetenteId) => {
    let items = await readCol("envioDocumentos");
    items = items.filter(d => d.remetenteId === remetenteId);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  marcarLido: async (docId, refereeId, nome) => {
    const item = await readDoc("envioDocumentos", docId);
    if (!item) return err("Nao encontrado.");
    const leituras = { ...item.leituras, [refereeId]: { lidoEm: now(), nome } };
    await patchDoc("envioDocumentos", docId, { leituras });
    return ok(true);
  },
};

// ─── Relatórios de Arbitragem ────────────────────────────────────────────────
export const relatoriosAPI = {
  list: async (filtros = {}) => {
    let items = await readCol("relatoriosArbitragem");
    if (filtros.refereeId) items = items.filter(r => r.refereeId === filtros.refereeId);
    if (filtros.eventId) items = items.filter(r => r.eventId === filtros.eventId);
    if (filtros.status) items = items.filter(r => r.status === filtros.status);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("relatoriosArbitragem", id); return item ? ok(item) : err("Nao encontrado."); },
  getByAssignment: async (assignmentId) => {
    const items = await readCol("relatoriosArbitragem");
    return ok(items.find(r => r.assignmentId === assignmentId) || null);
  },
  create: async (data) => { const item = await createDoc("relatoriosArbitragem", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("relatoriosArbitragem", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("relatoriosArbitragem", id); return ok(true); },
};

// ─── Reembolsos ─────────────────────────────────────────────────────────────
export const reembolsosAPI = {
  list: async (filtros = {}) => {
    let items = await readCol("reembolsos");
    if (filtros.refereeId) items = items.filter(r => r.refereeId === filtros.refereeId);
    if (filtros.assignmentId) items = items.filter(r => r.assignmentId === filtros.assignmentId);
    if (filtros.status) items = items.filter(r => r.status === filtros.status);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("reembolsos", id); return item ? ok(item) : err("Nao encontrado."); },
  create: async (data) => { const item = await createDoc("reembolsos", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("reembolsos", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("reembolsos", id); return ok(true); },
};

// ─── Diárias de Arbitragem ───────────────────────────────────────────────────
export const diariasAPI = {
  list: async (filtros = {}) => {
    let items = await readCol("diarias");
    if (filtros.refereeId) items = items.filter(d => d.refereeId === filtros.refereeId);
    if (filtros.eventId) items = items.filter(d => d.eventId === filtros.eventId);
    if (filtros.status) items = items.filter(d => d.status === filtros.status);
    items.sort((a, b) => new Date(b.eventDate || b.createdAt) - new Date(a.eventDate || a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("diarias", id); return item ? ok(item) : err("Nao encontrada."); },
  create: async (data) => { const item = await createDoc("diarias", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("diarias", id, data); return item ? ok(item) : err("Nao encontrada."); },
  delete: async (id) => { await removeDoc("diarias", id); return ok(true); },
};

// ─── Mural de Avisos ────────────────────────────────────────────────────────
export const muralAvisosAPI = {
  list: async ({ apenasAtivos = false } = {}) => {
    let items = await readCol("muralAvisos");
    if (apenasAtivos) items = items.filter(a => a.ativo);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("muralAvisos", id); return item ? ok(item) : err("Nao encontrado."); },
  create: async (data) => { const item = await createDoc("muralAvisos", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("muralAvisos", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("muralAvisos", id); return ok(true); },
};

// ─── Avaliações de Árbitros ──────────────────────────────────────────────────
export const avaliacoesAPI = {
  list: async (filtros = {}) => {
    let items = await readCol("avaliacoes");
    if (filtros.refereeId) items = items.filter(a => a.refereeId === filtros.refereeId);
    if (filtros.eventId) items = items.filter(a => a.eventId === filtros.eventId);
    if (filtros.assignmentId) items = items.filter(a => a.assignmentId === filtros.assignmentId);
    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("avaliacoes", id); return item ? ok(item) : err("Nao encontrada."); },
  create: async (data) => { const item = await createDoc("avaliacoes", { ...data, createdAt: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("avaliacoes", id, data); return item ? ok(item) : err("Nao encontrada."); },
  delete: async (id) => { await removeDoc("avaliacoes", id); return ok(true); },
};

// ─── Anuidades ──────────────────────────────────────────────────────────────
export const anuidadesAPI = {
  list: async (filtros = {}) => {
    let items = await readCol("anuidades");
    if (filtros.ano) items = items.filter(a => a.ano === filtros.ano);
    if (filtros.refereeId) items = items.filter(a => a.refereeId === filtros.refereeId);
    if (filtros.status) items = items.filter(a => a.status === filtros.status);
    items.sort((a, b) => (a.refereeName || "").localeCompare(b.refereeName || ""));
    return ok(items);
  },
  get: async (id) => { const item = await readDoc("anuidades", id); return item ? ok(item) : err("Anuidade nao encontrada."); },
  getByRefereeAno: async (refereeId, ano) => {
    const items = await readCol("anuidades");
    const found = items.find(a => a.refereeId === refereeId && a.ano === ano);
    return ok(found || null);
  },
  create: async (data) => { const item = await createDoc("anuidades", { ...data, criadoEm: now() }); return ok(item); },
  update: async (id, data) => { const item = await patchDoc("anuidades", id, data); return item ? ok(item) : err("Nao encontrado."); },
  delete: async (id) => { await removeDoc("anuidades", id); return ok(true); },
};

export const movimentacoesAPI = {
  listBySolicitacao: async (id, opts={}) => {
    let items = await readCol("movimentacoes");
    items = items.filter(m => m.solicitacaoId === id);
    if (opts.visivel !== undefined && opts.visivel !== null) items = items.filter(m => m.visivel === opts.visivel);
    items.sort((a,b) => new Date(a.criadoEm||a.createdAt) - new Date(b.criadoEm||b.createdAt));
    return { data: items, error: null };
  },
  registrar: async (data) => {
    const item = await createDoc("movimentacoes", { ...data, criadoEm: now() });
    return { data: item, error: null };
  },
  list: async ({ solicitacaoId, visivel=null }={}) => {
    let items=await readCol("movimentacoes");
    if (solicitacaoId)   items=items.filter(m=>m.solicitacaoId===solicitacaoId);
    if (visivel!==null)  items=items.filter(m=>m.visivel===visivel);
    items.sort((a,b)=>new Date(a.criadoEm||a.createdAt)-new Date(b.criadoEm||b.createdAt));
    return ok(items);
  },
  create: async (data) => { const item=await createDoc("movimentacoes",{...data,criadoEm:now()}); return ok(item); },
  delete: async (id) => { await removeDoc("movimentacoes",id); return ok(true); },
  deleteBySolicitacao: async (solId) => {
    const items = await readCol("movimentacoes");
    await Promise.all(items.filter(m => m.solicitacaoId === solId).map(m => removeDoc("movimentacoes", m.id)));
    return ok(true);
  },
};

export const resultadosAPI = {
  list: async ({ publishedOnly=true, categoria=null, ano=null }={}) => {
    let items=await readCol("resultados");
    if (publishedOnly) items=items.filter(r=>r.published);
    if (categoria)     items=items.filter(r=>r.categoria===categoria);
    if (ano)           items=items.filter(r=>String(r.anoCompetitivo)===String(ano));
    items.sort((a,b)=>new Date(b.dataEvento||b.createdAt)-new Date(a.dataEvento||a.createdAt));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("resultados",id); return item?ok(item):err("Não encontrado."); },
  create: async (data)    => { const item=await createDoc("resultados",data); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("resultados",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("resultados",id); return ok(true); },
  getAnos: async (categoria=null) => {
    let items=await readCol("resultados");
    if (categoria) items=items.filter(r=>r.categoria===categoria);
    return ok([...new Set(items.map(r=>r.anoCompetitivo).filter(Boolean))].sort((a,b)=>b-a));
  },
  getCidades: async (categoria=null) => {
    let items=await readCol("resultados");
    if (categoria) items=items.filter(r=>r.categoria===categoria);
    return ok([...new Set(items.map(r=>r.cidade).filter(Boolean))].sort());
  },
};

export const equipesAPI = {
  list: async ({ publishedOnly=true, busca=null }={}) => {
    let items=await readCol("equipes");
    if (publishedOnly) items=items.filter(e=>e.published);
    if (busca){const q=busca.toLowerCase();items=items.filter(e=>e.title.toLowerCase().includes(q)||(e.cidade||"").toLowerCase().includes(q)||(e.excerpt||"").toLowerCase().includes(q));}
    items.sort((a,b)=>(a.order||0)-(b.order||0));
    return ok(items);
  },
  get: async (idOrSlug) => {
    let item=await readDoc("equipes",idOrSlug);
    if (!item){const all=await readCol("equipes");item=all.find(e=>e.slug===idOrSlug)||null;}
    return item?ok(item):err("Equipe não encontrada.");
  },
  create: async (data) => {
    const all=await readCol("equipes");
    const maxOrder=all.reduce((m,e)=>Math.max(m,e.order||0),0);
    const item=await createDoc("equipes",{...data,order:data.order||maxOrder+1});
    return ok(item);
  },
  update: async (id,data) => { const item=await patchDoc("equipes",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("equipes",id); return ok(true); },
};
