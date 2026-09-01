# Display Masjid & Mushola Al Jabar

Aplikasi layar informasi masjid berbasis HTML, CSS, dan JavaScript. Data default ada di JSON. Siap diunggah ke GitHub Pages.

## Isi
- `index.html` — tampilan TV
- `admin.html` — panel pengaturan
- `data/config.json` — identitas, metode hitung, iqamah
- `data/content.json` — running text, pengumuman, kegiatan, kas
- `js/pray.js` — perhitungan jadwal sholat di perangkat

## Fitur
- Jadwal sholat mengikuti lokasi akses (GPS), dengan cadangan koordinat manual
- Hitungan mundur ke sholat berikutnya
- Sorotan saat waktu sudah dekat, layar adzan, countdown iqamah, mode sholat
- Jam, tanggal Masehi & Hijriah
- Running text, ayat/hadits, pengumuman, agenda, petugas, kas
- Tema cream / coklat / putih, responsif untuk TV dan HP
- Admin tanpa server; simpan di browser atau unduh JSON

## GitHub Pages
1. Buat repo baru, unggah seluruh isi folder ini ke root repo.
2. Settings → Pages → Deploy from branch `main` / folder `/`.
3. Buka URL Pages. Izinkan lokasi agar jadwal sesuai tempat TV.
4. Untuk kiosk: buka `index.html`, klik **Layar penuh**.

## Catatan jadwal
Perhitungan memakai sudut matahari (metode Kemenag 20°/18° sebagai bawaan). Koreksi menit bisa diatur di admin bila ingin menyesuaikan jadwal setempat.
