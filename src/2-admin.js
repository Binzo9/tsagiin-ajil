
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
  <div class="card" style="background:var(--sunk);gap:6px;padding:12px"><b class="small">CV ${BETA}</b>${cvView(w.cv)}</div>
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
  <section class="card" style="max-width:560px;display:none"><h2>Серверийн код</h2>
  <p class="small muted">GitHub дээр серверийн кодонд засвар орсон бол энэ товчоор серверийг шинэчилнэ. Утаснаас ч дарж болно. Хаяг өөрчлөгдөхгүй.</p>
  <div class="row"><button class="btn primary" data-a="selfUpdate">Серверийг шинэчлэх</button><button class="btn sm" data-a="selfCheck">Шалгах</button></div>
  ${V.selfMsg ? `<div class="alert ${V.selfErr ? "bad" : "info"} small">${esc(V.selfMsg)}</div>` : ""}</section>
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
