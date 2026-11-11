import { h } from '../h.js';
import { jam, rp } from '../format.js';
import { jadwalTahap } from '/shared/pricing.js';

const TAHAP = [
  { nama: 'Segar', fase: 'siang', syarat: 'Sisa waktu lebih dari 60%', nilai: '100%', baca: '100 persen dari harga dasar', ket: 'Harga penuh. Datang lebih awal, dapat porsi yang paling segar.' },
  { nama: 'Sore', fase: 'sore', syarat: 'Sisa waktu 30 sampai 60%', nilai: '70%', baca: '70 persen dari harga dasar', ket: 'Harga turun 30%.' },
  { nama: 'Terakhir', fase: 'sore', syarat: 'Sisa waktu 10 sampai 30%', nilai: '50%', baca: '50 persen dari harga dasar', ket: 'Setengah harga, daripada dibuang.' },
  { nama: 'Bantuan', fase: 'malam', syarat: 'Sisa waktu kurang dari 10%', nilai: 'Gratis', baca: 'Gratis bagi penerima bantuan', ket: 'Tidak dijual. Mahasiswa yang membutuhkan mengklaimnya, dan kantin dibayar 50% harga dasar dari dana bantuan.' },
];

const ATURAN = [
  'Penjual tahu persis berapa ia dapat di tiap tahap sebelum menayangkan porsi.',
  'Tahap Bantuan hanya jalan bila dana bantuan cukup. Bila kosong, porsi tetap dijual 50% sampai tutup.',
  'Satu mahasiswa maksimal satu klaim bantuan per hari, dijaga langsung oleh basis data.',
  'Dua orang tidak bisa memesan porsi terakhir yang sama: stok dikunci dalam transaksi basis data.',
  'Penjual hanya melihat kode pesanan. Jenis pesanan dan nama pemesan tidak sampai ke dashboard penjual, dan riwayat donasi tidak mencatat penerima.',
  'Klaim yang tidak diambil sampai jam tutup hangus, dan pembayaran dana bantuannya dikembalikan.',
];

const PIHAK = [
  ['Kantin dan warung', 'Sisa dagangan yang biasanya dibuang menjadi pendapatan, dan tetap dibayar bila porsi disalurkan sebagai bantuan.', '/dasbor', 'Dashboard penjual'],
  ['Mahasiswa pembeli', 'Makan murah dan dekat, harga turun otomatis seiring waktu.', '/jelajah', 'Jelajah porsi'],
  ['Penerima bantuan', 'Mengklaim satu porsi gratis per hari tanpa identitas terlihat oleh penjual.', '/bantuan', 'Aturan bantuan'],
  ['Donatur', 'Dosen, alumni, atau teman yang patungan porsi dan bisa melihat jejaknya sampai ke kantin.', '/donasi', 'Patungan'],
  ['Kampus', 'Ringkasan kerawanan pangan dan sampah makanan untuk bahan keputusan, tersedia untuk akun admin dan tanpa nama penerima.', '/dampak', 'Papan dampak'],
];

const FAQ = [
  ['Apakah kantin rugi kalau porsinya dijual murah?',
    ['Pembandingnya bukan harga penuh, melainkan dibuang. Porsi yang belum laku sampai tutup bernilai Rp 0 bagi kantin, sedangkan di tahap Terakhir kantin masih menerima 50% dari harga dasar.',
     'Harga turun hanya untuk porsi yang belum laku. Pembeli di awal tetap membayar penuh, dan penjual menentukan sendiri harga dasar, jumlah porsi yang ditayangkan, serta jam mulai dan selesai.',
     'Risikonya nyata: sebagian pembeli bisa belajar menunggu sore. Karena itu stoknya terbatas dan yang tayang hanya sisa, bukan menu utama.']],
  ['Siapa yang mengatur harga turun, dan kapan tepatnya?',
    ['Tidak ada yang mengaturnya satu per satu. Server menghitung harga dari harga dasar dan sisa waktu ambil pada saat itu, lalu menyalin harga itu ke pesanan ketika dibuat. Karena itu harga yang dilihat pembeli tidak bisa berubah di tengah jalan.',
     'Batasnya memakai persentase waktu, bukan jam tetap, supaya berlaku untuk kantin yang bukanya berbeda-beda. Untuk waktu ambil 14.00 sampai 20.00, tahap Sore mulai 16.24, Terakhir 18.12, dan Bantuan 19.24.']],
  ['Bagaimana kalau dua orang memesan porsi terakhir yang sama?',
    ['Hanya satu yang berhasil. Stok dikunci di dalam transaksi basis data, jadi pemesan kedua langsung mendapat pesan bahwa porsi sudah habis, bukan pesanan yang gagal belakangan.']],
  ['Apa itu dana bantuan, dan dari mana uangnya?',
    ['Dana bantuan adalah saldo bersama untuk satu kampus yang berasal dari patungan donatur, Rp 7.500 per porsi. Saat porsi masuk tahap Bantuan dan diklaim, dana ini membayar kantin 50% dari harga dasar.',
     'Saldonya adalah total patungan yang masuk dikurangi total yang sudah dibayarkan, dan semua pergerakannya tercatat di riwayat donasi.']],
  ['Bagaimana privasi mahasiswa penerima bantuan dijaga?',
    ['Penjual hanya melihat kode pesanan, tanpa nama dan tanpa penanda bahwa itu klaim bantuan. Riwayat donasi mencatat kantin dan jumlahnya, tidak mencatat siapa penerimanya. Ringkasan untuk admin kampus pun berupa angka gabungan.']],
  ['Bagaimana klaim bantuan dijaga dari penyalahgunaan?',
    ['Klaim hanya bisa dilakukan akun penerima yang berstatus mahasiswa terverifikasi, maksimal satu per hari, hanya di 10% waktu terakhir, dan harus diambil sebelum kantin tutup. Batas satu klaim per hari dijaga langsung oleh basis data.',
     'Ini langkah awal. Verifikasi yang lebih ketat, misalnya memakai email kampus, belum dipasang.']],
  ['Bagaimana kalau saya sudah memesan tetapi tidak sempat mengambil?',
    ['Pesanan hangus ketika waktu ambil habis, dan saat ini belum ada pengembalian dana otomatis untuk pembelian. Klaim bantuan yang hangus berbeda: pembayaran dana bantuannya dikembalikan supaya porsinya bisa dibantu ke orang lain.']],
  ['Bagaimana kalau dana bantuan habis?',
    ['Tahap Bantuan tidak jalan. Porsi yang tersisa tetap dijual 50% dari harga dasar sampai kantin tutup, jadi kantin tidak kehilangan kesempatan menjualnya.']],
];

/** Tahap dihitung dari aturan yang sama dengan server, dipakai untuk contoh satu porsi bernilai Rp 12.000. */
const CONTOH = jadwalTahap({ base_price: 12000, pickup_start: '2026-01-01T14:00:00+07:00', pickup_end: '2026-01-01T20:00:00+07:00' });

export default async function caraKerja() {
  const el = h('article', { class: 'ck', 'aria-labelledby': 'judul-cara' },
    h('header', { class: 'ck-kepala' },
      h('h1', { id: 'judul-cara' }, 'Cara kerja Sisa Rasa'),
      h('p', null, 'Tiap porsi sisa melewati empat tahap harga dalam satu hari. Ini aturannya, contoh hitungannya, dan jawaban untuk pertanyaan yang paling sering muncul.'),
      h('nav', { class: 'ck-isi', 'aria-label': 'Di halaman ini' },
        [['#harga', 'Empat tahap'], ['#contoh', 'Contoh hitungan'], ['#aturan', 'Aturan'], ['#pihak', 'Lima pihak'], ['#faq', 'Pertanyaan']].map(([href, teks]) => h('a', { href }, teks)))),

    h('section', { class: 'ck-bagian', id: 'harga', 'aria-labelledby': 'judul-harga' },
      h('h2', { id: 'judul-harga' }, 'Harga turun, lalu menjadi bantuan'),
      h('p', null, 'Tiap porsi punya waktu ambil, misalnya 14.00 sampai 20.00. Harga dihitung dari sisa waktu itu, jadi tidak ada yang perlu mengubah harga secara manual.'),
      h('ol', { class: 'garis garis--baris', 'aria-label': 'Empat tahap harga satu porsi' }, TAHAP.map((t) => h('li', { class: 'tahap', 'data-fase': t.fase },
        h('h3', null, t.nama),
        h('p', { class: 'tahap__jam nota' }, t.syarat),
        h('p', { class: 'harga harga--besar' }, h('span', { class: 'sr-saja' }, t.baca), h('span', { class: 'harga__sisi', 'aria-hidden': 'true' }, t.nilai)),
        h('p', { class: 'tahap__ket' }, t.ket))))),

    h('section', { class: 'ck-bagian', id: 'contoh', 'aria-labelledby': 'judul-contoh' },
      h('h2', { id: 'judul-contoh' }, 'Contoh hitungan'),
      h('p', null, `Satu porsi dengan harga dasar ${rp(12000)} dan waktu ambil 14.00 sampai 20.00. Tanpa Sisa Rasa, porsi yang tidak laku sampai tutup bernilai Rp 0 bagi kantin.`),
      h('table', { class: 'tabel-nota ck-hitung' },
        h('caption', { class: 'sr-saja' }, 'Yang dibayar pembeli dan yang diterima kantin di tiap tahap'),
        h('thead', null, h('tr', null, ['Tahap', 'Mulai', 'Pembeli membayar', 'Kantin menerima'].map((t, i) => h('th', { scope: 'col', class: i > 1 ? 'angka' : null }, t)))),
        h('tbody', null, CONTOH.map((t) => h('tr', null,
          h('th', { scope: 'row' }, t.nama),
          h('td', { class: 'nota', 'data-l': 'Mulai' }, jam(t.mulaiMs)),
          h('td', { class: 'angka', 'data-l': 'Pembeli membayar' }, t.bantuan ? 'Gratis' : rp(t.harga)),
          h('td', { class: 'angka', 'data-l': 'Kantin menerima' }, t.bantuan ? `${rp(t.penjualTerima)}, dari dana bantuan` : rp(t.penjualTerima))))))),

    h('section', { class: 'ck-bagian', id: 'aturan', 'aria-labelledby': 'judul-aturan' },
      h('h2', { id: 'judul-aturan' }, 'Aturan yang dijaga server'),
      h('ul', { class: 'ck-aturan' }, ATURAN.map((a) => h('li', null, a)))),

    h('section', { class: 'ck-bagian', id: 'pihak', 'aria-labelledby': 'judul-pihak' },
      h('h2', { id: 'judul-pihak' }, 'Lima pihak dalam satu ekosistem'),
      h('dl', { class: 'ck-pihak' }, PIHAK.map(([nama, isi, href, teks]) => h('div', null,
        h('dt', null, nama),
        h('dd', null, isi, ' ', h('a', { href }, teks)))))),

    h('section', { class: 'ck-bagian', id: 'sdg', 'aria-labelledby': 'judul-sdg' },
      h('h2', { id: 'judul-sdg' }, 'Kaitannya dengan tujuan pembangunan berkelanjutan'),
      h('p', null, 'Sisa Rasa dirancang untuk SDG 8 (pendapatan tambahan bagi usaha kecil kantin), SDG 10 (akses makan bagi mahasiswa yang uang sakunya menipis), dan SDG 12 (lebih sedikit makanan terbuang). Papan dampak menunjukkan angkanya, dan juga apa yang belum bisa dibuktikan.'),
      h('a', { class: 'tombol', href: '/dampak' }, 'Lihat papan dampak')),

    h('section', { class: 'ck-bagian', id: 'faq', 'aria-labelledby': 'judul-faq' },
      h('h2', { id: 'judul-faq' }, 'Pertanyaan yang sering muncul'),
      h('div', { class: 'ck-faq' }, FAQ.map(([tanya, jawab], i) => h('details', { name: 'faq', open: i === 0 },
        h('summary', null, tanya),
        h('div', { class: 'ck-faq__isi' }, jawab.map((p) => h('p', null, p))))))),

    h('section', { class: 'ck-penutup' },
      h('h2', null, 'Sudah paham alurnya?'),
      h('div', { class: 'baris-aksi' },
        h('a', { class: 'tombol tombol--merah tombol--besar', href: '/jelajah' }, 'Cari porsi sekarang'),
        h('a', { class: 'tombol tombol--besar', href: '/donasi' }, 'Lihat riwayat donasi'))));

  return { judul: 'Cara kerja', el };
}
