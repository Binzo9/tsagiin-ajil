#!/bin/sh
# src/*.js-ийг нэгтгэж app.js болгоно, logic.js-ийг Apps Script руу хуулна.
cd "$(dirname "$0")"
cat src/1-core.js src/2-admin.js src/3-client.js src/4-student.js src/5-actions.js > app.js
cp logic.js apps-script/Logic.gs
