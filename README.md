# Bizda Baraka × Next Nout — doʻkon ekrani / shop board

Fargʻonadagi telefon va kompyuter doʻkoni uchun 4 ta slaydli ekran.
Chrome'da ochiladi, monitorda kun boʻyi aylanib turadi.

A four-slide board for a phone and computer shop in Fergana. Opens in Chrome
and loops all day on a monitor.

---

## Ishga tushirish / Running it

1. `index.html` faylini Chrome'da oching (ikki marta bosing).
2. Oʻng yuqoridagi **Toʻliq ekran** tugmasini bosing. (**F** yoki **F11** ham ishlaydi.)
3. Tamom. Ekran oʻzi aylanadi.

Tugma sichqoncha qimirlaganda koʻrinadi va 2.5 soniyadan keyin oʻzi yoʻqoladi,
shuning uchun ekranda ortiqcha narsa turmaydi.

The fullscreen button rides with the cursor: it appears on any mouse movement
and fades out with the pointer, so nothing sits on the board unattended.

Butun ekran bitta faylda: internet, oʻrnatish yoki server kerak emas.
Shriftlar va logotip fayl ichida — internet oʻchsa ham ishlayveradi.

Everything is in one file — no internet, no install, no server. The fonts and
the logo are embedded, so it keeps running if the connection drops.

---

## Maʼlumotlarni oʻzgartirish / Editing the details

`index.html` ni Notepad yoki TextEdit'da oching. Yuqorida, `<script>` dan keyin
**SOZLAMALAR** bloki bor. Faqat shu yerni oʻzgartiring:

```js
var CONFIG = {
  telefon:   '+998 90 123 45 67',                          // telefon raqam
  manzil:    ['Fargʻona shahri, Mustaqillik koʻchasi 12',  // manzil, 1-qator
              'Telefon bozori, 3-qator'],                  // manzil, 2-qator
  ish_vaqti: 'Har kuni  09:00 – 20:00',                    // ish vaqti
  telegram:  'nextnout',                                   // Telegram kanal (@ siz)
  sekund:    9                                             // slayd necha soniya turadi
};
```

Saqlang va sahifani yangilang (**Ctrl+R** / **Cmd+R**).

`telegram` ni oʻzgartirsangiz, **QR kod ham oʻzi yangilanadi** — qoʻlda hech nima
qilish shart emas.

Change `telegram` and the QR code regenerates itself — nothing else to do.

---

## Boshqarish / Controls

| Tugma | Nima qiladi |
|---|---|
| `→` / `Space` / bosish | keyingi slayd |
| `←` | oldingi slayd |
| `1` `2` `3` `4` | kerakli slaydga oʻtish |
| `F` | toʻliq ekran |
| oʻng yuqoridagi tugma | toʻliq ekran / chiqish |

Qoʻlda bosilsa, avtomatik aylanish 15 soniyaga toʻxtaydi, keyin oʻzi davom etadi.
Sichqoncha 2.5 soniya tegilmasa yoʻqoladi.

A manual nudge pauses the loop for 15 seconds, then it resumes on its own.
The cursor hides after 2.5 seconds.

---

## Manzil qatoridagi sozlamalar / URL options

Bularni fayl manzilining oxiriga qoʻshing:

| | |
|---|---|
| `?slide=4` | 4-slayddan boshlash |
| `?still=1` | aylanmasin, bitta slayd tursin |
| `?sek=6` | har bir slayd 6 soniya |

Masalan, faqat aloqa slaydini koʻrsatish uchun: `index.html?slide=4&still=1`

---

## Doʻkon kompyuterida avtomatik ochish / Autostart on the shop PC

Chrome yorligʻiga shu qatorni qoʻshing:

```
chrome.exe --kiosk --start-fullscreen "C:\path\to\index.html"
```

`--kiosk` — Chrome toʻliq ekranda, manzil qatorisiz ochiladi. Yorliqni Windows
**Startup** papkasiga qoʻysangiz, kompyuter yoqilganda ekran oʻzi ishga tushadi.

`--kiosk` opens Chrome fullscreen with no address bar. Put the shortcut in the
Windows Startup folder and the board comes up by itself when the PC boots.

---

## Fayllar / Files

| | |
|---|---|
| `index.html` | butun ekran — shu bitta fayl |
| `assets/baraka-*.png` | logotipdan ajratilgan qismlar (fayl ichiga ham kiritilgan) |
| `assets/IMAGE *.jpg` | asl rasmlar |

`assets/` papkasi faqat manba sifatida saqlanadi — `index.html` uni ochish uchun
talab qilmaydi, hamma narsa fayl ichida.

The `assets/` folder is kept as source only; `index.html` does not need it.

---

## Eslatma / Notes

- Ekran monitorda kuylab turishi uchun rasm juda sekin (7 daqiqada bir marta)
  1–2 piksel siljiydi. Bu koʻrinmaydi, lekin monitorga "kuyib qolish"dan saqlaydi.
- Windows yoki macOS'da "harakatni kamaytirish" yoqilgan boʻlsa, animatsiyalar
  oddiy oʻtishga almashadi.

The whole board drifts by 1–2 pixels over a seven-minute cycle. You cannot see
it, but it stops a static image etching itself into the panel over months.
If the system has "reduce motion" enabled, the animation falls back to a fade.
