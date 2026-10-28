/**
 * Student Team Mongolia (STM) — Google Apps Script backend.
 *
 * Гурван тал:
 *   Админ (admin.html)      — Script properties-д нууц үгтэй. Төсөл, сонголт, ажилчид, сургалт, гэрээ, цалин.
 *   Захиалагч (company.html) — имэйл + нууц үг. Гэрээ зурах, өнөөдрийн баг, ирцийн QR, үнэлгээ, захиалгын хүсэлт.
 *   Оюутан (index.html)     — утас + нууц үг. Зар, өдөр сонгох, баталгаажуулах, ирц, цалин, сургалт, мессеж.
 *
 * Энэ файлтай хамт Logic.gs (= ../logic.js) байх ёстой.
 *
 * Script properties (Project Settings → Script properties):
 *   <нэвтрэх нэр>  заавал. Property-ийн нэр = админы нэвтрэх нэр, утга = нууц үг. Хамгийн ихдээ 4 админ.
 *   ADMIN_URL      сонголттой. Мэдэгдэл имэйлд оруулах админ линк.
 *   SITE_URL       сонголттой. Сайтын үндсэн хаяг, жишээ нь https://ТАНЫ-НЭР.github.io/tsagiin-ajil/
 */

// Script нь Sheet-ээс тусдаа (script.google.com дээр) үүссэн бол Sheet-ийн ID-г энд тавина.
// Sheet-ийн Extensions → Apps Script-ээр үүсгэсэн бол хоосон үлдээнэ.
const SPREADSHEET_ID = '1UnM0vId0e1R1_pNm5zY1L_NJQB3C4xItt15kzBZ_qBg';
const TZ = 'Asia/Ulaanbaatar';
const DEFAULT_SITE_URL = 'https://binzo9.github.io/tsagiin-ajil/';

/* ===================== Хүснэгтүүд ===================== */
// Шинэ багана зөвхөн ТӨГСГӨЛД нэмнэ. Дарааллыг бүү өөрчил.
function T_(key, name, cols, o) {
  o = o || {};
  return { key: key, name: name, cols: cols, keys: cols.map(c => c[0]), json: o.json || [], bool: o.bool || [], num: o.num || [], ts: o.ts || [], day: o.day || [], time: o.time || [] };
}
const COMPANIES = T_('co', 'Байгууллагууд', [
  ['id', 'id'], ['createdAt', 'Бүртгүүлсэн'], ['status', 'Төлөв'], ['org', 'Байгууллага'],
  ['contactName', 'Холбогдох хүн'], ['phone', 'Утас'], ['email', 'Имэйл'],
  ['salt', 'salt'], ['hash', 'hash'], ['lastLogin', 'Сүүлд нэвтэрсэн'],
  ['alias', 'Оюутанд харагдах нэр'], ['staff', 'Ажилтны тоо']
], { ts: ['createdAt', 'lastLogin'], num: ['staff'] });
const WORKERS = T_('wk', 'Оюутнууд', [
  ['id', 'id'], ['createdAt', 'Бүртгүүлсэн'], ['status', 'Төлөв'], ['lastName', 'Овог'], ['firstName', 'Нэр'],
  ['phone', 'Утас'], ['email', 'Имэйл'], ['birth', 'Төрсөн огноо'], ['school', 'Сургууль'], ['major', 'Мэргэжил, курс'],
  ['days', 'Сул өдөр'], ['shifts', 'Сул цаг'], ['health', 'Цагаан хуудас дуусах'], ['license', 'Жолооны үнэмлэх'],
  ['lang', 'Гадаад хэл'], ['signedAt', 'Ерөнхий гэрээ'], ['tests', 'Тест'], ['note', 'Тэмдэглэл'],
  ['salt', 'salt'], ['hash', 'hash'], ['lastLogin', 'Сүүлд нэвтэрсэн']
], { ts: ['createdAt', 'signedAt', 'lastLogin'], day: ['birth', 'health'], bool: ['license'], json: ['tests'] });
const PROJECTS = T_('pr', 'Төслүүд', [
  ['id', 'id'], ['createdAt', 'Үүсгэсэн'], ['no', 'Дугаар'], ['clientId', 'Захиалагчийн id'], ['clientName', 'Захиалагч'],
  ['title', 'Ажлын нэр'], ['cat', 'Ангилал'], ['place', 'Хаяг'], ['area', 'Дүүрэг'], ['from', 'Эхлэх'], ['to', 'Дуусах'],
  ['start', 'Эхлэх цаг'], ['end', 'Дуусах цаг'], ['need', 'Өдөрт хүн'], ['rate', 'Цагийн хөлс'], ['req', 'Шаардлага'],
  ['transport', 'Тээвэр'], ['letterNo', 'Албан бичиг №'], ['letterDate', 'Албан бичгийн огноо'],
  ['contractStatus', 'Гэрээ'], ['sentAt', 'Гэрээ илгээсэн'], ['signedAt', 'Гэрээ зурсан'], ['signer', 'Гарын үсэг зурсан'],
  ['paidUntil', 'Төлсөн (өдөр хүртэл)'], ['requestId', 'Хүсэлтийн id'], ['createdBy', 'Үүсгэсэн админ']
], { ts: ['createdAt'], day: ['from', 'to', 'letterDate', 'sentAt', 'signedAt', 'paidUntil'], time: ['start', 'end'], num: ['need', 'rate'], json: ['req'] });
const DAYT = T_('dy', 'Өдрүүд', [
  ['id', 'id'], ['projectId', 'Төслийн id'], ['n', '№'], ['date', 'Огноо'], ['status', 'Төлөв'], ['doneAt', 'Дууссан']
], { num: ['n'], day: ['date'], ts: ['doneAt'] });
const REGS = T_('rg', 'Ээлжийн бүртгэл', [
  ['id', 'id'], ['dayId', 'Өдрийн id'], ['workerId', 'Оюутны id'], ['workerName', 'Оюутан'], ['date', 'Огноо'],
  ['status', 'Төлөв'], ['createdAt', 'Бүртгүүлсэн'], ['selectedAt', 'Сонгогдсон'], ['confirmedAt', 'Баталгаажуулсан'],
  ['checkIn', 'Ирсэн'], ['checkOut', 'Явсан'], ['noshow', 'Ирээгүй'], ['rated', 'Үнэлгээ'], ['home', 'Гэртээ хүрсэн'],
  ['paidAt', 'Цалин олгосон']
], { day: ['date'], ts: ['createdAt', 'selectedAt', 'confirmedAt', 'paidAt'], time: ['checkIn', 'checkOut'], bool: ['noshow', 'home'], num: ['rated'] });
const TRAININGS = T_('tr', 'Сургалт', [
  ['id', 'Захиалагчийн id'], ['clientName', 'Захиалагч'], ['title', 'Гарчиг'], ['video', 'Видео'], ['mins', 'Минут'],
  ['pass', 'Тэнцэх %'], ['steps', 'Алхмууд'], ['qs', 'Асуултууд'], ['updatedAt', 'Зассан']
], { num: ['mins', 'pass'], json: ['steps', 'qs'], ts: ['updatedAt'] });
const MSGS = T_('ms', 'Мессеж', [
  ['id', 'id'], ['at', 'Огноо'], ['workerId', 'Оюутны id'], ['from', 'Хэнээс'], ['text', 'Мессеж'], ['readW', 'Оюутан уншсан'], ['readA', 'Админ уншсан']
], { ts: ['at'], bool: ['readW', 'readA'] });
const ALERTS = T_('al', 'Яаралтай', [
  ['id', 'id'], ['at', 'Огноо'], ['kind', 'Төрөл'], ['workerId', 'Оюутны id'], ['dayId', 'Өдрийн id'],
  ['lat', 'Өргөрөг'], ['lng', 'Уртраг'], ['resolvedAt', 'Шийдсэн'], ['resolvedBy', 'Шийдсэн админ']
], { ts: ['at', 'resolvedAt'] });
const REQUESTS = T_('rq', 'Захиалгын хүсэлт', [
  ['id', 'id'], ['createdAt', 'Илгээсэн'], ['status', 'Төлөв'], ['companyId', 'Байгууллагын id'], ['org', 'Байгууллага'],
  ['title', 'Ажлын нэр'], ['cat', 'Ангилал'], ['area', 'Дүүрэг'], ['place', 'Хаяг'], ['from', 'Эхлэх'], ['to', 'Дуусах'],
  ['start', 'Эхлэх цаг'], ['end', 'Дуусах цаг'], ['need', 'Өдөрт хүн'], ['rate', 'Цагийн хөлс'], ['req', 'Шаардлага'],
  ['transport', 'Тээвэр'], ['letterNo', 'Албан бичиг №'], ['letterDate', 'Албан бичгийн огноо'], ['note', 'Тайлбар'], ['projectId', 'Төслийн id']
], { ts: ['createdAt'], day: ['from', 'to', 'letterDate'], time: ['start', 'end'], num: ['need', 'rate'], json: ['req'] });
const TABLES = [COMPANIES, WORKERS, PROJECTS, DAYT, REGS, TRAININGS, MSGS, ALERTS, REQUESTS];

const COMPANY_STATUSES = { unverified: 'Баталгаажаагүй', active: 'Идэвхтэй', blocked: 'Хаагдсан' };
const TOKEN_DAYS = 30;
const MAX_ADMINS = 4;
const HASH_ROUNDS = 300;
const CODE_MINUTES = 15;
const MAX_REGS_PER_HOUR = 40;
const RESERVED = ['NOTIFY_EMAIL', 'ADMIN_URL', 'SITE_URL', 'TOKEN_SECRET', 'JOB', 'CONFIG', 'STM'];

/** Нэг удаа ажиллуулна: хүснэгтүүд үүсгээд эрх зөвшөөрүүлнэ. */
function setup() {
  TABLES.forEach(t => table_(t));
  hideCols_(COMPANIES, ['salt', 'hash']);
  hideCols_(WORKERS, ['salt', 'hash', 'tests']);
  if (!admins_().length) {
    throw new Error('Project Settings → Script properties хэсэгт админ нэмнэ үү: Property = нэвтрэх нэр, Value = нууц үг.');
  }
  sign_(0, admins_()[0]);
  MailApp.getRemainingDailyQuota();
  Logger.log('Бэлэн. Одоо Deploy → New deployment → Web app хийнэ үү.');
}

function hideCols_(t, keys) {
  const sh = table_(t);
  keys.forEach(k => sh.hideColumns(t.keys.indexOf(k) + 1));
}

function doGet() {
  return out_({ ok: true, app: 'STM', today: today_() });
}

function doPost(e) {
  try {
    const p = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    return out_(route_(p));
  } catch (err) {
    console.error(err);
    return out_({ ok: false, code: err.code || 'error', error: err.code ? err.message : 'Серверийн алдаа: ' + err.message });
  }
}

function route_(p) {
  switch (p.action) {
    // нээлттэй
    case 'login': return login_(p.user, p.password);
    case 'cRegister': return cRegister_(p.data || {});
    case 'cVerify': return cVerify_(p.email, p.code);
    case 'cLogin': return cLogin_(p.email, p.password);
    case 'cForgot': return cForgot_(p.email);
    case 'cReset': return cReset_(p.email, p.code, p.password);
    case 'sRegister': return sRegister_(p.data || {});
    case 'sLogin': return sLogin_(p.phone, p.password);
    case 'sForgot': return sForgot_(p.phone);
    case 'sReset': return sReset_(p.phone, p.code, p.password);
  }
  const tok = String(p.token || '');
  if (tok.indexOf('c.') === 0) return clientAction_(p);
  if (tok.indexOf('s.') === 0) return studentAction_(p);
  return adminAction_(p);
}

/* ===================== Хүснэгттэй ажиллах ===================== */

let SS_ = null, SS_TZ_ = null;
function ss_() {
  if (!SS_) SS_ = SPREADSHEET_ID ? SpreadsheetApp.openById(SPREADSHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  return SS_;
}
function ssTz_() {
  if (!SS_TZ_) SS_TZ_ = ss_().getSpreadsheetTimeZone() || TZ;
  return SS_TZ_;
}

function table_(t) {
  const ss = ss_();
  let sh = ss.getSheetByName(t.name);
  if (!sh) {
    sh = ss.insertSheet(t.name);
    sh.appendRow(t.cols.map(c => c[1]));
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, t.cols.length).setFontWeight('bold');
    sh.hideColumns(1);
  } else if (sh.getLastColumn() < t.cols.length) {
    const from = sh.getLastColumn() + 1;
    sh.getRange(1, from, 1, t.cols.length - from + 1)
      .setValues([t.cols.slice(from - 1).map(c => c[1])]).setFontWeight('bold');
  }
  return sh;
}

function parse_(r, t) {
  const o = {};
  t.keys.forEach((k, i) => {
    let v = r[i];
    if (v === null || v === undefined) v = '';
    if (t.ts.indexOf(k) >= 0) {
      o[k] = v instanceof Date ? v.getTime() : (v === '' ? '' : (Number(v) || Date.parse(v) || ''));
    } else if (t.day.indexOf(k) >= 0) {
      o[k] = v instanceof Date ? Utilities.formatDate(v, TZ, 'yyyy-MM-dd') : String(v).trim();
    } else if (t.time.indexOf(k) >= 0) {
      o[k] = v instanceof Date ? Utilities.formatDate(v, ssTz_(), 'HH:mm') : String(v).trim();
    } else if (t.json.indexOf(k) >= 0) {
      try { o[k] = v === '' ? null : JSON.parse(v); } catch (e) { o[k] = null; }
    } else if (t.bool.indexOf(k) >= 0) {
      o[k] = v === true || v === 1 || v === 'Тийм' || v === 'TRUE' || v === 'true';
    } else if (t.num.indexOf(k) >= 0) {
      o[k] = v === '' ? '' : Number(v) || 0;
    } else {
      o[k] = String(v);
    }
  });
  return o;
}

function serialize_(o, t) {
  return t.keys.map(k => {
    let v = o[k];
    if (v === null || v === undefined) v = '';
    if (t.ts.indexOf(k) >= 0) return v === '' ? '' : new Date(Number(v));
    if (t.json.indexOf(k) >= 0) return v === '' ? '' : text_(JSON.stringify(v));
    if (t.bool.indexOf(k) >= 0) return v ? 'Тийм' : '';
    if (t.num.indexOf(k) >= 0) return v === '' ? '' : Number(v);
    return text_(String(v));
  });
}

function load_(t) {
  const sh = table_(t), n = sh.getLastRow() - 1;
  const raw = n > 0 ? sh.getRange(2, 1, n, t.keys.length).getValues() : [];
  const rows = raw.map(r => parse_(r, t)).filter(r => r.id);
  return { t: t, sh: sh, rows: rows, n0: raw.length, dirty: false, added: [] };
}

function add_(tb, o) {
  tb.rows.push(o);
  tb.added.push(o);
  return o;
}

function save_(tb) {
  const t = tb.t, w = t.keys.length;
  if (tb.dirty) {
    const vals = tb.rows.map(r => serialize_(r, t));
    if (vals.length) tb.sh.getRange(2, 1, vals.length, w).setValues(vals);
    if (tb.n0 > vals.length) tb.sh.getRange(2 + vals.length, 1, tb.n0 - vals.length, w).clearContent();
  } else if (tb.added.length) {
    const vals = tb.added.map(r => serialize_(r, t));
    tb.sh.getRange(tb.sh.getLastRow() + 1, 1, vals.length, w).setValues(vals);
  }
  tb.dirty = false;
  tb.added = [];
}

function ctx_() {
  const c = {};
  TABLES.forEach(t => { c[t.key] = load_(t); });
  return c;
}

function saveCtx_(c) {
  TABLES.forEach(t => save_(c[t.key]));
}

// Скриптийн түгжээ дор ачаалж, өөрчилж, хадгална.
function mutate_(fn) {
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    const c = ctx_();
    S = state_(c);
    const r = fn(c);
    saveCtx_(c);
    return r;
  } finally {
    lock.releaseLock();
  }
}

function read_(fn) {
  const c = ctx_();
  S = state_(c);
  return fn(c);
}

function byId_(tb, id) {
  for (let i = 0; i < tb.rows.length; i++) if (tb.rows[i].id === String(id)) return tb.rows[i];
  return null;
}

function uid_() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 10);
}

/* ===================== Төлөв (S) бүтээх ===================== */

function today_() { return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd'); }
function hm_() { return Utilities.formatDate(new Date(), TZ, 'HH:mm'); }
function fmtTs_(ms) { return ms ? Utilities.formatDate(new Date(Number(ms)), TZ, 'yyyy-MM-dd HH:mm') : ''; }
function dayOf_(ms) { return ms ? Utilities.formatDate(new Date(Number(ms)), TZ, 'yyyy-MM-dd') : ''; }

function settings_() {
  let s = {};
  try { s = JSON.parse(props_().getProperty('STM') || '{}'); } catch (e) {}
  return Object.assign({}, DEFAULT_SETTINGS, s);
}

function listIdx_(text, names) {
  return String(text || '').split(/\s*,\s*/).map(x => names.indexOf(x)).filter(i => i >= 0).sort();
}

function state_(c) {
  const today = today_();
  const settings = settings_();
  const clients = c.co.rows.map(r => ({
    id: r.id, name: r.org, alias: r.alias, staff: Number(r.staff) || 0, email: r.email, phone: r.phone,
    contactName: r.contactName, status: r.status, createdAt: r.createdAt, lastLogin: r.lastLogin, hasPassword: !!r.hash
  }));
  const trainings = {};
  c.tr.rows.forEach(r => {
    trainings[r.id] = { title: r.title, video: r.video, mins: Number(r.mins) || 0, pass: Number(r.pass) || 70, steps: r.steps || [], qs: r.qs || [] };
  });
  const projects = c.pr.rows.map(r => ({
    id: r.id, no: r.no, clientId: r.clientId, title: r.title, cat: CATS[r.cat] ? r.cat : 'office', place: r.place, area: r.area,
    from: r.from, to: r.to, start: r.start, end: r.end, need: Number(r.need) || 1, rate: Number(r.rate) || 0,
    req: Object.assign({ health: false, adult: false, license: false, lang: false }, r.req || {}), transport: r.transport,
    letterNo: r.letterNo, letterDate: r.letterDate, paidUntil: r.paidUntil, createdAt: r.createdAt, requestId: r.requestId,
    contract: { status: r.contractStatus || 'draft', sentAt: r.sentAt, signedAt: r.signedAt, signer: r.signer }
  }));
  const pm = {};
  projects.forEach(p => { pm[p.id] = p; });
  const orders = [], om = {};
  c.dy.rows.forEach(d => {
    const P = pm[d.projectId];
    if (!P) return;
    const o = {
      id: d.id, proj: P.id, no: P.no + '/' + d.n, clientId: P.clientId, cat: P.cat, title: P.title, place: P.place, area: P.area,
      date: d.date, start: P.start, end: P.end, need: P.need, rate: P.rate, req: P.req, transport: P.transport,
      status: d.status === 'done' ? 'done' : 'open', apps: [], att: {}
    };
    orders.push(o);
    om[o.id] = o;
  });
  c.regIdx = {};
  c.rg.rows.forEach(r => {
    const o = om[r.dayId];
    if (!o) return;
    c.regIdx[o.id + '|' + r.workerId] = r;
    o.apps.push({ wid: r.workerId, st: r.status || 'applied', selAt: r.selectedAt, confAt: r.confirmedAt });
    if (r.checkIn || r.checkOut || r.noshow || r.rated) {
      o.att[r.workerId] = { in: r.checkIn, out: r.checkOut, noshow: r.noshow, rated: Number(r.rated) || 0, home: r.home, paidAt: r.paidAt };
    }
  });
  // ажилчдын статистикийг ирцээс тооцно
  const stat = {};
  c.wk.rows.forEach(r => { stat[r.id] = { done: 0, noshow: 0, late: 0, rsum: 0, rn: 0, resp: [] }; });
  orders.forEach(o => {
    o.apps.forEach(a => {
      const s = stat[a.wid];
      if (!s) return;
      const at = o.att[a.wid];
      if (at && at.out) {
        s.done++;
        if (at.in && toMin(at.in) > toMin(o.start) + 5) s.late++;
        if (at.rated) { s.rsum += at.rated; s.rn++; }
      }
      if (at && at.noshow) s.noshow++;
      if (a.selAt && a.confAt) s.resp.push((a.confAt - a.selAt) / 36e5);
    });
  });
  const workers = c.wk.rows.map(r => {
    const s = stat[r.id];
    const avgH = s.resp.length ? s.resp.reduce((a, b) => a + b, 0) / s.resp.length : null;
    return {
      id: r.id, last: r.lastName, first: r.firstName, phone: r.phone, email: r.email, birth: r.birth, age: ageAt(r.birth, today),
      school: r.school, major: r.major, days: listIdx_(r.days, DAYS), shifts: listIdx_(r.shifts, SHIFTS),
      health: r.health, license: r.license, lang: r.lang, signed: dayOf_(r.signedAt), status: r.status || 'active', note: r.note,
      tests: r.tests || {}, createdAt: r.createdAt, lastLogin: r.lastLogin,
      done: s.done, noshow: s.noshow, late: s.late, rn: s.rn, rating: s.rn ? s.rsum / s.rn : 0,
      resp: avgH === null ? .75 : Math.max(.3, Math.min(1, 1 - avgH / 4))
    };
  });
  const msgs = c.ms.rows.map(r => ({ id: r.id, w: r.workerId, from: r.from === 'admin' ? 'admin' : 'w', t: r.text, at: fmtTs_(r.at), ts: r.at, readW: r.readW, readA: r.readA }))
    .sort((a, b) => a.ts - b.ts);
  const unread = {};
  let adminUnread = 0;
  msgs.forEach(m => {
    if (m.from === 'admin' && !m.readW) unread[m.w] = (unread[m.w] || 0) + 1;
    if (m.from !== 'admin' && !m.readA) adminUnread++;
  });
  const sos = c.al.rows.filter(r => !r.resolvedAt).map(r => ({ id: r.id, w: r.workerId, o: r.dayId, at: fmtTs_(r.at), noshow: r.kind === 'noshow', loc: r.lat ? { lat: r.lat, lng: r.lng } : null }));
  const requests = c.rq.rows.map(r => ({
    id: r.id, createdAt: r.createdAt, status: r.status || 'pending', clientId: r.companyId, org: r.org, title: r.title, cat: r.cat, area: r.area, place: r.place,
    date: r.from, to: r.to, multi: !!r.to && r.to !== r.from, start: r.start, end: r.end, need: Number(r.need) || 1, rate: Number(r.rate) || 0,
    req: Object.assign({ health: false, adult: false, license: false, lang: false }, r.req || {}), transport: r.transport,
    letterNo: r.letterNo, letterDate: r.letterDate, note: r.note, projectId: r.projectId
  })).reverse();
  return {
    today: today, now: hm_(), settings: settings, clients: clients, workers: workers, projects: projects, orders: orders,
    trainings: trainings, msgs: msgs, unread: unread, adminUnread: adminUnread, sos: sos, requests: requests
  };
}

/* ---------- Дүр тус бүрт харагдах хэсэг ---------- */

function forAdmin_(user) {
  const o = JSON.parse(JSON.stringify(S));
  o.role = 'admin';
  o.me = user;
  return o;
}

function forClient_(cid) {
  const myP = S.projects.filter(p => p.clientId === cid);
  const pids = myP.map(p => p.id);
  const orders = S.orders.filter(o => pids.indexOf(o.proj) >= 0).map(o => {
    const x = JSON.parse(JSON.stringify(o));
    x.apps = x.apps.filter(active).map(a => ({ wid: a.wid, st: a.st }));
    const keep = {};
    x.apps.forEach(a => { if (x.att[a.wid]) keep[a.wid] = { in: x.att[a.wid].in, out: x.att[a.wid].out, noshow: x.att[a.wid].noshow, rated: x.att[a.wid].rated }; });
    x.att = keep;
    return x;
  });
  const wids = {};
  orders.forEach(o => o.apps.forEach(a => { if (a.st === 'confirmed') wids[a.wid] = 1; }));
  const attKeys = {};
  orders.forEach(o => {
    const P = P_(o.proj);
    const overnight = toMin(o.end) <= toMin(o.start) && o.date === addDays(S.today, -1);
    if ((o.date === S.today || overnight) && o.status === 'open' && P.contract.status === 'signed') attKeys[o.id] = attKey_(o.id);
  });
  const st = S.settings;
  return {
    role: 'client', me: cid, today: S.today, now: S.now,
    settings: { fee: st.fee, vat: st.vat, ndsh: st.ndsh, pit: st.pit, payoutDays: st.payoutDays, minWage: st.minWage, minWageNext: st.minWageNext, minWageFrom: st.minWageFrom, weekHours: st.weekHours },
    clients: S.clients.filter(c => c.id === cid),
    workers: S.workers.filter(w => wids[w.id]).map(w => ({ id: w.id, last: w.last, first: w.first, tests: {}, days: [], shifts: [] })),
    projects: JSON.parse(JSON.stringify(myP)), orders: orders, trainings: {}, msgs: [], unread: {}, adminUnread: 0, sos: [],
    requests: S.requests.filter(r => r.clientId === cid), attKeys: attKeys
  };
}

function forStudent_(wid) {
  const me = W_(wid);
  const signedP = S.projects.filter(p => p.contract.status === 'signed');
  const pids = signedP.map(p => p.id);
  const orders = S.orders.filter(o => pids.indexOf(o.proj) >= 0 && ((o.status === 'open' && o.date >= S.today) || o.apps.some(a => a.wid === wid)))
    .map(o => {
      const mine = o.apps.filter(a => a.wid === wid);
      const conf = mine.length && mine[0].st === 'confirmed';
      const at = o.att[wid];
      return {
        id: o.id, proj: o.proj, no: o.no, clientId: o.clientId, cat: o.cat, title: o.title, place: conf ? o.place : '', area: o.area,
        date: o.date, start: o.start, end: o.end, need: o.need, rate: o.rate, req: o.req, transport: o.transport, status: o.status,
        apps: mine.map(a => ({ wid: a.wid, st: a.st })), att: at ? (function () { const r = {}; r[wid] = at; return r; })() : {}
      };
    });
  const usedP = {};
  orders.forEach(o => { usedP[o.proj] = 1; });
  const projects = signedP.filter(p => usedP[p.id]).map(p => ({
    id: p.id, no: p.no, clientId: p.clientId, title: p.title, cat: p.cat, place: '', area: p.area, from: p.from, to: p.to,
    start: p.start, end: p.end, need: p.need, rate: p.rate, req: p.req, transport: p.transport, contract: { status: 'signed' }
  }));
  const trainings = {};
  Object.keys(S.trainings).forEach(cid => {
    const t = S.trainings[cid];
    trainings[cid] = { title: t.title, video: t.video, mins: t.mins, pass: t.pass, steps: t.steps, qs: t.qs.map(q => ({ q: q.q, o: q.o })) };
  });
  const st = S.settings;
  return {
    role: 'student', me: wid, today: S.today, now: S.now,
    settings: { ndsh: st.ndsh, pit: st.pit, payoutDays: st.payoutDays, weekHours: st.weekHours, minWage: st.minWage, minWageNext: st.minWageNext, minWageFrom: st.minWageFrom, fee: 0, vat: false },
    clients: S.clients.map(c => ({ id: c.id, alias: c.alias || 'Нууцалсан байгууллага' })),
    workers: [me], projects: projects, orders: orders, trainings: trainings,
    msgs: S.msgs.filter(m => m.w === wid), unread: (function () { const u = {}; u[wid] = S.unread[wid] || 0; return u; })(), adminUnread: 0,
    sos: S.sos.filter(s => s.w === wid && !s.noshow), requests: []
  };
}

/* ===================== Ирцийн код (30 секунд тутам солигдоно) ===================== */

function attKey_(dayId) {
  sign_(0, '');
  const secret = props_().getProperty('TOKEN_SECRET');
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature('att|' + dayId, secret + '|att', Utilities.Charset.UTF_8)).replace(/=+$/, '');
}

function attCode_(key, win) {
  const b = Utilities.computeHmacSha256Signature(String(win), key, Utilities.Charset.UTF_8);
  const n = (((b[0] & 255) << 24) | ((b[1] & 255) << 16) | ((b[2] & 255) << 8) | (b[3] & 255)) >>> 0;
  return String(n % 1000000).padStart(6, '0');
}

function checkAttCode_(dayId, code) {
  code = String(code || '').replace(/\D/g, '');
  if (code.length !== 6) return false;
  const key = attKey_(dayId), win = Math.floor(Date.now() / 30000);
  for (let d = -4; d <= 1; d++) if (attCode_(key, win + d) === code) return true;
  return false;
}

/* ===================== Оюутан ===================== */

function normPhone_(p) {
  return String(p || '').replace(/\D/g, '').slice(-8);
}

function sRegister_(d) {
  if (d.website) return { ok: true };
  const w = {
    lastName: clean_(d.lastName, 60), firstName: clean_(d.firstName, 60), phone: normPhone_(d.phone),
    email: normEmail_(d.email), birth: clean_(d.birth, 10), school: clean_(d.school, 100), major: clean_(d.major, 100),
    lang: clean_(d.lang, 60)
  };
  const days = (Array.isArray(d.days) ? d.days : []).map(Number).filter(i => i >= 0 && i < 7);
  const shifts = (Array.isArray(d.shifts) ? d.shifts : []).map(Number).filter(i => i >= 0 && i < 3);
  const miss = [];
  if (!w.lastName) miss.push('овог');
  if (!w.firstName) miss.push('нэр');
  if (w.phone.length !== 8) miss.push('утас (8 оронтой)');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(w.birth) || ageAt(w.birth, today_()) < 14 || ageAt(w.birth, today_()) > 80) miss.push('төрсөн огноо');
  if (w.email && !/^\S+@\S+\.\S+$/.test(w.email)) miss.push('имэйл зөв биш');
  if (!days.length) miss.push('сул өдөр');
  if (!shifts.length) miss.push('сул цаг');
  if (miss.length) throw fail_('invalid', 'Дараахыг бөглөнө үү: ' + miss.join(', '));
  if (d.consent !== true) throw fail_('invalid', 'Ерөнхий гэрээ болон хувийн мэдээлэл ашиглах зөвшөөрлийг зөвшөөрнө үү.');
  const pw = String(d.password || '');
  if (pw.length < 8) throw fail_('invalid', 'Нууц үг 8-аас дээш тэмдэгттэй байна.');
  const cache = CacheService.getScriptCache();
  const regs = Number(cache.get('sregs') || 0);
  if (regs >= MAX_REGS_PER_HOUR) throw fail_('busy', 'Хэт олон бүртгэл ирж байна. Түр хүлээгээд дахин оролдоно уу.');
  return mutate_(c => {
    if (c.wk.rows.some(r => normPhone_(r.phone) === w.phone)) throw fail_('exists', 'Энэ утасны дугаараар бүртгэл байна. Нэвтэрнэ үү.');
    const salt = Utilities.getUuid();
    const row = add_(c.wk, Object.assign(w, {
      id: uid_(), createdAt: Date.now(), status: 'active', days: days.map(i => DAYS[i]).join(', '), shifts: shifts.map(i => SHIFTS[i]).join(', '),
      health: '', license: false, signedAt: Date.now(), tests: {}, note: '', salt: salt, hash: hash_(pw, salt), lastLogin: Date.now()
    }));
    cache.put('sregs', String(regs + 1), 3600);
    S = state_(c);
    return sSession_(row);
  });
}

function sLogin_(phone, pw) {
  phone = normPhone_(phone);
  const cache = CacheService.getScriptCache();
  const key = 'sfail_' + phone, fails = Number(cache.get(key) || 0);
  if (fails >= 5) throw fail_('locked', 'Олон удаа буруу оруулсан тул 10 минут түгжигдлээ.');
  return mutate_(c => {
    const row = c.wk.rows.filter(r => normPhone_(r.phone) === phone)[0];
    if (!row || !row.hash || hash_(String(pw || ''), row.salt) !== row.hash) {
      cache.put(key, String(fails + 1), 600);
      throw fail_('auth', 'Утас эсвэл нууц үг буруу байна.');
    }
    cache.remove(key);
    if (row.status === 'blocked') throw fail_('blocked', 'Таны бүртгэлийг түр хаасан байна. STM багтай холбогдоно уу.');
    row.lastLogin = Date.now();
    c.wk.dirty = true;
    return sSession_(row);
  });
}

function sForgot_(phone) {
  phone = normPhone_(phone);
  const row = load_(WORKERS).rows.filter(r => normPhone_(r.phone) === phone)[0];
  if (row && row.email && row.status !== 'blocked') sendCode_(row.email, 'sreset');
  return { ok: true, hasEmail: !!(row && row.email) };
}

function sReset_(phone, code, pw) {
  phone = normPhone_(phone);
  pw = String(pw || '');
  if (pw.length < 8) throw fail_('invalid', 'Нууц үг 8-аас дээш тэмдэгттэй байна.');
  return mutate_(c => {
    const row = c.wk.rows.filter(r => normPhone_(r.phone) === phone)[0];
    if (!row || !row.email || row.status === 'blocked') throw fail_('invalid', 'Код хүчингүй болсон байна. Шинэ код авна уу.');
    takeCode_(row.email, code, 'sreset');
    row.salt = Utilities.getUuid();
    row.hash = hash_(pw, row.salt);
    c.wk.dirty = true;
    return sSession_(row);
  });
}

function sSession_(row) {
  const exp = Date.now() + TOKEN_DAYS * 864e5;
  return { ok: true, token: 's.' + exp + '.' + row.id + '.' + sSign_(exp, row) };
}

function sSign_(exp, row) {
  sign_(0, '');
  const key = props_().getProperty('TOKEN_SECRET') + '|s|' + row.hash;
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(exp + '|' + row.id, key));
}

function studentAuth_(c, token) {
  const parts = String(token || '').split('.');
  const row = parts.length === 4 ? byId_(c.wk, parts[2]) : null;
  if (!row || !row.hash || Number(parts[1]) < Date.now() || parts[3] !== sSign_(parts[1], row)) throw fail_('auth', 'Дахин нэвтэрнэ үү.');
  if (row.status === 'blocked') throw fail_('auth', 'Таны бүртгэлийг түр хаасан байна. STM багтай холбогдоно уу.');
  return row;
}

function studentAction_(p) {
  const a = p.action;
  if (a === 'sState') {
    return read_(c => { const row = studentAuth_(c, p.token); return { ok: true, S: forStudent_(row.id) }; });
  }
  return mutate_(c => {
    const row = studentAuth_(c, p.token), wid = row.id, w = W_(wid);
    let extra = {};
    switch (a) {
      case 'sApply': extra = sApply_(c, w, p.ids); break;
      case 'sConfirm': extra = sConfirm_(c, w, p.ids); break;
      case 'sDecline': extra = sDecline_(c, w, p.id); break;
      case 'sCheck': extra = sCheck_(c, w, p.id, p.code); break;
      case 'sHome': {
        const o = O_(p.id), r = o && c.regIdx[o.id + '|' + wid];
        if (!r || !r.checkOut) throw fail_('invalid', 'Ээлж дуусаагүй байна.');
        r.home = true; c.rg.dirty = true;
        msg_(c, wid, 'w', 'Гэртээ аюулгүй хүрлээ.');
        break;
      }
      case 'sSos': {
        add_(c.al, { id: uid_(), at: Date.now(), kind: 'sos', workerId: wid, dayId: clean_(p.id, 40), lat: clean_(p.lat, 20), lng: clean_(p.lng, 20), resolvedAt: '', resolvedBy: '' });
        msg_(c, wid, 'w', 'ЯАРАЛТАЙ тусламж хүсэв.');
        const o = O_(p.id);
        notifyAdmin_('ЯАРАЛТАЙ: ' + w.last + ' ' + w.first + ' тусламж хүсэв', [
          w.last + ' ' + w.first + ', утас: ' + w.phone, o ? 'Ээлж: ' + o.title + ', ' + o.date + ' ' + o.start + '–' + o.end + ', ' + o.place : '',
          p.lat ? 'Байршил: https://maps.google.com/?q=' + p.lat + ',' + p.lng : 'Байршил илгээгээгүй'
        ], true);
        break;
      }
      case 'sSend': {
        const t = clean_(p.text, 1000);
        if (!t) throw fail_('invalid', 'Мессеж хоосон байна.');
        msg_(c, wid, 'w', t);
        break;
      }
      case 'sRead':
        c.ms.rows.forEach(m => { if (m.workerId === wid && m.from === 'admin' && !m.readW) { m.readW = true; c.ms.dirty = true; } });
        break;
      case 'sProfile': {
        const days = (Array.isArray(p.days) ? p.days : []).map(Number).filter(i => i >= 0 && i < 7).sort();
        const shifts = (Array.isArray(p.shifts) ? p.shifts : []).map(Number).filter(i => i >= 0 && i < 3).sort();
        if (!days.length || !shifts.length) throw fail_('invalid', 'Дор хаяж нэг өдөр, нэг цаг сонгоно уу.');
        row.days = days.map(i => DAYS[i]).join(', ');
        row.shifts = shifts.map(i => SHIFTS[i]).join(', ');
        if (p.lang !== undefined) row.lang = clean_(p.lang, 60);
        if (p.email !== undefined) {
          const e = normEmail_(p.email);
          if (e && !/^\S+@\S+\.\S+$/.test(e)) throw fail_('invalid', 'Имэйл зөв биш байна.');
          row.email = e;
        }
        c.wk.dirty = true;
        break;
      }
      case 'sQuiz': extra = sQuiz_(c, row, p.cid, p.answers || {}); break;
      case 'sPassword': {
        if (hash_(String(p.current || ''), row.salt) !== row.hash) throw fail_('invalid', 'Одоогийн нууц үг буруу байна.');
        const nx = String(p.next || '');
        if (nx.length < 8) throw fail_('invalid', 'Шинэ нууц үг 8-аас дээш тэмдэгттэй байна.');
        row.salt = Utilities.getUuid();
        row.hash = hash_(nx, row.salt);
        c.wk.dirty = true;
        extra = { token: sSession_(row).token };
        break;
      }
      default: throw fail_('bad_action', 'Үл мэдэгдэх үйлдэл.');
    }
    S = state_(c);
    return Object.assign({ ok: true, S: forStudent_(wid) }, extra);
  });
}

function sApply_(c, w, ids) {
  ids = Array.isArray(ids) ? ids.slice(0, 200) : [];
  let n = 0;
  const skipped = [];
  ids.forEach(id => {
    const o = O_(id);
    if (!o || !signed(o) || o.status !== 'open') return;
    if (o.date < S.today || (o.date === S.today && toMin(S.now) >= toMin(o.start))) return;
    if (o.apps.some(a => a.wid === w.id)) return;
    const b = blockers(w, o);
    if (b.length) { skipped.push(shortDate(o.date) + ': ' + b[0]); return; }
    const r = add_(c.rg, {
      id: uid_(), dayId: o.id, workerId: w.id, workerName: w.last + ' ' + w.first, date: o.date, status: 'applied',
      createdAt: Date.now(), selectedAt: '', confirmedAt: '', checkIn: '', checkOut: '', noshow: false, rated: '', home: false, paidAt: ''
    });
    c.regIdx[o.id + '|' + w.id] = r;
    o.apps.push({ wid: w.id, st: 'applied' });
    n++;
  });
  if (!n) throw fail_('invalid', skipped.length ? 'Бүртгүүлэх боломжгүй: ' + skipped.join('; ') : 'Бүртгүүлэх өдөр олдсонгүй. Жагсаалтаа шинэчилнэ үү.');
  return { n: n, skipped: skipped };
}

function sConfirm_(c, w, ids) {
  let n = 0;
  S.orders.forEach(o => {
    if (Array.isArray(ids) && ids.length && ids.indexOf(o.id) < 0) return;
    const r = c.regIdx[o.id + '|' + w.id];
    if (r && r.status === 'selected' && o.status === 'open') {
      r.status = 'confirmed'; r.confirmedAt = Date.now(); n++;
    }
  });
  if (!n) throw fail_('invalid', 'Баталгаажуулах ажил олдсонгүй.');
  c.rg.dirty = true;
  if (n > 1) msg_(c, w.id, 'w', n + ' өдрийн ажлаа баталгаажууллаа.');
  return { n: n };
}

function sDecline_(c, w, id) {
  const o = O_(id), r = o && c.regIdx[o.id + '|' + w.id];
  if (!r || ['applied', 'selected', 'confirmed', 'waitlist'].indexOf(r.status) < 0 || r.checkIn || o.status !== 'open') throw fail_('invalid', 'Татгалзах боломжгүй.');
  const wasActive = r.status === 'selected' || r.status === 'confirmed';
  r.status = 'declined';
  c.rg.dirty = true;
  o.apps.filter(a => a.wid === w.id).forEach(a => { a.st = 'declined'; });
  let promoted = null;
  if (wasActive) {
    promoted = promote_(c, o);
    if (o.date <= addDays(S.today, 1)) msg_(c, w.id, 'w', 'Би ' + shortDate(o.date) + '-ны "' + o.title + '" ээлжээс татгалзлаа.');
  }
  return { promoted: !!promoted };
}

function sCheck_(c, w, id, code) {
  const o = O_(id), r = o && c.regIdx[o.id + '|' + w.id];
  if (!r || r.status !== 'confirmed') throw fail_('invalid', 'Та энэ ээлжинд баталгаажаагүй байна.');
  // Шөнө дундаас хойш дуусах ээлжийн "Явлаа"-г маргааш өглөө нь ч бүртгэж болно.
  const overnight = toMin(o.end) <= toMin(o.start) && o.date === addDays(S.today, -1) && r.checkIn && !r.checkOut;
  if (o.date !== S.today && !overnight) throw fail_('invalid', 'Ирцийг зөвхөн ажлын өдөр бүртгэнэ.');
  if (o.status !== 'open' || !signed(o)) throw fail_('invalid', 'Энэ ээлж хаагдсан байна.');
  if (r.noshow) throw fail_('invalid', 'Хариуцагч таныг ирээгүй гэж тэмдэглэсэн. STM багт бичнэ үү.');
  if (!checkAttCode_(o.id, code)) throw fail_('code', 'Код буруу эсвэл хугацаа нь дууссан. Хариуцагчийн утсан дээрх шинэ кодыг оруулна уу.');
  let kind;
  if (!r.checkIn) { r.checkIn = S.now; kind = 'in'; }
  else if (!r.checkOut) {
    if (toMin(S.now) - toMin(r.checkIn) < 10 && toMin(S.now) >= toMin(r.checkIn)) throw fail_('invalid', 'Дөнгөж ирц бүртгүүлсэн байна. Ээлж дуусахад "Явлаа" гэж бүртгүүлнэ.');
    r.checkOut = S.now; kind = 'out';
    if (lateEnd(o)) msg_(c, w.id, 'admin', 'Оройн ээлж дууслаа. Гэртээ хүрээд "Гэртээ хүрлээ" товчийг дарна уу.');
  } else throw fail_('invalid', 'Ирц, явах бүртгэл аль хэдийн хийгдсэн.');
  c.rg.dirty = true;
  return { kind: kind, time: S.now };
}

function sQuiz_(c, row, cid, answers) {
  const tr = byId_(c.tr, cid);
  if (!tr || !tr.qs || !tr.qs.length) throw fail_('not_found', 'Сургалт олдсонгүй.');
  const tests = row.tests || {}, prev = tests[cid];
  if (prev && prev.score < (Number(tr.pass) || 70) && prev.at && Date.now() - prev.at < 24 * 36e5) {
    throw fail_('wait', 'Тэнцээгүй тул 24 цагийн дараа дахин өгнө (' + fmtTs_(prev.at + 24 * 36e5) + ').');
  }
  let right = 0;
  const miss = [];
  tr.qs.forEach((q, i) => {
    if (answers[i] !== undefined && Number(answers[i]) === Number(q.a)) right++;
    else { miss.push({ q: q.q, a: q.o[q.a] }); q.wrong = (Number(q.wrong) || 0) + 1; }
  });
  const sc = Math.round(right / tr.qs.length * 100);
  tests[cid] = { score: Math.max(sc, prev ? prev.score : 0), att: (prev ? prev.att : 0) + 1, at: Date.now(), last: sc };
  row.tests = tests;
  c.wk.dirty = true;
  c.tr.dirty = true;
  return { score: sc, miss: miss, pass: Number(tr.pass) || 70 };
}

/* ---------- мессеж, сонголт ---------- */

function msg_(c, wid, from, text) {
  add_(c.ms, { id: uid_(), at: Date.now(), workerId: wid, from: from, text: text, readW: from !== 'admin', readA: from === 'admin' });
}

// Сонгогдсон оюутанд апп доторх мессеж + (тохиргоогоор) имэйл.
function tellWorker_(c, wid, text) {
  msg_(c, wid, 'admin', text);
  const w = W_(wid);
  if (S.settings.notifyStudents && w && w.email) {
    mail_(w.email, 'Student Team Mongolia: шинэ мэдэгдэл', text + '\n\nАпп: ' + siteUrl_() + 'index.html');
  }
}

function syncApps_(c, o) {
  o.apps.forEach(a => {
    const r = c.regIdx[o.id + '|' + a.wid];
    if (r && r.status !== a.st) {
      r.status = a.st;
      if (a.st === 'selected') r.selectedAt = Date.now();
      if (a.st === 'confirmed') r.confirmedAt = Date.now();
      c.rg.dirty = true;
    }
  });
}

function promote_(c, o) {
  const pool = o.apps.filter(a => a.st === 'waitlist').map(a => ({ a: a, w: W_(a.wid) }))
    .filter(x => x.w && !blockers(x.w, o).length).sort((x, y) => score(y.w).total - score(x.w).total);
  if (!pool[0]) return null;
  pool[0].a.st = 'selected';
  syncApps_(c, o);
  tellWorker_(c, pool[0].w.id, 'Суудал гарлаа! Та "' + o.title + '" (' + dayLabel(o.date) + ', ' + o.start + '–' + o.end + ') ажилд сонгогдлоо. "Ажил" хэсгээс 2 цагийн дотор баталгаажуулна уу.');
  return name(pool[0].w);
}

function selectMany_(c, list) {
  const per = {};
  let n = 0;
  list.filter(o => o.status === 'open' && signed(o) && o.date >= S.today).sort((a, b) => a.date < b.date ? -1 : 1).forEach(o => {
    selectDay(o).forEach(wid => { (per[wid] = per[wid] || []).push(o); n++; });
    syncApps_(c, o);
  });
  Object.keys(per).forEach(wid => {
    const os = per[wid];
    tellWorker_(c, wid, 'Та "' + os[0].title + '" ажилд ' + os.length + ' өдөр сонгогдлоо: ' + os.map(o => shortDate(o.date)).join(', ') + ' (' + os[0].start + '–' + os[0].end + '). "Ажил" хэсгээс 2 цагийн дотор баталгаажуулна уу.');
  });
  return { n: n, people: Object.keys(per).length };
}

/* ===================== Захиалагч ===================== */

function clientAuth_(c, token) {
  const parts = String(token || '').split('.');
  const row = parts.length === 4 ? byId_(c.co, parts[2]) : null;
  if (!row || Number(parts[1]) < Date.now() || parts[3] !== cSign_(parts[1], row)) throw fail_('auth', 'Дахин нэвтэрнэ үү.');
  if (row.status !== COMPANY_STATUSES.active) throw fail_('auth', 'Бүртгэл идэвхгүй байна. Админтай холбогдоно уу.');
  return row;
}

function clientAction_(p) {
  const a = p.action;
  if (a === 'cState') return read_(c => { const row = clientAuth_(c, p.token); return { ok: true, S: forClient_(row.id) }; });
  if (a === 'cPassword') {
    const co = clientAuth_({ co: load_(COMPANIES) }, p.token);
    return cPassword_(co, p.current, p.next);
  }
  return mutate_(c => {
    const row = clientAuth_(c, p.token), cid = row.id;
    const own = id => { const o = O_(id); if (!o || o.clientId !== cid) throw fail_('not_found', 'Өдөр олдсонгүй.'); return o; };
    let extra = {};
    switch (a) {
      case 'cSign': {
        const P = P_(p.id);
        if (!P || P.clientId !== cid) throw fail_('not_found', 'Гэрээ олдсонгүй.');
        const signer = clean_(p.signer, 120);
        if (!signer || p.agree !== true) throw fail_('invalid', 'Нэр, албан тушаалаа бичиж, нөхцөлийг зөвшөөрнө үү.');
        if (P.contract.status !== 'sent') throw fail_('invalid', 'Энэ гэрээг одоогоор зурах боломжгүй.');
        const r = byId_(c.pr, P.id);
        r.contractStatus = 'signed'; r.signedAt = S.today; r.signer = signer;
        c.pr.dirty = true;
        notifyAdmin_('Гэрээ зурагдлаа: ' + row.org + ' — ' + P.title, [P.no + ' ' + P.title, 'Зурсан: ' + signer, 'Одоо оюутнуудад зар харагдаж байна.']);
        S = state_(c);
        const fit = {};
        daysOf(P_(P.id)).forEach(o => S.workers.forEach(w => { if (!blockers(w, o).length) fit[w.id] = 1; }));
        extra = { fit: Object.keys(fit).length };
        break;
      }
      case 'cNoShow': {
        const o = own(p.id), r = c.regIdx[o.id + '|' + p.wid];
        if (o.date !== S.today) throw fail_('invalid', 'Зөвхөн өнөөдрийн ээлжид тэмдэглэнэ.');
        if (!r || r.status !== 'confirmed' || r.checkIn) throw fail_('invalid', 'Тэмдэглэх боломжгүй.');
        r.noshow = true; c.rg.dirty = true;
        const w = W_(p.wid);
        tellWorker_(c, p.wid, 'Та ' + shortDate(o.date) + '-ны "' + o.title + '" ээлжид ирээгүй гэж хариуцагч тэмдэглэлээ. Шалтгаанаа STM багт бичнэ үү.');
        add_(c.al, { id: uid_(), at: Date.now(), kind: 'noshow', workerId: p.wid, dayId: o.id, lat: '', lng: '', resolvedAt: '', resolvedBy: '' });
        notifyAdmin_('Ирээгүй: ' + name(w) + ' — ' + o.title + ' ' + o.date, [row.org + ' хариуцагч тэмдэглэв.', 'Орлох хүн гаргана уу. Утас: ' + w.phone], true);
        break;
      }
      case 'cRate': rate_(c, own(p.id), p.wid, p.v); break;
      case 'cRequest': {
        const d = draftFields_(p.data || {});
        d.clientId = cid;
        const bad = legal(d).filter(x => x.block && !x.ok);
        if (bad.length) throw fail_('invalid', bad[0].t);
        if (!d.title || !d.area) throw fail_('invalid', 'Ажлын нэр, дүүргийг бөглөнө үү.');
        if (c.rq.rows.filter(r => r.companyId === cid && r.status === 'pending').length >= 10) throw fail_('busy', 'Хүлээгдэж буй хүсэлт олон байна.');
        add_(c.rq, {
          id: uid_(), createdAt: Date.now(), status: 'pending', companyId: cid, org: row.org, title: d.title, cat: d.cat, area: d.area, place: d.place,
          from: d.date, to: d.multi ? d.to : d.date, start: d.start, end: d.end, need: d.need, rate: d.rate, req: d.req, transport: d.transport,
          letterNo: d.letterNo, letterDate: d.letterDate, note: clean_((p.data || {}).note, 1000), projectId: ''
        });
        notifyAdmin_('Шинэ захиалгын хүсэлт: ' + row.org + ' — ' + d.title, [d.title, d.date + (d.multi ? ' – ' + d.to : '') + ', ' + d.start + '–' + d.end, 'Өдөрт ' + d.need + ' хүн, ' + d.rate + '₮/цаг', '\nАдмин апп → Төсөл, захиалга.']);
        break;
      }
      default: throw fail_('bad_action', 'Үл мэдэгдэх үйлдэл.');
    }
    S = state_(c);
    return Object.assign({ ok: true, S: forClient_(cid) }, extra);
  });
}

function rate_(c, o, wid, v) {
  v = Number(v);
  if (!(v >= 1 && v <= 5)) throw fail_('invalid', 'Үнэлгээ 1–5.');
  const r = c.regIdx[o.id + '|' + wid];
  if (!r || !r.checkOut) throw fail_('invalid', 'Ажилласан ээлжийг л үнэлнэ.');
  r.rated = Math.round(v);
  c.rg.dirty = true;
}

function draftFields_(d) {
  const req = d.req || {};
  const cat = CATS[d.cat] ? d.cat : 'office';
  const out = {
    clientId: clean_(d.clientId, 40), letterNo: clean_(d.letterNo, 40), letterDate: clean_(d.letterDate, 10), cat: cat,
    title: clean_(d.title, 120), place: clean_(d.place, 200), area: clean_(d.area, 80),
    date: clean_(d.date, 10), to: clean_(d.to, 10), multi: d.multi === true,
    start: clean_(d.start, 5), end: clean_(d.end, 5), need: Math.max(0, Math.floor(Number(d.need) || 0)), rate: Math.max(0, Math.floor(Number(d.rate) || 0)),
    req: { health: req.health === true || !!CATS[cat].req.health, adult: req.adult === true, license: req.license === true || !!CATS[cat].req.license, lang: req.lang === true || !!CATS[cat].req.lang },
    transport: TRANSPORT[d.transport] !== undefined ? d.transport : ''
  };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(out.date)) throw fail_('invalid', 'Огноо буруу байна.');
  if (out.multi && !/^\d{4}-\d{2}-\d{2}$/.test(out.to)) throw fail_('invalid', 'Дуусах огноо буруу байна.');
  if (!/^\d{2}:\d{2}$/.test(out.start) || !/^\d{2}:\d{2}$/.test(out.end)) throw fail_('invalid', 'Цаг буруу байна.');
  return out;
}

/* ===================== Админ ===================== */

function adminAction_(p) {
  const user = auth_(p.token);
  const a = p.action;
  switch (a) {
    case 'aState': return read_(() => ({ ok: true, S: forAdmin_(user) }));
    case 'getSettings': return getSettings_(user);
    case 'saveConfig': return saveConfig_(p.config || {});
    case 'changePassword': return changePassword_(user, p.current, p.next);
    case 'addAdmin': return addAdmin_(p.name, p.password);
    case 'removeAdmin': return removeAdmin_(user, p.name);
  }
  return mutate_(c => {
    const O = id => { const o = O_(id); if (!o) throw fail_('not_found', 'Өдөр олдсонгүй. Жагсаалтаа шинэчилнэ үү.'); return o; };
    const P = id => { const x = P_(id); if (!x) throw fail_('not_found', 'Төсөл олдсонгүй.'); return x; };
    let extra = {};
    switch (a) {
      case 'aCreate': extra = aCreate_(c, user, p.draft || {}, p.requestId); break;
      case 'aDeleteProject': {
        const x = P(p.id);
        if (S.orders.some(o => o.proj === x.id && o.apps.length)) throw fail_('invalid', 'Бүртгэлтэй төслийг устгах боломжгүй.');
        c.pr.rows = c.pr.rows.filter(r => r.id !== x.id); c.pr.dirty = true;
        c.dy.rows = c.dy.rows.filter(r => r.projectId !== x.id); c.dy.dirty = true;
        c.rq.rows.forEach(r => { if (r.projectId === x.id) { r.projectId = ''; r.status = 'pending'; c.rq.dirty = true; } });
        break;
      }
      case 'aSelect': {
        const list = (Array.isArray(p.ids) ? p.ids : []).map(O_).filter(Boolean);
        extra = selectMany_(c, list);
        break;
      }
      case 'aManualSel': {
        const o = O(p.id), w = W_(p.wid), ap = o.apps.filter(x => x.wid === p.wid)[0];
        if (!ap || !w) throw fail_('not_found', 'Бүртгэл олдсонгүй.');
        if (!signed(o) || o.status !== 'open') throw fail_('invalid', 'Гэрээ зурагдаагүй эсвэл өдөр хаагдсан.');
        if (o.apps.filter(active).length >= o.need) throw fail_('invalid', 'Хүн бүрдсэн байна.');
        const b = blockers(w, o);
        if (b.length) throw fail_('invalid', b.join(', '));
        ap.st = 'selected'; syncApps_(c, o);
        tellWorker_(c, w.id, 'Та "' + o.title + '" (' + dayLabel(o.date) + ', ' + o.start + '–' + o.end + ') ажилд сонгогдлоо! "Ажил" хэсгээс 2 цагийн дотор баталгаажуулна уу.');
        break;
      }
      case 'aUnsel': {
        const o = O(p.id), ap = o.apps.filter(x => x.wid === p.wid)[0], at = o.att[p.wid];
        if (!ap || !active(ap) || (at && at.in)) throw fail_('invalid', 'Хасах боломжгүй.');
        ap.st = 'waitlist'; syncApps_(c, o);
        extra = { promoted: promote_(c, o) };
        break;
      }
      case 'aMarkDone': {
        const o = O(p.id), d = byId_(c.dy, o.id);
        if (o.date > S.today) throw fail_('invalid', 'Ирээгүй өдрийг дууссан гэж тэмдэглэх боломжгүй.');
        d.status = 'done'; d.doneAt = Date.now(); c.dy.dirty = true;
        o.apps.forEach(ap => {
          const r = c.regIdx[o.id + '|' + ap.wid];
          if (ap.st === 'confirmed' && r && !r.checkOut && !r.noshow) { r.checkIn = r.checkIn || o.start; r.checkOut = o.end; c.rg.dirty = true; }
        });
        break;
      }
      case 'aReopen': {
        const d = byId_(c.dy, O(p.id).id);
        d.status = 'open'; d.doneAt = ''; c.dy.dirty = true;
        break;
      }
      case 'aRate': rate_(c, O(p.id), p.wid, p.v); break;
      case 'aSendContract': {
        const x = P(p.id), r = byId_(c.pr, x.id), cl = C_(x.clientId);
        if (x.contract.status === 'signed') throw fail_('invalid', 'Гэрээ аль хэдийн зурагдсан.');
        r.contractStatus = 'sent'; r.sentAt = S.today; c.pr.dirty = true;
        const sent = cl && cl.email ? mail_(cl.email, 'Гэрээ зурах хүсэлт: ' + x.no + ' ' + x.title, [
          'Сайн байна уу, ' + (cl.contactName || cl.name) + '.', '',
          'Таны №' + x.letterNo + ' албан бичгийн дагуу "' + x.title + '" ажлын гэрээ, урьдчилсан тооцоо бэлэн боллоо.',
          'Доорх линкээр нэвтэрч гэрээг цахимаар зурна уу. Гэрээ зурагдмагц оюутнуудад зар нийтлэгдэнэ.', '',
          siteUrl_() + 'company.html',
          cl.hasPassword ? '' : '\nАнх удаа нэвтэрч байгаа бол "Нууц үгээ мартсан?" дээр дарж имэйлээрээ нууц үг тохируулна.'
        ].join('\n')) : false;
        extra = { mailed: sent };
        break;
      }
      case 'aMarkPaid': {
        const x = P(p.id), last = daysOf(x).filter(o => o.status === 'done').pop();
        if (!last) throw fail_('invalid', 'Дууссан өдөр алга.');
        byId_(c.pr, x.id).paidUntil = last.date; c.pr.dirty = true;
        break;
      }
      case 'aSaveSettings': saveStm_(p.settings || {}); break;
      case 'aSaveTraining': saveTraining_(c, p.cid, p.training || {}); break;
      case 'aDeleteTraining':
        c.tr.rows = c.tr.rows.filter(r => r.id !== String(p.cid)); c.tr.dirty = true;
        break;
      case 'aSend': {
        const t = clean_(p.text, 1000);
        if (!t || !W_(p.wid)) throw fail_('invalid', 'Мессеж хоосон байна.');
        msg_(c, p.wid, 'admin', t);
        break;
      }
      case 'aRead':
        c.ms.rows.forEach(m => { if (m.workerId === p.wid && m.from !== 'admin' && !m.readA) { m.readA = true; c.ms.dirty = true; } });
        break;
      case 'aWorker': {
        const r = byId_(c.wk, p.id), f = p.fields || {};
        if (!r) throw fail_('not_found', 'Ажилчин олдсонгүй.');
        if (f.health !== undefined) {
          if (f.health && !/^\d{4}-\d{2}-\d{2}$/.test(f.health)) throw fail_('invalid', 'Огноо буруу.');
          r.health = f.health || '';
        }
        if (f.license !== undefined) r.license = f.license === true;
        if (f.status !== undefined) r.status = f.status === 'blocked' ? 'blocked' : 'active';
        if (f.note !== undefined) r.note = clean_(f.note, 500);
        if (f.lang !== undefined) r.lang = clean_(f.lang, 60);
        c.wk.dirty = true;
        break;
      }
      case 'aWorkerPw': {
        const r = byId_(c.wk, p.id);
        if (!r) throw fail_('not_found', 'Ажилчин олдсонгүй.');
        const tmp = Utilities.getUuid().replace(/-/g, '').slice(0, 10);
        r.salt = Utilities.getUuid(); r.hash = hash_(tmp, r.salt); c.wk.dirty = true;
        extra = { temp: tmp };
        break;
      }
      case 'aClient': extra = saveClient_(c, p.data || {}); break;
      case 'aPayout': {
        const ids = Array.isArray(p.ids) ? p.ids : [];
        let n = 0;
        c.rg.rows.forEach(r => { if (ids.indexOf(r.dayId + '|' + r.workerId) >= 0 && r.checkOut && !r.paidAt) { r.paidAt = Date.now(); n++; } });
        if (n) c.rg.dirty = true;
        extra = { n: n };
        break;
      }
      case 'aResolve': {
        const r = byId_(c.al, p.id);
        if (r) { r.resolvedAt = Date.now(); r.resolvedBy = user; c.al.dirty = true; }
        break;
      }
      case 'aRequest': {
        const r = byId_(c.rq, p.id);
        if (!r) throw fail_('not_found', 'Хүсэлт олдсонгүй.');
        r.status = p.status === 'rejected' ? 'rejected' : 'pending'; c.rq.dirty = true;
        if (r.status === 'rejected') {
          const cl = C_(r.companyId);
          if (cl && cl.email) mail_(cl.email, 'Захиалгын хүсэлт: ' + r.title, 'Сайн байна уу. Таны "' + r.title + '" хүсэлтийг одоогоор хүлээн авах боломжгүй байна.' + (p.reason ? '\nШалтгаан: ' + clean_(p.reason, 500) : '') + '\nДэлгэрэнгүйг STM багаас асууна уу.');
        }
        break;
      }
      default: throw fail_('bad_action', 'Үл мэдэгдэх үйлдэл.');
    }
    S = state_(c);
    return Object.assign({ ok: true, S: forAdmin_(user) }, extra);
  });
}

function aCreate_(c, user, raw, requestId) {
  const d = draftFields_(raw);
  const cl = C_(d.clientId);
  if (!cl || cl.status !== COMPANY_STATUSES.active) throw fail_('invalid', 'Захиалагч сонгоно уу (идэвхтэй бүртгэлтэй).');
  const bad = legal(d).filter(x => x.block && !x.ok);
  if (bad.length) throw fail_('invalid', 'Хуулийн шаардлага: ' + bad[0].t);
  if (!d.title || !d.place || !d.letterNo) throw fail_('invalid', 'Албан бичгийн дугаар, ажлын нэр, байрыг бөглөнө үү.');
  const year = d.date.slice(0, 4);
  const seq = c.pr.rows.filter(r => String(r.no).indexOf('STM-' + year + '-') === 0).map(r => Number(String(r.no).split('-')[2]) || 0).reduce((a, b) => Math.max(a, b), 0) + 1;
  const id = 'P' + uid_().slice(0, 8);
  const to = d.multi ? d.to : d.date;
  add_(c.pr, {
    id: id, createdAt: Date.now(), no: 'STM-' + year + '-' + String(seq).padStart(3, '0'), clientId: cl.id, clientName: cl.name,
    title: d.title, cat: d.cat, place: d.place, area: d.area, from: d.date, to: to, start: d.start, end: d.end, need: d.need, rate: d.rate,
    req: d.req, transport: d.transport, letterNo: d.letterNo, letterDate: d.letterDate, contractStatus: 'draft', sentAt: '', signedAt: '', signer: '',
    paidUntil: '', requestId: requestId ? String(requestId) : '', createdBy: user
  });
  dateRange(d.date, to).forEach((dt, i) => add_(c.dy, { id: id + '-' + (i + 1), projectId: id, n: i + 1, date: dt, status: 'open', doneAt: '' }));
  if (requestId) {
    const r = byId_(c.rq, requestId);
    if (r) { r.status = 'done'; r.projectId = id; c.rq.dirty = true; }
  }
  return { id: id, single: to === d.date ? id + '-1' : '' };
}

function saveStm_(s) {
  const n = (v, lo, hi, name) => { v = Number(v); if (!(v >= lo && v <= hi)) throw fail_('invalid', name + ' буруу байна.'); return v; };
  const cur = settings_();
  const next = {
    fee: n(s.fee, 0, 100, 'Үйлчилгээний хөлс'), vat: s.vat === true, ndsh: n(s.ndsh, 0, 50, 'НДШ'), pit: n(s.pit, 0, 50, 'ХХОАТ'),
    reserveNew: s.reserveNew === true, payoutDays: Math.round(n(s.payoutDays, 0, 60, 'Олгох хоног')),
    minWage: Math.round(n(s.minWage, 100000, 10000000, 'Хөдөлмөрийн хөлсний доод хэмжээ')),
    minWageNext: s.minWageNext ? Math.round(n(s.minWageNext, 100000, 10000000, 'Дараагийн доод хэмжээ')) : '',
    minWageFrom: /^\d{4}-\d{2}-\d{2}$/.test(s.minWageFrom || '') ? s.minWageFrom : '',
    weekHours: n(s.weekHours, 1, 60, 'Долоо хоногийн цаг'), notifyStudents: s.notifyStudents === true
  };
  props_().setProperty('STM', JSON.stringify(Object.assign(cur, next)));
}

function saveTraining_(c, cid, t) {
  const cl = C_(cid);
  if (!cl) throw fail_('not_found', 'Захиалагч олдсонгүй.');
  const title = clean_(t.title, 160), video = clean_(t.video, 400);
  if (!title) throw fail_('invalid', 'Сургалтын гарчиг бичнэ үү.');
  if (video && !/^https:\/\//.test(video)) throw fail_('invalid', 'Видеоны линк https:// -ээр эхэлнэ.');
  const steps = (Array.isArray(t.steps) ? t.steps : []).map(x => clean_(x, 300)).filter(Boolean).slice(0, 30);
  const old = byId_(c.tr, cid);
  const oldWrong = {};
  ((old && old.qs) || []).forEach(q => { oldWrong[q.q] = q.wrong || 0; });
  const qs = (Array.isArray(t.qs) ? t.qs : []).slice(0, 40).map((q, i) => {
    const o = (Array.isArray(q.o) ? q.o : []).map(x => clean_(x, 200)).filter(Boolean).slice(0, 6);
    const text = clean_(q.q, 300);
    if (!text || o.length < 2) throw fail_('invalid', (i + 1) + '-р асуулт: асуулт, дор хаяж 2 хариулт бичнэ.');
    const a = Number(q.a);
    if (!(a >= 0 && a < o.length)) throw fail_('invalid', (i + 1) + '-р асуултын зөв хариултыг сонгоно уу.');
    return { q: text, o: o, a: a, wrong: oldWrong[text] || 0 };
  });
  if (!qs.length) throw fail_('invalid', 'Дор хаяж нэг асуулт нэмнэ үү.');
  const row = { id: cl.id, clientName: cl.name, title: title, video: video, mins: Math.max(0, Math.round(Number(t.mins) || 0)), pass: Math.min(100, Math.max(1, Math.round(Number(t.pass) || 70))), steps: steps, qs: qs, updatedAt: Date.now() };
  if (old) { Object.assign(old, row); c.tr.dirty = true; } else add_(c.tr, row);
}

function saveClient_(c, d) {
  const staff = Math.max(0, Math.floor(Number(d.staff) || 0));
  if (d.id) {
    const r = byId_(c.co, d.id);
    if (!r) throw fail_('not_found', 'Захиалагч олдсонгүй.');
    if (d.alias !== undefined) r.alias = clean_(d.alias, 100);
    if (d.staff !== undefined) r.staff = staff;
    if (d.org) r.org = clean_(d.org, 100);
    if (d.contactName !== undefined) r.contactName = clean_(d.contactName, 60);
    if (d.phone !== undefined) r.phone = clean_(d.phone, 20);
    if (d.status === 'active' || d.status === 'blocked') r.status = COMPANY_STATUSES[d.status];
    c.co.dirty = true;
    return {};
  }
  const email = normEmail_(d.email), org = clean_(d.org, 100);
  if (!org || !/^\S+@\S+\.\S+$/.test(email)) throw fail_('invalid', 'Байгууллагын нэр, имэйлийг бөглөнө үү.');
  if (c.co.rows.some(r => String(r.email).toLowerCase() === email)) throw fail_('exists', 'Энэ имэйлээр бүртгэл байна.');
  add_(c.co, {
    id: Utilities.getUuid(), createdAt: Date.now(), status: COMPANY_STATUSES.active, org: org, contactName: clean_(d.contactName, 60),
    phone: clean_(d.phone, 20), email: email, salt: '', hash: '', lastLogin: '', alias: clean_(d.alias, 100), staff: staff
  });
  const mailed = mail_(email, 'Student Team Mongolia: захиалагчийн бүртгэл', [
    'Сайн байна уу' + (d.contactName ? ', ' + clean_(d.contactName, 60) : '') + '.', '',
    'STM танай байгууллагад (' + org + ') захиалагчийн бүртгэл нээлээ.',
    'Доорх линкээр орж "Нууц үгээ мартсан?" дээр дарж, энэ имэйлээр нууц үгээ тохируулна уу:', '',
    siteUrl_() + 'company.html'
  ].join('\n'));
  return { mailed: mailed };
}

/* ===================== Байгууллагын бүртгэл, нэвтрэлт ===================== */

function normEmail_(e) {
  return clean_(e, 100).toLowerCase();
}

// Нууц үгийг шууд хадгалахгүй: salt + SHA-256-г олон давтана.
function hash_(pw, salt) {
  let h = salt + '|' + pw;
  for (let i = 0; i < HASH_ROUNDS; i++) {
    h = Utilities.base64Encode(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function findCompany_(by, value) {
  const sh = table_(COMPANIES), K = COMPANIES.keys, n = sh.getLastRow() - 1;
  const data = n > 0 ? sh.getRange(2, 1, n, K.length).getValues() : [];
  const i = data.findIndex(r => String(r[K.indexOf(by)]).toLowerCase() === String(value).toLowerCase());
  return i < 0 ? null : { row: i + 2, co: parse_(data[i], COMPANIES) };
}

function setCompanyFields_(row, fields) {
  const sh = table_(COMPANIES);
  Object.keys(fields).forEach(k => {
    const v = fields[k];
    sh.getRange(row, COMPANIES.keys.indexOf(k) + 1).setValue(v instanceof Date || typeof v === 'number' ? v : text_(String(v)));
  });
}

function publicCompany_(c) {
  return { id: c.id, createdAt: c.createdAt, status: c.status, org: c.org, contactName: c.contactName, phone: c.phone, email: c.email, lastLogin: c.lastLogin, alias: c.alias, staff: c.staff };
}

function checkPassword_(pw, email) {
  pw = String(pw || '');
  if (pw.length < 8) throw fail_('invalid', 'Нууц үг 8-аас дээш тэмдэгттэй байна.');
  if (pw.toLowerCase() === String(email).toLowerCase()) throw fail_('invalid', 'Нууц үг имэйлтэйгээ ижил байж болохгүй.');
  return pw;
}

// 6 оронтой кодыг имэйлээр илгээнэ. Код 15 минут хүчинтэй, 5 удаа буруу оруулбал хүчингүй.
function sendCode_(email, purpose) {
  const cache = CacheService.getScriptCache();
  const sent = Number(cache.get('codesent_' + email) || 0);
  if (sent >= 5) throw fail_('busy', 'Хэт олон код хүссэн байна. 15 минутын дараа дахин оролдоно уу.');
  if (MailApp.getRemainingDailyQuota() < 1) throw fail_('mail', 'Өнөөдөр имэйл илгээх хязгаар дууссан. Маргааш дахин оролдоно уу.');
  const code = String(parseInt(Utilities.getUuid().replace(/-/g, '').slice(0, 8), 16) % 1000000).padStart(6, '0');
  cache.put('code_' + email, JSON.stringify({ code: code, purpose: purpose, tries: 0 }), CODE_MINUTES * 60);
  cache.put('codesent_' + email, String(sent + 1), CODE_MINUTES * 60);
  MailApp.sendEmail(email, 'Student Team Mongolia: баталгаажуулах код ' + code, [
    'Таны код: ' + code, '',
    purpose === 'verify' ? 'Энэ кодоор байгууллагын бүртгэлээ баталгаажуулна.' : 'Энэ кодоор нууц үгээ шинэчилнэ.',
    'Код ' + CODE_MINUTES + ' минут хүчинтэй. Та хүсээгүй бол энэ имэйлийг үл тоомсорлоно уу.'
  ].join('\n'));
}

function takeCode_(email, code, purpose) {
  const cache = CacheService.getScriptCache();
  let c = null;
  try { c = JSON.parse(cache.get('code_' + email) || 'null'); } catch (e) {}
  if (!c || c.purpose !== purpose) throw fail_('invalid', 'Код хүчингүй болсон байна. Шинэ код авна уу.');
  if (String(code || '').trim() !== c.code) {
    c.tries++;
    if (c.tries >= 5) cache.remove('code_' + email);
    else cache.put('code_' + email, JSON.stringify(c), CODE_MINUTES * 60);
    throw fail_('invalid', 'Код буруу байна.');
  }
  cache.remove('code_' + email);
}

function cRegister_(d) {
  if (d.website) return { ok: true };
  const c = {
    org: clean_(d.org, 100), contactName: clean_(d.contactName, 60),
    phone: clean_(d.phone, 20), email: normEmail_(d.email), staff: Math.max(0, Math.floor(Number(d.staff) || 0))
  };
  const miss = [];
  if (!c.org) miss.push('байгууллагын нэр');
  if (!c.contactName) miss.push('холбогдох хүн');
  if (c.phone.replace(/\D/g, '').length < 8) miss.push('утас (8 оронтой)');
  if (!/^\S+@\S+\.\S+$/.test(c.email)) miss.push('имэйл');
  if (!c.staff) miss.push('ажилтны тоо');
  if (miss.length) throw fail_('invalid', 'Дараахыг бөглөнө үү: ' + miss.join(', '));
  const pw = checkPassword_(d.password, c.email);

  const cache = CacheService.getScriptCache();
  const regs = Number(cache.get('regs') || 0);
  if (regs >= 20) throw fail_('busy', 'Хэт олон бүртгэл ирж байна. Түр хүлээгээд дахин оролдоно уу.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const found = findCompany_('email', c.email);
    if (found && found.co.status !== COMPANY_STATUSES.unverified) throw fail_('exists', 'Энэ имэйлээр бүртгэл байна. Нэвтэрнэ үү.');
    const salt = Utilities.getUuid();
    if (found) {
      setCompanyFields_(found.row, { org: c.org, contactName: c.contactName, phone: c.phone, staff: c.staff, salt: salt, hash: hash_(pw, salt) });
    } else {
      const row = { id: Utilities.getUuid(), createdAt: Date.now(), status: COMPANY_STATUSES.unverified, org: c.org, contactName: c.contactName, phone: c.phone, email: c.email, salt: salt, hash: hash_(pw, salt), lastLogin: '', alias: '', staff: c.staff };
      table_(COMPANIES).appendRow(serialize_(row, COMPANIES));
    }
    cache.put('regs', String(regs + 1), 3600);
  } finally {
    lock.releaseLock();
  }
  sendCode_(c.email, 'verify');
  return { ok: true, email: c.email };
}

function cVerify_(email, code) {
  email = normEmail_(email);
  const found = findCompany_('email', email);
  if (!found) throw fail_('invalid', 'Бүртгэл олдсонгүй.');
  takeCode_(email, code, 'verify');
  if (found.co.status === COMPANY_STATUSES.unverified) setCompanyFields_(found.row, { status: COMPANY_STATUSES.active });
  notifyAdmin_('Шинэ захиалагч бүртгүүллээ: ' + found.co.org, [
    found.co.org, 'Холбогдох: ' + found.co.contactName + ', ' + found.co.phone + ', ' + email,
    'Админ апп → Захиалагчид хэсгээс "Оюутанд харагдах нэр"-ийг тохируулна уу.'
  ]);
  return cSession_(found.row, findCompany_('email', email).co);
}

function cLogin_(email, pw) {
  email = normEmail_(email);
  const cache = CacheService.getScriptCache();
  const key = 'cfail_' + email, fails = Number(cache.get(key) || 0);
  if (fails >= 5) throw fail_('locked', 'Олон удаа буруу оруулсан тул 10 минут түгжигдлээ.');
  const found = findCompany_('email', email);
  if (!found || !found.co.hash || hash_(String(pw || ''), found.co.salt) !== found.co.hash) {
    cache.put(key, String(fails + 1), 600);
    throw fail_('auth', 'Имэйл эсвэл нууц үг буруу байна.');
  }
  cache.remove(key);
  if (found.co.status === COMPANY_STATUSES.blocked) throw fail_('blocked', 'Энэ бүртгэлийг хаасан байна. Админтай холбогдоно уу.');
  if (found.co.status === COMPANY_STATUSES.unverified) {
    sendCode_(email, 'verify');
    throw fail_('unverified', 'Имэйлээ баталгаажуулна уу. Таны имэйл рүү шинэ код илгээлээ.');
  }
  return cSession_(found.row, found.co);
}

// Бүртгэл байгаа эсэхийг задруулахгүйн тулд үргэлж ok буцаана.
function cForgot_(email) {
  email = normEmail_(email);
  const found = findCompany_('email', email);
  if (found && found.co.status !== COMPANY_STATUSES.blocked) sendCode_(email, 'reset');
  return { ok: true };
}

function cReset_(email, code, pw) {
  email = normEmail_(email);
  const found = findCompany_('email', email);
  if (!found || found.co.status === COMPANY_STATUSES.blocked) throw fail_('invalid', 'Код хүчингүй болсон байна. Шинэ код авна уу.');
  pw = checkPassword_(pw, email);
  takeCode_(email, code, 'reset');
  const salt = Utilities.getUuid();
  setCompanyFields_(found.row, { salt: salt, hash: hash_(pw, salt), status: found.co.status === COMPANY_STATUSES.unverified ? COMPANY_STATUSES.active : found.co.status });
  return cSession_(found.row, findCompany_('email', email).co);
}

function cSession_(row, co) {
  setCompanyFields_(row, { lastLogin: new Date() });
  const exp = Date.now() + TOKEN_DAYS * 864e5;
  return { ok: true, token: 'c.' + exp + '.' + co.id + '.' + cSign_(exp, co), company: publicCompany_(co) };
}

// Нууц үг солигдох эсвэл бүртгэл хаагдахад token хүчингүй болно.
function cSign_(exp, co) {
  sign_(0, '');
  const key = props_().getProperty('TOKEN_SECRET') + '|c|' + co.hash;
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(exp + '|' + co.id, key));
}

function cPassword_(co, current, next) {
  if (!co.hash || hash_(String(current || ''), co.salt) !== co.hash) throw fail_('invalid', 'Одоогийн нууц үг буруу байна.');
  next = checkPassword_(next, co.email);
  const found = findCompany_('id', co.id), salt = Utilities.getUuid();
  setCompanyFields_(found.row, { salt: salt, hash: hash_(next, salt) });
  return cSession_(found.row, findCompany_('id', co.id).co);
}

/* ===================== Админы нэвтрэлт, тохиргоо ===================== */

function login_(user, pw) {
  const cache = CacheService.getScriptCache();
  const fails = Number(cache.get('fails') || 0);
  if (fails >= 5) throw fail_('locked', 'Олон удаа буруу оруулсан тул 10 минут түгжигдлээ.');
  if (!admins_().length) throw fail_('setup', 'Админ тохируулаагүй байна.');
  user = String(user || '').trim();
  const real = adminPassword_(user);
  if (real === null || String(pw || '') !== real) {
    cache.put('fails', String(fails + 1), 600);
    throw fail_('auth', 'Нэр эсвэл нууц үг буруу байна.');
  }
  cache.remove('fails');
  return { ok: true, user: user, token: token_(user) };
}

function token_(user) {
  const exp = Date.now() + TOKEN_DAYS * 864e5;
  const u = Utilities.base64EncodeWebSafe(user, Utilities.Charset.UTF_8);
  return exp + '.' + u + '.' + sign_(exp, user);
}

function auth_(token) {
  const parts = String(token || '').split('.');
  let user = '';
  try { user = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[1] || '')).getDataAsString('UTF-8'); } catch (e) {}
  const sig = user && adminPassword_(user) !== null ? sign_(parts[0], user) : null;
  if (parts.length !== 3 || Number(parts[0]) < Date.now() || !sig || parts[2] !== sig) {
    throw fail_('auth', 'Дахин нэвтэрнэ үү.');
  }
  return user;
}

// Property-ийн нэр = нэвтрэх нэр, утга = нууц үг. Тохиргооны нэрс админ биш.
function admins_() {
  return Object.keys(props_().getProperties()).filter(k => RESERVED.indexOf(k) < 0);
}

function adminPassword_(user) {
  if (!user || RESERVED.indexOf(user) >= 0) return null;
  const pw = props_().getProperty(user);
  return pw ? pw : null;
}

// Нууц үг солигдох эсвэл админ устгагдахад тэр админы token хүчингүй болно.
function sign_(exp, user) {
  const p = props_();
  let secret = p.getProperty('TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    p.setProperty('TOKEN_SECRET', secret);
  }
  const key = secret + '|' + adminPassword_(user);
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(exp + '|' + user, key));
}

function config_() {
  let c = {};
  try { c = JSON.parse(props_().getProperty('CONFIG') || '{}'); } catch (e) {}
  const legacy = props_().getProperty('NOTIFY_EMAIL');
  return {
    notify: c.notify !== undefined ? c.notify : legacy !== 'off',
    notifyEmail: c.notifyEmail !== undefined ? c.notifyEmail : (legacy && legacy !== 'off' ? legacy : '')
  };
}

function getSettings_(user) {
  const c = config_();
  c.user = user;
  c.ownerEmail = Session.getEffectiveUser().getEmail();
  c.admins = admins_().sort();
  c.maxAdmins = MAX_ADMINS;
  c.mailQuota = MailApp.getRemainingDailyQuota();
  return { ok: true, config: c };
}

function saveConfig_(s) {
  const email = clean_(s.notifyEmail, 100);
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw fail_('invalid', 'Имэйл хаяг буруу байна.');
  let c = {};
  try { c = JSON.parse(props_().getProperty('CONFIG') || '{}'); } catch (e) {}
  c.notify = s.notify === true;
  c.notifyEmail = email;
  props_().setProperty('CONFIG', JSON.stringify(c));
  return getSettings_('');
}

function changePassword_(user, current, next) {
  if (adminPassword_(user) !== String(current || '')) throw fail_('invalid', 'Одоогийн нууц үг буруу байна.');
  next = String(next || '');
  if (next.length < 8) throw fail_('invalid', 'Шинэ нууц үг 8-аас дээш тэмдэгттэй байна.');
  if (next === user) throw fail_('invalid', 'Нууц үг нэвтрэх нэртэйгээ ижил байж болохгүй.');
  props_().setProperty(user, next);
  return { ok: true, token: token_(user) };
}

function addAdmin_(name, password) {
  name = String(name || '').trim();
  password = String(password || '');
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(name)) {
    throw fail_('invalid', 'Нэвтрэх нэр 3–30 тэмдэгт, зөвхөн латин үсэг, тоо, . _ - байна.');
  }
  if (RESERVED.some(r => r.toLowerCase() === name.toLowerCase())) throw fail_('invalid', 'Энэ нэрийг ашиглах боломжгүй.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const list = admins_();
    if (list.some(a => a.toLowerCase() === name.toLowerCase())) throw fail_('invalid', 'Ийм нэртэй админ байна.');
    if (list.length >= MAX_ADMINS) throw fail_('invalid', 'Хамгийн ихдээ ' + MAX_ADMINS + ' админ байна.');
    if (password.length < 8) throw fail_('invalid', 'Нууц үг 8-аас дээш тэмдэгттэй байна.');
    if (password === name) throw fail_('invalid', 'Нууц үг нэвтрэх нэртэйгээ ижил байж болохгүй.');
    props_().setProperty(name, password);
    return { ok: true, admins: admins_().sort() };
  } finally {
    lock.releaseLock();
  }
}

function removeAdmin_(user, name) {
  name = String(name || '');
  if (name === user) throw fail_('invalid', 'Өөрийгөө устгах боломжгүй.');
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const list = admins_();
    if (list.indexOf(name) < 0) throw fail_('not_found', 'Админ олдсонгүй.');
    if (list.length <= 1) throw fail_('invalid', 'Сүүлчийн админыг устгах боломжгүй.');
    props_().deleteProperty(name);
    return { ok: true, admins: admins_().sort() };
  } finally {
    lock.releaseLock();
  }
}

/* ===================== Туслах ===================== */

function siteUrl_() {
  let u = props_().getProperty('SITE_URL') || DEFAULT_SITE_URL;
  if (!/\/$/.test(u)) u += '/';
  return u;
}

function mail_(to, subject, body) {
  try {
    if (!to || MailApp.getRemainingDailyQuota() < 1) return false;
    MailApp.sendEmail(to, subject, body);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
}

// urgent=true бол "мэдэгдэл унтраасан" тохиргоог үл харгалзан илгээнэ (SOS, ирээгүй).
function notifyAdmin_(subject, lines, urgent) {
  const c = config_();
  if (!c.notify && !urgent) return;
  const to = c.notifyEmail || Session.getEffectiveUser().getEmail();
  if (!to) return;
  const url = props_().getProperty('ADMIN_URL') || siteUrl_() + 'admin.html';
  mail_(to, subject, lines.concat(['\nАдмин апп: ' + url]).filter(Boolean).join('\n'));
}

function clean_(v, max) {
  return String(v === null || v === undefined ? '' : v)
    .replace(/[\u0000-\u0009\u000b-\u001f\u007f]/g, '')
    .trim()
    .slice(0, max);
}

// Урд нь ' тавьснаар текст хэвээр хадгалагдана: утасны дугаар тоо болохгүй, "=" томьёо ажиллахгүй.
function text_(v) {
  return typeof v === 'string' && v !== '' ? "'" + v : v;
}

function props_() {
  return PropertiesService.getScriptProperties();
}

function fail_(code, message) {
  const e = new Error(message);
  e.code = code;
  return e;
}

function out_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
