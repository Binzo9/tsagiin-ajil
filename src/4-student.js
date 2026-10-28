
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
