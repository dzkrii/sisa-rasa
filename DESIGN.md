# Sisa Rasa: sistem desain "Bungkus"

Dicatat dari hasil bangun tahap 3. Sumber kebenaran adalah `public/css/*.css` dan `public/js/komponen/*`. Dial: ENERGY 3 / RHYTHM 3 / MOTION 2.

## Gagasan

Senja ditampilkan lewat bungkusnya. Alas halaman berganti seperti kemasan nasi yang dibawa pulang: kertas nasi (siang), kertas nasi yang lebih gelap (sore), kresek hitam (malam). Tiket adalah label bungkus berperforasi. Setiap perubahan keadaan adalah cap karet yang jatuh.

## Warna (tiga alas, satu tinta, satu aksen)

| Peran | Siang | Sore | Malam |
|---|---|---|---|
| Alas `--alas` | #D9BE92 | #C99A62 | #14110F |
| Kertas `--kertas` (permukaan) | #E7D7BB | #DCC4A0 | #211B17 |
| Tinta `--tinta` | #1B1410 | #1B1410 | #E8D5B0 |
| Teks redup `--redup` | #4B3B2B | #3F2F20 | #BBA783 |
| Aksen merah kresek `--merah` | #B3150F | #B3150F | #FF5A47 |
| Teks merah kecil `--merah-teks` | #9E120D | #6E0A06 | #FF5A47 |

Fase dipasang di `html[data-fase]` menurut jam (siang sebelum 15.30, sore sampai 18.00, malam sesudahnya) dan boleh dipasang di elemen mana pun. Tahap harga memakai fase sendiri: Segar siang, Sore dan Terakhir sore, Bantuan malam. Merah hanya muncul sebagai bidang besar atau cap di satu momen per layar; teks merah kecil memakai `--merah-teks`. Pasangan yang sudah dihitung dengan skrip kontras: tinta atas alas siang 10.16:1, atas alas sore 7.18:1, krem di bidang merah 5.75:1, tinta malam atas kresek 13.05:1, aksen malam atas kresek 6.09:1, `--merah-teks` sore atas alas 4.85:1.

## Huruf

- Archivo (variabel, lebar 62%, bobot 900): judul dan semua angka harga. Spasi kata dilonggarkan 0.14em karena lebar sempit merapatkannya.
- Hanken Grotesk: isi.
- Courier Prime: baris nota, kode, jam, label kecil. Tidak pernah untuk judul.
- Angka memakai `tabular-nums lining-nums`.
- Ketiganya dilayani lokal dari `/fonts` (tanpa CDN).

## Unsur tactile: cap karet

`.cap` (komponen `cap.js`): bingkai 3px, miring beberapa derajat, `mix-blend-mode: multiply` di siang dan sore, filter SVG `#tinta-meleber` (turbulensi kecil) agar tinta meleber, dan bayangan teks 1.5px untuk tinta yang meleset. Jatuh sekali dengan GSAP (`jatuhkanCap` di `ui.js`) saat tahap baru berlaku atau tiket jadi; berhenti diam bila `prefers-reduced-motion`. Harga lama dicoret garis tinta miring (`.harga--coret`). Tiket yang sudah diambil memperlihatkan sobekannya terpisah.

## Komponen

- `.harga` angka raksasa, besar, sedang. `.tombol` (radius 2px; `--merah` untuk aksi utama, `--besar` untuk yang menjadi titik fokus layar). `.nota-baris` baris listing (baris pertama lebih besar karena paling cepat tutup; baris bantuan berfase malam; yang belum buka putus-putus). `.garis` empat tahap dalam tiga bentuk: `baris`, `lajur`, `lebar` (pita penuh di Beranda, kiri dan kanan bergantian). `.tiket` label bungkus dengan perforasi `mask` radial. `.keadaan` untuk kosong, memuat, dan galat. `.jam-demo` penggeser jam di pojok kanan bawah.
- Radius hanya 2px dan 4px. Bayangan hanya pada hal yang benar-benar melayang: tiket, panel jam demo, popover, toast.
- Sasaran sentuh 44px, `cursor: pointer` di lapisan dasar, fokus cincin tinta 3px.

## Papan dampak: toples (tahap 4)

Terrarium Kota tidak dipakai ulang (alasan di laporan tahap 4). Gantinya satu gambar SVG buatan sendiri, `halaman/dampak.js`: toples kaca bertutup merah, berisi tunas gambar garis. Satu tunas untuk setiap 10 porsi yang diambil. Tunas dari hari yang lebih tua tumbuh lebih tinggi, tunas dua hari terakhir berdaun merah (aksen). Tunas tumbuh dari yang tertua saat toples masuk layar (GSAP, berhenti diam bila gerak dikurangi). Diberi nama dan deskripsi untuk pembaca layar, dan keterangannya menyebut bahwa ini ilustrasi, bukan pengukuran pohon. Grafik batang harian (`.hari-bar`) selalu berjudul pertanyaan yang dijawabnya, hari terbaru berwarna merah.

## Gerak (MOTION 2)

Tiga momen, semuanya berhenti di bawah `prefers-reduced-motion`: cap jatuh, harga lama dicoret garis yang tertarik dari kiri, dan halaman masuk dengan geser 12px. Tunas toples dan batang grafik tumbuh sekali. Tidak ada gerak yang berulang tanpa henti.


## Pembaruan tahap 5: siap pakai, Medan, foto, scrollytelling

- **Siap pakai:** catatan bahwa kampus, kantin, nama, dan angka adalah data contoh, pembayaran simulasi, dan foto hanya ilustrasi, kini hanya ada di kaki halaman. Isi halaman tidak lagi memakai kata demo, simulasi, atau "pura-pura". Tombol "Coba sebagai" menjadi "Masuk" (pilih peran). Penggeser jam menjadi "Atur jam" dan hanya tampil di halaman yang isinya bergantung jam (bukan di Beranda).
- **Lokasi:** Kampus Deli Raya (fiktif) di Medan. Koordinat dan alamat kantin perkiraan, nama kantin dan orang karangan bernuansa Medan.
- **Foto:** 10 foto hidangan dari Wikimedia Commons (CC BY, CC BY-SA), kreditnya di `public/img/kredit.json` dan halaman `/kredit`. Foto dicetak di atas kertas lewat `mix-blend-mode: multiply` dan sedikit sepia, dibingkai seperti cetakan yang ditempel (`.bingkai`). Di fase malam perkaliannya dimatikan dan foto digelapkan. Penjual memilih foto dari pustaka, tidak mengunggah.
- **Hero:** judul 41 huruf, satu paragraf, dua tombol, foto dengan label harga yang menempel (harga lama dicoret, cap di dalam label).
- **Daftar peran:** empat baris tipografi besar yang masing-masing menjadi tautan, menggantikan baris tombol demo.
- **Scrollytelling "Satu porsi, dari siang sampai tutup":** panggung `position: sticky` setinggi layar di dalam lintasan 430vh. Gulir memajukan jam satu porsi nyata dari buka sampai tutup memakai `tahapPada`, mengganti alas panggung (siang, sore, malam), harga dicoret berurutan, dan menggeser penanda di garis waktu berskala 40/30/20/10 persen. Dengan gerak dikurangi, bagian ini diganti pita statis empat tahap.

## Tata letak dan irama

Beranda: pembuka dua kolom (kalimat dari data, tumpukan harga), empat pita tahap lebar, dana bantuan berfase malam, blok penjual dua kolom dengan tabel, catatan jujur. Jelajah: daftar dan peta berdampingan di layar lebar, dua tab di ponsel, saringan dilipat di ponsel. Tiap halaman punya satu titik fokus. Kolom tunggal selalu `minmax(0, 1fr)` agar angka besar tidak melebarkan halaman.

## Suara tulisan

Hangat dan spesifik, memakai jam dan nama kantin dari data. Kalimat pembuka Beranda dirakit dari porsi nyata (tahap, sisa, jam). Tombol menyebut aksinya ("Cari porsi sore ini", "Klaim satu porsi gratis", "Cek kode dan tandai diambil"). Galat menyebut masalah dan jalan keluarnya. Tanpa em dash, tanpa emoji, tanpa kata "solusi" dan "mudah". Semua data berlabel demo dan pembayaran berlabel simulasi.

## Yang dihindari

Hijau dan krem toko makanan, baris ikon, kartu seragam, foto stok, gradien langit, matahari atau bulan sebagai ikon, serif miring, pil di atas judul, garis warna di tepi kiri kartu, aksen merah di setiap tombol, aset gambar yang dibuat tanpa bertanya.

## Daftar pengganti dan batas yang diketahui

- Logo masih berupa nama dalam huruf (`Sisa Rasa`), belum ada ikon. Favicon dikosongkan sengaja.
- Foto hanya ilustrasi hidangan dari Wikimedia Commons, bukan foto porsi kantin yang sebenarnya.
- Peta memakai tile OpenStreetMap dan butuh internet.
- Angka CO₂ di API belum bersumber dan tidak ditampilkan di antarmuka.

## Pembaruan: halaman Dampak

- **Kepala:** judul pendek, satu kalimat editorial yang angkanya dihitung dari data (porsi, kantin, rupiah, mahasiswa), dan kolase tiga foto hidangan yang paling sering diselamatkan.
- **Scrollytelling toples:** panggung `sticky` dengan toples SVG di satu sisi dan empat bab di sisi lain (Dari sisa, Ke piring, Ke kantin, Gratis). Gulir mengisi toples (satu tunas per 10 porsi), angka bab menghitung naik, alas bergeser siang, sore, malam. Di bab Gratis tunas yang mewakili porsi gratis berdaun merah dan sisanya meredup. Dengan gerak dikurangi, semua bab tampil berurutan tanpa pin.
- **Hidangan teratas:** lima baris berfoto dengan batang, yang pertama lebih besar.
- **Grafik harian:** kolom tegak 14 hari, hari terbaru merah.
- **SDG 8, 10, 12:** tiga pita dengan komposisi berbeda (pendapatan per kantin, proporsi porsi gratis di alas malam, tingkat terambil). Tiap pita menutup dengan catatan "Belum bisa dibuktikan". Tanpa warna resmi SDG agar palet tetap satu.
- **Cara menghitung:** daftar definisi, termasuk alasan CO2 tidak ditampilkan.

## Pembaruan: Cara kerja dan FAQ

- Susunan: kepala dengan tautan "di halaman ini", empat tahap (komponen `.garis` yang sama dengan Detail porsi, berisi persentase), contoh hitungan satu porsi Rp 12.000 yang dihitung `jadwalTahap` (aturan yang sama dengan server), aturan, lima pihak, kaitan SDG, FAQ, penutup.
- FAQ memakai `<details name="faq">` bawaan peramban sebagai accordion: hanya satu terbuka, Enter dan Space bekerja tanpa skrip, cincin fokus mengikuti aturan global. Penanda plus digambar dengan CSS dan berputar menjadi silang saat terbuka. Delapan pertanyaan berasal dari keberatan yang nyata terhadap produk (kantin rugi, harga otomatis, stok terakhir, dana bantuan, privasi, penyalahgunaan, pesanan hangus, dana habis).
- Tautan `#bagian` tidak lagi dicegat router, jadi tautan "Lompat ke isi" dan navigasi dalam halaman bekerja.
