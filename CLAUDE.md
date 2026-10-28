# STM (tsagiin-ajil) — засвар хийх журам

- Сайт: https://binzo9.github.io/tsagiin-ajil/ (GitHub Pages, `main` салбар). `main` руу push хийхэд 1–2 минутад сайт шинэчлэгдэнэ.
- Frontend: `src/*.js`-ийг засаад `sh build.sh` ажиллуулна → `app.js` үүснэ. `app.js`-ийг шууд бүү засаарай.
- Хуваалцсан логик: `logic.js` (build.sh үүнийг `apps-script/Logic.gs` руу хуулна).
- Backend: `apps-script/Code.gs` + `Logic.gs` нь Google Apps Script "STM backend" төсөл дээр ажилладаг. `main` руу push хийсний дараа админ «Тохиргоо → Серверийг шинэчлэх» товч дарахад сервер GitHub-аас кодоо татаж, шинэ хувилбар гаргаж, ижил /exec хаягаа шинэчилнэ (`selfUpdate_`). Хэрэглэгчид товчийг дарахыг хэлнэ. SPREADSHEET_ID мөрийг сервер өөрийнхөөрөө хадгална. `selfUpdate_` функцийг Code.gs-ээс хэзээ ч бүү ав — эс бөгөөс дахин гараар суулгах шаардлагатай болно.
- Хэрэглэгч монголоор бичдэг; хариуг монголоор өгнө.
- Засвар оруулахаас өмнө `node -e` эсвэл Playwright-аар JS алдаагүйг шалгана. Service worker кэш: `sw.js` доторх CACHE нэрийг томоохон өөрчлөлтөд нэмэгдүүлнэ.
