import { h, kosongkan } from '../h.js';
import { api } from '../api.js';
import { harga, hari, jam, kecil, rp } from '../format.js';
import { konfigurasi, masukDemo, penggunaSaatIni } from '../sesi.js';
import { galat, kabari, kosong, memuat, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';

const PILIHAN = [1, 2, 5, 10];

export default async function donasi() {
  const porsiRp = konfigurasi().porsiDonasi;
  let u = penggunaSaatIni();
  let porsi = 2;
  let anonim = false;
  let pesan = '';
  let sibuk = false;
  let galatForm = '';
  let hasil = null;
  let entri = [];
  let berikutnya = null;

  const kolamEl = h('div', { class: 'donasi__kolam', 'data-fase': 'malam' });
  const formEl = h('div', { class: 'donasi__form' });
  const jejakEl = h('div', { class: 'donasi__jejak' });
  const bukuEl = h('ol', { class: 'buku' });
  const lagiEl = h('div', { class: 'baris-aksi' });

  async function muatKolam() {
    const k = await api.get('/pool');
    kosongkan(kolamEl);
    kolamEl.append(
      h('div', { class: 'donasi__kolam-isi' },
        h('div', null,
          h('p', { class: 'nota' }, 'Saldo dana bantuan'),
          harga(k.saldo, { ukuran: 'raksasa', label: `Saldo dana bantuan ${rp(k.saldo)}` })),
        h('div', { class: 'donasi__kolam-rinci' },
          h('p', null, 'Uang patungan donatur yang membayar kantin untuk porsi gratis.'),
          h('dl', { class: 'donasi__angka' },
            h('dt', null, 'Patungan masuk'), h('dd', { class: 'angka' }, rp(k.totalDonasi)),
            h('dt', null, 'Dibayarkan ke kantin'), h('dd', { class: 'angka' }, rp(k.totalTersalur)),
            h('dt', null, 'Setara'), h('dd', { class: 'angka' }, `${k.setaraPorsi} porsi patungan`)))));
  }

  async function muatJejak() {
    kosongkan(jejakEl);
    const penjelasan = () => jejakEl.append(
      h('h2', null, 'Ke mana patunganmu pergi'),
      h('p', null, 'Patunganmu masuk ke dana bantuan kampus. Di 10% waktu ambil yang terakhir, porsi yang belum laku bisa diklaim mahasiswa penerima secara gratis.'),
      h('p', null, 'Kantin dibayar 50% dari harga dasar porsi itu dari dana bantuan. Setelah itu jejak patunganmu muncul di sini: berapa porsi, dan di kantin mana.'));
    if (!u || u.peran === 'vendor') return penjelasan();
    const { donasi: daftar } = await api.get('/donations/mine');
    if (!daftar.length) return penjelasan();
    jejakEl.append(h('h2', null, 'Jejak donasimu'),
      h('p', null, 'Donasi yang masuk lebih dulu dipakai lebih dulu. Ini yang terjadi pada patunganmu.'),
      h('ul', { class: 'jejak' }, daftar.map((d) => h('li', null,
        h('p', { class: 'nota' }, `${hari(d.dibuat)}, ${rp(d.jumlah)}`),
        d.terpakai
          ? h('p', null, `Menjadi ${String(d.porsiTersalur).replace('.', ',')} porsi: ${d.kantin.map((k) => `${String(k.porsi).replace('.', ',')} di ${k.nama}`).join(', ')}.${d.sisa ? ` Sisa ${rp(d.sisa)} menunggu dipakai.` : ''}`)
          : h('p', null, 'Belum dipakai. Patunganmu disalurkan saat ada porsi masuk tahap Bantuan.')))));
  }

  async function muatBuku(tambah = false) {
    const r = await api.get(`/ledger?limit=15${tambah && berikutnya ? `&sebelum=${berikutnya}` : ''}`);
    entri = tambah ? [...entri, ...r.entri] : r.entri;
    berikutnya = r.berikutnya;
    gambarBuku();
  }

  function gambarBuku() {
    bukuEl.replaceChildren(...entri.map((e) => h('li', { class: `buku__baris buku__baris--${e.jenis}` },
      h('p', { class: 'nota buku__waktu' }, `${hari(e.waktu)}, ${jam(e.waktu)}`),
      e.jenis === 'donasi'
        ? h('div', null, h('p', null, h('strong', null, e.donatur ?? 'Seseorang'), ` patungan ${e.jumlah / porsiRp} porsi.`), e.pesan && h('p', { class: 'buku__pesan' }, `"${e.pesan}"`))
        : h('p', null, `Dibayarkan ke ${e.kantin} untuk ${kecil(e.judul)}.`),
      // Tanda + dan - menyertai warna: masuk atau keluar terbaca tanpa melihat warna.
      h('p', { class: 'angka buku__jumlah' }, h('span', { class: 'sr-saja' }, e.jenis === 'donasi' ? 'Masuk ' : 'Keluar '), `${e.jenis === 'donasi' ? '+' : '−'} ${rp(e.jumlah)}`))));
    lagiEl.replaceChildren(berikutnya ? h('button', { class: 'tombol', type: 'button', onclick: () => muatBuku(true).catch((err) => kabari(pesanGalat(err), { galat: true })) }, 'Muat catatan yang lebih lama') : h('p', { class: 'nota' }, entri.length ? 'Itu catatan paling awal.' : ''));
    if (!entri.length) bukuEl.replaceChildren(h('li', null, kosong('Belum ada catatan', 'Patungan pertama akan tampil di sini, lengkap dengan ke kantin mana ia disalurkan.')));
  }

  async function kirim() {
    sibuk = true;
    galatForm = '';
    gambarForm();
    try {
      const r = await api.post('/donations', { porsi, anonim, pesan: pesan.trim() || undefined });
      hasil = { porsi: r.donasi.porsi, jumlah: r.donasi.jumlah, saldo: r.saldo };
      pesan = '';
      kabari('Patungan masuk ke dana bantuan. Terima kasih.');
      await Promise.all([muatKolam(), muatJejak(), muatBuku()]);
    } catch (err) {
      galatForm = pesanGalat(err);
      kabari(galatForm, { galat: true });
    }
    sibuk = false;
    gambarForm();
  }

  function gambarForm() {
    kosongkan(formEl);
    if (hasil) {
      formEl.append(h('div', { class: 'terima' },
        cap('Masuk dana bantuan', { baru: true, besar: true }),
        h('h2', null, 'Terima kasih'),
        h('p', null, `${hasil.porsi} porsi (${rp(hasil.jumlah)}) masuk ke dana bantuan. Saldo dana bantuan sekarang ${rp(hasil.saldo)}. Jejaknya muncul di bawah saat porsi itu disalurkan ke kantin.`),
        h('button', { class: 'tombol', type: 'button', onclick: () => { hasil = null; gambarForm(); } }, 'Patungan lagi')));
      return;
    }
    if (!u) {
      formEl.append(h('h2', null, 'Patungan satu porsi'), h('p', null, `Satu porsi patungan ${rp(porsiRp)}. Kamu bisa menyembunyikan namamu dari riwayat donasi.`),
        h('button', { class: 'tombol tombol--merah tombol--besar', type: 'button', onclick: async () => { try { u = await masukDemo('donatur'); } catch (err) { kabari(pesanGalat(err), { galat: true }); } } }, 'Masuk sebagai donatur'));
      return;
    }
    if (u.peran === 'vendor') {
      formEl.append(kosong('Akun penjual tidak bisa berdonasi', 'Dana bantuan membayar kantin, jadi penjual tidak mengisinya. Masuk sebagai donatur untuk patungan.'));
      return;
    }
    formEl.append(
      h('h2', null, 'Patungan satu porsi'),
      h('form', { onsubmit: (e) => { e.preventDefault(); if (!sibuk) kirim(); }, novalidate: true },
        h('div', { class: 'isian' },
          h('span', { id: 'lbl-porsi', class: 'sebagai-label' }, `Jumlah porsi, masing-masing ${rp(porsiRp)}`),
          h('div', { class: 'baris-aksi' },
            h('div', { class: 'stepper', role: 'group', 'aria-labelledby': 'lbl-porsi' },
              h('button', { type: 'button', 'aria-label': 'Kurangi satu porsi', disabled: porsi <= 1, onclick: () => { porsi--; gambarForm(); } }, '−'),
              h('output', { 'aria-live': 'polite' }, porsi),
              h('button', { type: 'button', 'aria-label': 'Tambah satu porsi', disabled: porsi >= 100, onclick: () => { porsi++; gambarForm(); } }, '+')),
            PILIHAN.map((n) => h('button', { class: 'tombol', type: 'button', 'aria-pressed': String(porsi === n), onclick: () => { porsi = n; gambarForm(); } }, `${n} porsi`)))),
        h('div', { class: 'isian isian--centang' },
          h('input', { type: 'checkbox', id: 'anonim', checked: anonim, onchange: (e) => { anonim = e.target.checked; } }),
          h('label', { for: 'anonim' }, 'Tampil sebagai Seseorang di riwayat donasi')),
        h('div', { class: 'isian' },
          h('label', { for: 'pesan' }, 'Pesan untuk riwayat donasi (boleh kosong)'),
          h('textarea', { id: 'pesan', maxlength: 140, oninput: (e) => { pesan = e.target.value; e.target.parentElement.querySelector('small').textContent = `${pesan.length} dari 140 huruf`; } }, pesan),
          h('small', null, `${pesan.length} dari 140 huruf`)),
        galatForm && h('p', { class: 'galat-teks', role: 'alert' }, galatForm),
        h('button', { class: 'tombol tombol--merah tombol--besar', type: 'submit', disabled: sibuk }, sibuk ? 'Memproses' : `Patungan ${rp(porsi * porsiRp)}`),
        null));
  }

  const el = h('section', { class: 'donasi', 'aria-labelledby': 'judul-donasi' },
    h('h1', { id: 'judul-donasi' }, 'Patungan porsi, terlihat sampai ke piringnya'),
    kolamEl,
    h('div', { class: 'donasi__dua' }, formEl, jejakEl),
    h('section', { class: 'donasi__buku', 'aria-labelledby': 'judul-buku' },
      h('h2', { id: 'judul-buku' }, 'Riwayat donasi'),
      h('p', null, 'Setiap rupiah yang masuk dan keluar tercatat di sini. Nama penerima bantuan tidak pernah dicatat.'),
      bukuEl, lagiEl));

  kolamEl.append(memuat('Memuat dana bantuan'));
  bukuEl.append(h('li', null, memuat('Memuat riwayat donasi')));
  gambarForm();
  try {
    await Promise.all([muatKolam(), muatJejak(), muatBuku()]);
  } catch (err) {
    kolamEl.replaceChildren(galat(pesanGalat(err)));
  }
  return { judul: 'Patungan porsi', el, perbarui: () => Promise.all([muatKolam(), muatBuku()]).catch(() => {}) };
}
