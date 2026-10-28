
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
  selfCheck: () => { setBusy(1); return api("aSelfUpdate", { token: TOKEN, dry: true }).then(r => { V.selfErr = false; V.selfMsg = r.same ? `Сервер хамгийн сүүлийн кодтой байна (GitHub ${r.ref}).` : `GitHub дээр шинэ код байна (${r.ref}). «Серверийг шинэчлэх» дарна уу.`; }).catch(e => { V.selfErr = true; V.selfMsg = e.message; }).finally(() => { setBusy(-1); render(); }); },
  selfUpdate: () => { V.selfErr = false; V.selfMsg = "Шинэчилж байна… (30–60 сек)"; render(); setBusy(1); return api("aSelfUpdate", { token: TOKEN }).then(r => { V.selfMsg = r.msg; }).catch(e => { V.selfErr = true; V.selfMsg = e.message; }).finally(() => { setBusy(-1); render(); }); },
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
