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
  EmailAuthProvider, reauthenticateWithCredential, onAuthStateChanged,
} from "firebase/auth";

import { db, auth } from "../firebase";
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

function ok(data)  { return { data, error: null }; }
function err(msg)  { return { data: null, error: msg }; }
function generateId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function now() { return new Date().toISOString(); }

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

export async function initializeData() {
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
    seedSingleDoc("config", "adminUser",      SEED_ADMIN_USER),
    seedSingleDoc("config", "footerConfig",   SEED_FOOTER_CONFIG),
    seedSingleDoc("config", "athleteContent", Array.isArray(SEED_ATHLETE_CONTENT) ? { items: SEED_ATHLETE_CONTENT } : SEED_ATHLETE_CONTENT),
    seedSingleDoc("config", "refereeContent", Array.isArray(SEED_REFEREE_CONTENT) ? { items: SEED_REFEREE_CONTENT } : SEED_REFEREE_CONTENT),
  ]);
  await seedAuthUser(SEED_ADMIN_USER.email, SEED_ADMIN_USER.password, { role: "admin", name: SEED_ADMIN_USER.name, refId: SEED_ADMIN_USER.id });
  for (const r of SEED_REFEREES) await seedAuthUser(r.email, r.password, { role: "referee", name: r.name, refId: r.id });
  for (const o of SEED_ORGANIZERS) await seedAuthUser(o.email, o.password, { role: "organizer", name: o.name, refId: o.id });
}

export const authAPI = {
  login: async ({ email, password }) => {
    try {
      const cred    = await signInWithEmailAndPassword(auth, email, password);
      const profile = await readDoc("users", cred.user.uid);
      if (!profile) return err("Perfil não encontrado.");
      if (profile.role !== "admin") { await signOut(auth); return err("Acesso restrito ao painel admin."); }
      return ok({ user: { id: profile.refId, uid: cred.user.uid, name: profile.name, email: profile.email, role: profile.role } });
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
    return profile ? { id: profile.refId, uid: u.uid, name: profile.name, email: profile.email, role: profile.role } : null;
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
  updatePassword: async (currentPassword, newPassword) => {
    const u = auth.currentUser;
    if (!u) return err("Não autenticado.");
    try {
      const cred = EmailAuthProvider.credential(u.email, currentPassword);
      await reauthenticateWithCredential(u, cred);
      await fbUpdatePassword(u, newPassword);
      return ok(true);
    } catch (e) { return err(e.message); }
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
      if (!profile || profile.role !== "referee") { await signOut(auth); return err("Acesso restrito à intranet de árbitros."); }
      const referee = await readDoc("referees", profile.refId);
      if (!referee || referee.status !== "ativo") { await signOut(auth); return err("Árbitro inativo ou não encontrado."); }
      const session = { refereeId: referee.id, uid: cred.user.uid, email: referee.email, name: referee.name, role: referee.role, loginAt: now() };
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
    if (!profile || profile.role !== "referee") return null;
    const referee = await readDoc("referees", profile.refId);
    if (!referee) return null;
    return { refereeId: referee.id, uid: u.uid, email: referee.email, name: referee.name, role: referee.role };
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
};

export const refereesAPI = {
  list: async ({ status=null, category=null }={}) => {
    let items=await readCol("referees");
    if (status)   items=items.filter(r=>r.status===status);
    if (category) items=items.filter(r=>r.category===category);
    items.sort((a,b)=>a.name.localeCompare(b.name));
    return ok(items.map(({password,...safe})=>safe));
  },
  get: async (id,{includePassword=false}={}) => {
    const item=await readDoc("referees",id);
    if (!item) return err("Árbitro não encontrado.");
    if (!includePassword){const {password,...safe}=item;return ok(safe);}
    return ok(item);
  },
  create: async (data) => {
    const all=await readCol("referees");
    if (all.find(r=>r.email===data.email)) return err("E-mail já cadastrado.");
    const item=await createDoc("referees",data);
    const {password,...safe}=item;
    return ok(safe);
  },
  update: async (id,data) => {
    if (!data.password) delete data.password;
    const item=await patchDoc("referees",id,data);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item;
    return ok(safe);
  },
  delete:         async (id)      => { await removeDoc("referees",id); return ok(true); },
  updatePassword: async (id,pass) => { await patchDoc("referees",id,{password:pass}); return ok(true); },
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
};

export const refereeAssignmentsAPI = {
  list: async ({ refereeId=null, eventId=null, status=null }={}) => {
    let items=await readCol("refereeAssignments");
    if (refereeId) items=items.filter(a=>a.refereeId===refereeId);
    if (eventId)   items=items.filter(a=>a.eventId===eventId);
    if (status)    items=items.filter(a=>a.status===status);
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
      if (!profile || profile.role !== "organizer") { await signOut(auth); return err("Acesso restrito ao portal de organizadores."); }
      const org = await readDoc("organizers", profile.refId);
      if (!org || org.status !== "ativo") { await signOut(auth); return err("Conta inativa ou não encontrada."); }
      const session = { organizerId: org.id, uid: cred.user.uid, email: org.email, name: org.name, loginAt: now() };
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
    const profile = await readDoc("users", u.uid);
    if (!profile || profile.role !== "organizer") return null;
    const org = await readDoc("organizers", profile.refId);
    if (!org) return null;
    return { organizerId: org.id, uid: u.uid, email: org.email, name: org.name };
  },
  onAuthStateChange: (callback) => onAuthStateChanged(auth, callback),
  register: async (data) => {
    const all = await readCol("organizers");
    if (all.find(o => o.email === data.email)) return err("E-mail já cadastrado.");
    // Cria conta no Firebase Auth
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const item = await createDoc("organizers", { ...data, status: "pendente" });
      await setDoc(doc(db, "users", cred.user.uid), {
        uid: cred.user.uid, email: data.email,
        role: "organizer", name: data.name, refId: item.id, createdAt: now(),
      });
      await signOut(auth);
      const { password: _, ...safe } = item;
      return ok(safe);
    } catch (e) { return err(e.message); }
  },
};

export const organizersAPI = {
  list: async ({ status=null }={}) => {
    let items=await readCol("organizers");
    if (status) items=items.filter(o=>o.status===status);
    items.sort((a,b)=>a.name.localeCompare(b.name));
    return ok(items.map(({password,...safe})=>safe));
  },
  get: async (id,{includePassword=false}={}) => {
    const item=await readDoc("organizers",id);
    if (!item) return err("Não encontrado.");
    if (!includePassword){const {password,...safe}=item;return ok(safe);}
    return ok(item);
  },
  create: async (data) => {
    const all=await readCol("organizers");
    if (all.find(o=>o.email===data.email)) return err("E-mail já cadastrado.");
    const item=await createDoc("organizers",data);
    const {password:_,...safe}=item;
    return ok(safe);
  },
  update: async (id,data) => {
    if (!data.password) delete data.password;
    const item=await patchDoc("organizers",id,data);
    if (!item) return err("Não encontrado.");
    const {password,...safe}=item;
    return ok(safe);
  },
  delete:         async (id)      => { await removeDoc("organizers",id); return ok(true); },
  updatePassword: async (id,pass) => { await patchDoc("organizers",id,{password:pass}); return ok(true); },
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
    if (organizerId) items=items.filter(s=>s.organizerId===organizerId);
    if (status)      items=items.filter(s=>s.status===status);
    items.sort((a,b)=>new Date(b.criadoEm||b.createdAt)-new Date(a.criadoEm||a.createdAt));
    return ok(items);
  },
  get:    async (id)      => { const item=await readDoc("solicitacoes",id); return item?ok(item):err("Solicitação não encontrada."); },
  create: async (data)    => { const item=await createDoc("solicitacoes",{...data,criadoEm:now()}); return ok(item); },
  update: async (id,data) => { const item=await patchDoc("solicitacoes",id,data); return item?ok(item):err("Não encontrado."); },
  delete: async (id)      => { await removeDoc("solicitacoes",id); return ok(true); },
  updateStatus: async (id,status,extra={}) => {
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
};

export const solicitacaoArquivosAPI = {
  list: async ({ solicitacaoId }={}) => {
    let items=await readCol("solicitacaoArquivos");
    if (solicitacaoId) items=items.filter(a=>a.solicitacaoId===solicitacaoId);
    items.sort((a,b)=>new Date(b.enviadoEm||b.createdAt)-new Date(a.enviadoEm||a.createdAt));
    return ok(items);
  },
  create: async (data) => { const item=await createDoc("solicitacaoArquivos",{...data,enviadoEm:now()}); return ok(item); },
  delete: async (id)   => { await removeDoc("solicitacaoArquivos",id); return ok(true); },
};

export const movimentacoesAPI = {
  list: async ({ solicitacaoId, visivel=null }={}) => {
    let items=await readCol("movimentacoes");
    if (solicitacaoId)   items=items.filter(m=>m.solicitacaoId===solicitacaoId);
    if (visivel!==null)  items=items.filter(m=>m.visivel===visivel);
    items.sort((a,b)=>new Date(a.criadoEm||a.createdAt)-new Date(b.criadoEm||b.createdAt));
    return ok(items);
  },
  create: async (data) => { const item=await createDoc("movimentacoes",{...data,criadoEm:now()}); return ok(item); },
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
