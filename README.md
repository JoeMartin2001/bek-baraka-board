# Bizda Baraka × Next Nout — doʻkon ekrani / shop board

Fargʻonadagi telefon va kompyuter doʻkoni uchun 5 ta slaydli ekran.
Chrome'da ochiladi, monitorda kun boʻyi aylanib turadi. Bir aylanish ~38 soniya.

A five-slide board for a phone and computer shop in Fergana. Opens in Chrome
and loops all day on a monitor; one lap is about 38 seconds.

Ikkala doʻkon navbatma-navbat chiqadi — Bizda Baraka, Next Nout, Bizda Baraka,
Next Nout. Har brendning oʻz rangi bor, shuning uchun qaysi doʻkon gapirayotgani
uzoqdan ham koʻrinib turadi.

The two shops take turns all the way through, each in its own colour, so which
shop is speaking is readable from across the room.

| | Slayd | Doʻkon | Nima haqida |
|---|---|---|---|
| 1 | Bosh sahifa | ikkalasi | ikkala brend, shiorlari, Instagram / Telegram / telefon |
| 2 | Nasiya savdo | Bizda Baraka | 1 dona pasport va 50% bosh toʻlov, trade-in; qoʻl berishish surati |
| 3 | Oʻyin va grafika | Next Nout | zamonaviy oʻyinlar, 3D render, 4K montaj; Asus TUF surati |
| 4 | Telefon va gadjetlar | Bizda Baraka | iPhone, Galaxy, iPad, Ray-Ban suratlari; telefon sotib olish |
| 5 | Bogʻlanish | ikkalasi | ikkala raqam, ikkita QR, manzil, ish vaqti |

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
Shriftlar va logotip fayl ichida — internet oʻchsa ham ishlayveradi.

Everything is in one file — no internet, no install, no server. The fonts, the
logo are embedded, so it keeps running if the connection drops.

### Mahsulot suratlari / The product pictures

Mahsulot slaydlarida haqiqiy suratlar navbatma-navbat aylanadi: iPhone 18 Pro,
Samsung Galaxy S25 Ultra, iPad Pro, Ray-Ban Meta va Asus TUF Gaming A15. Har
safar slayd ikkitasini koʻrsatadi va keyingi aylanishda qolganlaridan davom
etadi — nomi pastida yoziladi.

Surat topilmasa yoki hali yuklanmagan boʻlsa, oʻsha joyda chizma turadi, ekran
hech qachon boʻsh qolmaydi.

Each product slide cycles photographs — iPhone 18 Pro, Galaxy S25 Ultra, iPad
Pro, Ray-Ban Meta and the Asus TUF Gaming A15. A slide shows two per visit and
carries on from there next lap, captioned. While a picture is still loading, or
if its file is missing, the engraved drawing holds the slot, so it is never
empty.

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
  sekund:    7,                          // har bir slayd necha soniya turadi

  fasl: '',                              // '' | 'avto' | 'bahor' | 'yoz' | 'kuz' | 'qish'
  fasl_rasm: { bahor:'', yoz:'', kuz:'', qish:'' },

  rasm: { nasiya:[], telefon:[ ... ], gaming:[] },
  fon:  { nasiya:'', telefon:'', gaming:'' }
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

### Fasllar / Seasons

`fasl` ekranning butun yorugʻligini oʻzgartiradi: bahor — yashil, yoz — oltin,
kuz — sariq-qizgʻish, qish — muzdek koʻk. `'avto'` desangiz, sanaga qarab oʻzi
tanlaydi. Har fasl uchun `fasl_rasm` ga rasm yoʻlini yozsangiz, u barcha
slaydlar orqasida xira koʻrinadi. Koʻrib chiqish uchun manzilga `?fasl=qish`
qoʻshing.

`fasl` retints the whole board (spring green, summer gold, autumn amber, winter
ice-blue); `'avto'` picks from the date. A path in `fasl_rasm` puts that photo,
dimmed, behind every slide. Preview any season with `?fasl=qish` in the URL.

### Televizorda / On a television

Televizor brauzeri odatda juda eski — bu ekranni ochib ololmaydi yoki qotib
qoladi. Shuning uchun ekran video qilib ham yozilgan:

    dist/bizda-baraka-next-nout.mp4     1920x1080, 30 kadr/s, 39.4 soniya, ~9 MB

Ikki fayl bor:

| Fayl | Uzunligi | Ovoz |
|---|---|---|
| `dist/bizda-baraka-next-nout.mp4` | 39.5 s | ovozsiz |
| `dist/bizda-baraka-next-nout-musiqali.mp4` | 5 min 55 s (9 aylanish) | musiqa bilan |

Musiqali fayl katta (~160 MB), shuning uchun repozitoriyda saqlanmaydi.
Oʻzingiz yasashingiz mumkin:

    sh tools/add-music.sh <musiqa.mp3>

Nega 9 aylanish? Agar 40 soniyalik videoga 40 soniyalik musiqa qoʻyilsa, bir
soatda bir xil musiqa 90 marta takrorlanadi — sotuvchi bundan charchaydi.
Toʻqqiz aylanish bilan musiqa har 6 daqiqada bir marta qaytadi. Rasm esa har
aylanishda bir xil, shuning uchun baribir uzluksiz.

Musiqa: "Chill Lounge" — AtlasAudio, Pixabay. Tijorat uchun bepul, muallif
koʻrsatish shart emas. Ovoz darajasi -20 LUFS — gaplashish uchun yetarli past.

Two files: a silent 39.5-second lap, and a 5 minute 55 second version with
music, which is nine identical laps so the track runs its whole length before
repeating. The musical one is about 160MB and is not kept in the repository;
rebuild it with `sh tools/add-music.sh <track.mp3>`. The music is "Chill Lounge"
by AtlasAudio from Pixabay, free for commercial use with no credit required,
laid in at -20 LUFS so it sits under conversation.

Uch xil ishlatish mumkin, eng ishonchlisidan boshlab:

1. **Flesh-karta.** MP4 ni fleshga koʻchiring, televizorga suqing, oʻz
   pleyeridan oching va "takrorlash" (repeat) ni yoqing. Bu har qanday
   televizorda ishlaydi.
2. **`tv.html`.** Brauzerdan shu sahifani oching — u faqat videoni aylantiradi.
3. **`index.html`.** Toʻliq ekran, faqat kompyuterda.

Video bir aylanishga teng va boshi bilan oxiri tutashgan, shuning uchun uzluksiz
takrorlanadi. 30 kadr/s, har kadr alohida — sakramaydi.

Ekran matni yoki raqamlar oʻzgarsa, videoni qayta yozing:

    sh tools/make-video.sh

(node va ffmpeg kerak: `brew install ffmpeg`)

A television's browser is usually too old for this board and will freeze, so the
board is also published as a film. The surest route is a USB stick played by the
set's own player with repeat switched on; `tv.html` is a page that does nothing
but loop the file. The film is exactly one lap, measured from the board itself rather than
calculated, and its end meets its beginning, so it repeats without a seam. It is
filmed at about 57 frames a second and laid down at 30, so the motion is even. Re-record it with `sh tools/make-video.sh` after
changing any wording.

### Sekin kompyuterda / On a slow shop PC

Ekranda 3D yoʻq — hammasi surat va CSS. Shuning uchun eski kompyuterlarda ham
yengil ishlaydi va videokartaga bogʻliq emas.

There is no 3D on the board: it is photographs and CSS, so it does not lean on
the graphics chip at all.

Fon rasmlari allaqachon xiralashtirilgan holda saqlangan — brauzer ularni har
kadrda qayta ishlamaydi. Yangi fon rasmi qoʻshsangiz, uni ham oldindan xira va
yumshoq qilib tayyorlang.

The background photographs ship already dimmed and softened, so the browser does
no per-frame filtering. If you add your own, prepare it the same way.

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

Bir slaydga bir nechta surat qoʻysangiz, ular navbatma-navbat oʻtadi. Nasiya
slaydidagi qoʻl berishish surati `fon.nasiya` da turadi (Pexels, Ekaterina
Bolovtsova — bepul, tijorat uchun ham). Boshqa surat qoʻymoqchi boʻlsangiz, shu
yoʻlni almashtiring. Surat topilmasa ham ekran buzilmaydi — chizma qoladi.

Several photos on one slide cycle through them, captioned. Leave a slide empty,
or point it at a file that is not there, and its drawing stays instead.

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

Har bir slayd oʻz umri davomida bir marta sekin oldinga suriladi — matn
koʻtariladi, rasm yaqinlashadi, yorugʻlik ekran boʻylab oʻtadi. Takrorlanmaydi,
shuning uchun aylanma emas, video kabi koʻrinadi.

Every slide makes one slow move across its life: the text rises, the artwork
pushes in, a light crosses the screen, a background photo gets a gentle zoom.
Nothing repeats within a slide, which is what stops it reading as a loop. The
product itself turns on two unrelated periods so it never returns to the same
pose. None of it costs the processor anything — it is all CSS animation, run on
the graphics card rather than the main thread.

Oʻlchangan natija — protsessor 4 barobar sekinlashtirilgan holda, toʻliq
aylanma uchun (doʻkon kompyuteriga oʻxshatib):

Measured over the full loop with the CPU throttled four times over, to stand in
for the shop machine:

| | style recalc | jami / total |
|---|---|---|
| boshida / at the start | 18.9% | 29.2% |
| foil tuzatilgandan keyin / after the foil fix | 8.7% | 24.0% |
| suratlar tayyorlangach / with the photos baked | 6.9% | 18.7% |
| 3D olib tashlangach / with the 3D removed | **5.6%** | **16.6%** |

Fayl hajmi 1108 KB dan 365 KB ga tushdi, xotira 16 MB dan 2.5 MB ga.

The file went from 1108 KB to 365 KB and the heap from about 16 MB to 2.5 MB.
Nothing on the board runs per frame: the motion is CSS animation on the
compositor, and a single timer changes the picture.

---

## Eslatma / Notes

- Ekran monitorda kuylab turishi uchun rasm juda sekin (7 daqiqada bir marta)
  1–2 piksel siljiydi. Bu koʻrinmaydi, lekin monitorga "kuyib qolish"dan saqlaydi.
- Windows yoki macOS'da "harakatni kamaytirish" yoqilgan boʻlsa, animatsiyalar
  oddiy oʻtishga almashadi.

The whole board drifts by 1–2 pixels over a seven-minute cycle. You cannot see
it, but it stops a static image etching itself into the panel over months.
If the system has "reduce motion" enabled, the animation falls back to a fade.
