# Sisa Rasa

**Ekosistem Digital Pangan Kampus untuk Menekan Limbah Makanan dan Kerawanan Pangan Mahasiswa.**
*Rasa yang tak terbuang.*

Karya untuk **INVOFEST 2026 Web Design Competition**, kategori Mahasiswa (individu).
Tema: *Smart Ecosystems: Digital Solutions for a Sustainable Future*.
Subtema: Digital Economy & Sociopreneurship (SDG 8 dan 10), dengan dampak sampingan SDG 12.

| | |
|---|---|
| Karya yang berjalan | https://sisa-rasa.fatahul.my.id |
| Video demo | https://youtu.be/S3viPH15nSQ |
| Kode sumber | repositori ini |

> **Semua data adalah data demo.** Kampus Deli Raya, nama kantin, nama orang, serta angka pesanan dan donasi bersifat fiktif. Pembayaran hanya simulasi. Pernyataan ini juga tampil di dalam aplikasi.

## Apa itu Sisa Rasa

Aplikasi web untuk kantin dan warung di sekitar kampus. Porsi makanan yang belum laku menjelang tutup tidak dibuang, tetapi dijual dengan harga yang turun mengikuti sisa waktu ambil. Porsi yang masih tersisa di akhir jendela ambil menjadi makan gratis bagi mahasiswa yang membutuhkan, dan kantin tetap dibayar dari dana bantuan hasil patungan donatur.

Berbeda dari aplikasi diskon makanan biasa, Sisa Rasa punya tahap Bantuan, dana bantuan yang terbuka untuk publik, dan penerima yang tidak terlihat oleh penjual.

### Siklus empat tahap

Setiap porsi punya jendela ambil (misalnya 14.00 sampai 20.00). Harga dihitung dari sisa waktu jendela itu.

| Tahap | Sisa waktu ambil | Harga | Yang bisa mengambil |
|---|---|---|---|
| Segar | lebih dari 60% | 100% harga dasar | Semua pembeli |
| Sore | 30% sampai 60% | 70% harga dasar | Semua pembeli |
| Terakhir | 10% sampai 30% | 50% harga dasar | Semua pembeli |
| Bantuan | kurang dari 10% | gratis bagi penerima; kantin dibayar 50% harga dasar dari dana bantuan | Penerima bantuan terverifikasi |

Aturan yang dijaga server: tahap Bantuan hanya berjalan bila dana bantuan cukup (bila kosong, porsi tetap dijual 50% sampai tutup); satu mahasiswa maksimal satu klaim bantuan per hari; stok divalidasi dalam transaksi basis data sehingga dua orang tidak memesan porsi terakhir yang sama; penjual hanya melihat kode pesanan, tidak melihat nama penerima, dan buku besar donasi tidak memuat nama penerima.

### Lima peran

- **Pembeli**: mencari porsi yang dekat dan murah (daftar dan peta), memesan, mengambil dengan tiket berkode.
- **Penjual**: menayangkan porsi sisa, melihat pendapatan tiap tahap sebelum porsi dibuat, memeriksa kode pembeli saat porsi diambil.
- **Penerima bantuan**: mengklaim satu porsi gratis per hari tanpa identitas yang terlihat oleh penjual.
- **Donatur**: patungan porsi ke dana bantuan, melihat jejak donasi sampai ke kantin.
- **Admin kampus**: melihat ringkasan klaim bantuan dan dana bantuan tanpa nama penerima.

## Coba sebagai juri (tanpa daftar)

1. Buka https://sisa-rasa.fatahul.my.id.
2. Klik **Masuk** di pojok kanan atas, lalu pilih peran: Pembeli, Penerima bantuan, Donatur, Penjual, atau Admin kampus. Tanpa kata sandi.
3. Di halaman yang menampilkan harga (misalnya **Jelajah**), klik tombol **"atur jam"** di pojok kanan bawah. Geser jam untuk melihat harga bergerak dari Segar sampai Bantuan tanpa menunggu sore. Warna halaman ikut berubah dari siang, sore, ke malam.

Alur yang disarankan: **Penjual** menayangkan porsi di Dashboard, **Pembeli** memesannya di Jelajah dan mendapat tiket, **Penjual** memasukkan kode tiket, lalu **Penerima bantuan** mengklaim porsi di tahap Bantuan (atur jam ke akhir jendela ambil) dan **Donatur** melihat dana bantuan di halaman Donasi.

Halaman: Beranda, Jelajah, Detail porsi, Tiketku, Bantuan, Donasi, Dashboard penjual, Papan dampak, Ringkasan admin, Cara kerja, Kredit foto.

## Teknologi

- **Front-end**: HTML, CSS, dan JavaScript modul ES, **tanpa framework dan tanpa template**. Tanpa CMS.
- **Peta**: Leaflet dengan data OpenStreetMap. **Gerak**: GSAP.
- **Back-end**: Node.js dan Express. **Basis data**: PostgreSQL (driver `pg`).
- Harga **tidak disimpan**: dihitung dari harga dasar dan sisa waktu, lalu disalin ke pesanan saat pesanan dibuat. Penurunan harga tidak memerlukan tugas terjadwal.
- Antarmuka dirancang dengan target WCAG AA (kontras, operasi keyboard, area sentuh, `prefers-reduced-motion`), dengan tata letak yang disusun mulai dari layar ponsel.
- Foto hidangan berasal dari Wikimedia Commons, hanya sebagai ilustrasi. Kreditnya ada di halaman **Kredit foto**.

## Menjalankan di komputer sendiri

Kebutuhan: **Node.js 22.9 atau lebih baru** dan **PostgreSQL** yang berjalan di `localhost:5432` (dites dengan PostgreSQL 18).

```bash
npm install
cp .env.example .env     # di Windows PowerShell: copy .env.example .env
npm run db:reset         # membuat basis data, memasang skema, mengisi data contoh
npm start                # http://localhost:3000
```

Sesuaikan `DATABASE_URL` di `.env` bila PostgreSQL Anda memakai pengguna atau kata sandi lain. `npm run db:reset` membuat basis data bila belum ada, lalu **menghapus dan mengisi ulang tabelnya**, jadi arahkan hanya ke basis data khusus Sisa Rasa.

Data contoh berisi lima kantin, porsi, pesanan, dan riwayat donasi untuk Kampus Deli Raya. Server menyalin porsi terakhir tiap kantin sebagai porsi hari ini setiap beberapa menit supaya demo tidak basi.

Opsi berguna:

```bash
npm run db:reset -- --at=2026-11-11T16:30:00+07:00   # mengisi data seakan-akan sekarang pukul 16.30
npm test                                              # tes harga dan tes integrasi API
```

Tes integrasi memakai basis data terpisah (`sisa_rasa_test`, atau yang diatur lewat `TEST_DATABASE_URL`), jadi tidak menyentuh data demo.

## Struktur proyek

```
public/            situs statis: index.html, css/, js/ (halaman, komponen), fonts/, img/, vendor/
src/server/        Express: app, rute (auth, listings, orders, donations, vendor, stats), kolam dana bantuan
src/shared/        aturan harga dan daftar foto, dipakai server dan browser
db/                skema SQL, pengisi data contoh
scripts/           db-reset, vendor (menyalin font dan pustaka dari node_modules ke public/)
test/              tes integrasi API
```

## Dokumen perancangan

- [PRODUCT.md](PRODUCT.md): pengguna, tujuan produk, batasan, dan prinsip.
- [RANCANGAN.md](RANCANGAN.md): masalah dan solusi, siklus harga, skema basis data, API, tahapan kerja.
- [DESIGN.md](DESIGN.md) dan [ARAH-VISUAL.md](ARAH-VISUAL.md): identitas visual "Senja" dan sistem desain.

## Penulis

Fatahul Ahmad Dzikri, Universitas Battuta, Sumatera Utara. Dibuat untuk INVOFEST 2026 Web Design Competition.
