# STM (tsagiin-ajil) — засвар хийх журам

- Сайт: https://binzo9.github.io/tsagiin-ajil/ (GitHub Pages, `main` салбар). `main` руу push хийхэд 1–2 минутад сайт шинэчлэгдэнэ.
- Frontend: `src/*.js`-ийг засаад `sh build.sh` ажиллуулна → `app.js` үүснэ. `app.js`-ийг шууд бүү засаарай.
- Хуваалцсан логик: `logic.js` (build.sh үүнийг `apps-script/Logic.gs` руу хуулна).
- Backend: `apps-script/Code.gs` + `Logic.gs` нь Google Apps Script "STM backend" төсөл дээр ажилладаг. Энд засах нь сервер дээр автоматаар орохгүй: Apps Script редактор руу хуулж, шинэ хувилбар (Deploy → Manage deployments → Edit → New version) гаргах шаардлагатай. Ажиллаж буй төслийн SPREADSHEET_ID нь энд байгаагаас өөр тул хуулахдаа тэр мөрийг солихгүй үлдээнэ.
- Хэрэглэгч монголоор бичдэг; хариуг монголоор өгнө.
- Засвар оруулахаас өмнө `node -e` эсвэл Playwright-аар JS алдаагүйг шалгана. Service worker кэш: `sw.js` доторх CACHE нэрийг томоохон өөрчлөлтөд нэмэгдүүлнэ.
