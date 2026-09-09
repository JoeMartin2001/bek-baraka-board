#!/bin/sh
# Builds index.html from the parts in src/.
#   sh build.sh
# index.html is the deliverable: one self-contained file, no runtime deps.
set -e
cd "$(dirname "$0")"
{
  printf '%s\n' '<!doctype html>' \
    '<!--' \
    '  Bizda Baraka x Next Nout - dokon ekrani.' \
    '' \
    '  TELEFON RAQAM, MANZIL, ISH VAQTI va TELEGRAM kanalni ozgartirish uchun:' \
    '  shu faylda "SOZLAMALAR" sozini qidiring (Ctrl+F / Cmd+F).' \
    '  Boshqa joyga tegmang.' \
    '' \
    '  To change the phone number, address, hours or Telegram channel:' \
    '  search this file for "SOZLAMALAR" (Ctrl+F / Cmd+F). Nothing else needs editing.' \
    '-->' \
    '<html lang="uz">' '<head>' \
    '<meta charset="utf-8">' \
    '<meta name="viewport" content="width=device-width,initial-scale=1">' \
    '<title>Bizda Baraka × Next Nout — Fargʻona</title>' '<style>'
  cat src/assets.css src/main.css
  printf '%s\n' '</style>' '</head>' '<body>'
  cat src/body.html
  printf '%s\n' '<script>'
  cat src/qr.js src/engine.js
  printf '%s\n' '</script>' '</body>' '</html>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
