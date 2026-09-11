# Bizda Baraka × Next Nout — doʻkon ekrani / shop board

Fargʻonadagi telefon va kompyuter doʻkoni uchun 8 ta slaydli ekran.
Chrome'da ochiladi, monitorda kun boʻyi aylanib turadi. Bir aylanish ~78 soniya.

An eight-slide board for a phone and computer shop in Fergana. Opens in Chrome
and loops all day on a monitor; one lap is about 78 seconds.

Ikkala doʻkon navbatma-navbat chiqadi — Bizda Baraka, Next Nout, Bizda Baraka,
Next Nout. Har brendning oʻz rangi bor, shuning uchun qaysi doʻkon gapirayotgani
uzoqdan ham koʻrinib turadi.

The two shops take turns all the way through, each in its own colour, so which
shop is speaking is readable from across the room.

| | Slayd | Doʻkon | Nima haqida |
|---|---|---|---|
| 1 | Bosh sahifa | ikkalasi | ikkala brend, har birining oʻz shiori bilan |
| 2 | Nasiya savdo | Bizda Baraka | 1 dona pasport va 50% bosh toʻlov evaziga |
| 3 | Oʻyin va grafika | Next Nout | oʻyin noutbuklari, kuchli videokarta |
| 4 | Telefonlar | Bizda Baraka | iPhone va smartfonlar, telefon sotib olish |
| 5 | Ofis va oʻqish | Next Nout | noutbuk, monoblok, printer, Wi-Fi modem |
| 6 | Aksessuarlar | Bizda Baraka | gʻilof, quvvat banki, quloqchin, zaryadlagich |
| 7 | Kompyuterlar | Next Nout | tizim bloki, monitor, sozlab berish |
| 8 | Bogʻlanish | ikkalasi | ikkala raqam, ikkita QR, manzil, ish vaqti |

Bizda Baraka slaydlari oltin rangda, Next Nout slaydlari feruza rangda. Pastdagi
belgilardan gapirayotgan brendi yorqin turadi — mijoz qaysi raqamga qoʻngʻiroq
qilishni darrov biladi.

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
Shriftlar, logotip va 3D kutubxona fayl ichida — internet oʻchsa ham ishlayveradi.

Everything is in one file — no internet, no install, no server. The fonts, the
logo and the 3D library are embedded, so it keeps running if the connection drops.

### 3D mahsulotlar / The 3D products

Har bir mahsulot slaydida haqiqiy 3D model aylanib turadi: iPhone, AirPods,
quvvat banki, zaryadlagich, noutbuk, monoblok, tizim bloki, pasport. Bitta
slaydda bir nechta mahsulot navbatma-navbat oʻtadi — nomi pastida yoziladi.

Modellar fayl ichida yasaladi, tashqi fayl kerak emas. Agar kompyuterda WebGL
ishlamasa, ekran oʻzi eski chizmalarga qaytadi va hech narsa buzilmaydi.

Each product slide turns a real 3D model — iPhone, AirPods, power bank, charger,
laptop, all-in-one, tower, passport — and slides with several products cycle
through them one at a time, captioned. The models are built in code, so there
are no asset files. If the machine cannot run WebGL the board silently falls
back to the engraved drawings; nothing breaks.

---

## Maʼlumotlarni oʻzgartirish / Editing the details

`index.html` ni Notepad yoki TextEdit'da oching. Yuqorida, `<script>` dan keyin
**SOZLAMALAR** bloki bor. Faqat shu yerni oʻzgartiring:

```js
var CONFIG = {
  // Telefon raqamlar. Reklamangizdagidek yozilgan (+998 siz).
  telefon_baraka:   '97 666 68 67',      // Bizda Baraka   (+998 97 666 68 67)
  telefon_nextnout: '99 990 01 10',      // Next Nout      (+998 99 990 01 10)

  // Ijtimoiy tarmoqlar (@ belgisisiz). QR kodlar shulardan yasaladi.
  instagram_baraka:   'bizda_baraka',    // instagram.com/bizda_baraka
  instagram_nextnout: 'next.nout',       // ekranda koʻrinadigan manzil
  telegram_nextnout:  'nextnout',        // t.me/nextnout — QR shu yerga olib boradi

  manzil:    ['Fargʻona shahri, Mustaqillik koʻchasi 12',
              'Telefon bozori, 3-qator'],
  ish_vaqti: 'Har kuni  09:00 – 20:00',
  sekund:    9,                          // har bir slayd necha soniya turadi

  rasm: { nasiya:'', telefon:'', aksessuar:'', gaming:'', ofis:'', desktop:'' }
};
```

Saqlang va sahifani yangilang (**Ctrl+R** / **Cmd+R**).

Telefon raqamlar toʻgʻri. **Manzil va ish vaqti hali namuna** — ularni oʻzingiznikiga
almashtiring.

The two phone numbers are real. The **address and opening hours are still
placeholders** — swap them for the real ones.

Manzillarni oʻzgartirsangiz, **QR kodlar ham oʻzi yangilanadi** — qoʻlda hech nima
qilish shart emas.

Change a handle and its QR code regenerates itself — nothing else to do.

### Mahsulot rasmlarini qoʻshish / Adding product photos

Rasmni `assets/products/` papkasiga qoʻying, keyin `rasm` ichida yozing. Bir
slaydga bir nechta rasm qoʻysangiz, ular navbatma-navbat oʻtadi:

```js
rasm: {
  telefon: [
    { rasm: 'assets/products/iphone-18-pro.png', nom: 'iPhone 18 Pro' },
    { rasm: 'assets/products/iphone-18.png',     nom: 'iPhone 18' }
  ]
}
```

Boʻsh qoldirsangiz, oʻsha slaydda 3D model koʻrinadi. Rasm topilmasa ham ekran
buzilmaydi — 3D model oʻrnida qoladi.

Leave a slide empty and it keeps its 3D model. Several photos on one slide cycle
through them, captioned, exactly like the models do.

**Rasm qanday boʻlishi kerak / What the photo needs to be**

- Fon bir xil — oq, kulrang yoki boshqa tekis rang. Foni shaffof PNG boʻlsa eng yaxshi.
- Kamida 1200px. Mahsulot toʻliq koʻrinsin, kesilmasin.
- Qoʻlsiz, bitta mahsulot, toʻgʻridan yoki biroz burchakdan.
- Yorugʻlik tekis, soya kerak emas — ekran oʻz yorugʻligini qoʻshadi.

Plain flat backdrop, ≥1200px, the whole product uncropped, one item, no hands,
even light with no baked-in shadow.

**Fonini oʻzi olib tashlash / Removing the background automatically**

```
python3 tools/cutout.py rasm.jpg assets/products/mahsulot.png
```

Burchaklardagi rangni fon deb biladi va chetlaridan ichkariga qarab tozalaydi,
keyin qirralarini yumshatib kesadi.

Reads the backdrop colour from the corners, floods inward from every edge so
enclosed detail is never punched out, feathers and trims. Works on white, grey
or any flat studio background.

### Slayd orqasidagi fon rasmi / Background photo

`fon` ichiga rasm yoʻlini yozsangiz, u slayd orqasida juda xira koʻrinadi.
Yozuvlarga xalaqit bermasligi uchun chap tomoni butunlay oʻchiriladi.

`CONFIG.fon` puts a photo behind a slide, heavily dimmed and blurred and faded
out under the text. Use something atmospheric — a photo full of legible text or
detail will fight the words.

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
| `index.html` | butun ekran — doʻkonda shu bitta fayl ochiladi |
| `src/` | ekran qismlari: `body.html`, `main.css`, `engine.js`, `qr.js`, `assets.css` |
| `build.sh` | `src/` dan `index.html` ni yigʻadi: `sh build.sh` |
| `tools/` | tekshirish skriptlari (Chrome orqali avtomatik sinov) |
| `assets/baraka-*.png` | logotipdan ajratilgan qismlar (fayl ichiga ham kiritilgan) |
| `assets/products/` | mahsulot rasmlari (siz qoʻshasiz) |
| `tools/cutout.py` | rasm fonini avtomatik olib tashlaydi |

Ekranni oʻzgartirish uchun `src/` ichidagi fayllarni tahrirlab, `sh build.sh` ni
ishga tushiring. Doʻkon uchun esa hech narsa oʻzgarmaydi — `index.html` hamon
bitta mustaqil fayl.

Edit the parts in `src/` and run `sh build.sh`. Nothing changes for the shop:
`index.html` stays one self-contained file with no runtime dependencies.

## Harakat va yuklama / Motion and load

Ekrandagi hamma narsa sekin harakatlanadi: yorugʻlik slayd boʻylab suriladi,
mahsulot aylanadi, roʻyxatdagi chiziqchalar navbat bilan yonadi, matn ohista
tebranadi. Hech biri protsessorni bandi qilmaydi — bularning barchasi brauzer
videokartasida ishlaydigan CSS animatsiyalari.

Everything on the board drifts: a light crosses the slide, the product turns,
the list dashes pulse in sequence, the text breathes. None of it costs the
processor anything — it is all CSS animation, which the browser runs on the
graphics card rather than the main thread.

Oʻlchangan natija (asosiy oqimdagi yuklama):

Measured main-thread cost, before and after moving the ambient motion off the
per-frame path:

| | style recalc | jami / total |
|---|---|---|
| 3D siz slayd / slide without 3D | 21.0% → **0.8%** | 24.1% → **2.0%** |
| toʻliq aylanma / full loop | 11.7% → **1.2%** | 56.7% → **24.0%** |

3D slaydlardagi qolgan yuklama videokartaga tegishli — sinov kompyuterida
videokarta yoʻq edi, haqiqiy kompyuterda u ancha kam boʻladi.

What remains on 3D slides is GPU work; the test machine had no GPU, so a real
one will be lower again. The 3D itself renders at 30fps and only while a slide
with a model is on screen.

---

## Eslatma / Notes

- Ekran monitorda kuylab turishi uchun rasm juda sekin (7 daqiqada bir marta)
  1–2 piksel siljiydi. Bu koʻrinmaydi, lekin monitorga "kuyib qolish"dan saqlaydi.
- Windows yoki macOS'da "harakatni kamaytirish" yoqilgan boʻlsa, animatsiyalar
  oddiy oʻtishga almashadi.

The whole board drifts by 1–2 pixels over a seven-minute cycle. You cannot see
it, but it stops a static image etching itself into the panel over months.
If the system has "reduce motion" enabled, the animation falls back to a fade.
