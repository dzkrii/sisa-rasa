# Sisa Rasa: arah visual "Bungkus"

Status: usulan, menunggu persetujuan. Belum ada kode.

Reading this as: aplikasi demo dengan beranda penjelas untuk juri lomba dan mahasiswa, dalam bahasa cap dan bungkus nasi warung, dial ENERGY 3 / RHYTHM 3 / MOTION 2.

## Gagasan

Senja tidak ditampilkan sebagai langit. Ia ditampilkan sebagai bungkusnya. Makanan sisa dibawa pulang dalam bungkus, dan bungkusnya berganti seiring jam: kertas nasi di siang hari, kertas nasi yang makin gelap di sore hari, kresek hitam di malam hari. Warna halaman bergeser mengikuti jam karena alasan yang bisa dipegang tangan, bukan karena gradien matahari terbenam.

Tiket bukan karcis bioskop berlubang. Tiket adalah label bungkus: secarik kertas nasi yang dicap kode, dengan sobekan yang dirobek penjual saat porsi diambil.

## Palet (tiga warna inti dan satu aksen)

| Peran | Siang | Sore | Malam |
|---|---|---|---|
| Alas: kertas nasi | #D9BE92 | #C99A62 | kresek #14110F |
| Tinta | #1B1410 | #1B1410 | #E8D5B0 |
| Aksen: merah kresek | #B3150F | #B3150F | #FF5A47 |

Aksen hanya muncul sebagai bidang besar di satu momen per layar: tahap harga yang sedang berlaku dan tombol utama. Teks merah kecil memakai #9E120D di atas alas siang. Alasan: merah kresek adalah warna yang langsung dikenali semua orang yang pernah membawa pulang nasi bungkus, dan bidang besar membuatnya tegas tanpa perlu hiasan lain.

Kontras sudah dihitung dengan skrip: tinta di atas alas siang 10.16:1, tinta di atas alas sore 7.18:1, teks krem di atas bidang merah 5.75:1, tinta malam di atas kresek 13.05:1, aksen malam di atas kresek 6.09:1.

## Huruf

- Judul dan angka harga: Archivo pada lebar sangat sempit dan bobot paling tebal, dipasang sebesar mungkin. Angka harga memenuhi lebar layar seperti harga yang ditulis spidol di karton.
- Isi: Hanken Grotesk.
- Label, kode, dan baris nota: Courier Prime berukuran kecil, seperti cetakan struk.

Kontras ciri: angka raksasa yang sempit dan tebal berhadapan dengan baris nota mungil berhuruf mesin ketik. Fraunces dari RANCANGAN.md saya lepas karena masuk daftar huruf bawaan yang saya pakai tanpa alasan khusus, dan krem plus serif adalah tampilan yang ingin dihindari.

## Unsur tactile: cap tinta

Setiap perubahan keadaan adalah cap karet yang jatuh: tahap harga baru, pesanan masuk, porsi diambil. Capnya miring beberapa derajat, tintanya sedikit meleber dan meleset dari garis, dan cap lama tetap terlihat di bawahnya sebagai harga yang dicoret. Cap yang sedang berlaku berwarna merah dan basah. Cap yang sudah lewat berwarna tinta dan kering. Gerak hanya ini (GSAP: jatuh, memantul sekali, diam) ditambah sobekan tiket.

## Penerapan "senja" tanpa klise

1. Tahap harga memakai alas yang sama dengan jamnya: Segar dan awal Sore di kertas nasi, Terakhir di kertas yang lebih gelap, Bantuan di kresek hitam. Pergeseran terjadi di antara bagian halaman saat digulir, jadi satu halaman bisa memperlihatkan seluruh hari.
2. Ada penggeser jam demo di pojok. Juri tidak harus menunggu sore: mereka menggeser jam dan melihat harga, alas, dan stempel berubah. Ini kontrol sungguhan yang memakai logika harga yang sama dengan server.
3. Tahap berikutnya selalu tampil sebelum berlaku, sehingga penjual tidak pernah dikejutkan (prinsip produk nomor 1).

## Nada tulisan

Hangat, spesifik, kadang berpihak. Kalimat bicara tentang kantin dan jam, bukan tentang "solusi".

- Beranda: "Pukul 17.40, ayam geprek Bu Yati tinggal sembilan porsi. Harganya sudah dua kali dicoret."
- Tombol: "Cari porsi sore ini", "Patungan satu porsi", "Coba sebagai penjual".
- Donasi: "Rp 7.500 jadi satu porsi. Kamu bisa melihat porsi itu diambil di kantin mana, tanpa tahu siapa yang makan."
- Kosong: "Belum ada porsi sisa di sekitar Deli Raya. Kantin biasanya mengunggah sejam sebelum tutup."
- Demo: "Kantin, angka, dan nama di sini data contoh. Uangnya tidak sungguhan."

Catatan: Bu Yati dan kantinnya adalah data demo dan akan berlabel demo di layar.

## Yang dihindari

- Hijau dan krem toko bahan makanan, daun sebagai logo, baris ikon "gratis ongkir", kartu produk seragam, foto stok makanan.
- Gradien langit, matahari atau bulan sebagai ikon, bintang malam.
- Serif miring, pil kecil di atas judul, garis warna di tepi kiri kartu, "tiga langkah" berikon bulat.
- Em dash di teks apa pun, kata "solusi", "mudah", "cerdas".
- Aksen merah menyebar ke setiap tombol, ikon, dan garis.
- Aset gambar atau foto yang dibuat tanpa bertanya. Logo sementara berupa nama dalam huruf. Cap dan sobekan digambar dengan CSS dan SVG, bukan gambar jadi.

## Risiko yang jujur

Kertas hangat dengan aksen merah masuk ke kelompok tampilan yang sering dihasilkan model. Penangkalnya: alasnya kraft yang lebih pekat, bukan krem; hurufnya sans sempit yang berat, bukan serif; merahnya murni dan dipakai sebagai bidang; dan malam benar-benar berbalik menjadi hitam. Kalau hasil jadi terasa seperti toko kerajinan, bidang merah harus lebih besar dan alas lebih gelap.

## Hasil kocok (concept-seed, kunci 24cf4c70)

Daftar tujuh asal saya, berurutan: nota warung berkarbon, kalender sobek harian, stiker diskon kuning, teks berjalan LED merah, jadwal salat dan imsakiyah, bungkus nasi, lampu gerobak malam. Dadu menunjuk nomor 6, bungkus nasi, dan itulah arah di atas. Penantang yang dibahas:

- Hatch Show Print (poster letterpress): bersaing. Dipinjam disiplinnya: tinta bertumpuk dengan `mix-blend-mode: multiply` dan meleset dari garis. Hurufnya tidak dipinjam.
- Tampilan jejak partikel: ditolak. Dipinjam: ketebalan garis menandai kepastian, diterapkan sebagai kepekatan cap menurut umur tahap.
- Algorave: ditolak. Dipinjam: perubahan terlihat sebelum berbunyi, diterapkan pada tahap harga berikutnya.
- Penyelaman dalam: ditolak. Dipinjam: satu sumbu vertikal mengatur halaman detail listing.
- Kota yang terlipat: ditolak. Dipinjam: satu hal bergeser pelan mengikuti jam, tanpa kejutan.
- Spesimen bitmap Emigre: ditolak. Dipinjam: keadaan jujur yang bisa dipilih pengguna, dipakai pada tombol "tampilkan label demo".

## Pertanyaan untuk kamu

1. Setuju dengan arah Bungkus, atau mau kocok ulang (lebih aman atau lebih berani)?
2. Setuju melepas Fraunces dan memakai Archivo, Hanken Grotesk, dan Courier Prime?
3. Penggeser jam demo boleh ada di semua halaman, atau hanya di Beranda dan Jelajah?
