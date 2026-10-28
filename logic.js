/* =====================================================================
 * STM — нийтлэг логик. Энэ файл браузерт (logic.js) болон Apps Script-д
 * (apps-script/Logic.gs) ЯГ ИЖИЛ агуулгатай байна. Нэгийг нь засвал
 * нөгөөд нь хуулж тавина.
 *
 * Бүх функц глобал `S` (төлөв) дээр ажиллана:
 *   S.today, S.settings, S.clients, S.workers, S.projects, S.orders, S.trainings
 * ===================================================================== */
var S;

var DAYS = ["Да", "Мя", "Лх", "Пү", "Ба", "Бя", "Ня"];
var DAYS_FULL = ["Даваа", "Мягмар", "Лхагва", "Пүрэв", "Баасан", "Бямба", "Ням"];
var SHIFTS = ["Өглөө", "Өдөр", "Орой"];
var CATS = {
  sample: { n: "Амталгаа, сурталчилгаа", req: { health: true } },
  merch: { n: "Бараа өрөх", req: {} },
  gift: { n: "Бэлэг боох", req: {} },
  stock: { n: "Тооллого", req: {} },
  food: { n: "Хоол үйлчилгээ", req: { health: true } },
  event: { n: "Арга хэмжээ", req: {} },
  wh: { n: "Агуулах, савлагаа", req: {} },
  deliv: { n: "Хүргэлт", req: { license: true } },
  tour: { n: "Аялал жуулчлал", req: { lang: true } },
  office: { n: "Оффис, дижитал", req: {} },
  survey: { n: "Судалгаа", req: {} },
  clean: { n: "Цэвэрлэгээ", req: {} }
};
var TRANSPORT = { "": "Сонгоогүй", client: "Захиалагч хүргэнэ", taxi: "Таксины зардал олгоно", early: "Ээлжийг 21:00-д дуусгана" };
var W = { rating: 35, attend: 25, test: 15, exp: 15, resp: 10 };
var ST = { applied: ["Бүртгүүлсэн", "p-blue"], selected: ["Сонгогдсон", "p-sun"], confirmed: ["Баталгаажсан", "p-ok"], waitlist: ["Хүлээлгэд", "p-grey"], declined: ["Татгалзсан", "p-bad"] };
var DEFAULT_SETTINGS = { fee: 15, vat: true, ndsh: 11.5, pit: 10, reserveNew: true, payoutDays: 7, minWage: 792000, minWageNext: 1000000, minWageFrom: "2027-01-01", weekHours: 32, notifyStudents: true, remind: true };

/* ---------- огноо ---------- */
function toMin(t) { var p = String(t || "0:0").split(":"); return (+p[0]) * 60 + (+p[1] || 0); }
function pad2(n) { return (n < 10 ? "0" : "") + n; }
function addDays(d, n) { var x = new Date(d + "T00:00:00"); x.setDate(x.getDate() + n); return x.getFullYear() + "-" + pad2(x.getMonth() + 1) + "-" + pad2(x.getDate()); }
function dow(date) { return (new Date(date + "T00:00:00").getDay() + 6) % 7; }
function daysBetween(a, b) { return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 864e5); }
function weekKey(d) { return addDays(d, -dow(d)); }
function fmtDate(d) { if (!d) return ""; var p = String(d).split("-"); return (+p[1]) + "-р сарын " + (+p[2]); }
function shortDate(d) { var p = String(d).split("-"); return (+p[1]) + "/" + (+p[2]); }
function dayLabel(d) { return DAYS[dow(d)] + ", " + fmtDate(d); }
function dateRange(a, b) { var r = []; for (var d = a; d <= b; d = addDays(d, 1)) r.push(d); return r; }
function ageAt(birth, date) {
  if (!birth) return 0;
  var b = String(birth).split("-"), d = String(date).split("-");
  var a = (+d[0]) - (+b[0]);
  if ((+d[1]) < (+b[1]) || ((+d[1]) === (+b[1]) && (+d[2]) < (+b[2]))) a--;
  return a;
}

/* ---------- хайлт ---------- */
function W_(id) { for (var i = 0; i < S.workers.length; i++) if (S.workers[i].id === id) return S.workers[i]; return null; }
function C_(id) { for (var i = 0; i < S.clients.length; i++) if (S.clients[i].id === id) return S.clients[i]; return null; }
function O_(id) { for (var i = 0; i < S.orders.length; i++) if (S.orders[i].id === id) return S.orders[i]; return null; }
function P_(id) { for (var i = 0; i < S.projects.length; i++) if (S.projects[i].id === id) return S.projects[i]; return null; }
function name(w) { return w ? String(w.last || "").charAt(0) + ". " + w.first : "—"; }
function alias(cid) { var c = C_(cid); return (c && c.alias) || "Нууцалсан байгууллага"; }
function cname(cid) { var c = C_(cid); return c ? (c.name || c.alias || "—") : "—"; }
function ctr(o) { return P_(o.proj).contract; }
function signed(o) { var p = P_(o.proj); return !!p && p.contract.status === "signed"; }
function daysOf(P) { return S.orders.filter(function (o) { return o.proj === P.id; }).sort(function (a, b) { return a.date < b.date ? -1 : 1; }); }
function training(cid) { return (S.trainings || {})[cid] || null; }

/* ---------- ээлж ---------- */
function hours(o) { var d = toMin(o.end) - toMin(o.start); if (d <= 0) d += 1440; return d / 60; }
function shiftOf(t) { var h = toMin(t) / 60; return h < 12 ? 0 : h < 17 ? 1 : 2; }
function lateEnd(o) { return toMin(o.end) >= 21 * 60 || toMin(o.end) <= toMin(o.start); }
function nightEnd(o) { return toMin(o.end) > 22 * 60 || toMin(o.end) <= toMin(o.start); }
function minHourly(date) {
  var s = S.settings;
  var m = (s.minWageFrom && date >= s.minWageFrom && s.minWageNext) ? s.minWageNext : s.minWage;
  return Math.ceil(m / 168);
}
function active(a) { return a.st === "confirmed" || a.st === "selected"; }

/* ---------- оноо ---------- */
function score(w) {
  var isNew = !w.done;
  var rating = (isNew ? 4 : (w.rn ? w.rating : 4)) / 5 * W.rating;
  var attend = isNew ? W.attend * .8 : Math.max(0, 1 - (w.noshow * 2 + w.late * .5) / Math.max(w.done, 1)) * W.attend;
  var t = Object.keys(w.tests || {}).map(function (k) { return w.tests[k]; });
  var avg = t.length ? t.reduce(function (a, b) { return a + b.score; }, 0) / t.length : 65;
  var test = avg / 100 * W.test;
  var exp = Math.max(isNew ? .25 : 0, Math.min(w.done, 20) / 20) * W.exp;
  var resp = (w.resp == null ? .75 : w.resp) * W.resp;
  return { total: Math.round(rating + attend + test + exp + resp), parts: { rating: rating, attend: attend, test: test, exp: exp, resp: resp }, isNew: isNew };
}

/* ---------- тохирох эсэх ---------- */
function blockers(w, o) {
  var r = [];
  if (w.status === "blocked") r.push("Бүртгэл түр хаагдсан");
  if ((w.days || []).indexOf(dow(o.date)) < 0) r.push(DAYS[dow(o.date)] + " гараг сул биш");
  if ((w.shifts || []).indexOf(shiftOf(o.start)) < 0) r.push(SHIFTS[shiftOf(o.start)].toLowerCase() + "ийн ээлж сонгоогүй");
  if (o.req.health && (!w.health || w.health < o.date)) r.push(w.health ? "Цагаан хуудасны хугацаа дууссан" : "Цагаан хуудас шаардлагатай");
  if (o.req.license && !w.license) r.push("Жолооны үнэмлэх шаардлагатай");
  if (o.req.lang && !w.lang) r.push("Гадаад хэл шаардлагатай");
  if ((o.req.adult || nightEnd(o)) && ageAt(w.birth, o.date) < 18) r.push("18 нас хүрсэн байх шаардлагатай");
  var tr = training(o.clientId), t = (w.tests || {})[o.clientId];
  if (tr && (!t || t.score < tr.pass)) r.push("Сургалтын тест өгөөгүй");
  var wk = weekKey(o.date);
  var h = S.orders.filter(function (x) {
    return x.id !== o.id && weekKey(x.date) === wk && x.apps.some(function (a) { return a.wid === w.id && active(a); });
  }).reduce(function (s, x) { return s + hours(x); }, 0);
  var lim = S.settings.weekHours || 32;
  if (h + hours(o) > lim) r.push("Долоо хоногийн " + lim + " цагийн хязгаар хэтэрнэ");
  return r;
}

/* ---------- захиалгын хуулийн шалгалт ---------- */
function money(n) { return Math.round(n).toLocaleString("en-US") + "₮"; }
function legal(d) {
  var c = C_(d.clientId), min = minHourly(d.date || S.today), h = (d.start && d.end) ? hours(d) : 0, out = [];
  out.push({ ok: +d.rate >= min, block: true, t: "Цагийн хөлс доод хэмжээнээс багагүй (" + money(min) + "/цаг-аас дээш)" });
  if (d.start && d.end && lateEnd(d)) out.push({ ok: !!d.transport, block: true, t: "21:00-аас хойш дуусах тул тээврийн шийдэл заасан" });
  if (d.start && d.end && nightEnd(d)) out.push({ ok: true, info: true, t: "22:00-аас хойш үргэлжлэх тул 18 хүрээгүй хүн оролцохгүй (автоматаар)" });
  if (c && +c.staff > 0) out.push({ ok: +d.need <= Math.floor(c.staff * .3), block: true, t: "Өдөрт нийлүүлэх хүн байгууллагын ажилтны 30%-иас хэтрэхгүй (" + c.staff + " ажилтан → дээд тал нь " + Math.floor(c.staff * .3) + ")" });
  else if (c) out.push({ ok: false, block: true, t: "Захиалагчийн ажилтны тоог оруулаагүй (30%-ийн дүрэм шалгах боломжгүй)" });
  if (d.multi) { var n = d.to >= d.date ? daysBetween(d.date, d.to) + 1 : 0; out.push({ ok: n > 0 && n <= 183, block: true, t: n > 0 ? "Төслийн хугацаа " + n + " хоног (6 сараас хэтрэхгүй)" : "Дуусах огноо эхлэхээс хойш байх ёстой" }); }
  if (d.date) out.push({ ok: d.date >= S.today, block: true, t: "Эхлэх огноо өнгөрөөгүй" });
  if (h) out.push({ ok: h <= 12, block: true, t: "Ээлжийн урт " + h + " цаг" });
  if (+d.need < 1) out.push({ ok: false, block: true, t: "Өдөрт хэрэгтэй хүн 1-ээс багагүй" });
  if (d.cat && CATS[d.cat] && CATS[d.cat].req.health) out.push({ ok: true, info: true, t: "Хүнстэй харьцах ажил тул хүчинтэй цагаан хуудастай хүн л сонгогдоно" });
  return out;
}

/* ---------- цалин ---------- */
function pay(o) {
  var gross = hours(o) * o.rate, ndsh = gross * S.settings.ndsh / 100, pit = (gross - ndsh) * S.settings.pit / 100;
  return { h: hours(o), gross: gross, ndsh: ndsh, pit: pit, net: gross - ndsh - pit };
}
function payDate(o) { return addDays(o.date, S.settings.payoutDays || 7); }

/* ---------- төсөл ---------- */
function unit(id) {
  var P = P_(id), ds = daysOf(P);
  return { id: id, P: P, orders: ds, clientId: P.clientId, no: P.no, title: P.title, cat: P.cat, place: P.place, area: P.area, from: P.from, to: P.to, start: P.start, end: P.end, need: P.need, rate: P.rate, transport: P.transport, letterNo: P.letterNo, letterDate: P.letterDate, contract: P.contract };
}
function units() { return S.projects.slice().sort(function (a, b) { return a.from < b.from ? 1 : -1; }).map(function (p) { return p.id; }); }
function presentCount(o) { return Object.keys(o.att).filter(function (k) { return o.att[k].out; }).length; }
function invoice(u) {
  var h = u.orders.length ? hours(u.orders[0]) : 0, st = S.settings;
  var doneOs = u.orders.filter(function (o) { return o.status === "done"; });
  var present = doneOs.reduce(function (s, o) { return s + presentCount(o); }, 0);
  var plannedPD = u.orders.length * u.need;
  var labor = present * h * u.rate, fee = labor * st.fee / 100, sub = labor + fee, vat = st.vat ? sub * .1 : 0;
  var plabor = plannedPD * h * u.rate, pfee = plabor * st.fee / 100, ptotal = (plabor + pfee) * (st.vat ? 1.1 : 1);
  var pd = u.P.paidUntil ? doneOs.filter(function (o) { return o.date <= u.P.paidUntil; }).reduce(function (s, o) { return s + presentCount(o); }, 0) : 0;
  var paid = pd * h * u.rate * (1 + st.fee / 100) * (st.vat ? 1.1 : 1);
  return { h: h, present: present, plannedPD: plannedPD, labor: labor, fee: fee, sub: sub, vat: vat, total: sub + vat, ptotal: ptotal, paid: paid, due: sub + vat - paid, doneDays: doneOs.length };
}

/* ---------- автомат сонголт (сервер талд ажиллана) ---------- */
function selectDay(o) {
  var pool = o.apps.filter(function (a) { return a.st === "applied" || a.st === "waitlist"; })
    .map(function (a) { return { a: a, w: W_(a.wid) }; })
    .filter(function (x) { return x.w && !blockers(x.w, o).length; })
    .sort(function (x, y) { return score(y.w).total - score(x.w).total; });
  var slots = o.need - o.apps.filter(active).length, chosen = [];
  if (S.settings.reserveNew && o.need >= 3 && slots > 0) {
    var nw = pool.filter(function (x) { return !x.w.done; })[0];
    if (nw) { chosen.push(nw); nw.a.st = "selected"; slots--; }
  }
  pool.forEach(function (x) {
    if (slots <= 0 || chosen.indexOf(x) >= 0) return;
    if (blockers(x.w, o).length) return;
    x.a.st = "selected"; chosen.push(x); slots--;
  });
  pool.forEach(function (x) { if (chosen.indexOf(x) < 0) x.a.st = "waitlist"; });
  return chosen.map(function (x) { return x.w.id; });
}
