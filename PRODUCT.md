# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Ditentukan pemilik: Node.js 20 + Express + PostgreSQL di backend. Front-end HTML, CSS, dan JavaScript modul ES tanpa framework. Leaflet + OpenStreetMap untuk peta, GSAP untuk gerak, Three.js hanya bila terrarium dipakai ulang. Tanpa CMS dan tanpa template.

## Users

Pengunjung pertama adalah juri INVOFEST 2026 Web Design Competition (kategori Mahasiswa, individu). Mereka menilai lewat layar, jadi Beranda harus membuat siklus produk dan jalur demo terbaca dalam beberapa detik.

Pengguna produk di dunia fiktifnya, semuanya di satu kampus:
- Pembeli (mahasiswa, pegawai): mencari makan murah dan dekat.
- Penerima bantuan (mahasiswa terverifikasi email kampus): menahan lapar saat uang saku habis, mengklaim satu porsi gratis per hari tanpa identitas terlihat oleh penjual.
- Donatur (dosen, alumni, teman): ingin membantu dan ingin tahu uangnya sampai.
- Penjual (kantin, warung): sisa dagangan dibuang menjelang tutup.
- Admin kampus: butuh gambaran kerawanan pangan dan sampah makanan.

## Product Purpose

Sisa Rasa mengubah makanan sisa kantin kampus menjadi pendapatan kantin, makan murah, atau makan gratis bagi mahasiswa yang membutuhkan. Tagline sementara: "Rasa yang tak terbuang."

Lomba: tema Smart Ecosystems: Digital Solutions for a Sustainable Future, subtema Digital Economy & Sociopreneurship (SDG 8 dan 10), dampak sampingan SDG 12. Sukses berarti juri memahami siklusnya, mencoba setiap peran, dan menemukan model yang bukan sekadar diskon makanan.

## Positioning

Satu porsi melewati empat tahap dalam satu jendela ambil: Segar (100%), Sore (70%), Terakhir (50%), lalu Bantuan (gratis bagi penerima, dibayar dari dana bantuan sebesar 50% harga dasar). Harga dihitung dari sisa waktu, penjual tahu persis pendapatannya di tiap tahap, dan porsi yang tidak laku tetap terbayar bila disalurkan sebagai bantuan. Aplikasi diskon biasa tidak punya tahap bantuan, dana bantuan publik, atau penerima yang anonim bagi penjual.

## Operating Context

Konteks kampus, jendela ambil harian (contoh 14.00 sampai 20.00), tiket berkode yang dicek penjual saat porsi diambil. Dashboard penjual, buku besar donasi publik, papan dampak, ringkasan admin.

Halaman masuk punya tombol "Coba sebagai..." untuk tiap peran agar juri tidak perlu mendaftar.

## Capabilities and Constraints

- Harga tidak disimpan. Dihitung dari `base_price` dan sisa waktu, lalu disalin ke `orders.price_each` saat pesanan dibuat.
- Tahap Bantuan hanya jalan bila kolam cukup. Bila kolam kosong, porsi tetap dijual 50% sampai tutup.
- Satu mahasiswa maksimal satu klaim bantuan per hari. Penjual hanya melihat kode pesanan. Buku besar tidak memuat nama penerima.
- Satu porsi donasi Rp 7.500.
- Semua data adalah data demo. Pembayaran hanya simulasi. Keduanya dinyatakan jelas di dalam aplikasi dan di dokumen karya.
- Kampus fiktif untuk data demo: Kampus Deli Raya.
- Semua teks antarmuka berbahasa Indonesia.
- Harus bisa jalan lokal dengan satu perintah dan skrip data contoh, sebagai cadangan bila VPS mati.
- Terrarium Kota (D:\projects\personal\terrarium-kota) boleh dipakai ulang sebagai papan dampak setelah dibaca dulu.
- Belum diputuskan: subdomain hasil akhir.

## Brand Commitments

- Nama produk: Sisa Rasa.
- Suara tulisan hangat dan spesifik, bukan nada fintech atau SaaS.
- Folder `referensi/` berisi lima gambar yang sengaja dipakai sebagai anti-referensi: tampilan toko bahan makanan generik, hijau dan krem, baris ikon, kartu seragam. Jangan ditiru.
- Pelajaran yang diminta dari atomato.co, nomu.store, apocalypsecoffee.com: satu warna aksen tegas, satu kontras tipografi yang menjadi ciri, satu unsur tactile, dan suara tulisan berkarakter. Pelajaran, bukan tata letak.
- Ide "senja" (warna halaman bergeser mengikuti jam, tiket berbentuk karcis) tetap titik awal, dengan penerapan yang tidak klise.

## Evidence on Hand

Tidak ada pengguna, kantin, transaksi, atau testimoni nyata. Semua angka, nama kantin, dan nama orang adalah data demo yang harus berlabel demo di layar. Jangan menampilkan statistik, kutipan, atau klaim dampak tanpa label itu. Tidak ada foto atau logo yang tersedia; aset gambar tidak dibuat tanpa bertanya dulu.

## Product Principles

1. Penjual tidak pernah dikejutkan: setiap tahap harga dan pendapatannya terlihat sebelum listing dibuat.
2. Martabat penerima dijaga oleh rancangan, bukan oleh kebijakan: identitas tidak terlihat penjual dan tidak ada di buku besar.
3. Setiap rupiah donasi bisa dilacak sampai ke porsi dan kantin.
4. Keterusterangan tentang demo: yang simulasi dinyatakan simulasi.
5. Satu siklus, bukan lima fitur: halaman melayani perjalanan satu porsi dari sisa sampai terambil.

## Accessibility & Inclusion

Target WCAG AA (kontras 4.5:1 teks normal, 3:1 teks besar), operasi penuh dengan keyboard, area sentuh 44px, mobile first, `prefers-reduced-motion` dihormati. Pengguna utama memakai ponsel di luar ruangan dan sering pada baterai rendah.
