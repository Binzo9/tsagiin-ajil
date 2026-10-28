/* =====================================================================
 * Student Team Mongolia — апп (index.html / company.html / admin.html)
 * ROLE-ийг HTML хуудас тодорхойлно: "student" | "client" | "admin".
 * logic.js, config.js-ийн дараа ачаална.
 * ===================================================================== */
"use strict";
const LOGO = "icons/logo.png";
const TOKEN_KEY = "stm-token-" + ROLE;
let TOKEN = null;
try { TOKEN = localStorage.getItem(TOKEN_KEY); } catch (e) {}
let TODAY = "";
let authView = ROLE === "client" && location.hash === "#register" ? "register" : "login", authMsg = "", authData = {};
const V = { aview: "dash", sview: "home", cview: "home", openOrder: null, openProj: null, docUnit: null, chatWith: null, trainClient: null, statUnit: null, editTrain: null };

/* ===================== API ===================== */
function apiReady() { return typeof API_URL === "string" && /^https?:\/\//.test(API_URL); }
async function api(action, data) {
  let res;
  try {
    res = await fetch(API_URL, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(Object.assign({ action }, data || {})) });
  } catch (e) { throw Object.assign(new Error("Интернэт холболтоо шалгана уу."), { code: "network" }); }
  let json;
  try { json = await res.json(); } catch (e) { throw Object.assign(new Error("Сервер буруу хариу өглөө."), { code: "server" }); }
  if (!json.ok) throw Object.assign(new Error(json.error || "Алдаа гарлаа."), { code: json.code });
  return json;
}
let busyN = 0;
function setBusy(d) { busyN = Math.max(0, busyN + d); document.body.classList.toggle("busy", busyN > 0); }
function setToken(t) { TOKEN = t; try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch (e) {} }
function logout(msg) { setToken(null); S = null; authView = "login"; authMsg = msg || ""; closeModal(); render(); }

// Нэвтэрсэн үйлдэл: сервер шинэ төлөв буцаана → дахин зурна.
async function call(action, data, okMsg) {
  setBusy(1);
  try {
    const r = await api(action, Object.assign({ token: TOKEN }, data || {}));
    if (r.token) setToken(r.token);
    if (r.S) applyState(r.S);
    render();
    const m = typeof okMsg === "function" ? okMsg(r) : okMsg;
    if (m) toast(m);
    return r;
  } catch (e) {
    if (e.code === "auth") { logout(e.message); return null; }
    toast(e.message, true);
    throw e;
  } finally { setBusy(-1); }
}
async function loadState(silent) {
  if (!TOKEN) return;
  const act = { student: "sState", client: "cState", admin: "aState" }[ROLE];
  try {
    if (!silent) setBusy(1);
    const r = await api(act, { token: TOKEN });
    applyState(r.S);
    if (silent && !safeToRerender()) return;
    render();
    if (ROLE === "student") handlePendingAtt();
  } catch (e) {
    if (e.code === "auth") logout(e.message);
    else if (!silent) { if (!S) { authMsg = e.message; render(); } else toast(e.message, true); }
  } finally { if (!silent) setBusy(-1); }
}
function applyState(st) {
  S = st; TODAY = S.today;
  if (!S.settings) S.settings = DEFAULT_SETTINGS;
}
function safeToRerender() {
  if ($("#layer") && $("#layer").innerHTML) return false;
  const a = document.activeElement;
  if (a && /^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) return false;
  if (draft || reqDraft || (quiz && quiz.step === "test") || V.editTrain) return false;
  return true;
}
setInterval(() => { if (TOKEN && S && document.visibilityState === "visible") loadState(true); }, 60000);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && TOKEN && S) loadState(true); });

/* ===================== Туслах ===================== */
const $ = s => document.querySelector(s);
const esc = v => String(v == null ? "" : v).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const pct = (a, b) => b ? Math.round(a / b * 100) : 0;
function placeFor(o, w) { const a = o.apps.find(x => x.wid === w.id); return a && a.st === "confirmed" && o.place ? o.place : (o.area || "Байршлыг баталгаажуулсны дараа харуулна"); }
function isSingle(pid) { return daysOf(P_(pid)).length === 1; }
function fmtTs(ms) { if (!ms) return ""; const d = new Date(+ms); return d.getFullYear() + "-" + pad2(d.getMonth() + 1) + "-" + pad2(d.getDate()) + " " + pad2(d.getHours()) + ":" + pad2(d.getMinutes()); }
function val(id) { const el = $("#" + id); return el ? el.value.trim() : ""; }
function checked(id) { const el = $("#" + id); return !!(el && el.checked); }

/* ---------- Туршилт: CSV, байршил ---------- */
const BETA = '<span class="pill p-sun" title="Туршилтын боломж">Туршилт</span>';
function downloadCSV(fname, header, rows) {
  const q = v => { v = v == null ? "" : String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
  const text = "\uFEFF" + [header].concat(rows).map(r => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  a.download = fname; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}
function getPos() {
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude.toFixed(6), lng: p.coords.longitude.toFixed(6) }), () => res(null), { timeout: 10000, enableHighAccuracy: true, maximumAge: 0 });
  });
}
const icons = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/></svg>',
  jobs: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>',
  mine: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/></svg>',
  pay: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="13" rx="2"/><circle cx="12" cy="12.5" r="2.5"/></svg>',
  me: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
  play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>'
};
function pill(st) { const x = ST[st] || [st, "p-grey"]; return `<span class="pill ${x[1]}">${x[0]}</span>`; }
function bar(v, color) { return `<div class="bar" title="${Math.round(v)}/100"><i style="width:${Math.max(0, Math.min(100, v))}%;${color ? "background:" + color : ""}"></i></div>`; }
function reqTags(o) { const t = []; if (o.req.health) t.push("Цагаан хуудас"); if (o.req.license) t.push("Жолооны үнэмлэх"); if (o.req.lang) t.push("Гадаад хэл"); if (o.req.adult || nightEnd(o)) t.push("18+"); return t.map(x => `<span class="tag">${x}</span>`).join(" "); }
let toastT;
function toast(t, bad) { const el = document.createElement("div"); el.className = "toast" + (bad ? " bad" : ""); el.textContent = t; el.setAttribute("role", "status"); document.querySelectorAll(".toast").forEach(x => x.remove()); document.body.append(el); clearTimeout(toastT); toastT = setTimeout(() => el.remove(), bad ? 5000 : 3200); }
function modal(html) { $("#layer").innerHTML = `<div class="scrim" data-a="closeModal"><div class="modal" role="dialog" aria-modal="true">${html}</div></div>`; const f = $("#layer input,#layer textarea"); if (f) setTimeout(() => f.focus(), 30); }
function closeModal() { const l = $("#layer"); if (l) l.innerHTML = ""; }
let askFn = null;
function ask(text, label, fn, danger) { askFn = fn; modal(`<h2>${esc(text)}</h2><div class="row"><button class="btn ${danger ? "danger" : "primary"}" data-a="askYes">${esc(label)}</button><button class="btn" data-a="closeModal">Болих</button></div>`); }
function dayState(o) { return o.status === "done" ? ["Дууссан", "p-grey"] : o.date === TODAY ? ["Өнөөдөр", "p-sun"] : o.date < TODAY ? ["Хаагаагүй", "p-warn"] : ["Ирэх", "p-blue"]; }

/* ===================== Үндсэн зураг ===================== */
const ROLE_LABEL = { admin: "Админ", client: "Захиалагч", student: "Оюутан" };
function header() {
  let who = "";
  if (S) {
    if (ROLE === "admin") who = S.me;
    if (ROLE === "client") who = (C_(S.me) || {}).name;
    if (ROLE === "student") who = name(W_(S.me));
  }
  return `<header class="top">
    <div class="brand"><img src="${LOGO}" alt="STM"><span>Student Team Mongolia</span></div>
    <div class="row">
      <span class="demo">${ROLE_LABEL[ROLE]}${who ? " · " + esc(who) : ""}</span>
      ${S ? `<button class="btn sm" data-a="refresh" title="Шинэчлэх">↻</button><button class="btn sm" data-a="logout">Гарах</button>` : ""}
    </div>
  </header>`;
}
function render() {
  const app = $("#app");
  if (!apiReady()) { app.innerHTML = header() + `<main class="main"><div class="wrap" style="max-width:560px"><div class="alert warn">config.js файлд Apps Script-ийн URL-ийг оруулна уу (README-г үзнэ үү).</div></div></main>`; return; }
  if (!TOKEN || !S) {
    app.innerHTML = header() + (TOKEN ? `<main class="main"><div class="wrap" style="max-width:480px">${authMsg ? `<div class="alert bad">${esc(authMsg)}</div><button class="btn" data-a="logout">Дахин нэвтрэх</button>` : '<p class="muted">Ачааллаж байна…</p>'}</div></main>` : authScreen());
    return;
  }
  app.innerHTML = header() + (ROLE === "admin" ? adminShell() : ROLE === "client" ? clientView() : studentShell(W_(S.me)));
  clearInterval(liveI);
  if (document.querySelector("[data-live]")) startLive();
  if (draft) renderChecks();
  if (reqDraft) renderChecks();
}

/* ===================== Нэвтрэх, бүртгүүлэх ===================== */
function authWrap(inner) {
  const cls = ROLE === "student" ? "phone" : "";
  return `<div class="${cls}"><main class="main"><div class="wrap auth">${inner}</div></main></div>`;
}
function authNote() { return authMsg ? `<div class="alert ${/илгээлээ|амжилттай|илгээгдлээ/.test(authMsg) ? "ok" : "bad"}">${esc(authMsg)}</div>` : ""; }
function authScreen() {
  const v = authView;
  if (ROLE === "admin") {
    return authWrap(`<h1>Админ нэвтрэх</h1>${authNote()}<form class="card" data-form="aLogin">
      <label class="f">Нэвтрэх нэр<input id="au_user" type="text" autocomplete="username" required></label>
      <label class="f">Нууц үг<input id="au_pw" type="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit">Нэвтрэх</button></form>`);
  }
  if (ROLE === "client") {
    if (v === "register") return authWrap(`<h1>Захиалагчаар бүртгүүлэх</h1>${authNote()}<form class="card" data-form="cRegister">
      <label class="f">Байгууллагын нэр<input id="cr_org" type="text" required></label>
      <label class="f">Холбогдох хүн<input id="cr_contact" type="text" required></label>
      <div class="grid2"><label class="f">Утас<input id="cr_phone" type="tel" inputmode="tel" required></label>
      <label class="f">Ажилтны тоо<input id="cr_staff" type="number" min="1" required></label></div>
      <label class="f">Имэйл<input id="cr_email" type="email" autocomplete="email" required></label>
      <label class="f">Нууц үг (8+ тэмдэгт)<input id="cr_pw" type="password" autocomplete="new-password" minlength="8" required></label>
      <input id="cr_web" type="text" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
      <p class="small muted">Ажилтны тоо нь хуулийн 30%-ийн хязгаарыг шалгахад хэрэгтэй. Имэйл рүү 6 оронтой код очно.</p>
      <button class="btn primary" type="submit">Бүртгүүлэх</button></form>
      <button class="linkbtn" data-a="authView" data-v="login">Бүртгэлтэй юу? Нэвтрэх</button>`);
    if (v === "verify") return authWrap(`<h1>Имэйлээ баталгаажуулах</h1>${authNote()}<form class="card" data-form="cVerify">
      <p class="small">${esc(authData.email)} хаяг руу 6 оронтой код илгээлээ.</p>
      <label class="f">Код<input id="cv_code" type="text" inputmode="numeric" maxlength="6" required></label>
      <button class="btn primary" type="submit">Баталгаажуулах</button></form>
      <button class="linkbtn" data-a="authView" data-v="login">Буцах</button>`);
    if (v === "forgot") return authWrap(`<h1>Нууц үг сэргээх</h1>${authNote()}<form class="card" data-form="cForgot">
      <label class="f">Имэйл<input id="cf_email" type="email" value="${esc(authData.email || "")}" required></label>
      <button class="btn primary" type="submit">Код авах</button></form>
      ${authData.sent ? `<form class="card" data-form="cReset"><label class="f">Имэйлд ирсэн код<input id="cf_code" type="text" inputmode="numeric" maxlength="6" required></label>
      <label class="f">Шинэ нууц үг (8+)<input id="cf_pw" type="password" autocomplete="new-password" minlength="8" required></label>
      <button class="btn primary" type="submit">Нууц үг тохируулах</button></form>` : ""}
      <button class="linkbtn" data-a="authView" data-v="login">Буцах</button>`);
    return authWrap(`<h1>Захиалагчийн булан</h1><p class="muted">Гэрээ зурах, өнөөдрийн багаа харах, ирцийн QR код, ажилтнуудаа үнэлэх.</p>${authNote()}<form class="card" data-form="cLogin">
      <label class="f">Имэйл<input id="cl_email" type="email" autocomplete="email" required></label>
      <label class="f">Нууц үг<input id="cl_pw" type="password" autocomplete="current-password" required></label>
      <button class="btn primary" type="submit">Нэвтрэх</button></form>
      <div class="row between"><button class="linkbtn" data-a="authView" data-v="register">Шинээр бүртгүүлэх</button><button class="linkbtn" data-a="authView" data-v="forgot">Нууц үгээ мартсан?</button></div>`);
  }
  // оюутан
  if (v === "register") return authWrap(`<h1>Бүртгүүлэх</h1><p class="small muted">Нэг удаа бүртгүүлээд таны сул цагт таарах цагийн ажлуудад өдрөө сонгон бүртгүүлнэ.</p>${authNote()}<form class="card" data-form="sRegister">
    <div class="grid2"><label class="f">Овог<input id="sr_last" type="text" required></label><label class="f">Нэр<input id="sr_first" type="text" required></label></div>
    <div class="grid2"><label class="f">Утас<input id="sr_phone" type="tel" inputmode="numeric" placeholder="9911 2233" required></label><label class="f">Төрсөн огноо<input id="sr_birth" type="date" required></label></div>
    <label class="f">Имэйл (нууц үг сэргээх, мэдэгдэл авахад)<input id="sr_email" type="email" autocomplete="email"></label>
    <div class="grid2"><label class="f">Сургууль<input id="sr_school" type="text" placeholder="МУИС"></label><label class="f">Мэргэжил, курс<input id="sr_major" type="text" placeholder="Эдийн засаг, 2-р курс"></label></div>
    <label class="f">Гадаад хэл<input id="sr_lang" type="text" placeholder="Англи"></label>
    <div><div class="small" style="font-weight:700;margin-bottom:6px">Сул өдөр</div><div class="row">${DAYS.map((d, i) => `<label class="daychip"><input type="checkbox" name="sr_day" value="${i}"><span>${d}</span></label>`).join("")}</div></div>
    <div><div class="small" style="font-weight:700;margin-bottom:6px">Сул цаг</div><div class="row">${SHIFTS.map((s, i) => `<label class="daychip"><input type="checkbox" name="sr_shift" value="${i}"><span>${s}</span></label>`).join("")}</div><div class="small muted" style="margin-top:4px">Өглөө 12:00 хүртэл · Өдөр 12–17 · Орой 17:00-аас</div></div>
    <label class="f">Нууц үг (8+ тэмдэгт)<input id="sr_pw" type="password" autocomplete="new-password" minlength="8" required></label>
    <input id="sr_web" type="text" tabindex="-1" autocomplete="off" class="hp" aria-hidden="true">
    <details><summary class="small">Ерөнхий гэрээ (хураангуй)</summary>${generalContract()}</details>
    <label class="chk"><input type="checkbox" id="sr_consent"> Ерөнхий гэрээ болон хувийн мэдээлэл ашиглах нөхцөлийг зөвшөөрч байна</label>
    <button class="cta" type="submit" style="justify-self:start">Бүртгүүлэх</button></form>
    <button class="linkbtn" data-a="authView" data-v="login">Бүртгэлтэй юу? Нэвтрэх</button>`);
  if (v === "forgot") return authWrap(`<h1>Нууц үг сэргээх</h1>${authNote()}<form class="card" data-form="sForgot">
    <label class="f">Бүртгэлтэй утас<input id="sf_phone" type="tel" inputmode="numeric" value="${esc(authData.phone || "")}" required></label>
    <button class="btn primary" type="submit">Имэйлээр код авах</button>
    <p class="small muted">Бүртгэлдээ имэйл оруулаагүй бол STM багт хандаж түр нууц үг авна.</p></form>
    ${authData.sent ? `<form class="card" data-form="sReset"><label class="f">Имэйлд ирсэн код<input id="sf_code" type="text" inputmode="numeric" maxlength="6" required></label>
    <label class="f">Шинэ нууц үг (8+)<input id="sf_pw" type="password" autocomplete="new-password" minlength="8" required></label>
    <button class="btn primary" type="submit">Нууц үг тохируулах</button></form>` : ""}
    <button class="linkbtn" data-a="authView" data-v="login">Буцах</button>`);
  return authWrap(`<section class="hero"><div class="eyebrow">Оюутны цагийн ажил</div><h2>Сул цагтаа ажиллаж, ээлж бүрээр цалингаа ав</h2><div class="facts"><span>Өдрөө өөрөө сонгоно</span><span>Ирцийг QR-ээр</span><span>Цалин ${S && S.settings ? S.settings.payoutDays : 7} хоногт</span></div></section>
    ${authNote()}${pendingAttNote()}<form class="card" data-form="sLogin">
    <label class="f">Утас<input id="sl_phone" type="tel" inputmode="numeric" autocomplete="username" required></label>
    <label class="f">Нууц үг<input id="sl_pw" type="password" autocomplete="current-password" required></label>
    <button class="cta" type="submit" style="justify-self:start">Нэвтрэх</button></form>
    <div class="row between"><button class="linkbtn" data-a="authView" data-v="register">Шинээр бүртгүүлэх</button><button class="linkbtn" data-a="authView" data-v="forgot">Нууц үгээ мартсан?</button></div>`);
}
function generalContract() {
  const pd = (S && S.settings && S.settings.payoutDays) || 7;
  return `<ol style="margin:8px 0 0;padding-left:20px;display:grid;gap:6px;font-size:.86rem"><li>ЭС ТИ ЭМ БАГ ХХК таныг захиалагч байгууллагуудад цагийн ажилд нийлүүлнэ.</li><li>Ажил бүрийн цаг, хөлс, байрыг ажил хүлээн авах үед баталгаажуулна.</li><li>Хөлсийг цагаар тооцож, ээлж дууссанаас хойш ${pd} хоногт олгоно. НДШ, ХХОАТ суутгана.</li><li>Та ажлаас татгалзах эрхтэй. Баталгаажуулсан ээлжээс 24 цагаас өмнө мэдэгдэнэ.</li><li>Таны мэдээллийг зөвхөн ажилд зуучлах зорилгоор ашиглана. Захиалагч зөвхөн таны нэрийг харна.</li></ol><p class="small muted">Жинхэнэ гэрээний текстийг хуульчаар хянуулна.</p>`;
}

/* ===================== АДМИН ===================== */
function adminShell() {
  const waiting = S.orders.filter(o => o.status === "open" && signed(o)).reduce((s, o) => s + o.apps.filter(a => a.st === "applied").length, 0);
  const reqs = S.requests.filter(r => r.status === "pending").length;
  const unpaid = payoutRows().length;
  const nav = [["dash", "Хяналт", S.sos.length], ["stats", "Тайлан, судалгаа"], ["orders", "Төсөл, захиалга", waiting + reqs], ["workers", "Ажилчид"], ["clients", "Захиалагчид"], ["train", "Сургалт, тест"], ["chat", "Мессеж", S.adminUnread], ["docs", "Гэрээ, нэхэмжлэх"], ["payouts", "Цалин олголт", unpaid], ["settings", "Тохиргоо"]];
  const v = V.aview;
  const views = { dash: aDash, stats: aStats, orders: aOrders, workers: aWorkers, clients: aClients, train: aTrain, chat: aChat, docs: aDocs, payouts: aPayouts, settings: aSettings };
  return `<div class="shell"><nav class="side" aria-label="Админ цэс">${nav.map(([k, t, b]) => `<button data-a="aview" data-v="${k}" ${v === k ? 'aria-current="page"' : ""}><span>${t}</span>${b ? `<span class="badge">${b}</span>` : ""}</button>`).join("")}</nav>
  <main class="main"><div class="wrap">${views[v]()}</div></main></div>`;
}
function alertsList() {
  const al = [];
  S.orders.forEach(o => o.apps.forEach(a => { if (a.leave && a.leave.st === "pending" && o.status === "open") { const w = W_(a.wid); al.push(["warn", `Чөлөө хүсэв: ${name(w)} — ${shortDate(o.date)} "${o.title}" ${o.start}–${o.end}. Шалтгаан: ${a.leave.reason}`, `<button class="btn sm primary" data-a="leaveOk" data-v="${o.id}|${a.wid}">Зөвшөөрөх</button><button class="btn sm" data-a="leaveNo" data-v="${o.id}|${a.wid}">Татгалзах</button>`]); } }));
  S.sos.forEach(s => {
    const w = W_(s.w), o = O_(s.o);
    const t = s.noshow ? `${name(w)} ${o ? shortDate(o.date) : ""}-ны ээлжид ирээгүй (хариуцагч ${s.at.slice(11)}) — орлох хүн гаргана уу` : `ЯАРАЛТАЙ: ${name(w)} тусламж хүссэн (${s.at})${w ? " · утас " + w.phone : ""}`;
    al.push(["bad", t, `${s.loc ? `<a class="btn sm" target="_blank" rel="noopener" href="https://maps.google.com/?q=${encodeURIComponent(s.loc.lat + "," + s.loc.lng)}">Байршил</a>` : ""}<button class="btn sm" data-a="resolve" data-v="${s.id}">Шийдсэн</button>`]);
  });
  S.orders.forEach(o => { if (lateEnd(o)) Object.entries(o.att).forEach(([wid, a]) => { if (a.out && !a.home && daysBetween(o.date, TODAY) <= 1) al.push(["bad", `${name(W_(wid))} оройн ээлжийн дараа "Гэртээ хүрлээ" гэж мэдэгдээгүй`]); }); });
  S.workers.forEach(w => { if (w.health) { const d = daysBetween(TODAY, w.health); if (d < 0) al.push(["bad", `${name(w)}: цагаан хуудасны хугацаа дууссан`]); else if (d <= 30) al.push(["warn", `${name(w)}: цагаан хуудас ${d} хоногийн дараа дуусна`]); } });
  const now = Date.now();
  S.orders.filter(o => o.status === "open" && signed(o) && o.date >= TODAY).forEach(o => {
    const conf = o.apps.filter(a => a.st === "confirmed").length, sel = o.apps.filter(active).length; const dd = daysBetween(TODAY, o.date);
    if (dd <= 2 && sel < o.need) al.push(["warn", `${shortDate(o.date)} ${o.title}: ${o.need - sel} хүн дутуу`]);
    else if (dd <= 1 && conf < sel) al.push(["info", `${shortDate(o.date)}: ${sel - conf} хүн баталгаажуулаагүй`]);
    o.apps.filter(a => a.st === "selected" && a.selAt && now - a.selAt > 2 * 36e5).forEach(a => al.push(["warn", `${name(W_(a.wid))}: ${shortDate(o.date)} "${o.title}" — 2 цагаас дээш баталгаажуулаагүй. Хасаад дараагийнхыг сонгож болно.`]));
  });
  S.orders.filter(o => o.status === "open" && o.date < TODAY && signed(o)).forEach(o => al.push(["info", `${shortDate(o.date)} "${o.title}": өдөр өнгөрсөн, "дууссан" гэж тэмдэглээгүй`]));
  units().forEach(id => { const u = unit(id); if (u.contract.status === "sent") al.push(["info", `${cname(u.clientId)}: ${u.no} гэрээнд гарын үсэг хүлээж байна`]); if (u.contract.status === "draft") al.push(["warn", `${u.no} "${u.title}": гэрээ илгээгээгүй`]); const v = invoice(u); if (v.due > 0 && v.doneDays) al.push(["info", `${cname(u.clientId)}: ${u.no} төлөгдөөгүй ${money(v.due)}`]); });
  const rq = S.requests.filter(r => r.status === "pending").length;
  if (rq) al.push(["info", `${rq} захиалгын хүсэлт хүлээгдэж байна (Төсөл, захиалга)`]);
  return al;
}
function alertHtml([k, t, actions]) { return `<div class="alert ${k}"><span style="flex:1">${esc(t)}</span>${actions ? `<span class="row" style="gap:6px;flex:none">${actions}</span>` : ""}</div>`; }
function aDash() {
  const today = S.orders.filter(o => o.date === TODAY && signed(o));
  const al = alertsList();
  const todayTeam = today.reduce((s, o) => s + o.apps.filter(a => a.st === "confirmed").length, 0);
  const arrived = today.reduce((s, o) => s + Object.values(o.att).filter(a => a.in).length, 0);
  return `<div class="row between"><h1>Хяналт</h1><span class="muted small">Өнөөдөр: ${dayLabel(TODAY)}</span></div>
  <div class="kpis">
    <div class="kpi"><b class="num">${arrived}/${todayTeam}</b><span>Өнөөдөр ирсэн</span></div>
    <div class="kpi"><b class="num">${S.orders.filter(o => o.status === "open" && signed(o)).reduce((s, o) => s + o.apps.filter(a => a.st === "applied").length, 0)}</b><span>Сонголт хүлээж буй бүртгэл</span></div>
    <div class="kpi"><b class="num">${S.workers.length}</b><span>Бүртгэлтэй ажилчин</span></div>
    <div class="kpi"><b class="num">${money(units().reduce((s, id) => s + invoice(unit(id)).due, 0))}</b><span>Авах төлбөр</span></div>
  </div>
  <section class="card"><div class="row between"><h2>Анхааруулга</h2>${al.length ? `<span class="pill p-bad num">${al.length}</span>` : ""}</div>${al.length ? al.slice(0, 6).map(alertHtml).join("") + (al.length > 6 ? `<details><summary class="small">Бусад ${al.length - 6}</summary><div class="stack" style="margin-top:8px;gap:8px">${al.slice(6).map(alertHtml).join("")}</div></details>` : "") : '<div class="alert ok">Одоогоор анхаарах зүйл алга.</div>'}</section>
  <section class="card"><div class="row between"><h2>Төслүүд</h2><button class="btn sm primary" data-a="newOrder">+ Захиалга бүртгэх</button></div>${projTable()}</section>`;
}
/* ---------- тайлан ---------- */
function barChart(items, opt) {
  opt = opt || {};
  const W_w = Math.max(320, items.length * 44), H = 170, pl = 28, pb = 34, pt = 12, iw = W_w - pl - 8, ih = H - pt - pb;
  const max = Math.max(1, ...items.map(i => Math.max(i.v, i.ref || 0))); const bw = Math.min(26, iw / Math.max(1, items.length) - 8);
  const y = v => pt + ih - v / max * ih; const ticks = [0, Math.round(max / 2), max];
  return `<div style="overflow-x:auto"><svg viewBox="0 0 ${W_w} ${H}" width="100%" style="min-width:${Math.min(W_w, 560)}px;max-width:${W_w}px;display:block" role="img" aria-label="${esc(opt.title || "")}">
  ${ticks.map(t => `<line x1="${pl}" x2="${W_w - 8}" y1="${y(t)}" y2="${y(t)}" stroke="var(--line)" stroke-width="1"/><text x="${pl - 6}" y="${y(t) + 4}" text-anchor="end" font-size="10" fill="var(--muted)">${t}</text>`).join("")}
  ${items.map((it, i) => { const cx = pl + iw / items.length * (i + .5); const top = y(it.v); const h = pt + ih - top;
    return `<g><title>${esc(it.tip || it.label + ": " + it.v)}</title><rect x="${cx - bw / 2 - 6}" y="${pt}" width="${bw + 12}" height="${ih}" fill="transparent"/>
    ${h > 0 ? `<path d="M${cx - bw / 2},${pt + ih} V${top + 4} q0,-4 4,-4 H${cx + bw / 2 - 4} q4,0 4,4 V${pt + ih} Z" fill="${it.warn ? "var(--warn)" : "var(--blue)"}"/>` : ""}
    ${it.ref ? `<line x1="${cx - bw / 2 - 3}" x2="${cx + bw / 2 + 3}" y1="${y(it.ref)}" y2="${y(it.ref)}" stroke="var(--fg)" stroke-width="2" stroke-dasharray="3 2"/>` : ""}
    <text x="${cx}" y="${H - 18}" text-anchor="middle" font-size="10" fill="var(--muted)">${esc(it.label)}</text>${it.sub ? `<text x="${cx}" y="${H - 6}" text-anchor="middle" font-size="9" fill="var(--muted)">${esc(it.sub)}</text>` : ""}</g>`; }).join("")}
  </svg></div>`;
}
function hbars(rows) { const max = Math.max(1, ...rows.map(r => r.v)); return `<div class="stack" style="gap:8px">${rows.map(r => `<div style="display:grid;grid-template-columns:minmax(90px,140px) 1fr 52px;gap:10px;align-items:center" title="${esc(r.tip || "")}"><span class="small">${esc(r.label)}</span><div class="bar" style="height:12px"><i style="width:${r.v / max * 100}%"></i></div><b class="num small" style="text-align:right">${r.v}${r.pct != null ? ` <span class="muted">${r.pct}%</span>` : ""}</b></div>`).join("")}</div>`; }
function aStats() {
  const ids = units();
  if (!ids.length) return `<h1>Тайлан, судалгаа</h1><div class="alert info">Одоогоор төсөл алга.</div>`;
  if (!V.statUnit || !ids.includes(V.statUnit)) V.statUnit = ids[0];
  const u = unit(V.statUnit); const os = u.orders; const v = invoice(u);
  const past = os.filter(o => o.status === "done");
  const conf = past.reduce((s, o) => s + o.apps.filter(a => a.st === "confirmed").length, 0);
  const present = past.reduce((s, o) => s + Object.values(o.att).filter(a => a.out).length, 0);
  const noshow = past.concat(os.filter(o => o.date === TODAY && o.status !== "done")).reduce((s, o) => s + Object.values(o.att).filter(a => a.noshow).length, 0);
  const late = past.reduce((s, o) => s + Object.values(o.att).filter(a => a.in && toMin(a.in) > toMin(o.start) + 5).length, 0);
  const needPD = os.length * u.need; const staffed = os.reduce((s, o) => s + Math.min(o.need, o.apps.filter(active).length), 0);
  const ratings = past.flatMap(o => Object.values(o.att).filter(a => a.rated).map(a => a.rated));
  const avgR = ratings.length ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : "—";
  const apps = os.flatMap(o => o.apps);
  const funnel = [{ label: "Бүртгүүлсэн", v: apps.length }, { label: "Сонгогдсон", v: apps.filter(a => a.st !== "applied" && a.st !== "waitlist").length }, { label: "Баталгаажсан", v: apps.filter(a => a.st === "confirmed").length }, { label: "Ирсэн", v: present + os.filter(o => o.date === TODAY && o.status !== "done").reduce((s, o) => s + Object.values(o.att).filter(a => a.in).length, 0) }];
  funnel.forEach(f => f.pct = pct(f.v, funnel[0].v));
  const days = os.map(o => { const st = o.status === "done" ? Object.values(o.att).filter(a => a.out).length : o.apps.filter(active).length; return { label: shortDate(o.date), sub: DAYS[dow(o.date)], v: st, ref: o.need, warn: st < o.need && o.status !== "done", tip: `${dayLabel(o.date)}: ${o.status === "done" ? "ирсэн" : "оноогдсон"} ${st}/${o.need}` }; });
  const cid = u.clientId, tr = training(cid);
  const pool = S.workers.filter(w => { const t = w.tests[cid]; const ok = !tr || (t && t.score >= tr.pass); const h = !os[0].req.health || (w.health && w.health >= u.to); return ok && h && w.status !== "blocked"; });
  const avail = DAYS.map((d, i) => { const n = pool.filter(w => w.days.includes(i) && w.shifts.includes(shiftOf(u.start))).length; return { label: d, v: n, ref: u.need, warn: n < u.need, tip: `${DAYS_FULL[i]}: ${u.start}–${u.end} ээлжид ажиллах боломжтой, шаардлага хангасан ${n} хүн` }; });
  const people = S.workers.map(w => { const mine = os.filter(o => o.apps.some(a => a.wid === w.id && a.st === "confirmed")); const doneM = mine.filter(o => o.att[w.id] && o.att[w.id].out); const rs = doneM.map(o => o.att[w.id].rated).filter(Boolean);
    return { w, shifts: mine.length, done: doneM.length, ns: mine.filter(o => o.att[w.id] && o.att[w.id].noshow).length, late: doneM.filter(o => toMin(o.att[w.id].in) > toMin(o.start) + 5).length, r: rs.length ? (rs.reduce((a, b) => a + b, 0) / rs.length).toFixed(1) : "—", earn: doneM.reduce((s, o) => s + pay(o).net, 0) }; }).filter(p => p.shifts).sort((a, b) => b.done - a.done);
  const workerPay = people.reduce((s, p) => s + p.earn, 0);
  const trs = S.clients.filter(c => training(c.id)).map(c => { const t = training(c.id); const tried = S.workers.filter(w => w.tests[c.id]); const pass = tried.filter(w => w.tests[c.id].score >= t.pass).length; return { label: c.name, v: pass, pct: pct(pass, tried.length), tip: `${tried.length} өгснөөс ${pass} тэнцсэн` }; });
  return `<div class="row between"><h1>Тайлан, судалгаа</h1><div class="row"><button class="btn sm" data-a="csvAtt" data-v="${u.id}">Ирцийн CSV</button><select id="statPick" style="width:auto;max-width:100%">${ids.map(id => { const x = unit(id); return `<option value="${id}" ${id === u.id ? "selected" : ""}>${esc(cname(x.clientId))} · ${esc(x.title)}</option>`; }).join("")}</select></div></div>
  <div class="kpis">
    <div class="kpi"><b class="num">${pct(staffed, needPD)}%</b><span>Хүн бүрдүүлэлт (${staffed}/${needPD} хүн-өдөр)</span></div>
    <div class="kpi"><b class="num">${pct(present, conf)}%</b><span>Ирц (${present}/${conf})</span></div>
    <div class="kpi"><b class="num">${noshow}</b><span>Ирээгүй · ${late} хоцорсон</span></div>
    <div class="kpi"><b class="num">${avgR}</b><span>Захиалагчийн дундаж үнэлгээ</span></div>
  </div>
  <section class="card"><div class="row between"><h2>Өдөр бүрийн бүрдэл</h2><span class="small muted">Багана: ирсэн / оноогдсон хүн · тасархай зураас: хэрэгтэй тоо</span></div>${barChart(days, { title: "Өдөр бүрийн бүрдэл" })}${days.some(d => d.warn) ? `<div class="alert warn small">${days.filter(d => d.warn).length} өдөрт хүн дутуу байна.</div>` : ""}</section>
  <div class="grid2" style="align-items:start">
    <section class="card"><h2>Сонголтын юүлүүр</h2>${hbars(funnel)}<p class="small muted">Бүртгүүлсэн хүмүүсийн хэдэн хувь нь эцэст нь ажилдаа ирж байгааг харуулна.</p></section>
    <section class="card"><h2>Гарагаар боломжит хүн</h2>${barChart(avail, { title: "Гарагаар боломжит хүн" })}<p class="small muted">Шаардлага хангасан (сургалт, цагаан хуудас) хүмүүсээс тухайн гараг, ээлжид боломжтой нь. Улбар шар = хэрэгтэй тооноос бага, тэр өдрүүдэд шинэ хүн татах хэрэгтэй.</p></section>
  </div>
  <section class="card"><h2>Санхүү</h2><div class="tbl"><table><tbody>
    <tr><td>Гүйцэтгэлийн дүн (${v.present} хүн-өдөр)</td><td class="r num">${money(v.labor)}</td></tr>
    <tr><td>STM-ийн үйлчилгээний хөлс (${S.settings.fee}%)</td><td class="r num"><b>${money(v.fee)}</b></td></tr>
    <tr><td>НӨАТ</td><td class="r num">${money(v.vat)}</td></tr>
    <tr><td>Захиалагчаас авах нийт / төлсөн</td><td class="r num">${money(v.total)} / ${money(v.paid)}</td></tr>
    <tr><td><b>Захиалагчийн үлдэгдэл</b></td><td class="r num"><b>${money(v.due)}</b></td></tr>
    <tr><td>Ажилчдад олгох (гарт, нийт)</td><td class="r num">${money(workerPay)}</td></tr>
    <tr><td class="muted">Төслийн төлөвлөсөн нийт дүн</td><td class="r num muted">${money(v.ptotal)}</td></tr>
  </tbody></table></div></section>
  <section class="card"><h2>Ажилчдын гүйцэтгэл</h2>${people.length ? `<div class="tbl"><table><thead><tr><th>Нэр</th><th class="r">Оноогдсон</th><th class="r">Ажилласан</th><th class="r">Ирээгүй</th><th class="r">Хоцорсон</th><th class="r">Үнэлгээ</th><th class="r">Олсон</th><th class="r">Оноо</th></tr></thead><tbody>${people.map(p => `<tr><td><b>${esc(name(p.w))}</b></td><td class="r num">${p.shifts}</td><td class="r num">${p.done}</td><td class="r num" style="${p.ns ? "color:var(--bad)" : ""}">${p.ns}</td><td class="r num" style="${p.late ? "color:var(--warn)" : ""}">${p.late}</td><td class="r num">${p.r}</td><td class="r num">${money(p.earn)}</td><td class="r num">${score(p.w).total}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Одоогоор оноогдсон хүн алга.</p>'}</section>
  ${trs.length ? `<section class="card"><h2>Сургалтын тэнцэлт (захиалагчаар)</h2>${hbars(trs)}</section>` : ""}`;
}
function projTable() {
  const ids = units();
  if (!ids.length) return '<p class="muted">Одоогоор төсөл алга. "+ Захиалга бүртгэх" дээр дарж албан бичгээс захиалга үүсгэнэ.</p>';
  return `<div class="tbl"><table><thead><tr><th>Төсөл / захиалга</th><th>Хугацаа</th><th>Явц</th><th>Хүн</th><th>Гэрээ</th><th></th></tr></thead><tbody>${ids.map(id => { const u = unit(id);
    const n = u.orders.length || 1, done = u.orders.filter(o => o.status === "done").length; const pd = n * u.need; const filled = u.orders.reduce((s, o) => s + Math.min(o.need, o.apps.filter(active).length), 0);
    const cs = { signed: ["Зурсан", "p-ok"], sent: ["Илгээсэн", "p-sun"], draft: ["Ноорог", "p-grey"] }[u.contract.status];
    const single = u.orders.length === 1;
    return `<tr><td><b>${esc(u.title)}</b><div class="muted small">${esc(cname(u.clientId))} · ${u.no}</div></td><td class="num small">${u.from === u.to ? fmtDate(u.from) : `${shortDate(u.from)} – ${shortDate(u.to)}<div class="muted">${u.orders.length} хоног</div>`}</td>
    <td style="min-width:120px"><div class="small num">${done}/${n} өдөр</div>${bar(done / n * 100)}</td><td style="min-width:110px"><div class="small num">${filled}/${pd}</div>${bar(filled / pd * 100, "var(--sun)")}</td><td><span class="pill ${cs[1]}">${cs[0]}</span></td><td><button class="btn sm" data-a="${single ? "openOrder" : "openProj"}" data-v="${single ? u.orders[0].id : id}">Нээх</button></td></tr>`; }).join("")}</tbody></table></div>`;
}

let draft = null;
function newDraft(clientId) { const c = clientId || (S.clients.find(c => c.status === "Идэвхтэй") || {}).id || ""; return { clientId: c, letterNo: "", letterDate: TODAY, cat: "sample", title: "", place: "", area: "", date: addDays(TODAY, 7), to: addDays(TODAY, 13), multi: true, start: "12:00", end: "18:00", need: 3, rate: Math.max(7000, Math.ceil(minHourly(addDays(TODAY, 7)) / 100) * 100), req: { health: false, adult: false, license: false, lang: false }, transport: "", requestId: "" }; }
function draftFromRequest(r) { return { clientId: r.clientId, letterNo: r.letterNo || "", letterDate: r.letterDate || TODAY, cat: r.cat, title: r.title, place: r.place || "", area: r.area || "", date: r.date, to: r.to || r.date, multi: r.multi, start: r.start, end: r.end, need: r.need, rate: r.rate, req: Object.assign({}, r.req), transport: r.transport || "", requestId: r.id }; }
function aOrders() {
  if (V.openOrder && O_(V.openOrder)) return orderDetail(O_(V.openOrder));
  if (V.openProj && P_(V.openProj)) return projDetail(P_(V.openProj));
  const reqs = S.requests.filter(r => r.status === "pending");
  return `<div class="row between"><h1>Төсөл, захиалга</h1><button class="btn primary" data-a="newOrder">+ Захиалга бүртгэх</button></div>
  ${draft ? orderForm(draft, "admin") : ""}
  ${reqs.length ? `<section class="card"><h2>Захиалагчийн хүсэлт <span class="pill p-sun">${reqs.length}</span></h2>${reqs.map(r => `<div class="card" style="background:var(--sunk);gap:6px"><div class="row between"><div><b>${esc(r.title)}</b><div class="small muted">${esc(r.org)} · ${CATS[r.cat] ? CATS[r.cat].n : ""} · илгээсэн ${fmtTs(r.createdAt)}</div></div><div class="row"><button class="btn sm primary" data-a="reqToDraft" data-v="${r.id}">Захиалга болгох</button><button class="btn sm danger" data-a="reqReject" data-v="${r.id}">Татгалзах</button></div></div>
    <div class="facts"><span><b>${r.multi ? `${fmtDate(r.date)} – ${fmtDate(r.to)}` : dayLabel(r.date)}</b></span><span class="num">${r.start}–${r.end}</span><span>Өдөрт <b>${r.need}</b> хүн</span><span class="num">${money(r.rate)}/цаг</span><span>${esc(r.area)}</span>${r.letterNo ? `<span>Албан бичиг №${esc(r.letterNo)}</span>` : ""}</div>${r.note ? `<div class="small">${esc(r.note)}</div>` : ""}</div>`).join("")}</section>` : ""}
  <section class="card">${projTable()}</section>`;
}
function orderForm(d, mode) {
  const isAdmin = mode === "admin";
  const clients = S.clients.filter(c => c.status === "Идэвхтэй" || c.id === d.clientId);
  return `<section class="card" id="orderForm"><div class="row between"><h2>${isAdmin ? (d.requestId ? "Хүсэлтээс захиалга үүсгэх" : "Шинэ захиалга (албан бичгээс)") : "Шинэ захиалга хүсэх"}</h2><button class="btn sm" data-a="cancelOrder">Болих</button></div>
  <div class="grid2">
    ${isAdmin ? `<label class="f">Захиалагч<select id="d_clientId">${clients.length ? clients.map(c => `<option value="${c.id}" ${c.id === d.clientId ? "selected" : ""}>${esc(c.name)}</option>`).join("") : '<option value="">— Эхлээд "Захиалагчид" хэсэгт нэмнэ үү —</option>'}</select></label>` : ""}
    <label class="f">Албан бичгийн дугаар${isAdmin ? "" : " (байвал)"}<input id="d_letterNo" type="text" value="${esc(d.letterNo)}" placeholder="ИМ-01/80"></label>
    <label class="f">Албан бичгийн огноо<input id="d_letterDate" type="date" value="${d.letterDate}"></label>
    <label class="f">Ажлын ангилал<select id="d_cat">${Object.entries(CATS).map(([k, c]) => `<option value="${k}" ${k === d.cat ? "selected" : ""}>${c.n}</option>`).join("")}</select></label>
    <label class="f">Ажлын нэр<input id="d_title" type="text" value="${esc(d.title)}" placeholder="Жишээ: Шинэ бүтээгдэхүүний амталгаа"></label>
    <label class="f">Ажлын байрны хаяг<input id="d_place" type="text" value="${esc(d.place)}" placeholder="Зөвхөн баталгаажсан хүнд харагдана"></label>
    <label class="f">Дүүрэг (оюутанд харагдана)<input id="d_area" type="text" value="${esc(d.area || "")}" placeholder="Хан-Уул дүүрэг"></label>
  </div>
  <label class="chk"><input type="checkbox" id="d_multi" ${d.multi ? "checked" : ""}> Олон өдрийн төсөл (өдөр бүр ижил ээлж)</label>
  <div class="grid2">
    <label class="f">${d.multi ? "Эхлэх огноо" : "Огноо"}<input id="d_date" type="date" value="${d.date}"></label>
    ${d.multi ? `<label class="f">Дуусах огноо<input id="d_to" type="date" value="${d.to}"></label>` : ""}
    <div class="row" style="gap:10px;flex-wrap:nowrap"><label class="f" style="flex:1">Эхлэх цаг<input id="d_start" type="time" value="${d.start}"></label><label class="f" style="flex:1">Дуусах цаг<input id="d_end" type="time" value="${d.end}"></label></div>
    <label class="f">Өдөрт хэрэгтэй хүн<input id="d_need" type="number" min="1" value="${d.need}"></label>
    <label class="f">Цагийн хөлс (₮)<input id="d_rate" type="number" min="0" step="100" value="${d.rate}"></label>
    <label class="f">Тээвэр (оройн ээлжид)<select id="d_transport">${Object.entries(TRANSPORT).map(([k, t]) => `<option value="${k}" ${k === d.transport ? "selected" : ""}>${t}</option>`).join("")}</select></label>
  </div>
  <div class="row" style="gap:16px"><span class="small muted">Шаардлага:</span>
    <label class="chk"><input type="checkbox" id="r_health" ${d.req.health ? "checked" : ""}> Цагаан хуудас</label>
    <label class="chk"><input type="checkbox" id="r_license" ${d.req.license ? "checked" : ""}> Жолооны үнэмлэх</label>
    <label class="chk"><input type="checkbox" id="r_lang" ${d.req.lang ? "checked" : ""}> Гадаад хэл</label>
    <label class="chk"><input type="checkbox" id="r_adult" ${d.req.adult ? "checked" : ""}> 18+</label>
  </div>
  ${isAdmin ? `<div class="grid2"><label class="f">Ажлын байрны координат ${BETA}<input id="d_geo" type="text" value="${esc(d.geo || "")}" placeholder="47.9184, 106.9177 (Google Maps-аас)"></label><label class="f">Ирцийн радиус (м)<input id="d_radius" type="number" min="50" max="2000" value="${d.radius || 300}"></label></div><p class="small muted" style="margin-top:-6px">Бөглөвөл оюутан зөвхөн энэ цэгээс заасан радиус дотор байж ирцээ бүртгэнэ. Google Maps дээр байршил дээр удаан дарж координатыг хуулна. Хоосон бол шалгахгүй.</p>` : ""}
  ${isAdmin ? "" : `<label class="f">Нэмэлт тайлбар<textarea id="d_note" rows="3" placeholder="Хувцас, хариуцагч, бусад">${esc(d.note || "")}</textarea></label>`}
  <div class="card" style="background:var(--sunk)"><h3>Хуулийн шалгалт</h3><div class="checks" id="checks"></div></div>
  <div class="row"><button class="btn primary" data-a="${isAdmin ? "publishOrder" : "sendRequest"}" id="pubBtn">${isAdmin ? "Захиалга бүртгэх" : "Хүсэлт илгээх"}</button><span class="small muted" id="pubNote"></span></div>
  </section>`;
}
function renderChecks() {
  const box = $("#checks"); const d = draft || reqDraft; if (!box || !d) return;
  const c = legal(d);
  box.innerHTML = c.map(x => `<div><span class="ck ${x.info ? "i" : x.ok ? "y" : "n"}">${x.info ? "i" : x.ok ? "✓" : "!"}</span><span>${esc(x.t)}</span></div>`).join("");
  const bad = c.some(x => x.block && !x.ok);
  const miss = draft ? (!d.clientId || !d.title.trim() || !d.place.trim() || !d.letterNo.trim()) : (!d.title.trim() || !d.area.trim());
  $("#pubBtn").disabled = bad || miss;
  $("#pubNote").textContent = bad ? "Хуулийн шаардлага хангаагүй тул бүртгэх боломжгүй." : miss ? (draft ? "Захиалагч, албан бичгийн дугаар, ажлын нэр, байрыг бөглөнө үү." : "Ажлын нэр, дүүргийг бөглөнө үү.") : "";
}
function readDraft() {
  const d = draft || reqDraft; if (!d) return;
  ["clientId", "letterNo", "letterDate", "cat", "title", "place", "area", "date", "to", "start", "end", "need", "rate", "transport", "note", "geo", "radius"].forEach(k => { const el = $("#d_" + k); if (el) d[k] = el.value; });
  ["health", "license", "lang", "adult"].forEach(k => { const el = $("#r_" + k); if (el) d.req[k] = el.checked; });
  const m = $("#d_multi"); if (m) d.multi = m.checked;
  // Ангилал солигдох үед тухайн ангиллын шаардлагыг шинээр тавина (өмнөх ангиллынх үлдэхгүй).
  if (d.cat && CATS[d.cat]) {
    const r = CATS[d.cat].req, changed = d._cat !== undefined && d._cat !== d.cat;
    ["health", "license", "lang"].forEach(k => { if (r[k] || changed) { d.req[k] = !!r[k]; const el = $("#r_" + k); if (el) el.checked = !!r[k]; } });
    d._cat = d.cat;
  }
}
function contractRow(u) {
  const c = u.contract;
  if (c.status === "signed") return `<div class="alert ok small">Гэрээ зурагдсан: ${fmtDate(c.signedAt)}, ${esc(c.signer || "")}. Захиалагчийн хяналтын самбар нээгдэж, зар оюутнуудад харагдаж байна.</div>`;
  if (c.status === "sent") return `<div class="alert warn small row between"><span>Гэрээг ${fmtDate(c.sentAt)}-нд ${esc((C_(u.clientId) || {}).email || "")} руу илгээсэн. Захиалагч зурмагц зар нийтлэгдэнэ.</span><button class="btn sm" data-a="sendContract" data-v="${u.id}">Дахин илгээх</button></div>`;
  return `<div class="alert info small row between"><span>Гэрээ илгээгдээгүй. Зар гэрээ зурагдсаны дараа оюутнуудад харагдана.</span><button class="btn sm primary" data-a="sendContract" data-v="${u.id}">Гэрээ илгээх</button></div>`;
}
function projDetail(P) {
  const u = unit(P.id); const ds = u.orders; const v = invoice(u);
  const open = ds.filter(o => o.status === "open");
  const pending = open.reduce((s, o) => s + o.apps.filter(a => a.st === "applied" || a.st === "waitlist").length, 0);
  const anyApps = ds.some(o => o.apps.length);
  return `<div class="row between"><button class="btn sm" data-a="back">← Буцах</button>${anyApps ? "" : `<button class="btn sm danger" data-a="deleteProj" data-v="${P.id}">Төслийг устгах</button>`}</div>
  <section class="card">
    <div class="row between"><div><span class="muted small">${esc(cname(P.clientId))} · ${P.no}</span><h1>${esc(P.title)}</h1></div><span class="pill p-blue">${ds.length} хоногийн төсөл</span></div>
    <div class="facts"><span>Хугацаа: <b>${fmtDate(P.from)} – ${fmtDate(P.to)}</b></span><span>Ээлж: <b class="num">${P.start}–${P.end}</b> (${hours(P)} цаг)</span><span>Өдөрт: <b>${P.need} хүн</b></span><span>Хөлс: <b class="num">${money(P.rate)}/цаг</b></span><span>Байр: <b>${esc(P.place)}</b></span><span>Албан бичиг: <b>№${esc(P.letterNo)}</b></span></div>
    <div class="row">${reqTags(P)}</div>
    ${contractRow(u)}
    ${geoBox(P)}
    <div class="kpis"><div class="kpi"><b class="num">${v.doneDays}/${ds.length}</b><span>Дууссан өдөр</span></div><div class="kpi"><b class="num">${v.present}</b><span>Гүйцэтгэсэн хүн-өдөр</span></div><div class="kpi"><b class="num">${money(v.total)}</b><span>Гүйцэтгэлийн дүн</span></div><div class="kpi"><b class="num">${money(v.due)}</b><span>Төлөх үлдэгдэл</span></div></div>
    <div class="row"><button class="btn sun" data-a="selectProj" data-v="${P.id}" ${!pending || P.contract.status !== "signed" ? "disabled" : ""}>Нээлттэй бүх өдрийг оноогоор бөглөх${pending ? ` (${pending} бүртгэл)` : ""}</button><button class="btn" data-a="openDoc" data-v="${P.id}">Гэрээ, нэхэмжлэх</button></div>
    <p class="small muted">Сонгогдсон хүн бүрт сонгогдсон өдрүүдийнх нь жагсаалттай нэг мессеж очно. Нэг хүн долоо хоногт ${S.settings.weekHours || 32} цагаас хэтрэхгүй.</p>
  </section>
  <section class="card"><h2>Өдөр бүрээр</h2><div class="tbl"><table><thead><tr><th>Өдөр</th><th>Төлөв</th><th>Баг</th><th class="r">Бүртгэл</th><th>Ирц</th><th></th></tr></thead><tbody>${ds.map(o => { const st = dayState(o); const conf = o.apps.filter(a => a.st === "confirmed").length, sel = o.apps.filter(a => a.st === "selected").length, ap = o.apps.filter(a => a.st === "applied").length; const arr = Object.values(o.att).filter(a => a.in).length, ns = Object.values(o.att).filter(a => a.noshow).length;
    return `<tr ${o.date === TODAY ? 'style="background:var(--sun-soft)"' : ""}><td class="num"><b>${shortDate(o.date)}</b> <span class="muted">${DAYS[dow(o.date)]}</span></td><td><span class="pill ${st[1]}">${st[0]}</span></td><td class="small" style="min-width:150px">${o.apps.filter(active).map(a => `${esc(name(W_(a.wid)))}${a.st === "selected" ? ' <span class="muted">(хүлээж)</span>' : ""}`).join(", ") || '<span class="muted">—</span>'}<div class="num" style="${conf + sel < o.need ? "color:var(--bad)" : "color:var(--muted)"}">${conf + sel}/${o.need}</div></td><td class="r num">${ap || "—"}</td><td class="num small">${o.status === "done" || o.date === TODAY ? `${arr}/${conf}${ns ? ` · <span style="color:var(--bad)">${ns} ирээгүй</span>` : ""}` : "—"}</td><td><button class="btn sm" data-a="openOrder" data-v="${o.id}">Нээх</button></td></tr>`; }).join("")}</tbody></table></div></section>`;
}
function orderDetail(o) {
  const c = C_(o.clientId) || {};
  const apps = o.apps.map(a => ({ a, w: W_(a.wid) })).filter(x => x.w).map(x => ({ ...x, sc: score(x.w), bl: blockers(x.w, o) })).sort((x, y) => y.sc.total - x.sc.total);
  const sel = o.apps.filter(active).length; const done = o.status === "done"; const u = unit(o.proj); const single = u.orders.length === 1;
  return `<div class="row between"><button class="btn sm" data-a="back">← ${single ? "Буцах" : "Төсөл рүү"}</button>${single && !o.apps.length ? `<button class="btn sm danger" data-a="deleteProj" data-v="${o.proj}">Захиалгыг устгах</button>` : ""}</div>
  <section class="card">
    <div class="row between"><div><span class="muted small">${esc(c.name)} · ${o.no}</span><h1>${esc(o.title)}</h1></div>${done ? '<span class="pill p-grey">Дууссан</span>' : `<span class="pill ${sel >= o.need ? "p-ok" : "p-blue"}">${sel}/${o.need} хүн</span>`}</div>
    <div class="facts"><span>Огноо: <b>${dayLabel(o.date)}, ${o.start}–${o.end}</b></span><span>Байр: <b>${esc(o.place)}</b></span><span>Хөлс: <b class="num">${money(o.rate)}/цаг</b></span>${lateEnd(o) ? `<span>Тээвэр: <b>${TRANSPORT[o.transport]}</b></span>` : ""}</div>
    <div class="row">${reqTags(o)}</div>
    ${single ? contractRow(u) + geoBox(P_(o.proj)) : ""}
    ${!done ? `<div class="row"><button class="btn sun" data-a="selectOne" data-v="${o.id}" ${sel >= o.need || !signed(o) ? "disabled" : ""}>Оноогоор автоматаар сонгох</button><button class="btn" data-a="markDone" data-v="${o.id}" ${o.date > TODAY ? "disabled" : ""}>Ажил дууссан гэж тэмдэглэх</button>${single ? `<button class="btn" data-a="openDoc" data-v="${o.proj}">Гэрээ, нэхэмжлэх</button>` : ""}</div>` : `<div class="row"><button class="btn sm" data-a="reopen" data-v="${o.id}">Дахин нээх</button></div>`}
  </section>
  <section class="card"><h2>Бүртгүүлсэн хүмүүс (оноогоор)</h2>
  ${apps.length ? `<div class="tbl"><table><thead><tr><th>Нэр</th><th>Оноо</th><th>Тохирох эсэх</th><th>Төлөв</th>${done || o.date === TODAY ? "<th>Ирц</th>" : ""}${done ? "<th>Үнэлгээ</th>" : "<th></th>"}</tr></thead><tbody>${apps.map(({ a, w, sc, bl }) => { const at = o.att[w.id]; return `<tr>
    <td><b>${esc(name(w))}</b>${sc.isNew ? ' <span class="pill p-sun">Шинэ</span>' : ""}<div class="muted small">${esc(w.school)} · ${w.age} нас · <a href="tel:${esc(w.phone)}">${esc(w.phone)}</a></div></td>
    <td><div class="row" style="gap:8px;flex-wrap:nowrap"><b class="num">${sc.total}</b>${bar(sc.total)}</div></td>
    <td>${done && a.st === "confirmed" ? '<span class="small muted">—</span>' : bl.length && !active(a) ? bl.map(b => `<div class="small" style="color:var(--bad)">${esc(b)}</div>`).join("") : '<span class="small" style="color:var(--ok)">Бүх шаардлага хангасан</span>'}</td>
    <td>${pill(a.st)}${a.leave ? `<div class="small" style="margin-top:4px">${a.leave.st === "pending" ? `<span class="pill p-warn">Чөлөө хүссэн</span><div class="muted">${esc(a.leave.reason)}</div><div class="row" style="gap:4px;margin-top:4px"><button class="btn sm primary" data-a="leaveOk" data-v="${o.id}|${w.id}">Зөвшөөрөх</button><button class="btn sm" data-a="leaveNo" data-v="${o.id}|${w.id}">Татгалзах</button></div>` : a.leave.st === "approved" ? '<span class="muted">Чөлөө зөвшөөрсөн</span>' : '<span class="muted">Чөлөө татгалзсан</span>'}</div>` : ""}</td>
    ${done || o.date === TODAY ? `<td class="num small">${at && at.noshow ? '<span class="pill p-bad">Ирээгүй</span>' : at ? `${at.in || "—"} → ${at.out || "—"}${at.inDist !== "" && at.inDist != null ? `<div class="muted">📍 ${at.inDist} м</div>` : ""}` : "—"}</td>` : ""}
    ${done ? `<td>${at && at.out ? rateSel(o.id, w.id, at.rated) : "—"}</td>` : `<td>${a.st === "applied" || a.st === "waitlist" ? `<button class="btn sm" data-a="manualSel" data-v="${o.id}|${w.id}" ${bl.length || sel >= o.need || !signed(o) ? "disabled" : ""}>Сонгох</button>` : active(a) && !(at && at.in) ? `<button class="btn sm danger" data-a="unsel" data-v="${o.id}|${w.id}">Хасах</button>` : ""}</td>`}
  </tr>`; }).join("")}</tbody></table></div>` : '<p class="muted">Одоогоор бүртгүүлсэн хүн алга.</p>'}
  </section>`;
}
function geoBox(P) {
  const has = P.lat !== null && P.lat !== undefined && !isNaN(P.lat);
  return `<details class="card" style="background:var(--sunk);gap:8px" ${has ? "" : "open"}><summary>Ирцийн байршил ${BETA} ${has ? `<span class="pill p-ok">${P.radius} м</span>` : '<span class="pill p-grey">Тохируулаагүй</span>'}</summary>
    <div class="grid2" style="margin-top:8px"><label class="f">Координат (Google Maps-аас)<input id="geo_${P.id}" type="text" value="${has ? P.lat + ", " + P.lng : ""}" placeholder="47.9184, 106.9177"></label><label class="f">Радиус (м)<input id="rad_${P.id}" type="number" min="50" max="2000" value="${P.radius || 300}"></label></div>
    <div class="row"><button class="btn sm primary" data-a="saveGeo" data-v="${P.id}">Хадгалах</button>${has ? `<a class="btn sm" target="_blank" rel="noopener" href="https://maps.google.com/?q=${P.lat},${P.lng}">Газрын зураг</a><button class="btn sm" data-a="clearGeo" data-v="${P.id}">Унтраах</button>` : ""}</div>
    <p class="small muted">Тохируулбал оюутан QR/кодоор бүртгүүлэхдээ утасныхаа байршлыг илгээж, энэ радиус дотор байх ёстой. Барилга дотор GPS 50–100 м алдаатай байж болно.</p></details>`;
}
function rateSel(oid, wid, v) { return `<select data-rate="${oid}|${wid}" aria-label="Үнэлгээ" style="width:auto">${["", 1, 2, 3, 4, 5].map(n => `<option value="${n}" ${n == v ? "selected" : ""}>${n ? "★".repeat(n) : "Үнэлэх"}</option>`).join("")}</select>`; }

function aWorkers() {
  const q = (V.wq || "").toLowerCase();
  const list = S.workers.filter(w => !q || (w.last + " " + w.first + " " + w.phone + " " + w.school).toLowerCase().includes(q)).map(w => ({ w, sc: score(w) })).sort((a, b) => b.sc.total - a.sc.total);
  return `<div class="row between"><h1>Ажилчид</h1><div class="row"><input id="wq" type="text" placeholder="Нэр, утас, сургуулиар хайх" value="${esc(V.wq || "")}" style="max-width:260px"><button class="btn sm" data-a="csvWorkers">CSV татах</button></div></div>
  <section class="card"><p class="small muted">Оноо = үнэлгээ ${W.rating}% · ирц ${W.attend}% · сургалтын тест ${W.test}% · туршлага ${W.exp}% · хариу өгөх хурд ${W.resp}%. Шинэ хүнд эхлэлийн дундаж оноо өгнө. Оюутнууд index.html-ээр өөрсдөө бүртгүүлнэ.</p>
  ${list.length ? `<div class="tbl"><table><thead><tr><th>Нэр</th><th>Оноо</th><th class="r">Ээлж</th><th class="r">Үнэлгээ</th><th>Сул цаг</th><th>Бичиг баримт</th><th></th></tr></thead><tbody>${list.map(({ w, sc }) => {
    const hd = w.health ? daysBetween(TODAY, w.health) : null;
    const health = w.health ? `<span class="pill ${hd < 0 ? "p-bad" : hd <= 30 ? "p-warn" : "p-ok"}">Цагаан хуудас: ${w.health}</span>` : '<span class="pill p-grey">Цагаан хуудасгүй</span>';
    return `<tr><td><b>${esc(name(w))}</b>${sc.isNew ? ' <span class="pill p-sun">Шинэ</span>' : ""}${w.status === "blocked" ? ' <span class="pill p-bad">Хаагдсан</span>' : ""}<div class="muted small">${esc(w.school)}${w.major ? ", " + esc(w.major) : ""} · ${w.age} нас · ${esc(w.phone)}</div></td>
    <td><div class="row" style="gap:8px;flex-wrap:nowrap"><b class="num">${sc.total}</b>${bar(sc.total)}</div></td>
    <td class="r num">${w.done}${w.noshow ? `<div class="small" style="color:var(--bad)">${w.noshow} тасалсан</div>` : ""}${w.late ? `<div class="small" style="color:var(--warn)">${w.late} хоцорсон</div>` : ""}</td>
    <td class="r num">${w.rn ? w.rating.toFixed(1) + " ★" : "—"}</td>
    <td class="small">${w.days.map(d => DAYS[d]).join(" ")}<div class="muted">${w.shifts.map(s => SHIFTS[s]).join(", ")}</div></td>
    <td class="small">${health}${w.license ? ' <span class="tag">Жолоо</span>' : ""}${w.lang ? ` <span class="tag">${esc(w.lang)}</span>` : ""}${w.age < 18 ? ' <span class="pill p-warn">18 хүрээгүй</span>' : ""}</td>
    <td><div class="row" style="gap:6px;flex-wrap:nowrap"><button class="btn sm" data-a="editWorker" data-v="${w.id}">Засах</button><button class="btn sm" data-a="chatTo" data-v="${w.id}">Мессеж</button></div></td></tr>`; }).join("")}</tbody></table></div>` : `<p class="muted">${q ? "Олдсонгүй." : "Одоогоор бүртгүүлсэн оюутан алга. index.html линкээ оюутнуудад тараана уу."}</p>`}
  <p class="small muted">Цагаан хуудасны зөвхөн хүчинтэй хугацааг тэмдэглэнэ. Эрүүл мэндийн мэдээлэл, зургийг хадгалахгүй.</p></section>`;
}
function workerModal(w) {
  modal(`<h2>${esc(w.last)} ${esc(w.first)}</h2><div class="small muted">${esc(w.phone)}${w.email ? " · " + esc(w.email) : ""} · ${esc(w.birth)} (${w.age} нас)<br>Бүртгүүлсэн: ${fmtTs(w.createdAt)} · Гэрээ: ${esc(w.signed)}</div>
  <label class="f">Цагаан хуудас дуусах огноо (хуудсыг үзэж шалгасны дараа)<input id="ew_health" type="date" value="${esc(w.health || "")}"></label>
  <label class="chk"><input type="checkbox" id="ew_license" ${w.license ? "checked" : ""}> Жолооны үнэмлэхтэй (шалгасан)</label>
  <label class="f">Гадаад хэл<input id="ew_lang" type="text" value="${esc(w.lang || "")}"></label>
  <label class="f">Тэмдэглэл (зөвхөн админд)<input id="ew_note" type="text" value="${esc(w.note || "")}"></label>
  <label class="chk"><input type="checkbox" id="ew_blocked" ${w.status === "blocked" ? "checked" : ""}> Бүртгэлийг түр хаах (нэвтэрч, бүртгүүлэхгүй)</label>
  <div class="row"><button class="btn primary" data-a="saveWorker" data-v="${w.id}">Хадгалах</button><button class="btn" data-a="workerPw" data-v="${w.id}">Түр нууц үг өгөх</button><button class="btn" data-a="closeModal">Хаах</button></div>
  <div id="ew_pw"></div>`);
}

function aClients() {
  return `<div class="row between"><h1>Захиалагчид</h1><button class="btn primary" data-a="newClient">+ Захиалагч нэмэх</button></div>
  <section class="card"><p class="small muted">Захиалагч company.html-ээр өөрөө бүртгүүлж болно, эсвэл та энд нэмбэл түүний имэйл рүү нууц үг тохируулах заавар очно. "Оюутанд харагдах нэр" нь жинхэнэ нэрийг оюутнуудаас нууцална.</p>
  ${S.clients.length ? `<div class="tbl"><table><thead><tr><th>Байгууллага</th><th>Холбогдох</th><th>Оюутанд харагдах нэр</th><th class="r">Ажилтан</th><th>Төлөв</th><th></th></tr></thead><tbody>${S.clients.map(c => `<tr><td><b>${esc(c.name)}</b><div class="small muted">Сүүлд: ${c.lastLogin ? fmtTs(c.lastLogin) : "нэвтрээгүй"}</div></td><td class="small">${esc(c.contactName)}<div class="muted">${esc(c.phone)} · ${esc(c.email)}</div></td><td class="small">${c.alias ? esc(c.alias) : '<span class="pill p-warn">Тохируулаагүй</span>'}</td><td class="r num">${c.staff || '<span class="pill p-warn">—</span>'}</td><td><span class="pill ${c.status === "Идэвхтэй" ? "p-ok" : c.status === "Хаагдсан" ? "p-bad" : "p-grey"}">${esc(c.status)}</span></td><td><button class="btn sm" data-a="editClient" data-v="${c.id}">Засах</button></td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Одоогоор захиалагч алга.</p>'}</section>`;
}
function clientModal(c) {
  c = c || {};
  modal(`<h2>${c.id ? esc(c.name) : "Захиалагч нэмэх"}</h2>
  <label class="f">Байгууллагын нэр<input id="ec_org" type="text" value="${esc(c.name || "")}"></label>
  <label class="f">Оюутанд харагдах нэр<input id="ec_alias" type="text" value="${esc(c.alias || "")}" placeholder="Хүнсний супермаркет сүлжээ"></label>
  <label class="f">Ажилтны тоо (30%-ийн дүрэмд)<input id="ec_staff" type="number" min="0" value="${esc(c.staff || "")}"></label>
  <label class="f">Холбогдох хүн<input id="ec_contact" type="text" value="${esc(c.contactName || "")}"></label>
  <label class="f">Утас<input id="ec_phone" type="tel" value="${esc(c.phone || "")}"></label>
  ${c.id ? `<div class="small muted">Имэйл: ${esc(c.email)}</div><label class="chk"><input type="checkbox" id="ec_blocked" ${c.status === "Хаагдсан" ? "checked" : ""}> Бүртгэлийг хаах</label>` : `<label class="f">Имэйл<input id="ec_email" type="email"></label>`}
  <div class="row"><button class="btn primary" data-a="saveClient" data-v="${c.id || ""}">Хадгалах</button><button class="btn" data-a="closeModal">Болих</button></div>`);
}

function aTrain() {
  const withT = S.clients.filter(c => c.status === "Идэвхтэй" || training(c.id));
  if (!withT.length) return `<h1>Сургалт, тест</h1><div class="alert info">Эхлээд "Захиалагчид" хэсэгт захиалагч нэмнэ үү.</div>`;
  if (!V.trainClient || !C_(V.trainClient)) V.trainClient = withT[0].id;
  const cid = V.trainClient; const t = training(cid);
  const seg = `<div class="seg" role="group" aria-label="Захиалагч" style="flex-wrap:wrap">${withT.map(c => `<button data-a="trainClient" data-v="${c.id}" aria-pressed="${c.id === cid}">${esc(c.name.replace(" ХХК", ""))}${training(c.id) ? "" : " +"}</button>`).join("")}</div>`;
  if (V.editTrain) return `<h1>Сургалт, тест</h1>${seg}${trainEditor()}`;
  if (!t) return `<h1>Сургалт, тест</h1>${seg}<section class="card"><h2>${esc(cname(cid))}</h2><p class="muted">Энэ захиалагчид сургалт үүсгээгүй. Сургалтгүй бол оюутан тест өгөхгүйгээр бүртгүүлнэ.</p><button class="btn primary" data-a="editTrain" style="justify-self:start">Сургалт үүсгэх</button></section>`;
  const tried = S.workers.filter(w => w.tests[cid]); const passed = tried.filter(w => w.tests[cid].score >= t.pass);
  const avg = tried.length ? Math.round(tried.reduce((s, w) => s + w.tests[cid].score, 0) / tried.length) : 0;
  const hard = [...t.qs].sort((a, b) => (b.wrong || 0) - (a.wrong || 0))[0];
  return `<h1>Сургалт, тест</h1>${seg}
  <div class="kpis"><div class="kpi"><b class="num">${tried.length}</b><span>Тест өгсөн</span></div><div class="kpi"><b class="num">${passed.length}</b><span>Тэнцсэн (${t.pass}%+)</span></div><div class="kpi"><b class="num">${avg}%</b><span>Дундаж оноо</span></div><div class="kpi"><b class="num">${t.qs.length}</b><span>Асуулт</span></div></div>
  <section class="card"><div class="row between"><h2>${esc(cname(cid))}: ${esc(t.title)}</h2><button class="btn sm" data-a="editTrain">Засах</button></div>
    <div class="facts"><span>Оюутанд харагдах нэр: <b>${esc(alias(cid))}</b></span><span>Видео: <b>${t.mins} мин</b></span><span>Тэнцэх: <b>${t.pass}%</b></span><span>Дахин өгөх: <b>24 цагийн дараа</b></span>${t.video ? `<a href="${esc(t.video)}" target="_blank" rel="noopener">Видео нээх</a>` : ""}</div>
    ${hard && hard.wrong ? `<div class="alert warn">Хамгийн олон буруу хариулсан: "${esc(hard.q)}" (${hard.wrong} удаа).</div>` : ""}
    <h3>Алхмууд</h3><ol style="margin:0;padding-left:20px">${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol>
    <h3>Асуултууд</h3><div class="stack">${t.qs.map((q, i) => `<div class="q"><b>${i + 1}. ${esc(q.q)}</b><div class="small">${q.o.map((o, j) => `<span style="${j === q.a ? "color:var(--ok);font-weight:700" : "color:var(--muted)"}">${j === q.a ? "✓ " : ""}${esc(o)}</span>`).join(" · ")}</div><span class="small muted">Буруу хариулт: ${q.wrong || 0}</span></div>`).join("")}</div>
  </section>
  <section class="card"><h2>Үр дүн</h2>${tried.length ? `<div class="tbl"><table><thead><tr><th>Нэр</th><th class="r">Оноо</th><th class="r">Оролдлого</th><th>Дүн</th></tr></thead><tbody>${tried.sort((a, b) => b.tests[cid].score - a.tests[cid].score).map(w => `<tr><td>${esc(name(w))}</td><td class="r num">${w.tests[cid].score}%</td><td class="r num">${w.tests[cid].att}</td><td>${w.tests[cid].score >= t.pass ? '<span class="pill p-ok">Тэнцсэн</span>' : '<span class="pill p-bad">Тэнцээгүй</span>'}</td></tr>`).join("")}</tbody></table></div>` : '<p class="muted">Одоогоор хэн ч тест өгөөгүй.</p>'}</section>`;
}
function trainEditor() {
  const e = V.editTrain;
  return `<section class="card" id="trainForm"><div class="row between"><h2>${esc(cname(V.trainClient))}: сургалт засах</h2><button class="btn sm" data-a="cancelTrain">Болих</button></div>
  <div class="grid2"><label class="f">Гарчиг<input id="te_title" type="text" value="${esc(e.title)}"></label><label class="f">Видеоны линк (YouTube гэх мэт)<input id="te_video" type="text" value="${esc(e.video)}" placeholder="https://"></label>
  <label class="f">Видеоны урт (минут)<input id="te_mins" type="number" min="0" value="${e.mins}"></label><label class="f">Тэнцэх оноо (%)<input id="te_pass" type="number" min="1" max="100" value="${e.pass}"></label></div>
  <label class="f">Гол алхмууд (мөр бүрт нэг)<textarea id="te_steps" rows="5">${esc(e.steps.join("\n"))}</textarea></label>
  <h3>Асуултууд</h3>
  ${e.qs.map((q, i) => `<div class="q" data-q="${i}"><div class="row between"><b>${i + 1}.</b><button class="btn sm danger" data-a="delQ" data-v="${i}">Устгах</button></div>
    <input type="text" data-qf="q" value="${esc(q.q)}" placeholder="Асуулт">
    ${q.o.map((o, j) => `<div class="row" style="flex-wrap:nowrap;gap:8px"><input type="radio" name="qa${i}" data-qa="${j}" ${q.a === j ? "checked" : ""} aria-label="Зөв хариулт"><input type="text" data-qo="${j}" value="${esc(o)}" placeholder="Хариулт ${j + 1}"></div>`).join("")}
    <span class="small muted">Зөв хариултын өмнөх дугуйг сонгоно.</span></div>`).join("")}
  <div class="row"><button class="btn" data-a="addQ">+ Асуулт нэмэх</button></div>
  <div class="row"><button class="btn primary" data-a="saveTrain">Хадгалах</button>${training(V.trainClient) ? `<button class="btn danger" data-a="delTrain">Сургалтыг устгах</button>` : ""}</div></section>`;
}
function readTrain() {
  const e = V.editTrain; if (!e || !$("#trainForm")) return;
  e.title = val("te_title"); e.video = val("te_video"); e.mins = +val("te_mins") || 0; e.pass = +val("te_pass") || 70;
  e.steps = ($("#te_steps").value || "").split("\n").map(s => s.trim()).filter(Boolean);
  document.querySelectorAll("[data-q]").forEach(box => { const i = +box.dataset.q; const q = e.qs[i]; q.q = box.querySelector('[data-qf="q"]').value; box.querySelectorAll("[data-qo]").forEach(inp => { q.o[+inp.dataset.qo] = inp.value; }); const r = box.querySelector("[data-qa]:checked"); q.a = r ? +r.dataset.qa : -1; });
}

function chatList(wid, meSide) {
  const m = S.msgs.filter(x => x.w === wid);
  return m.length ? m.map(x => { const mine = (meSide === "admin") === (x.from === "admin"); return `<div class="msg ${mine ? "out" : "in"}">${esc(x.t)}<small>${x.from === "admin" ? "STM баг" : esc(name(W_(wid)))} · ${x.at}</small></div>`; }).join("") : '<p class="muted">Мессеж алга.</p>';
}
function aChat() {
  const last = {}; S.msgs.forEach(m => { last[m.w] = m; });
  const unreadW = {}; S.msgs.forEach(m => { if (m.from !== "admin" && !m.readA) unreadW[m.w] = (unreadW[m.w] || 0) + 1; });
  const list = S.workers.slice().sort((a, b) => ((last[b.id] || {}).ts || 0) - ((last[a.id] || {}).ts || 0));
  if (!V.chatWith && list[0]) V.chatWith = list[0].id;
  const wid = V.chatWith; const w = W_(wid);
  if (!w) return `<h1>Мессеж</h1><div class="alert info">Одоогоор оюутан бүртгүүлээгүй.</div>`;
  return `<h1>Мессеж</h1><div class="grid2 chatgrid">
  <section class="card" style="align-content:start;gap:4px;max-height:70vh;overflow:auto">${list.map(x => `<button class="btn" style="text-align:left;border-color:${x.id === wid ? "var(--blue)" : "transparent"}" data-a="chatTo" data-v="${x.id}"><b>${esc(name(x))}</b>${unreadW[x.id] ? ` <span class="pill p-bad">${unreadW[x.id]}</span>` : ""}<div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last[x.id] ? esc(last[x.id].t) : "—"}</div></button>`).join("")}</section>
  <section class="card" style="align-content:start"><div class="row between"><h2>${esc(name(w))}</h2><a class="small" href="tel:${esc(w.phone)}">${esc(w.phone)}</a></div><div class="stack" style="gap:8px">${chatList(wid, "admin")}</div>
  <form class="row" data-form="adminSend" style="flex-wrap:nowrap"><input id="adminMsg" type="text" placeholder="Мессеж бичих…" style="flex:1" maxlength="1000"><button class="btn primary" type="submit">Илгээх</button></form></section></div>`;
}

function aDocs() {
  const ids = units();
  if (!ids.length) return `<h1>Гэрээ, нэхэмжлэх</h1><div class="alert info">Одоогоор төсөл алга.</div>`;
  if (!ids.includes(V.docUnit)) V.docUnit = ids[0];
  const u = unit(V.docUnit); const v = invoice(u);
  return `<h1>Гэрээ, нэхэмжлэх</h1>
  <label class="f" style="max-width:460px">Төсөл / захиалга<select id="docPick">${ids.map(id => { const x = unit(id); return `<option value="${id}" ${id === u.id ? "selected" : ""}>${x.no} · ${esc(x.title)}</option>`; }).join("")}</select></label>
  <p class="small muted">Албан бичигт тулгуурлан автоматаар бэлдэгдсэн. "Илгээх" дарахад захиалагчийн имэйл рүү гарын үсэг зурах линк очно; захиалагч company.html-д нэвтэрч цахимаар зурна. Хэвлэх бол браузерын Print (Ctrl+P) ашиглана. Гэрээний текстийг хуульчаар хянуулна.</p>
  ${contractRow(u)}
  ${contractDoc(u)}${invoiceDoc(u)}
  <div class="row">${u.contract.status !== "signed" ? `<button class="btn primary" data-a="sendContract" data-v="${u.id}">${esc((C_(u.clientId) || {}).email || "")} руу илгээх</button>` : ""}${v.due > 0 && v.doneDays ? `<button class="btn" data-a="markPaid" data-v="${u.id}">Гүйцэтгэлийн төлбөр орсон гэж тэмдэглэх</button>` : ""}<button class="btn" data-a="print">Хэвлэх</button></div>`;
}
function contractDoc(u) {
  const c = C_(u.clientId) || {}; const h = u.orders.length ? hours(u.orders[0]) : hours(u); const multi = u.orders.length > 1;
  return `<div class="doc"><div class="head"><img src="${LOGO}" alt="STM"><span>Гэрээ № ${u.no}</span><span>Улаанбаатар, ${fmtDate(u.contract.signedAt || TODAY)}</span></div>
  <h3>АЖИЛЛАХ ХҮЧ НИЙЛҮҮЛЭХ ГЭРЭЭ (ТӨСӨЛ)</h3>
  <p>Нэг талаас <b>ЭС ТИ ЭМ БАГ ХХК</b> (цаашид "Нийлүүлэгч"), нөгөө талаас <b>${esc(c.name)}</b> (цаашид "Хүлээн авагч") нь Хүлээн авагчийн ${fmtDate(u.letterDate)}-ны №${esc(u.letterNo)} албан бичгийн дагуу дараах гэрээг байгуулав.</p>
  <ol style="margin:0;padding-left:20px;display:grid;gap:4px">
    <li>Ажил: ${esc(u.title)} (${CATS[u.cat].n}); байр: ${esc(u.place)}.</li>
    <li>Хугацаа: ${multi ? `${fmtDate(u.from)}-ээс ${fmtDate(u.to)} хүртэл ${u.orders.length} хоног, өдөр бүр` : dayLabel(u.from) + ","} ${u.start}–${u.end} (${h} цаг); өдөрт ${u.need} ажилтан.</li>
    <li>Хөлс цагаар тооцогдоно: ${money(u.rate)}/цаг; хөдөлмөрийн хөлсний доод хэмжээнээс багагүй. Бодит ирцээр (QR код) гүйцэтгэлийг баталгаажуулна.</li>
    <li>Нийлүүлсэн ажилтны хөдөлмөрийн нөхцөл Хүлээн авагчийн өөрийн ажилтнуудынхаас дордохгүй.</li>
    <li>Хүлээн авагч ажлын байрны аюулгүй ажиллагааг хангаж, хариуцагч томилж, ирцийн кодыг ажлын байранд харуулна.</li>
    ${lateEnd(u) ? `<li>Ээлж 21:00-аас хойш дуусах тул тээвэр: ${TRANSPORT[u.transport]}.</li>` : ""}
    ${CATS[u.cat].req.health ? "<li>Нийлүүлэгч хүнстэй харьцах ажилтныг хүчинтэй эрүүл мэндийн үзлэгтэйгээр нийлүүлнэ.</li>" : ""}
    <li>Сонгогдсон ажилтан ирээгүй тохиолдолд Нийлүүлэгч орлох ажилтан гаргана.</li>
    <li>${multi ? "Төлбөрийг долоо хоног тутам гүйцэтгэлээр нэхэмжилнэ." : "Төлбөрийг ажил дууссаны дараа гүйцэтгэлээр нэхэмжилнэ."}</li>
    <li>Үйлчилгээний хөлс: ажилтны хөлсний ${S.settings.fee}%${S.settings.vat ? ", НӨАТ 10% нэмэгдэнэ" : ""}.</li>
    <li>Талууд хувийн мэдээллийг зөвхөн энэ гэрээний зорилгоор ашиглана.</li>
  </ol>${u.contract.status === "signed" ? `<p class="small">Хүлээн авагч цахимаар зурсан: ${esc(u.contract.signer)}, ${fmtDate(u.contract.signedAt)}</p>` : ""}</div>`;
}
function invoiceDoc(u) {
  const c = C_(u.clientId) || {}; const v = invoice(u); const pre = !v.doneDays;
  return `<div class="doc"><div class="head"><img src="${LOGO}" alt="STM"><span>${pre ? "Урьдчилсан тооцоо" : "Гүйцэтгэлийн нэхэмжлэх"} № ${u.no}</span><span>${fmtDate(TODAY)}</span></div>
  <h3>${pre ? "УРЬДЧИЛСАН ТООЦОО" : "НЭХЭМЖЛЭХ"}</h3><p>Төлөгч: <b>${esc(c.name)}</b></p>
  <div class="tbl"><table><thead><tr><th>Утга</th><th class="r">Хүн-цаг</th><th class="r">Нэгж</th><th class="r">Дүн</th></tr></thead><tbody>
  ${pre ? `<tr><td>${esc(u.title)} — төлөвлөсөн ${v.plannedPD} хүн-өдөр × ${v.h} цаг</td><td class="r num">${v.plannedPD * v.h}</td><td class="r num">${money(u.rate)}</td><td class="r num">${money(v.plannedPD * v.h * u.rate)}</td></tr><tr><td><b>Нийт (хөлс${S.settings.vat ? ", НӨАТ" : ""} орсон)</b></td><td></td><td></td><td class="r num"><b>${money(v.ptotal)}</b></td></tr>` :
  `<tr><td>${esc(u.title)} — ирцээр баталгаажсан ${v.present} хүн-өдөр × ${v.h} цаг${u.orders.length > 1 ? ` (${v.doneDays} өдөр)` : ""}</td><td class="r num">${v.present * v.h}</td><td class="r num">${money(u.rate)}</td><td class="r num">${money(v.labor)}</td></tr>
  <tr><td>Үйлчилгээний хөлс (${S.settings.fee}%)</td><td></td><td></td><td class="r num">${money(v.fee)}</td></tr>
  ${S.settings.vat ? `<tr><td>НӨАТ (10%)</td><td></td><td></td><td class="r num">${money(v.vat)}</td></tr>` : ""}
  <tr><td><b>Гүйцэтгэлийн нийт</b></td><td></td><td></td><td class="r num"><b>${money(v.total)}</b></td></tr>
  <tr><td>Төлсөн</td><td></td><td></td><td class="r num">−${money(v.paid)}</td></tr>
  <tr><td><b>Төлөх үлдэгдэл</b></td><td></td><td></td><td class="r num"><b>${money(v.due)}</b></td></tr>`}
  </tbody></table></div>${u.orders.length > 1 ? `<p class="small">Төслийн нийт төлөвлөсөн дүн: ${money(v.ptotal)} (${v.plannedPD} хүн-өдөр).</p>` : ""}</div>`;
}

/* ---------- цалин олголт ---------- */
function payoutRows() {
  const rows = [];
  S.orders.forEach(o => Object.entries(o.att).forEach(([wid, at]) => { if (at.out && !at.paidAt) rows.push({ o, w: W_(wid), at, key: o.id + "|" + wid, due: payDate(o) <= TODAY }); }));
  return rows.filter(r => r.w);
}
function aPayouts() {
  const rows = payoutRows();
  const by = {}; rows.forEach(r => { (by[r.w.id] = by[r.w.id] || []).push(r); });
  const ppl = Object.values(by).map(rs => ({ w: rs[0].w, rs, net: rs.reduce((s, r) => s + pay(r.o).net, 0), due: rs.filter(r => r.due) })).sort((a, b) => b.due.length - a.due.length);
  const paid = [];
  S.orders.forEach(o => Object.entries(o.att).forEach(([wid, at]) => { if (at.paidAt) paid.push({ o, w: W_(wid), at }); }));
  paid.sort((a, b) => b.at.paidAt - a.at.paidAt);
  return `<div class="row between"><h1>Цалин олголт</h1><button class="btn sm" data-a="csvPay">Бүх ээлжийн CSV ${BETA}</button></div>
  <p class="small muted">Ээлж бүрийн цалинг ${S.settings.payoutDays} хоногийн дотор олгоно. Шилжүүлсний дараа "Олгосон" гэж тэмдэглэхэд оюутны "Цалин" хэсэгт харагдана. Суутгал: НДШ ${S.settings.ndsh}%, ХХОАТ ${S.settings.pit}%.</p>
  <div class="kpis"><div class="kpi"><b class="num">${money(rows.reduce((s, r) => s + pay(r.o).net, 0))}</b><span>Олгох нийт (гарт)</span></div><div class="kpi"><b class="num">${rows.filter(r => r.due).length}</b><span>Хугацаа болсон ээлж</span></div></div>
  ${ppl.length ? ppl.map(p => `<section class="card" style="gap:8px"><div class="row between"><div><h3>${esc(p.w.last)} ${esc(p.w.first)}</h3><div class="small muted">${esc(p.w.phone)} · ${p.rs.length} ээлж</div></div><div class="row"><b class="num">${money(p.net)}</b><button class="btn sm primary" data-a="payout" data-v="${p.rs.map(r => r.key).join(",")}">Бүгдийг олгосон</button></div></div>
    <div class="tbl"><table><thead><tr><th>Өдөр</th><th>Ажил</th><th class="r">Цаг</th><th class="r">Нийт</th><th class="r">Гарт</th><th>Олгох</th><th></th></tr></thead><tbody>${p.rs.map(r => { const x = pay(r.o); return `<tr><td class="num">${shortDate(r.o.date)}</td><td class="small">${esc(r.o.title)}</td><td class="r num">${x.h}</td><td class="r num">${money(x.gross)}</td><td class="r num"><b>${money(x.net)}</b></td><td>${r.due ? '<span class="pill p-warn">Хугацаа болсон</span>' : `<span class="pill p-blue">${shortDate(payDate(r.o))}</span>`}</td><td><button class="btn sm" data-a="payout" data-v="${r.key}">Олгосон</button></td></tr>`; }).join("")}</tbody></table></div></section>`).join("") : '<div class="alert ok">Олгох цалин алга.</div>'}
  ${paid.length ? `<details class="card"><summary>Олгосон ${paid.length} ээлж</summary><div class="tbl" style="margin-top:10px"><table><tbody>${paid.slice(0, 200).map(r => `<tr><td class="num">${shortDate(r.o.date)}</td><td>${esc(name(r.w))}</td><td class="small">${esc(r.o.title)}</td><td class="r num">${money(pay(r.o).net)}</td><td class="small muted">${fmtTs(r.at.paidAt)}</td></tr>`).join("")}</tbody></table></div></details>` : ""}`;
}

let adminCfg = null;
function aSettings() {
  const s = S.settings;
  if (!adminCfg) { api("getSettings", { token: TOKEN }).then(r => { adminCfg = r.config; if (V.aview === "settings" && safeToRerender()) render(); }).catch(() => {}); }
  const c = adminCfg;
  return `<h1>Тохиргоо</h1><section class="card" style="max-width:560px">
  <label class="f">Үйлчилгээний хөлс (%)<input id="s_fee" type="number" value="${s.fee}" min="0"></label>
  <label class="chk"><input id="s_vat" type="checkbox" ${s.vat ? "checked" : ""}> НӨАТ төлөгч (нэхэмжлэхэд 10% нэмнэ)</label>
  <label class="f">НДШ, ажилтны хувь (%)<input id="s_ndsh" type="number" step="0.1" value="${s.ndsh}"></label>
  <label class="f">ХХОАТ (%)<input id="s_pit" type="number" step="0.1" value="${s.pit}"></label>
  <label class="f">Цалин олгох хугацаа (хоног)<input id="s_payoutDays" type="number" min="0" value="${s.payoutDays}"></label>
  <label class="f">Долоо хоногт нэг хүний дээд цаг<input id="s_weekHours" type="number" min="1" value="${s.weekHours}"></label>
  <div class="grid2"><label class="f">Хөдөлмөрийн хөлсний доод хэмжээ (сараар, ₮)<input id="s_minWage" type="number" value="${s.minWage}"></label>
  <label class="f">Дараагийн доод хэмжээ (₮)<input id="s_minWageNext" type="number" value="${s.minWageNext || ""}"></label>
  <label class="f">Дараагийнх мөрдөх огноо<input id="s_minWageFrom" type="date" value="${s.minWageFrom || ""}"></label></div>
  <p class="small muted">Цагийн доод хөлс = сарын доод хэмжээ / 168. Одоо: ${money(minHourly(TODAY))}/цаг.</p>
  <label class="chk"><input id="s_reserveNew" type="checkbox" ${s.reserveNew ? "checked" : ""}> 3+ хүнтэй өдөрт 1 суудлыг шинэ хүнд үлдээх</label>
  <label class="chk"><input id="s_remind" type="checkbox" ${s.remind !== false ? "checked" : ""}> Ээлжийн өмнөх өдөр болон 2 цагийн өмнө оюутанд сануулах ${BETA}</label>
  <label class="chk"><input id="s_notifyStudents" type="checkbox" ${s.notifyStudents ? "checked" : ""}> Сонгогдсон оюутанд имэйлээр мэдэгдэх (имэйлтэй бол; өдөрт ~100 имэйлийн хязгаартай)</label>
  <div class="alert warn">Суутгалын хувь жишээ. Одоо мөрдөж буй хувийг нягтлан бодогчоор шалгуулна.</div>
  <button class="btn primary" data-a="saveSettings">Хадгалах</button></section>
  <section class="card" style="max-width:560px"><h2>Админд ирэх мэдэгдэл</h2>
  ${c ? `<label class="chk"><input type="checkbox" id="cfg_notify" ${c.notify ? "checked" : ""}> Шинэ хүсэлт, гэрээ зурсан тухай имэйл авах</label>
  <label class="f">Мэдэгдэл авах имэйл (хоосон бол ${esc(c.ownerEmail || "таны Google имэйл")})<input id="cfg_email" type="text" value="${esc(c.notifyEmail || "")}"></label>
  <p class="small muted">SOS болон "ирээгүй" мэдэгдэл үргэлж очно. Өнөөдөр илгээх боломжтой имэйл: ${c.mailQuota}.</p>
  <button class="btn primary" data-a="saveConfig">Хадгалах</button>` : '<p class="muted">Ачааллаж байна…</p>'}</section>
  <section class="card" style="max-width:560px"><h2>Админууд</h2>
  ${c ? `<div class="row">${c.admins.map(a => `<span class="tag">${esc(a)}${a === S.me ? " (та)" : ""}</span>${a !== S.me ? `<button class="btn sm danger" data-a="removeAdmin" data-v="${esc(a)}">Хасах</button>` : ""}`).join(" ")}</div>
  ${c.admins.length < c.maxAdmins ? `<div class="grid2"><label class="f">Шинэ админы нэр<input id="na_name" type="text" placeholder="latin"></label><label class="f">Нууц үг (8+)<input id="na_pw" type="password" autocomplete="new-password"></label></div><button class="btn" data-a="addAdmin" style="justify-self:start">Админ нэмэх</button>` : ""}` : ""}
  <h3>Нууц үг солих</h3><div class="grid2"><label class="f">Одоогийн<input id="cp_cur" type="password" autocomplete="current-password"></label><label class="f">Шинэ (8+)<input id="cp_next" type="password" autocomplete="new-password"></label></div><button class="btn" data-a="changePw" style="justify-self:start">Солих</button></section>`;
}

/* ===================== ЗАХИАЛАГЧ ===================== */
let liveI;
const enc = s => new TextEncoder().encode(s);
const keyCache = {};
async function attCode(key, win) {
  if (!keyCache[key]) keyCache[key] = await crypto.subtle.importKey("raw", enc(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const b = new Uint8Array(await crypto.subtle.sign("HMAC", keyCache[key], enc(String(win))));
  const n = ((b[0] << 24) | (b[1] << 16) | (b[2] << 8) | b[3]) >>> 0;
  return String(n % 1000000).padStart(6, "0");
}
function qrSvg(text) { try { const q = qrcode(0, "M"); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 5, margin: 2, scalable: true }); } catch (e) { return `<div class="scan">${icons.qr}</div>`; } }
function attUrl(oid, code) { return new URL("index.html#a=" + encodeURIComponent(oid) + "." + code, location.href).href; }
function startLive() {
  const tick = async () => {
    for (const box of document.querySelectorAll("[data-live]")) {
      const oid = box.dataset.live, key = (S.attKeys || {})[oid];
      if (!key) continue;
      const win = Math.floor(Date.now() / 30000), left = 30 - Math.floor(Date.now() / 1000) % 30;
      let c;
      try { c = await attCode(key, win); } catch (e) { box.querySelector(".lc").textContent = "HTTPS шаардлагатай"; continue; }
      if (box.dataset.code !== c) { box.dataset.code = c; box.querySelector(".lc").textContent = c.slice(0, 3) + " " + c.slice(3); box.querySelector(".lq").innerHTML = qrSvg(attUrl(oid, c)); }
      box.querySelector(".ll").textContent = left + " сек"; box.querySelector(".lb").style.width = (left / 30 * 100) + "%";
    }
  };
  tick(); liveI = setInterval(tick, 1000);
}
function liveBox(o) {
  return `<div class="card" data-live="${o.id}" style="justify-items:center;text-align:center;background:var(--sunk)">
    <h3>Өнөөдрийн ирцийн код</h3>
    <div class="lq" style="width:220px;max-width:100%;background:#fff;border-radius:12px;padding:6px" aria-label="Ирцийн QR код"></div>
    <div><div class="muted small">Эсвэл кодыг оруулна</div><b class="lc num" style="font-family:var(--display);font-size:2rem;letter-spacing:.06em">––– –––</b></div>
    <div style="width:220px;max-width:100%"><div class="bar"><i class="lb" style="width:100%;background:var(--sun)"></i></div><div class="small muted" style="margin-top:4px">Шинэ код: <span class="ll num">30 сек</span></div></div>
    <p class="small muted" style="max-width:40ch">Ажилтнууд ирэх, явахдаа утасныхаа камераар QR-ийг уншуулна эсвэл 6 оронтой кодыг апп-даа оруулна. Энэ дэлгэцийг зөвхөн хариуцагч харуулна.</p>
    <button class="btn sm" data-a="fullCode" data-v="${o.id}">Том дэлгэцээр</button>
  </div>`;
}
function teamTable(o, canMark) {
  const team = o.apps.filter(a => a.st === "confirmed").map(a => ({ w: W_(a.wid), at: o.att[a.wid] || {} })).filter(x => x.w);
  if (!team.length) return '<p class="muted small">Баг бүрдүүлэгдэж байна.</p>';
  return `<div class="tbl"><table><thead><tr><th>Ажилтан</th><th>Ирсэн</th><th>Явсан</th><th></th></tr></thead><tbody>${team.map(({ w, at }) => `<tr><td><b>${esc(name(w))}</b></td><td class="num">${at.noshow ? '<span class="pill p-bad">Ирээгүй</span>' : at.in ? `${at.in}${toMin(at.in) > toMin(o.start) + 5 ? ' <span class="pill p-warn">Хоцорсон</span>' : ""}` : '<span class="muted">—</span>'}</td><td class="num">${at.out || "—"}</td><td>${at.out ? rateSel(o.id, w.id, at.rated) : canMark && !at.in && !at.noshow ? `<button class="btn sm danger" data-a="noShow" data-v="${o.id}|${w.id}">Ирээгүй</button>` : ""}</td></tr>`).join("")}</tbody></table></div>`;
}
function signBox(u) {
  return `<section class="card" style="border-color:var(--blue)"><div><span class="pill p-sun">${u.contract.status === "draft" ? "Бэлтгэж байна" : "Гарын үсэг хүлээж байна"}</span><h2 style="margin-top:6px">${esc(u.title)}</h2><div class="muted small">Гэрээ № ${u.no}</div></div>
    ${u.contract.status === "draft" ? '<p class="muted small">STM гэрээг бэлдэж байна. Бэлэн болмогц имэйлээр мэдэгдэнэ.</p>' : `<details open><summary class="small">Гэрээ, урьдчилсан тооцоо</summary><div class="stack" style="margin-top:10px">${contractDoc(u)}${invoiceDoc(u)}</div></details>
    <label class="f" style="max-width:420px">Гарын үсэг зурах хүний нэр, албан тушаал<input id="signer_${u.id}" type="text" placeholder="Б. Болд, хүний нөөцийн менежер"></label>
    <label class="chk"><input type="checkbox" id="agree_${u.id}"> Гэрээний нөхцөлийг зөвшөөрч байна</label>
    <button class="btn primary" data-a="clientSign" data-v="${u.id}" style="justify-self:start">Гэрээг цахимаар зурах</button>`}</section>`;
}
let reqDraft = null;
function clientView() {
  const c = C_(S.me);
  const tabs = `<div class="seg" role="group" aria-label="Цэс"><button data-a="cview" data-v="home" aria-pressed="${V.cview === "home"}">Төслүүд</button><button data-a="cview" data-v="requests" aria-pressed="${V.cview === "requests"}">Захиалга хүсэх</button><button data-a="cview" data-v="account" aria-pressed="${V.cview === "account"}">Бүртгэл</button></div>`;
  let body;
  if (V.cview === "requests") body = clientRequests(c);
  else if (V.cview === "account") body = clientAccount(c);
  else body = clientHome(c);
  return `<main class="main"><div class="wrap" style="max-width:900px"><div class="row between"><h1>${esc(c.name)}</h1>${tabs}</div>${body}</div></main>`;
}
function clientHome(c) {
  const us = units().map(unit).filter(u => u.clientId === c.id);
  const pending = us.filter(u => u.contract.status !== "signed"); const live = us.filter(u => u.contract.status === "signed");
  const todayOs = S.orders.filter(o => o.date === TODAY && signed(o));
  const tTeam = todayOs.reduce((s, o) => s + o.apps.filter(a => a.st === "confirmed").length, 0), tArr = todayOs.reduce((s, o) => s + Object.values(o.att).filter(a => a.in).length, 0);
  const due = live.reduce((s, u) => s + invoice(u).due, 0);
  return `<div class="kpis"><div class="kpi"><b class="num">${tArr}/${tTeam}</b><span>Өнөөдөр ирсэн ажилтан</span></div><div class="kpi"><b class="num">${money(due)}</b><span>Төлөх дүн</span></div></div>
  ${pending.map(signBox).join("")}
  ${live.map(u => { const v = invoice(u); const ds = u.orders; const today = ds.filter(o => S.attKeys && S.attKeys[o.id]); const up = ds.filter(o => o.date > TODAY); const okUp = up.filter(o => o.apps.filter(active).length >= o.need).length; const past = ds.filter(o => o.status === "done").reverse(); const unrated = past.reduce((s, o) => s + Object.values(o.att).filter(a => a.out && !a.rated).length, 0);
    return `<section class="card"><div class="row between"><div><h2>${esc(u.title)}</h2><div class="muted small num">${u.from === u.to ? fmtDate(u.from) : `${shortDate(u.from)} – ${shortDate(u.to)}`} · ${u.start}–${u.end} · ${esc(u.place)}</div></div><span class="pill p-grey num">${v.doneDays}/${ds.length} өдөр дууссан</span></div>
    ${today.map(o => `<div class="grid2" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));align-items:start"><div class="stack"><h3>${o.date === TODAY ? "Өнөөдрийн баг" : shortDate(o.date) + "-ны шөнийн ээлж"}</h3>${teamTable(o, o.date === TODAY)}</div>${liveBox(o)}</div>`).join("")}
    ${up.length ? `<div class="small">Ирэх ${up.length} өдөр: ${okUp === up.length ? '<span style="color:var(--ok);font-weight:700">баг бүрдсэн</span>' : `${okUp} өдөр бүрдсэн, бусдыг STM бүрдүүлж байна`}</div>` : ""}
    ${past.length ? `<details><summary class="small">Ажилтнуудыг үнэлэх${unrated ? ` · ${unrated} үнэлээгүй` : ""}</summary><div class="stack" style="margin-top:10px">${past.map(o => `<div class="stack" style="gap:6px"><b class="small">${dayLabel(o.date)}</b>${teamTable(o, false)}</div>`).join("")}</div></details>` : ""}
    <details><summary class="small">Гэрээ, нэхэмжлэх</summary><div class="stack" style="margin-top:10px">${contractDoc(u)}${invoiceDoc(u)}</div></details>
    <div class="row between small" style="border-top:1px solid var(--line);padding-top:10px"><span>Гүйцэтгэл: <b class="num">${money(v.total)}</b></span><span>Үлдэгдэл: <b class="num">${money(v.due)}</b></span></div>
    </section>`; }).join("")}
  ${!us.length ? `<div class="alert info">Одоогоор захиалга алга. "Захиалга хүсэх" хэсгээс хүсэлт илгээнэ үү, эсвэл албан бичгээ STM-д ирүүлнэ үү.</div>` : ""}`;
}
function clientRequests(c) {
  const rs = S.requests;
  const lbl = { pending: ["Хүлээгдэж буй", "p-sun"], done: ["Захиалга болсон", "p-ok"], rejected: ["Татгалзсан", "p-bad"] };
  return `${reqDraft ? orderForm(reqDraft, "client") : `<section class="card"><h2>Шинэ захиалга хүсэх</h2><p class="small muted">Хэдэн өдөр, хэдэн цагт хэдэн хүн хэрэгтэйг илгээнэ үү. STM шалгаад гэрээ, урьдчилсан тооцоог бэлдэж, имэйлээр илгээнэ. Хуулийн шалгалт автоматаар хийгдэнэ.</p><button class="btn primary" data-a="newRequest" style="justify-self:start">+ Хүсэлт бөглөх</button></section>`}
  ${rs.length ? `<section class="card"><h2>Илгээсэн хүсэлтүүд</h2><div class="tbl"><table><thead><tr><th>Ажил</th><th>Хугацаа</th><th class="r">Хүн</th><th>Төлөв</th></tr></thead><tbody>${rs.map(r => `<tr><td><b>${esc(r.title)}</b><div class="small muted">${fmtTs(r.createdAt)}</div></td><td class="small num">${r.multi ? `${shortDate(r.date)} – ${shortDate(r.to)}` : fmtDate(r.date)} · ${r.start}–${r.end}</td><td class="r num">${r.need}</td><td><span class="pill ${(lbl[r.status] || lbl.pending)[1]}">${(lbl[r.status] || lbl.pending)[0]}</span></td></tr>`).join("")}</tbody></table></div></section>` : ""}`;
}
function clientAccount(c) {
  return `<section class="card" style="max-width:560px"><h2>Байгууллагын мэдээлэл</h2>
  <div class="facts"><span>Холбогдох: <b>${esc(c.contactName)}</b></span><span>Утас: <b>${esc(c.phone)}</b></span><span>Имэйл: <b>${esc(c.email)}</b></span><span>Ажилтны тоо: <b>${c.staff || "—"}</b></span></div>
  <p class="small muted">Мэдээллээ өөрчлөх бол STM багт хандана уу.</p></section>
  <section class="card" style="max-width:560px"><h2>Нууц үг солих</h2><div class="grid2"><label class="f">Одоогийн<input id="cp_cur" type="password" autocomplete="current-password"></label><label class="f">Шинэ (8+)<input id="cp_next" type="password" autocomplete="new-password"></label></div><button class="btn" data-a="changePw" style="justify-self:start">Солих</button></section>`;
}

/* ===================== ОЮУТАН ===================== */
function studentShell(w) {
  const v = V.sview; const un = S.unread[w.id];
  const tabs = [["home", "Нүүр", icons.home], ["jobs", "Зар", icons.jobs], ["mine", "Ажил", icons.mine], ["pay", "Цалин", icons.pay], ["me", "Би", icons.me]];
  const views = { home: sHome, jobs: sJobs, mine: sMine, learn: sLearn, pay: sPay, me: sMe, chat: sChat };
  return `<div class="phone"><main class="main"><div class="stack">${views[v](w)}</div></main>
  <nav class="tabs" aria-label="Оюутны цэс">${tabs.map(([k, t, i]) => `<button data-a="sview" data-v="${k}" ${v === k || (k === "me" && (v === "chat" || v === "learn")) ? 'aria-current="page"' : ""}>${i}<span>${t}</span>${k === "me" && un ? '<i class="dot"></i>' : ""}</button>`).join("")}</nav></div>`;
}
function hello(w) { const t = score(w).total; return `<div class="row between" style="flex-wrap:nowrap"><div><div class="muted small">Сайн уу,</div><h1>${esc(w.first)}</h1></div><div class="score" style="--v:${t}" title="Таны оноо ${t}/100"><b class="num">${t}</b></div></div>`; }
function myShifts(w) { return S.orders.filter(o => o.att[w.id] && o.att[w.id].out).sort((a, b) => a.date < b.date ? 1 : -1); }
function earnings(w) { const sh = myShifts(w); const r = { total: 0, paid: 0, pending: 0, hours: 0, next: null }; sh.forEach(o => { const p = pay(o); r.total += p.net; r.hours += p.h; if (o.att[w.id].paidAt) r.paid += p.net; else { r.pending += p.net; if (!r.next || payDate(o) < r.next) r.next = payDate(o); } }); return r; }
function openFor(w) { return S.orders.filter(o => o.status === "open" && signed(o) && !o.apps.some(a => a.wid === w.id) && (o.date > TODAY || (o.date === TODAY && toMin(S.now) < toMin(o.start)))); }
function sHome(w) {
  const up = S.orders.filter(o => o.apps.some(a => a.wid === w.id && active(a)) && o.status !== "done" && !(o.att[w.id] && (o.att[w.id].out || o.att[w.id].noshow))).sort((a, b) => a.date < b.date ? -1 : 1);
  const next = up[0]; const e = earnings(w);
  const todo = [];
  const selN = S.orders.filter(o => o.apps.some(a => a.wid === w.id && a.st === "selected")).length;
  if (selN) todo.push(["warn", `${selN} өдрийн ажлыг 2 цагийн дотор баталгаажуулна уу`, "mine"]);
  const trainNeed = new Set(); openFor(w).forEach(o => { const b = blockers(w, o); if (b.length === 1 && b[0] === "Сургалтын тест өгөөгүй") trainNeed.add(o.clientId); });
  trainNeed.forEach(cid => todo.push(["info", `"${training(cid).title}"-ыг өгвөл нээлттэй ажилд бүртгүүлэх боломжтой`, "learn"]));
  if (w.health) { const d = daysBetween(TODAY, w.health); if (d <= 30) todo.push(["warn", d < 0 ? "Цагаан хуудасны хугацаа дууссан" : `Цагаан хуудас ${d} хоногийн дараа дуусна`, "me"]); }
  S.orders.forEach(o => { const at = o.att[w.id]; if (at && at.out && lateEnd(o) && !at.home && daysBetween(o.date, TODAY) <= 1) todo.unshift(["bad", "Гэртээ хүрснээ мэдэгдэнэ үү", "mine"]); });
  if (S.unread[w.id]) todo.push(["info", `${S.unread[w.id]} шинэ мессеж`, "chat"]);
  const fit = openFor(w).filter(o => !blockers(w, o).length).length;
  return `${hello(w)}
  ${next ? `<section class="hero"><div class="eyebrow">${next.date === TODAY ? "Өнөөдөр" : "Дараагийн ээлж"}</div><h2>${esc(next.title)}</h2><div class="facts"><span><b>${next.date === TODAY ? "Өнөөдөр" : dayLabel(next.date)}</b></span><span><b class="num">${next.start}–${next.end}</b></span><span>${esc(placeFor(next, w))}</span></div><div class="row between"><span class="small">Гарт ≈ <b class="num" style="font-size:1.05rem">${money(pay(next).net)}</b></span><button class="cta" data-a="sview" data-v="mine">${next.date === TODAY ? "Ирцээ бүртгүүлэх" : "Харах"}</button></div></section>` : `<section class="hero"><div class="eyebrow">Шинэ боломж</div><h2>Танд ${fit} өдрийн ажил тохирч байна</h2><button class="cta" data-a="sview" data-v="jobs" style="justify-self:start">Зар харах</button></section>`}
  <div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi"><b class="num">${money(e.pending)}</b><span>Олгох цалин${e.next ? ` · ${shortDate(e.next)}` : ""}</span></div><div class="kpi"><b class="num">${w.done}</b><span>Ажилласан ээлж${w.rn ? ` · ${w.rating.toFixed(1)}★` : ""}</span></div></div>
  ${todo.length ? `<h2>Хийх зүйлс</h2>${todo.map(([k, t, go]) => `<button class="alert ${k}" data-a="sview" data-v="${go}" style="border:0;text-align:left;width:100%">${esc(t)} →</button>`).join("")}` : ""}`;
}

let pickDays = {};
function sJobs(w) {
  const open = S.orders.filter(o => o.status === "open" && signed(o) && o.date >= TODAY);
  const projIds = [...new Set(open.map(o => o.proj))];
  const cards = projIds.map(pid => {
    const P = P_(pid); const all = daysOf(P);
    const ds = open.filter(o => o.proj === pid && (o.date > TODAY || toMin(S.now) < toMin(o.start)));
    const opts = ds.map(o => { const mine = o.apps.find(a => a.wid === w.id); const b = blockers(w, o); return { o, mine, b }; });
    if (!opts.length) return "";
    const can = opts.filter(x => !x.mine && !x.b.length);
    if (all.length === 1) {
      const x = opts[0];
      if (x.mine) return "";
      return `<article class="job ${x.b.length ? "locked" : ""}">
      <div class="row between"><span class="tag">${CATS[P.cat].n}</span><span class="pay num">${money(P.rate)}<span class="muted small" style="font-family:var(--body)">/цаг</span></span></div>
      <div><h2>${esc(P.title)}</h2><div class="muted small">${esc(alias(P.clientId))}</div></div>
      <div class="facts"><span><b>${dayLabel(x.o.date)}</b></span><span><b class="num">${x.o.start}–${x.o.end}</b></span><span>${esc(x.o.area || "")}</span><span>Нийт ≈ <b class="num">${money(pay(x.o).gross)}</b></span></div>
      <div class="row">${reqTags(x.o)}</div>
      ${x.b.length ? `<div class="small" style="color:var(--bad)">${x.b.map(esc).join(" · ")}</div>${x.b.includes("Сургалтын тест өгөөгүй") ? `<button class="btn sm" data-a="goLearn" data-v="${P.clientId}" style="justify-self:start">Сургалт үзэх</button>` : ""}` : `<button class="cta" data-a="apply" data-v="${x.o.id}" style="justify-self:start">За, бүртгүүлье</button>`}</article>`;
    }
    const sel = pickDays[pid] || (pickDays[pid] = new Set(can.map(x => x.o.id)));
    [...sel].forEach(id => { if (!can.some(x => x.o.id === id)) sel.delete(id); });
    const anyBlock = opts.every(x => x.b.length && !x.mine);
    const reasons = [...new Set(opts.flatMap(x => x.b).filter(r => !r.includes("гараг") && !r.includes("цагийн хязгаар") && !r.includes("ээлж сонгоогүй")))];
    const total = [...sel].reduce((s, id) => s + pay(O_(id)).gross, 0);
    return `<article class="job ${anyBlock ? "locked" : ""}">
      <div class="row between"><span class="tag">${CATS[P.cat].n} · ${all.length} хоногийн төсөл</span><span class="pay num">${money(P.rate)}<span class="muted small" style="font-family:var(--body)">/цаг</span></span></div>
      <div><h2>${esc(P.title)}</h2><div class="muted small">${esc(alias(P.clientId))} · ${esc(P.area || "")}</div></div>
      <div class="facts"><span>Өдөр бүр <b class="num">${P.start}–${P.end}</b></span><span>${shortDate(P.from)} – ${shortDate(P.to)}</span><span>${hours(P)} цаг/ээлж ≈ <b class="num">${money(pay(P).gross)}</b></span></div>
      <div class="row">${reqTags(P)}</div>
      ${anyBlock ? `<div class="small" style="color:var(--bad)">${(reasons.length ? reasons : [...new Set(opts.flatMap(x => x.b))]).map(esc).join(" · ")}</div>${reasons.includes("Сургалтын тест өгөөгүй") ? `<button class="btn sm" data-a="goLearn" data-v="${P.clientId}" style="justify-self:start">Сургалт үзэх</button>` : ""}` : `
      <div class="small muted">Өдрөө сонго:</div>
      <div class="row" style="gap:6px">${opts.map(({ o, mine, b }) => mine ? `<span class="pill ${(ST[mine.st] || ST.applied)[1]} num" title="${(ST[mine.st] || ST.applied)[0]}">${shortDate(o.date)} ✓</span>` : `<label class="daychip ${b.length ? "off" : ""}" title="${esc(b.join(", "))}"><input type="checkbox" data-pick="${pid}|${o.id}" ${b.length ? "disabled" : ""} ${sel.has(o.id) ? "checked" : ""}><span class="num">${DAYS[dow(o.date)]} ${shortDate(o.date)}</span></label>`).join("")}</div>
      ${can.length ? `<div class="row between"><span class="small">Сонгосон: <b class="num">${sel.size}</b> өдөр ≈ <b class="num">${money(total)}</b> (суутгалын өмнө)</span><button class="cta" data-a="applyMany" data-v="${pid}" ${sel.size ? "" : "disabled"}>За, бүртгүүлье</button></div>` : '<div class="small muted">Таны сул цагт таарах бүх өдөрт бүртгүүлсэн байна.</div>'}`}
    </article>`;
  }).join("");
  return `${hello(w)}<h2>Нээлттэй ажил</h2><p class="small muted">Хаяг нь баталгаажуулсны дараа харагдана. Сул өдөр, цагаа "Би" хэсгээс өөрчилнө.</p>${cards || '<div class="alert info">Одоогоор нээлттэй зар алга. Шинэ зар гарахад энд харагдана.</div>'}`;
}

function sMine(w) {
  const mine = S.orders.filter(o => o.apps.some(a => a.wid === w.id));
  if (!mine.length) return `<h1>Миний ажил</h1><div class="alert info">Та одоогоор ямар ч ажилд бүртгүүлээгүй байна. "Зар" хэсгээс өдрүүдээ сонгоод "За" гэж дарна уу.</div>`;
  const myA = o => o.apps.find(a => a.wid === w.id);
  const cur = mine.filter(o => { const at = o.att[w.id] || {}; const st = myA(o).st; if (st === "declined") return false; if (o.status === "done") return lateEnd(o) && at.out && !at.home && daysBetween(o.date, TODAY) <= 1; return !(at.out && !(lateEnd(o) && !at.home)); }).sort((a, b) => a.date < b.date ? -1 : 1);
  const fin = mine.filter(o => !cur.includes(o)).sort((a, b) => a.date < b.date ? 1 : -1);
  const selected = cur.filter(o => myA(o).st === "selected");
  const card = o => {
    const a = myA(o); const at = o.att[w.id] || {}; let act = "";
    const overnight = toMin(o.end) <= toMin(o.start) && o.date === addDays(TODAY, -1) && at.in && !at.out;
    const lv = a.leave;
    const leaveUi = lv && lv.st === "pending" ? `<div class="alert warn small">Чөлөө хүссэн — STM-ийн хариуг хүлээж байна.</div>` : lv && lv.st === "rejected" ? `<div class="alert bad small">Чөлөөний хүсэлтийг зөвшөөрөөгүй. Ээлждээ ирнэ үү.</div>` : `<button class="btn sm" data-a="leave" data-v="${o.id}" style="justify-self:start">Чөлөө хүсэх</button>`;
    if (a.st === "selected") act = `<div class="row"><button class="cta" data-a="confirm" data-v="${o.id}">Баталгаажуулах</button><button class="btn danger sm" data-a="decline" data-v="${o.id}">Татгалзах</button></div>`;
    else if (at.noshow) act = `<div class="alert bad small">Хариуцагч таныг ирээгүй гэж тэмдэглэсэн. Алдаа гарсан бол STM багт бичнэ үү.</div>`;
    else if (a.st === "confirmed" && o.status !== "done" && (o.date === TODAY || overnight)) {
      if (!at.in) act = `<button class="cta" data-a="checkIn" data-v="${o.id}" style="justify-self:start">Ирлээ</button>` + leaveUi;
      else if (!at.out) act = `<div class="small">Ирсэн: <b class="num">${at.in}</b></div><button class="cta" data-a="checkOut" data-v="${o.id}" style="justify-self:start">Явлаа</button>`;
      else act = payBox(o, at);
      act += `<button class="btn sm danger" data-a="sos" data-v="${o.id}" style="justify-self:start">Яаралтай тусламж</button>`;
    } else if (a.st === "confirmed" && o.date > TODAY) act = `<div class="small muted">Ажлын өдөр хариуцагчийн QR / кодоор ирцээ бүртгүүлнэ.${o.geo ? " Ирэхдээ утасныхаа байршлыг асаана." : ""}</div>` + leaveUi;
    else if (a.st === "applied" || a.st === "waitlist") act = `<div class="small muted">${a.st === "applied" ? "Сонголт хийгдэхийг хүлээж байна. Сонгогдвол мессеж ирнэ." : "Хүлээлгийн жагсаалтад байна. Суудал гарвал мессеж ирнэ."}</div><button class="btn sm" data-a="decline" data-v="${o.id}" style="justify-self:start">Бүртгэлээ цуцлах</button>`;
    if (at.out && lateEnd(o)) act += at.home ? '<div class="alert ok small">Гэртээ хүрснээ мэдэгдсэн.</div>' : `<button class="cta" data-a="home" data-v="${o.id}" style="justify-self:start">Гэртээ хүрлээ</button>`;
    return `<article class="job" ${o.date === TODAY ? 'style="border-color:var(--sun)"' : ""}><div class="row between">${pill(a.st)}<span class="muted small">${o.date === TODAY ? "<b>Өнөөдөр</b>" : dayLabel(o.date)}</span></div><div><h3>${esc(o.title)}</h3><div class="muted small">${esc(alias(o.clientId))} · ${esc(placeFor(o, w))} · <span class="num">${o.start}–${o.end}</span></div></div>${act}</article>`;
  };
  return `<h1>Миний ажил</h1>${S.sos.length ? '<div class="alert bad">Таны яаралтай дуудлагыг STM баг хүлээн авлаа. Удахгүй холбогдоно. Амь насанд аюултай бол 102, 103.</div>' : ""}
  ${selected.length > 1 ? `<div class="alert warn row between"><span>${selected.length} өдөрт сонгогдсон байна. 2 цагийн дотор баталгаажуулна уу.</span><button class="cta" data-a="confirmAll">Бүгдийг баталгаажуулах</button></div>` : ""}
  ${cur.map(card).join("") || '<div class="alert info">Идэвхтэй ажил алга.</div>'}
  ${fin.length ? `<details><summary style="cursor:pointer;font-weight:700">Дууссан, цуцалсан ${fin.length}</summary><div class="stack" style="margin-top:10px">${fin.map(o => { const at = o.att[w.id] || {}; const st = myA(o).st; return at.out ? `<div class="row between small" style="border-bottom:1px solid var(--line);padding-bottom:6px"><span>${shortDate(o.date)} · ${esc(o.title)}</span><b class="num">${money(pay(o).net)}</b></div>` : `<div class="row between small muted"><span>${shortDate(o.date)} · ${esc(o.title)}</span><span>${at.noshow ? "Ирээгүй" : (ST[st] || ST.applied)[0]}</span></div>`; }).join("")}</div></details>` : ""}`;
}
function payBox(o, at) { const p = pay(o); return `<div class="card" style="background:var(--sunk);padding:12px;gap:6px"><div class="row between small"><span>Ирсэн → явсан</span><b class="num">${at.in} → ${at.out}</b></div><div class="row between small"><span>${p.h} цаг × ${money(o.rate)}</span><b class="num">${money(p.gross)}</b></div><div class="row between small muted"><span>НДШ (${S.settings.ndsh}%)</span><span class="num">−${money(p.ndsh)}</span></div><div class="row between small muted"><span>ХХОАТ (${S.settings.pit}%)</span><span class="num">−${money(p.pit)}</span></div><div class="row between"><b>Гарт олгох</b><b class="num" style="font-family:var(--display)">${money(p.net)}</b></div><div class="small muted">Олгох өдөр: ${fmtDate(payDate(o))}</div></div>`; }

let quiz = null;
function sLearn(w) {
  if (quiz && quiz.wid === w.id) return quizView(w);
  const cids = Object.keys(S.trainings);
  return `<div class="row"><button class="btn sm" data-a="sview" data-v="me">← Буцах</button></div><h1>Сургалт</h1><p class="muted small">Захиалагч бүрийн сургалтыг үзэж, тест өгсөн тохиолдолд тухайн байгууллагын ажил танд санал болгогдоно.</p>${cids.length ? cids.map(cid => {
    const t = S.trainings[cid]; const r = w.tests[cid]; const ok = r && r.score >= t.pass;
    const wait = r && !ok && r.at && Date.now() - r.at < 24 * 36e5;
    return `<article class="job"><div class="row between"><h2>${esc(t.title)}</h2>${r ? `<span class="pill ${ok ? "p-ok" : "p-bad"}">${r.score}% ${ok ? "Тэнцсэн" : "Тэнцээгүй"}</span>` : '<span class="pill p-grey">Үзээгүй</span>'}</div>
    <div class="muted small">${esc(alias(cid))} · видео ${t.mins} мин · ${t.qs.length} асуулт · тэнцэх ${t.pass}%</div>
    ${wait ? `<div class="small muted">Дахин өгөх: ${fmtTs(r.at + 24 * 36e5)}</div>` : `<button class="btn ${ok ? "" : "primary"}" data-a="startLearn" data-v="${cid}" style="justify-self:start">${ok ? "Дахин үзэх" : r ? "Дахин өгөх" : "Эхлэх"}</button>`}</article>`;
  }).join("") : '<div class="alert info">Одоогоор сургалт алга.</div>'}`;
}
function quizView(w) {
  const t = S.trainings[quiz.cid];
  if (quiz.step === "watch") return `<div class="row"><button class="btn sm" data-a="quitQuiz">← Буцах</button></div><h1>${esc(t.title)}</h1>
    ${t.video ? `<a class="video" href="${esc(t.video)}" target="_blank" rel="noopener">${icons.play}<span>Видео үзэх (${t.mins} мин)<br><small style="opacity:.8">Шинэ цонхонд нээгдэнэ</small></span></a>` : ""}
    <div class="card"><h3>Гол алхмууд</h3><ol style="margin:0;padding-left:20px;display:grid;gap:6px">${t.steps.map(s => `<li>${esc(s)}</li>`).join("")}</ol></div>
    <label class="chk"><input type="checkbox" id="watched" ${quiz.watched ? "checked" : ""}> ${t.video ? "Видеог бүтэн үзэж, алхмуудтай танилцлаа" : "Алхмуудтай танилцлаа"}</label>
    <p class="small muted">Тест ${t.qs.length} асуулттай, ${t.qs.length} минутын хугацаатай. Тэнцэх оноо ${t.pass}%. Тэнцээгүй бол 24 цагийн дараа дахин өгнө.</p>
    <button class="btn primary" data-a="toTest" ${quiz.watched ? "" : "disabled"} id="toTestBtn">Тест эхлэх</button>`;
  if (quiz.step === "test") return `<div class="row between"><h1>Тест</h1><span class="pill p-sun num" id="timer">${Math.floor(quiz.left / 60)}:${String(quiz.left % 60).padStart(2, "0")}</span></div>
    <form class="stack" data-form="quiz">${quiz.order.map((qi, n) => { const q = t.qs[qi]; return `<fieldset class="q" style="margin:0"><legend style="font-weight:700;padding:0 4px">${n + 1}. ${esc(q.q)}</legend>${quiz.opt[qi].map(oi => `<label><input type="radio" name="q${qi}" value="${oi}" required> ${esc(q.o[oi])}</label>`).join("")}</fieldset>`; }).join("")}
    <button class="btn primary" type="submit">Дуусгах</button></form>`;
  if (quiz.step === "sending") return `<h1>Шалгаж байна…</h1>`;
  const ok = quiz.score >= quiz.pass;
  return `<h1>Дүн</h1><div class="card" style="justify-items:center;text-align:center"><b class="num" style="font-family:var(--display);font-size:2.4rem;color:${ok ? "var(--ok)" : "var(--bad)"}">${quiz.score}%</b><div>${ok ? "Тэнцлээ! Энэ байгууллагын ажил танд санал болгогдоно." : `Тэнцэх оноо ${quiz.pass}%. 24 цагийн дараа дахин өгөх боломжтой.`}</div></div>
  ${quiz.miss.length ? `<div class="card"><h3>Алдсан асуултууд</h3>${quiz.miss.map(m => `<div class="small"><b>${esc(m.q)}</b><br>Зөв хариулт: ${esc(m.a)}</div>`).join("")}</div>` : ""}
  <button class="btn" data-a="quitQuiz">Сургалт руу буцах</button>`;
}
let timerI;
function startTimer() { clearInterval(timerI); timerI = setInterval(() => { if (!quiz || quiz.step !== "test") { clearInterval(timerI); return; } quiz.left--; const el = $("#timer"); if (el) el.textContent = `${Math.floor(quiz.left / 60)}:${String(Math.max(0, quiz.left) % 60).padStart(2, "0")}`; if (quiz.left <= 0) { clearInterval(timerI); finishQuiz(true); } }, 1000); }
function shuffle(a) { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
async function finishQuiz(timeout) {
  const form = document.querySelector('[data-form="quiz"]'); const answers = {};
  const t = S.trainings[quiz.cid];
  t.qs.forEach((q, i) => { const v = form && form.querySelector(`input[name="q${i}"]:checked`); if (v) answers[i] = +v.value; });
  const cid = quiz.cid; quiz.step = "sending"; render();
  try {
    const r = await call("sQuiz", { cid, answers }, timeout ? "Хугацаа дууслаа" : null);
    if (r) { quiz = { wid: S.me, cid, step: "done", score: r.score, miss: r.miss, pass: r.pass }; pickDays = {}; render(); }
  } catch (e) { quiz = null; render(); }
}

function sPay(w) {
  const sh = myShifts(w); const e = earnings(w);
  const groups = {}; sh.forEach(o => { (groups[o.proj] = groups[o.proj] || []).push(o); });
  return `<h1>Цалин</h1><p class="small muted">Цалинг ээлж бүрээр цагаар тооцож, ээлж дууссанаас хойш ${S.settings.payoutDays} хоногт олгоно. НДШ ${S.settings.ndsh}%, ХХОАТ ${S.settings.pit}% суутгана.</p>
  <div class="kpis" style="grid-template-columns:repeat(2,1fr)"><div class="kpi"><b class="num">${money(e.pending)}</b><span>Олгох${e.next ? ` · ${shortDate(e.next)}` : ""}</span></div><div class="kpi"><b class="num">${money(e.paid)}</b><span>Олгосон</span></div></div>
  ${sh.length ? Object.entries(groups).map(([k, os]) => { const P = P_(k); const tot = os.reduce((s, o) => s + pay(o).net, 0); return `<section class="card" style="gap:8px"><div class="row between"><div><h3>${esc(P ? P.title : os[0].title)}</h3><div class="muted small">${esc(alias(os[0].clientId))} · ${os.length} ээлж</div></div><b class="num">${money(tot)}</b></div>
  <div class="tbl"><table><thead><tr><th>Өдөр</th><th class="r">Цаг</th><th class="r">Гарт</th><th>Олголт</th></tr></thead><tbody>${os.map(o => { const p = pay(o); const pd = o.att[w.id].paidAt; return `<tr><td class="num">${shortDate(o.date)}</td><td class="r num">${p.h}</td><td class="r num"><b>${money(p.net)}</b></td><td>${pd ? '<span class="pill p-ok">Олгосон</span>' : `<span class="pill p-blue">${shortDate(payDate(o))}</span>`}</td></tr>`; }).join("")}</tbody></table></div></section>`; }).join("") : '<div class="alert info">Одоогоор дууссан ээлж алга. Ээлжээ дуусгаад "Явлаа" гэж бүртгүүлэхэд цалингийн тооцоо энд гарна.</div>'}`;
}

function sMe(w) {
  const hd = w.health ? daysBetween(TODAY, w.health) : null;
  const passed = Object.keys(w.tests).filter(cid => S.trainings[cid] && w.tests[cid].score >= S.trainings[cid].pass).length;
  return `<div class="row between"><h1>${esc(w.last)} ${esc(w.first)}</h1><button class="btn sm" data-a="sview" data-v="chat">Мессеж${S.unread[w.id] ? ` (${S.unread[w.id]})` : ""}</button></div>
  <div class="card"><div class="facts"><span><b>${esc(w.school || "—")}</b></span><span>${esc(w.major)}</span><span>${w.age} нас</span><span class="num">${esc(w.phone)}</span></div>
  <div class="small">Ээлж: <b>${w.done}</b> · Үнэлгээ: <b>${w.rn ? w.rating.toFixed(1) + " ★" : "—"}</b> · Оноо: <b>${score(w).total}</b></div></div>
  <button class="card" data-a="sview" data-v="learn" style="text-align:left;cursor:pointer;color:inherit;font:inherit"><div class="row between" style="width:100%"><h3>Сургалт, тест</h3><span class="muted">→</span></div><span class="small muted">${passed} сургалтад тэнцсэн</span></button>
  <div class="card"><h3>Сул өдөр</h3><div class="row">${DAYS.map((d, i) => `<label class="daychip"><input type="checkbox" data-day="${i}" ${w.days.includes(i) ? "checked" : ""}><span>${d}</span></label>`).join("")}</div>
  <h3>Сул цаг</h3><div class="row">${SHIFTS.map((s, i) => `<label class="daychip"><input type="checkbox" data-shift="${i}" ${w.shifts.includes(i) ? "checked" : ""}><span>${s}</span></label>`).join("")}</div>
  <label class="f">Гадаад хэл<input id="me_lang" type="text" value="${esc(w.lang || "")}"></label>
  <label class="f">Имэйл<input id="me_email" type="email" value="${esc(w.email || "")}"></label>
  <button class="btn primary" data-a="saveProfile" style="justify-self:start">Хадгалах</button></div>
  <div class="card"><h3>Бичиг баримт</h3>
  <div class="row between small"><span>Цагаан хуудас</span>${w.health ? `<span class="pill ${hd < 0 ? "p-bad" : hd <= 30 ? "p-warn" : "p-ok"}">${hd < 0 ? "Дууссан" : "Хүчинтэй"}: ${w.health}</span>` : '<span class="pill p-grey">Байхгүй</span>'}</div>
  ${!w.health || hd <= 30 ? `<div class="alert warn small">${!w.health ? "Амталгаа, хоолны ажилд цагаан хуудас шаардлагатай." : hd < 0 ? "Хугацаа дууссан." : "Хугацаа " + hd + " хоногийн дараа дуусна."} Хуудсаа STM-ийн оффист авчирч үзүүлнэ үү.</div>` : ""}
  <div class="row between small"><span>Жолооны үнэмлэх</span><span>${w.license ? "Бий (шалгасан)" : "Бүртгэлгүй"}</span></div></div>
  <div class="card"><h3>Гэрээ, зөвшөөрөл</h3><div class="row between small"><span>Ерөнхий гэрээ (цахим)</span><span class="pill p-ok">${esc(w.signed)}</span></div><div class="row between small"><span>Хувийн мэдээлэл ашиглах зөвшөөрөл</span><span class="pill p-ok">Өгсөн</span></div><button class="btn sm" data-a="showContract" style="justify-self:start">Гэрээ харах</button></div>
  <div class="card"><h3>Нууц үг солих</h3><label class="f">Одоогийн<input id="cp_cur" type="password" autocomplete="current-password"></label><label class="f">Шинэ (8+)<input id="cp_next" type="password" autocomplete="new-password"></label><button class="btn" data-a="changePw" style="justify-self:start">Солих</button></div>
  <button class="btn danger" data-a="logout" style="justify-self:start">Гарах</button>`;
}
function sChat(w) {
  return `<div class="row"><button class="btn sm" data-a="sview" data-v="me">← Буцах</button></div><h1>STM баг</h1><div class="stack" style="gap:8px">${chatList(w.id, "w")}</div>
  <form class="row" data-form="studentSend" style="flex-wrap:nowrap"><input id="stuMsg" type="text" placeholder="Мессеж бичих…" style="flex:1" maxlength="1000"><button class="btn primary" type="submit">Илгээх</button></form>`;
}

/* ---------- ирц ---------- */
function attend(oid, kind) {
  const o = O_(oid);
  modal(`<h2>${kind === "in" ? "Ирц бүртгэх" : "Явах бүртгэл"}</h2><p class="small muted">${esc(placeFor(o, W_(S.me)))}</p>
  <div class="scan">${icons.qr}</div>
  ${o.geo ? `<div class="alert info small">📍 Энэ ажлын байранд ирцийг байршлаар шалгадаг ${BETA}. Утас байршил асуувал "Allow" дарна уу.</div>` : ""}
  <p class="small">Хариуцагчийн утсан дээрх <b>QR кодыг утасныхаа камераар</b> уншуулахад энэ апп нээгдэж ирц автоматаар бүртгэгдэнэ.</p>
  <form class="stack" data-form="codeIn" data-v="${oid}" style="gap:8px"><label class="f">Эсвэл 6 оронтой код<input id="codeIn" type="text" inputmode="numeric" maxlength="7" placeholder="000 000" autocomplete="off" style="font-size:1.3rem;letter-spacing:.15em;text-align:center"></label><div id="codeErr" class="small" style="color:var(--bad)"></div><button class="btn primary" type="submit">Бүртгэх</button></form>
  <button class="btn sm" data-a="closeModal" style="justify-self:start">Болих</button>`);
}
const PEND_KEY = "stm-pending-att";
function readPendingAtt() {
  const m = /[#&]a=([^&]+)/.exec(location.hash);
  if (m) {
    const v = decodeURIComponent(m[1]); const i = v.lastIndexOf(".");
    try { sessionStorage.setItem(PEND_KEY, JSON.stringify({ id: v.slice(0, i), code: v.slice(i + 1), at: Date.now() })); } catch (e) {}
    history.replaceState(null, "", location.pathname + location.search);
  }
}
function getPendingAtt() { try { const p = JSON.parse(sessionStorage.getItem(PEND_KEY) || "null"); return p && Date.now() - p.at < 5 * 60000 ? p : null; } catch (e) { return null; } }
function pendingAttNote() { return getPendingAtt() ? '<div class="alert warn">Ирц бүртгүүлэхийн тулд эхлээд нэвтэрнэ үү. Нэвтэрмэгц ирц бүртгэгдэнэ.</div>' : ""; }
let attBusy = false;
async function handlePendingAtt() {
  const p = getPendingAtt(); if (!p || attBusy || !S) return;
  try { sessionStorage.removeItem(PEND_KEY); } catch (e) {}
  attBusy = true;
  try { await submitAtt(p.id, p.code); } finally { attBusy = false; }
}
async function submitAtt(oid, code) {
  try {
    const o = O_(oid); let pos = null;
    if (o && o.geo) { setBusy(1); pos = await getPos(); setBusy(-1); }
    const r = await call("sCheck", Object.assign({ id: oid, code }, pos || {}), r => r.kind === "in" ? `Ирц бүртгэгдлээ: ${r.time}` : `Ээлж дууслаа (${r.time}). Цалингийн тооцоо гарлаа`);
    if (r) { closeModal(); V.sview = "mine"; render(); }
  } catch (e) { const el = $("#codeErr"); if (el) el.textContent = e.message; }
}

/* ===================== Үйлдлүүд ===================== */
// CSV татахын өмнө серверээс хамгийн сүүлийн өгөгдлийг авна.
function freshThen(fn) { return loadState().then(fn); }
const act = {
  // ерөнхий
  refresh: () => { adminCfg = null; return loadState(); },
  logout: () => { logout(); return "skip"; },
  closeModal: () => { closeModal(); return "skip"; },
  askYes: () => { const f = askFn; askFn = null; closeModal(); return f ? f() : undefined; },
  authView: v => { authView = v; authMsg = ""; },
  print: () => { window.print(); return "skip"; },
  changePw: () => {
    const cur = val("cp_cur"), nx = val("cp_next");
    if (nx.length < 8) { toast("Шинэ нууц үг 8-аас дээш тэмдэгттэй байна", true); return "skip"; }
    const a = { admin: "changePassword", client: "cPassword", student: "sPassword" }[ROLE];
    return call(a, { current: cur, next: nx }, "Нууц үг солигдлоо").catch(() => {});
  },

  // админ: навигаци
  aview: v => { V.aview = v; V.openOrder = null; V.openProj = null; if (v !== "orders") draft = null; if (v !== "train") V.editTrain = null; },
  openOrder: v => { V.aview = "orders"; V.openOrder = v; },
  openProj: v => { V.aview = "orders"; V.openProj = v; V.openOrder = null; },
  back: () => { const o = V.openOrder && O_(V.openOrder); if (o && !isSingle(o.proj)) { V.openProj = o.proj; V.openOrder = null; } else { V.openOrder = null; V.openProj = null; } },
  openDoc: v => { V.aview = "docs"; V.docUnit = v; V.openOrder = null; V.openProj = null; },
  newOrder: () => { V.aview = "orders"; V.openOrder = null; V.openProj = null; draft = newDraft(); },
  cancelOrder: () => { draft = null; reqDraft = null; },
  reqToDraft: v => { const r = S.requests.find(x => x.id === v); draft = draftFromRequest(r); V.openOrder = null; V.openProj = null; window.scrollTo(0, 0); },
  reqReject: v => { askFn = null; modal(`<h2>Хүсэлтээс татгалзах</h2><label class="f">Шалтгаан (захиалагчид имэйлээр очно)<input id="rj_reason" type="text"></label><div class="row"><button class="btn danger" data-a="reqRejectGo" data-v="${v}">Татгалзах</button><button class="btn" data-a="closeModal">Болих</button></div>`); return "skip"; },
  reqRejectGo: v => { const reason = val("rj_reason"); closeModal(); return call("aRequest", { id: v, status: "rejected", reason }, "Татгалзлаа").catch(() => {}); },
  publishOrder: () => {
    readDraft(); if (legal(draft).some(x => x.block && !x.ok)) return "skip";
    const d = Object.assign({}, draft);
    return call("aCreate", { draft: d, requestId: d.requestId }, "Захиалга бүртгэгдлээ. Гэрээг захиалагч руу илгээнэ үү").then(r => { if (!r) return; draft = null; if (r.single) { V.openOrder = r.single; V.openProj = null; } else { V.openProj = r.id; V.openOrder = null; } render(); }).catch(() => {});
  },
  deleteProj: v => { ask("Энэ төслийг устгах уу?", "Устгах", () => call("aDeleteProject", { id: v }, "Устгалаа").then(() => { V.openOrder = null; V.openProj = null; render(); }).catch(() => {}), true); return "skip"; },
  selectProj: v => call("aSelect", { ids: daysOf(P_(v)).map(o => o.id) }, r => r.n ? `${r.people} хүнд ${r.n} ээлж оноож, мессеж илгээлээ` : "Шаардлага хангасан бүртгэл алга").catch(() => {}),
  selectOne: v => call("aSelect", { ids: [v] }, r => r.n ? `${r.n} хүн сонгогдож, мессеж илгээгдлээ` : "Шаардлага хангасан бүртгэл алга").catch(() => {}),
  manualSel: v => { const [id, wid] = v.split("|"); return call("aManualSel", { id, wid }, "Сонгож, мессеж илгээлээ").catch(() => {}); },
  unsel: v => { const [id, wid] = v.split("|"); return call("aUnsel", { id, wid }, r => r.promoted ? `${r.promoted} дараагийнхаар сонгогдлоо` : "Хүлээлгийн жагсаалтад шилжүүллээ").catch(() => {}); },
  markDone: v => { ask("Энэ өдрийг дууссан гэж тэмдэглэх үү? Ирцээ бүртгүүлээгүй баталгаажсан ажилчдад бүтэн ээлж тооцогдоно.", "Тэмдэглэх", () => call("aMarkDone", { id: v }, "Ажил дууссан. Ажилчдыг үнэлнэ үү").catch(() => {})); return "skip"; },
  reopen: v => call("aReopen", { id: v }, "Дахин нээлээ").catch(() => {}),
  sendContract: v => call("aSendContract", { id: v }, r => r.mailed ? `Гэрээ ${(C_(P_(v).clientId) || {}).email} руу илгээгдлээ` : "Гэрээ илгээсэн төлөвт орлоо (имэйл явуулж чадсангүй — захиалагчид линкээ өөрөө өгнө үү)").catch(() => {}),
  markPaid: v => call("aMarkPaid", { id: v }, "Төлбөр бүртгэгдлээ").catch(() => {}),
  leaveOk: v => { const [id, wid] = v.split("|"); return call("aLeave", { id, wid, approve: true }, r => "Чөлөө зөвшөөрлөө" + (r.promoted ? `. ${r.promoted} дараагийнхаар сонгогдлоо` : "")).catch(() => {}); },
  leaveNo: v => { const [id, wid] = v.split("|"); return call("aLeave", { id, wid, approve: false }, "Татгалзлаа. Оюутанд мэдэгдлээ").catch(() => {}); },
  saveGeo: v => {
    const t = val("geo_" + v), m = t.match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
    if (!m) { toast('Координатыг "47.9184, 106.9177" хэлбэрээр оруулна уу', true); return "skip"; }
    return call("aProjectGeo", { id: v, lat: m[1], lng: m[2], radius: +val("rad_" + v) || 300 }, "Байршил хадгалагдлаа").catch(() => {});
  },
  clearGeo: v => call("aProjectGeo", { id: v, lat: "", lng: "", radius: 300 }, "Байршлын шалгалтыг унтраалаа").catch(() => {}),
  csvWorkers: () => freshThen(() => downloadCSV("STM-ajilchid-" + TODAY + ".csv", ["Овог", "Нэр", "Утас", "Имэйл", "Төрсөн", "Нас", "Сургууль", "Мэргэжил", "Сул өдөр", "Сул цаг", "Цагаан хуудас", "Жолоо", "Гадаад хэл", "Ээлж", "Тасалсан", "Хоцорсон", "Үнэлгээ", "Оноо", "Төлөв", "Бүртгүүлсэн"], S.workers.map(w => [w.last, w.first, w.phone, w.email, w.birth, w.age, w.school, w.major, w.days.map(d => DAYS[d]).join(" "), w.shifts.map(s => SHIFTS[s]).join(" "), w.health, w.license ? "Тийм" : "", w.lang, w.done, w.noshow, w.late, w.rn ? w.rating.toFixed(1) : "", score(w).total, w.status === "blocked" ? "Хаагдсан" : "Идэвхтэй", fmtTs(w.createdAt)]))),
  csvPay: () => freshThen(() => { const rows = []; S.orders.forEach(o => Object.entries(o.att).forEach(([wid, at]) => { if (!at.out) return; const w = W_(wid), p = pay(o); rows.push([o.date, o.no, cname(o.clientId), o.title, w ? w.last : "", w ? w.first : "", w ? w.phone : "", at.in, at.out, p.h, o.rate, Math.round(p.gross), Math.round(p.ndsh), Math.round(p.pit), Math.round(p.net), payDate(o), at.paidAt ? fmtTs(at.paidAt) : ""]); })); rows.sort((a, b) => a[0] < b[0] ? -1 : 1); downloadCSV("STM-tsalin-" + TODAY + ".csv", ["Огноо", "Дугаар", "Захиалагч", "Ажил", "Овог", "Нэр", "Утас", "Ирсэн", "Явсан", "Цаг", "Цагийн хөлс", "Нийт", "НДШ", "ХХОАТ", "Гарт", "Олгох өдөр", "Олгосон"], rows); }),
  csvAtt: v => freshThen(() => { const u = unit(v), rows = []; u.orders.forEach(o => o.apps.forEach(a => { const w = W_(a.wid), at = o.att[a.wid] || {}; rows.push([o.date, w ? w.last + " " + w.first : a.wid, w ? w.phone : "", (ST[a.st] || [a.st])[0], at.in || "", at.out || "", at.noshow ? "Ирээгүй" : "", at.inDist != null ? at.inDist : "", at.rated || "", a.leave ? a.leave.st + ": " + a.leave.reason : ""]); })); downloadCSV("STM-irts-" + u.no + ".csv", ["Огноо", "Оюутан", "Утас", "Төлөв", "Ирсэн", "Явсан", "Ирээгүй", "Зай (м)", "Үнэлгээ", "Чөлөө"], rows); }),
  resolve: v => call("aResolve", { id: v }, "Шийдсэн гэж тэмдэглэлээ").catch(() => {}),
  payout: v => call("aPayout", { ids: v.split(",") }, r => `${r.n} ээлжийн цалин олгосон гэж тэмдэглэлээ`).catch(() => {}),
  chatTo: v => { V.aview = "chat"; V.chatWith = v; if (S.msgs.some(m => m.w === v && m.from !== "admin" && !m.readA)) return call("aRead", { wid: v }).catch(() => {}); },
  editWorker: v => { workerModal(W_(v)); return "skip"; },
  saveWorker: v => { const f = { health: val("ew_health"), license: checked("ew_license"), lang: val("ew_lang"), note: val("ew_note"), status: checked("ew_blocked") ? "blocked" : "active" }; closeModal(); return call("aWorker", { id: v, fields: f }, "Хадгаллаа").catch(() => {}); },
  workerPw: v => { ask("Шинэ түр нууц үг үүсгэх үү? Хуучин нууц үг ажиллахаа болино.", "Үүсгэх", () => call("aWorkerPw", { id: v }).then(r => { if (r) modal(`<h2>Түр нууц үг</h2><p>Оюутанд хэлнэ үү. Нэвтэрсний дараа "Би" хэсгээс сольж болно.</p><b class="num" style="font-size:1.6rem;font-family:var(--display);letter-spacing:.05em">${esc(r.temp)}</b><button class="btn" data-a="closeModal">Хаах</button>`); }).catch(() => {})); return "skip"; },
  newClient: () => { clientModal(null); return "skip"; },
  editClient: v => { clientModal(C_(v)); return "skip"; },
  saveClient: v => {
    const d = { org: val("ec_org"), alias: val("ec_alias"), staff: val("ec_staff"), contactName: val("ec_contact"), phone: val("ec_phone") };
    if (v) { d.id = v; d.status = checked("ec_blocked") ? "blocked" : "active"; } else d.email = val("ec_email");
    closeModal();
    return call("aClient", { data: d }, r => v ? "Хадгаллаа" : r.mailed ? "Нэмлээ. Захиалагчид нууц үг тохируулах заавар имэйлээр очлоо" : "Нэмлээ").catch(() => {});
  },
  trainClient: v => { V.trainClient = v; V.editTrain = null; },
  editTrain: () => { const t = training(V.trainClient); V.editTrain = t ? JSON.parse(JSON.stringify({ title: t.title, video: t.video, mins: t.mins, pass: t.pass, steps: t.steps, qs: t.qs.map(q => ({ q: q.q, o: q.o.concat(["", "", "", ""]).slice(0, Math.max(4, q.o.length)), a: q.a })) })) : { title: "", video: "", mins: 5, pass: 70, steps: [], qs: [{ q: "", o: ["", "", "", ""], a: -1 }] }; },
  cancelTrain: () => { V.editTrain = null; },
  addQ: () => { readTrain(); V.editTrain.qs.push({ q: "", o: ["", "", "", ""], a: -1 }); },
  delQ: v => { readTrain(); V.editTrain.qs.splice(+v, 1); },
  saveTrain: () => {
    readTrain(); const e = V.editTrain;
    const qs = e.qs.map(q => { const opts = []; let a = -1; q.o.forEach((o, j) => { if (o.trim()) { if (j === q.a) a = opts.length; opts.push(o.trim()); } }); return { q: q.q.trim(), o: opts, a }; }).filter(q => q.q || q.o.length);
    return call("aSaveTraining", { cid: V.trainClient, training: { title: e.title, video: e.video, mins: e.mins, pass: e.pass, steps: e.steps, qs } }, "Сургалт хадгалагдлаа").then(r => { if (r) { V.editTrain = null; render(); } }).catch(() => {});
  },
  delTrain: () => { ask("Сургалтыг устгах уу? Оюутнууд тестгүйгээр бүртгүүлэх болно.", "Устгах", () => call("aDeleteTraining", { cid: V.trainClient }, "Устгалаа").then(() => { V.editTrain = null; render(); }).catch(() => {}), true); return "skip"; },
  saveSettings: () => call("aSaveSettings", { settings: { fee: +val("s_fee"), vat: checked("s_vat"), ndsh: +val("s_ndsh"), pit: +val("s_pit"), payoutDays: +val("s_payoutDays"), weekHours: +val("s_weekHours"), minWage: +val("s_minWage"), minWageNext: +val("s_minWageNext") || "", minWageFrom: val("s_minWageFrom"), reserveNew: checked("s_reserveNew"), notifyStudents: checked("s_notifyStudents"), remind: checked("s_remind") } }, "Хадгаллаа").catch(() => {}),
  saveConfig: () => { setBusy(1); return api("saveConfig", { token: TOKEN, config: { notify: checked("cfg_notify"), notifyEmail: val("cfg_email") } }).then(r => { adminCfg = r.config; render(); toast("Хадгаллаа"); }).catch(e => toast(e.message, true)).finally(() => setBusy(-1)); },
  addAdmin: () => { setBusy(1); return api("addAdmin", { token: TOKEN, name: val("na_name"), password: val("na_pw") }).then(r => { adminCfg.admins = r.admins; render(); toast("Админ нэмлээ"); }).catch(e => toast(e.message, true)).finally(() => setBusy(-1)); },
  removeAdmin: v => { ask(v + " админыг хасах уу?", "Хасах", () => { setBusy(1); return api("removeAdmin", { token: TOKEN, name: v }).then(r => { adminCfg.admins = r.admins; render(); toast("Хаслаа"); }).catch(e => toast(e.message, true)).finally(() => setBusy(-1)); }, true); return "skip"; },

  // захиалагч
  cview: v => { V.cview = v; if (v !== "requests") reqDraft = null; },
  newRequest: () => { const d = newDraft(S.me); d.note = ""; reqDraft = d; },
  sendRequest: () => { readDraft(); if (legal(reqDraft).some(x => x.block && !x.ok)) return "skip"; const d = Object.assign({}, reqDraft); return call("cRequest", { data: d }, "Хүсэлт илгээгдлээ. STM удахгүй холбогдоно").then(r => { if (r) { reqDraft = null; render(); } }).catch(() => {}); },
  clientSign: v => {
    const nm = val("signer_" + v), ag = checked("agree_" + v);
    if (!nm || !ag) { toast("Нэр, албан тушаалаа бичиж, нөхцөлийг зөвшөөрнө үү", true); return "skip"; }
    return call("cSign", { id: v, signer: nm, agree: true }, r => `Гэрээ зурагдлаа. Зар ${r.fit} оюутанд санал болгогдлоо`).catch(() => {});
  },
  noShow: v => { const [id, wid] = v.split("|"); ask(name(W_(wid)) + "-г ирээгүй гэж тэмдэглэх үү? STM орлох хүн гаргана.", "Ирээгүй", () => call("cNoShow", { id, wid }, "STM-д мэдэгдлээ. Орлох хүн гаргана").catch(() => {}), true); return "skip"; },
  fullCode: v => { const box = document.querySelector(`[data-live="${v}"]`); if (box && box.requestFullscreen) box.requestFullscreen().catch(() => {}); return "skip"; },

  // оюутан
  sview: v => { V.sview = v; if (v !== "learn") quiz = null; window.scrollTo(0, 0); if (v === "chat" && S.unread[S.me]) return call("sRead").catch(() => {}); },
  apply: v => call("sApply", { ids: [v] }, "Бүртгүүллээ! Сонгогдвол мессеж ирнэ").catch(() => {}),
  applyMany: v => { const ids = [...(pickDays[v] || [])]; return call("sApply", { ids }, r => `${r.n} өдөрт бүртгүүллээ! Сонгогдвол мессеж ирнэ` + (r.skipped.length ? ` (${r.skipped.length} өдөр боломжгүй)` : "")).then(r => { if (r) { delete pickDays[v]; render(); } }).catch(() => {}); },
  goLearn: v => { V.sview = "learn"; quiz = { wid: S.me, cid: v, step: "watch", watched: false }; },
  startLearn: v => { quiz = { wid: S.me, cid: v, step: "watch", watched: false }; },
  toTest: () => { const t = S.trainings[quiz.cid]; quiz.step = "test"; quiz.left = t.qs.length * 60; quiz.order = shuffle(t.qs.map((_, i) => i)); quiz.opt = {}; t.qs.forEach((q, i) => quiz.opt[i] = shuffle(q.o.map((_, j) => j))); setTimeout(startTimer, 0); },
  quitQuiz: () => { quiz = null; clearInterval(timerI); },
  leave: v => { const o = O_(v); modal(`<h2>Чөлөө хүсэх</h2><p class="small">${esc(o.title)} · ${dayLabel(o.date)} ${o.start}–${o.end}</p><label class="f">Шалтгаан<textarea id="lv_reason" rows="3" maxlength="300" placeholder="Жишээ: шалгалт давхацсан"></textarea></label><p class="small muted">STM зөвшөөрвөл суудал хүлээлгийн дараагийн хүнд шилжинэ. Зөвшөөрөгдөх хүртэл ээлж тань хэвээр.</p><div class="row"><button class="btn primary" data-a="leaveGo" data-v="${v}">Илгээх</button><button class="btn" data-a="closeModal">Болих</button></div>`); return "skip"; },
  leaveGo: v => { const reason = val("lv_reason"); if (!reason) { toast("Шалтгаанаа бичнэ үү", true); return "skip"; } closeModal(); return call("sLeave", { id: v, reason }, "Хүсэлт илгээгдлээ. Хариуг мессежээр мэдэгдэнэ").catch(() => {}); },
  confirm: v => call("sConfirm", { ids: [v] }, "Баталгаажлаа").catch(() => {}),
  confirmAll: () => call("sConfirm", { ids: [] }, r => `${r.n} өдөр баталгаажлаа`).catch(() => {}),
  decline: v => { ask("Энэ ээлжээс татгалзах уу?", "Татгалзах", () => call("sDecline", { id: v }, r => "Татгалзлаа" + (r.promoted ? ". Суудал дараагийн хүнд шилжлээ" : "")).catch(() => {}), true); return "skip"; },
  checkIn: v => { attend(v, "in"); return "skip"; },
  checkOut: v => { attend(v, "out"); return "skip"; },
  home: v => call("sHome", { id: v }, "Аюулгүй хүрсэн нь бүртгэгдлээ").catch(() => {}),
  sos: v => { modal(`<h2>Яаралтай тусламж</h2><p>STM багт яаралтай мэдэгдэл илгээх үү?</p><label class="chk"><input type="checkbox" id="sosLoc" checked> Байршлаа илгээх</label><div class="alert bad small">Амь насанд аюултай бол шууд 102, 103 руу залгана уу.</div><div class="row"><button class="btn danger" data-a="sosSend" data-v="${v}">Илгээх</button><button class="btn" data-a="closeModal">Болих</button></div>`); return "skip"; },
  sosSend: v => {
    const send = (lat, lng) => { closeModal(); return call("sSos", { id: v, lat, lng }, "Илгээгдлээ. STM баг удахгүй холбогдоно").catch(() => {}); };
    if (checked("sosLoc") && navigator.geolocation) {
      setBusy(1);
      navigator.geolocation.getCurrentPosition(p => { setBusy(-1); send(p.coords.latitude.toFixed(5), p.coords.longitude.toFixed(5)); }, () => { setBusy(-1); send("", ""); }, { timeout: 8000, enableHighAccuracy: true });
      return "skip";
    }
    send("", ""); return "skip";
  },
  saveProfile: () => {
    const days = [...document.querySelectorAll("[data-day]:checked")].map(x => +x.dataset.day), shifts = [...document.querySelectorAll("[data-shift]:checked")].map(x => +x.dataset.shift);
    if (!days.length || !shifts.length) { toast("Дор хаяж нэг өдөр, нэг цаг сонгоно уу", true); return "skip"; }
    return call("sProfile", { days, shifts, lang: val("me_lang"), email: val("me_email") }, "Хадгаллаа").then(() => { pickDays = {}; }).catch(() => {});
  },
  showContract: () => { modal(`<h2>Ерөнхий гэрээ (хураангуй)</h2>${generalContract()}<p class="small muted">Цахимаар баталгаажуулсан: ${esc(W_(S.me).signed)}</p><button class="btn" data-a="closeModal">Хаах</button>`); return "skip"; }
};

document.addEventListener("click", e => {
  const el = e.target.closest("[data-a]"); if (!el) return;
  if (el.dataset.a === "closeModal" && el.classList.contains("scrim") && e.target !== el) return;
  if (el.tagName === "A") return;
  const f = act[el.dataset.a]; if (!f) return;
  if (el.disabled) return;
  const r = f(el.dataset.v);
  if (r === "skip" || (r && typeof r.then === "function")) return;
  render();
});
document.addEventListener("input", e => {
  if (e.target.closest("#orderForm") && e.target.type !== "checkbox") { readDraft(); renderChecks(); }
  if (e.target.id === "wq") { V.wq = e.target.value; const pos = e.target.selectionStart; render(); const n = $("#wq"); if (n) { n.focus(); n.setSelectionRange(pos, pos); } }
});
document.addEventListener("change", e => {
  const t = e.target;
  if (t.id === "statPick") { V.statUnit = t.value; render(); return; }
  if (t.id === "docPick") { V.docUnit = t.value; render(); return; }
  if (t.id === "watched") { quiz.watched = t.checked; $("#toTestBtn").disabled = !t.checked; return; }
  if (t.id === "d_multi" || t.id === "d_cat") { readDraft(); render(); return; }
  if (t.dataset.pick) { const [pid, oid] = t.dataset.pick.split("|"); const s = pickDays[pid]; t.checked ? s.add(oid) : s.delete(oid); render(); return; }
  if (t.dataset.rate) {
    const [id, wid] = t.dataset.rate.split("|"); const v = +t.value; if (!v) return;
    call(ROLE === "client" ? "cRate" : "aRate", { id, wid, v }, "Үнэлгээ хадгалагдлаа. Оноо шинэчлэгдлээ").catch(() => {});
    return;
  }
  if (e.target.closest("#orderForm")) { readDraft(); renderChecks(); }
});
document.addEventListener("submit", async e => {
  e.preventDefault(); const f = e.target.dataset.form;
  const btn = e.target.querySelector('[type="submit"]');
  const pub = async (action, data, after) => {
    if (btn) btn.disabled = true; setBusy(1);
    try { const r = await api(action, data); authMsg = ""; await after(r); }
    catch (err) { authMsg = err.message; render(); }
    finally { setBusy(-1); if (btn) btn.disabled = false; }
  };
  const session = async r => { setToken(r.token); await loadState(); };
  if (f === "aLogin") return pub("login", { user: val("au_user"), password: $("#au_pw").value }, session);
  if (f === "cLogin") return pub("cLogin", { email: val("cl_email"), password: $("#cl_pw").value }, async r => session(r)).then(() => { if (authMsg && /баталгаажуулна/.test(authMsg)) { authData = { email: val("cl_email") }; authView = "verify"; render(); } });
  if (f === "cRegister") return pub("cRegister", { data: { org: val("cr_org"), contactName: val("cr_contact"), phone: val("cr_phone"), staff: val("cr_staff"), email: val("cr_email"), password: $("#cr_pw").value, website: val("cr_web") } }, async r => { authData = { email: r.email }; authView = "verify"; authMsg = "Код илгээлээ. Имэйлээ шалгана уу (Spam хавтсыг ч)."; render(); });
  if (f === "cVerify") return pub("cVerify", { email: authData.email, code: val("cv_code") }, session);
  if (f === "cForgot") return pub("cForgot", { email: val("cf_email") }, async () => { authData = { email: val("cf_email"), sent: true }; authMsg = "Бүртгэлтэй бол имэйл рүү код илгээлээ."; render(); });
  if (f === "cReset") return pub("cReset", { email: authData.email, code: val("cf_code"), password: $("#cf_pw").value }, session);
  if (f === "sLogin") return pub("sLogin", { phone: val("sl_phone"), password: $("#sl_pw").value }, session);
  if (f === "sRegister") {
    const days = [...document.querySelectorAll('[name="sr_day"]:checked')].map(x => +x.value), shifts = [...document.querySelectorAll('[name="sr_shift"]:checked')].map(x => +x.value);
    return pub("sRegister", { data: { lastName: val("sr_last"), firstName: val("sr_first"), phone: val("sr_phone"), birth: val("sr_birth"), email: val("sr_email"), school: val("sr_school"), major: val("sr_major"), lang: val("sr_lang"), days, shifts, password: $("#sr_pw").value, consent: checked("sr_consent"), website: val("sr_web") } }, async r => { await session(r); toast("Бүртгэл үүслээ! Тохирох зарууд \"Зар\" хэсэгт байна"); });
  }
  if (f === "sForgot") return pub("sForgot", { phone: val("sf_phone") }, async r => { authData = { phone: val("sf_phone"), sent: r.hasEmail }; authMsg = r.hasEmail ? "Бүртгэлтэй имэйл рүү код илгээлээ." : "Энэ дугаарт имэйл бүртгэлгүй байна. STM багт хандаж түр нууц үг авна уу."; render(); });
  if (f === "sReset") return pub("sReset", { phone: authData.phone, code: val("sf_code"), password: $("#sf_pw").value }, session);
  if (f === "adminSend") { const v = val("adminMsg"); if (!v) return; await call("aSend", { wid: V.chatWith, text: v }).catch(() => {}); const i = $("#adminMsg"); if (i) i.focus(); return; }
  if (f === "studentSend") { const v = val("stuMsg"); if (!v) return; await call("sSend", { text: v }).catch(() => {}); const i = $("#stuMsg"); if (i) i.focus(); return; }
  if (f === "quiz") { clearInterval(timerI); return finishQuiz(false); }
  if (f === "codeIn") { const v = val("codeIn").replace(/\D/g, ""); if (v.length !== 6) { $("#codeErr").textContent = "6 оронтой код оруулна уу."; return; } return submitAtt(e.target.dataset.v, v); }
});
document.addEventListener("keydown", e => { if (e.key === "Escape" && $("#layer") && $("#layer").innerHTML) closeModal(); });

/* ===================== Эхлэл ===================== */
if (ROLE === "student") { readPendingAtt(); window.addEventListener("hashchange", () => { readPendingAtt(); handlePendingAtt(); }); }
render();
if (TOKEN) loadState();
