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
