# Sisa Rasa — Rancangan

Platform kampus yang mengubah makanan sisa menjadi pendapatan kantin, makan murah, atau makan gratis bagi mahasiswa yang membutuhkan.

Tagline sementara: **"Rasa yang tak terbuang."**

Lomba: INVOFEST 2026 Web Design Competition, kategori Mahasiswa individu.
Tema: *Smart Ecosystems: Digital Solutions for a Sustainable Future*.
Subtema: **Digital Economy & Sociopreneurship (SDG 8 & 10)**, dengan dampak sampingan SDG 12.

Semua data adalah data demo. Pembayaran disimulasikan. Hal ini dinyatakan jelas di dokumen karya dan di dalam aplikasi.

## 1. Masalah dan solusi

| Pihak | Masalah | Yang diberikan Sisa Rasa |
|---|---|---|
| Kantin/warung | Sisa dagangan dibuang menjelang tutup, uang hilang | Pendapatan dari sisa, dan jaminan dibayar bila porsi disalurkan sebagai bantuan |
| Mahasiswa umum | Makan murah dan dekat | Harga turun otomatis seiring waktu |
| Mahasiswa yang butuh | Menahan lapar karena uang saku habis | Klaim makan gratis tanpa identitas terlihat |
| Donatur (dosen, alumni, teman) | Ingin membantu tapi tidak tahu caranya dan ragu uangnya sampai | Patungan porsi dengan buku besar yang transparan |
| Kampus | Tidak ada data kerawanan pangan dan sampah makanan | Papan dampak dan ringkasan admin |

## 2. Inti ide: siklus harga yang turun, lalu menjadi bantuan

Setiap listing punya jendela pengambilan (contoh 14.00–20.00). Harga dihitung dari sisa waktu:

| Tahap | Syarat | Harga | Siapa bisa ambil |
|---|---|---|---|
| 1 Segar | sisa waktu > 60% | 100% harga dasar | Semua pembeli |
| 2 Sore | 30–60% | 70% | Semua pembeli |
| 3 Terakhir | 10–30% | 50% | Semua pembeli |
| 4 Bantuan | < 10% sampai tutup | gratis bagi penerima | Hanya klaim bantuan, dibayar dari kolam donasi sebesar 50% harga dasar |

Aturan penting:
- Penjual tahu persis berapa ia dapat di tiap tahap. Tidak ada kejutan.
- Tahap 4 hanya jalan bila kolam bantuan cukup. Bila kolam kosong, porsi tetap dijual 50% sampai tutup.
- Satu mahasiswa maksimal 1 klaim bantuan per hari.
- Penjual hanya melihat kode pesanan, tidak melihat nama penerima bantuan.

## 3. Peran pengguna

1. **Pembeli** (mahasiswa/pegawai): jelajah, pesan, ambil.
2. **Penerima bantuan** (mahasiswa terverifikasi): klaim porsi gratis. Dalam demo, verifikasi berupa email kampus.
3. **Donatur**: patungan ke kolam bantuan, bisa anonim, melihat dampak donasinya.
4. **Penjual**: unggah listing, lihat pesanan, verifikasi kode ambil, lihat pendapatan.
5. **Admin kampus**: ringkasan, moderasi listing.

Untuk memudahkan juri, halaman masuk punya tombol **"Coba sebagai…"** untuk tiap peran tanpa perlu mendaftar.

## 4. Alur utama

**Penjual.** Masuk, lalu Buat listing (foto, nama, harga dasar, jumlah, jendela ambil), lalu sistem menurunkan harga otomatis. Saat pembeli datang, penjual memasukkan atau memindai kode, pesanan ditandai diambil, pendapatan bertambah.

**Pembeli.** Buka Jelajah (peta + daftar, filter jarak dan jam), pilih listing dengan harga hari ini dan hitung mundur, pesan, dapat tiket berkode, ambil sebelum jendela tutup.

**Donatur.** Buka Donasi, pilih jumlah porsi (misal 1 porsi = Rp 7.500), kirim pesan atau anonim, kolam bertambah, lihat jejak: "donasimu menjadi 3 porsi di Kantin Bu Yati".

**Penerima.** Buka Bantuan, lihat porsi tahap 4 yang tersedia, klaim satu, dapat tiket berkode, ambil.

## 5. Halaman

1. **Beranda**: cerita 3 langkah (sisa, harga turun, bantuan), hitung mundur hidup, angka dampak live.
2. **Jelajah**: peta Leaflet + daftar kartu, filter jarak/harga/jam/jenis.
3. **Detail listing**: foto, harga hari ini, jadwal penurunan harga berbentuk garis waktu, tombol pesan.
4. **Tiket**: tampilan karcis dengan kode, hitung mundur, status.
5. **Bantuan** (penerima).
6. **Donasi**: kolam, patungan, buku besar publik.
7. **Dasbor penjual**: listing aktif, pesanan, verifikasi kode, pendapatan.
8. **Papan dampak**: porsi terselamatkan, rupiah ke UMKM, mahasiswa terbantu, CO₂ dihindari, dan terrarium yang menumbuhkan satu pohon per porsi.
9. **Admin**: ringkasan kampus.
10. **Cara kerja dan tentang karya**: model harga, SDG, teknologi, catatan "data demo".

## 6. Skema database (PostgreSQL)

```
campuses(id, name, city, lat, lng)
users(id, campus_id, name, email, password_hash, role, student_verified, created_at)
vendors(id, user_id, campus_id, name, description, lat, lng, address, photo_url)
listings(id, vendor_id, title, description, photo_url, base_price, qty_total, qty_left,
         pickup_start, pickup_end, status)            -- status: active | closed
orders(id, listing_id, user_id, kind, qty, price_each, funded_by, code, status,
       created_at, picked_up_at)
         -- kind: purchase | aid_claim ; status: reserved | picked_up | expired | cancelled
ledger(id, campus_id, kind, amount, order_id, donor_id, anonymous, message, created_at)
         -- kind: donation | aid_payout   (saldo kolam = jumlah ledger)
```

Harga tidak disimpan. Ia dihitung dari `base_price` dan sisa waktu pada saat itu, lalu disalin ke `orders.price_each` ketika pesanan dibuat. Dengan begitu penurunan harga tidak perlu tugas terjadwal.

## 7. API (Express)

```
POST /api/auth/login        POST /api/auth/demo/:role        POST /api/auth/logout
GET  /api/me
GET  /api/listings?lat&lng&sort           GET /api/listings/:id
POST /api/listings          (penjual)     PATCH /api/listings/:id
POST /api/orders            (beli/klaim)  GET /api/orders/mine
POST /api/orders/:code/pickup  (penjual)
POST /api/donations         GET /api/ledger        GET /api/pool
GET  /api/impact            GET /api/admin/summary
```

Aturan server: validasi stok dengan transaksi database (cegah dua orang memesan porsi terakhir), batas 1 klaim per hari, kolam harus cukup, penjual hanya mengelola listing miliknya.

## 8. Teknologi

- **Front-end:** HTML, CSS, JavaScript (modul ES), tanpa framework berat. Leaflet + OpenStreetMap untuk peta. GSAP untuk gerak. Three.js hanya untuk terrarium di papan dampak.
- **Back-end:** Node.js 20, Express, `pg`, `argon2`/`bcrypt`, sesi cookie httpOnly.
- **Database:** PostgreSQL.
- **Server:** VPS kamu. Caddy atau Nginx untuk HTTPS dan domain, pm2 untuk menjaga proses hidup.
- **Cadangan untuk juri:** saya sertakan mode demo yang bisa jalan lokal dengan satu perintah dan skrip data contoh, jadi karya tetap bisa dinilai bila VPS mati.

## 9. Arah visual: "Senja"

- Warna halaman bergeser mengikuti jam: siang (krem dan hijau daun), sore (kuning-jingga, terakota), malam (indigo tua dengan lampu kuning hangat). Hitung mundur listing terasa seperti matahari yang turun.
- Motif karcis dan struk: tiket pesanan berbentuk karcis berlubang dengan kode dicap, kartu listing seperti menu tulis tangan.
- Tipografi tetap Fraunces (judul) dan Hanken Grotesk (isi), DM Mono untuk label dan angka kecil. Bahasa Indonesia, nada hangat dan manusiawi, bukan nada fintech.
- Terrarium dari karya sebelumnya dipakai sebagai papan dampak.

## 10. Cakupan dan tahapan

**Wajib (MVP)**
1. Autentikasi demo dan peran
2. Listing, penurunan harga otomatis, hitung mundur
3. Pesan, tiket berkode, verifikasi ambil oleh penjual
4. Donasi, kolam, klaim bantuan, buku besar
5. Papan dampak
6. Beranda, Jelajah, Cara kerja

**Bila waktu cukup**
- Peta interaktif dengan jarak
- Terrarium di papan dampak
- Ringkasan admin
- Mode gelap otomatis mengikuti jam
- PWA agar bisa dipasang di ponsel

**Tahapan kerja (estimasi bersama saya)**
1. Fondasi proyek, database, dan data contoh: 2–3 jam
2. API dan aturan inti (harga, stok, kolam): 4–5 jam
3. Halaman inti: 6–8 jam
4. Visual "senja", animasi, terrarium: 4–6 jam
5. Pengujian, perbaikan, deploy ke VPS: 3–4 jam
6. Dokumen PDF, lembar orisinalitas, naskah video: 2 jam

## 11. Pemetaan ke penilaian lomba

| Aspek | Bobot | Cara dipenuhi |
|---|---|---|
| Tampilan dan desain | 30% | Identitas senja, karcis, gerak mengikuti jam |
| Kreativitas dan inovasi | 25% | Siklus harga turun lalu bantuan, kolam transparan |
| Kemudahan pengguna dan responsif | 20% | Masuk satu klik per peran, mobile first, alur pendek |
| Originalitas | 15% | Gabungan surplus dan donasi dalam satu siklus, konteks kampus |
| Kesesuaian tema | 10% | Ekosistem lima pihak, dampak SDG 8, 10, 12 |

## 12. Risiko dan penanganan

- **Server mati saat penilaian:** mode demo lokal dan video demo sebagai cadangan.
- **Penyalahgunaan klaim:** batas 1 klaim per hari, verifikasi email kampus, dijelaskan sebagai langkah awal.
- **Privasi penerima:** penjual hanya melihat kode, buku besar tidak memuat nama penerima.
- **Kesan "aplikasi sudah ada":** ditekankan pada siklus tiga tahap dan konteks kampus, bukan pada jual-beli diskon biasa.

## 13. Hal yang perlu diputuskan

1. Nama produk: tetap **Sisa Rasa** atau ganti?
2. Nama kampus fiktif untuk data demo (saran: "Kampus Deli Raya" di kota yang kamu pilih).
3. Subdomain di domain kamu untuk hasil akhir.
4. Satu porsi donasi bernilai Rp 7.500 (saran), setuju?
