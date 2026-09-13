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
    '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%277%27 fill=%27%23000%27/%3E%3Ccircle cx=%2716%27 cy=%2716%27 r=%279%27 fill=%27none%27 stroke=%27%23E8B23C%27 stroke-width=%273%27/%3E%3C/svg%3E">' \
    '<title>Bizda Baraka × Next Nout — Fargʻona</title>' '<style>'
  cat src/assets.css src/main.css
  printf '%s\n' '</style>' '</head>' '<body>'
  cat src/body.html
  printf '%s\n' '<script>'
  cat vendor/three.iife.js src/stage3d.js src/qr.js src/engine.js
  printf '%s\n' '</script>' '</body>' '</html>'
} > index.html
echo "built index.html ($(wc -c < index.html) bytes)"
