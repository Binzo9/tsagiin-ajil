
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
