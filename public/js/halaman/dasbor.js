import { h, kosongkan } from '../h.js';
import { api } from '../api.js';
import { harga, jam, kecil, rp, sampai } from '../format.js';
import { masukDemo, penggunaSaatIni } from '../sesi.js';
import { menitHariIni } from '../waktu.js';
import { galat, kabari, kosong, memuat, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';
import { garisHarga } from '../komponen/garisHarga.js';
import { FOTO } from '/shared/foto.js';

const hariIniJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());
const KOLOM = { 'Nama porsi': 'f-judul', Keterangan: 'f-ket', 'Harga dasar': 'f-harga', 'Jumlah porsi': 'f-stok', 'Jam mulai': 'f-mulai', 'Jam selesai': 'f-selesai', Foto: 'f-foto' };
const STATUS = { reserved: 'Menunggu', picked_up: 'Diambil', expired: 'Hangus', cancelled: 'Batal' };

export default async function dasbor() {
  const u = penggunaSaatIni();
  const el = h('section', { class: 'dasbor', 'aria-labelledby': 'judul-dasbor' }, h('h1', { id: 'judul-dasbor' }, 'Dashboard penjual'));

  if (!u || u.peran !== 'vendor') {
    el.append(kosong(u ? 'Dashboard ini khusus penjual' : 'Masuk sebagai penjual', 'Di sini penjual mengunggah porsi sisa, memasukkan kode pesanan saat porsi diambil, dan melihat pendapatannya.',
      h('button', { class: 'tombol tombol--merah', type: 'button', onclick: async () => { try { await masukDemo('penjual'); } catch (err) { kabari(pesanGalat(err), { galat: true }); } } }, 'Masuk sebagai penjual')));
    return { judul: 'Dashboard penjual', el };
  }

  const uangEl = h('div', { class: 'dasbor__uang' });
  const listingEl = h('div', { class: 'dasbor__listing' });
  const pesananEl = h('div', { class: 'dasbor__pesanan' });
  let konfirmasiTutup = null;

  function gambarUang(d) {
    kosongkan(uangEl);
    uangEl.append(
      h('div', null,
        h('p', { class: 'nota' }, `Masuk ke ${d.kantin.nama} hari ini`),
        harga(d.pendapatan.hariIni, { ukuran: 'raksasa', gratis: false, label: `Pendapatan hari ini ${rp(d.pendapatan.hariIni)}` })),
      h('dl', { class: 'dasbor__rinci nota' },
        h('dt', null, 'Tujuh hari terakhir'), h('dd', { class: 'angka' }, rp(d.pendapatan.tujuhHari)),
        h('dt', null, 'Menunggu diambil'), h('dd', { class: 'angka' }, rp(d.pendapatan.menunggu))));
  }

  async function tutup(l) {
    if (konfirmasiTutup !== l.id) {
      konfirmasiTutup = l.id;
      setTimeout(() => { if (konfirmasiTutup === l.id) { konfirmasiTutup = null; muat(); } }, 5000);
      return muat();
    }
    try {
      await api.patch(`/listings/${l.id}`, { status: 'closed' });
      kabari('Listing ditutup. Pesanan yang sudah masuk tetap bisa diambil.');
    } catch (err) {
      kabari(pesanGalat(err), { galat: true });
    }
    konfirmasiTutup = null;
    muat();
  }

  function gambarListing(d) {
    kosongkan(listingEl);
    const aktif = d.listing.filter((l) => l.status === 'active');
    if (!aktif.length) {
      listingEl.append(kosong('Belum ada porsi yang kamu unggah untuk hari ini', 'Unggah porsi sisa dengan formulir di bawah. Pembeli melihatnya setelah jam mulai, dan harganya turun otomatis.'));
      return;
    }
    listingEl.append(...aktif.map((l) => h('article', { class: 'dasbor__butir' },
      h('div', { class: 'dasbor__butir-kepala' },
        h('div', null,
          h('h3', null, l.judul),
          h('p', { class: 'nota' }, `Harga dasar ${rp(l.hargaDasar)}. Sisa ${l.stokSisa} dari ${l.stok} porsi. ${l.pesanan.menunggu} menunggu diambil, ${l.pesanan.diambil} diambil, ${l.pesanan.hangus} hangus.`),
          l.kondisi.status === 'buka' && h('p', { class: 'nota' }, `Tahap ${kecil(l.kondisi.nama)} sekarang. ${l.kondisi.tahapBerikut ? 'Tahap berikut dalam ' : 'Tutup dalam '}`, sampai(l.kondisi.tahapBerikut ? l.kondisi.tahapBerikut.mulaiMs : +new Date(l.jendela.selesai)))),
        h('button', { class: konfirmasiTutup === l.id ? 'tombol tombol--merah' : 'tombol', type: 'button', onclick: () => tutup(l) }, konfirmasiTutup === l.id ? 'Klik lagi untuk menutup' : 'Tutup listing')),
      garisHarga({ judul: l.judul, hargaDasar: l.hargaDasar, jendela: l.jendela }, { peran: 'penjual', bentuk: 'baris', kolamCukup: l.jadwal[3].bantuan }))));
  }

  function gambarPesanan(d) {
    kosongkan(pesananEl);
    if (!d.pesanan.length) {
      pesananEl.append(kosong('Belum ada pesanan', 'Pesanan muncul di sini dengan kodenya begitu pembeli memesan. Kamu hanya melihat kode dan rupiah, tidak melihat siapa yang memesan.'));
      return;
    }
    pesananEl.append(h('table', { class: 'tabel-nota' },
      h('caption', { class: 'nota' }, 'Pesanan terbaru, hanya kode dan rupiah'),
      h('thead', null, h('tr', null, ['Kode', 'Porsi', 'Jumlah', 'Diterima', 'Status'].map((t, i) => h('th', { scope: 'col', class: i > 1 && i < 4 ? 'angka' : null }, t)))),
      h('tbody', null, d.pesanan.map((o) => h('tr', null,
        h('th', { scope: 'row', class: 'nota' }, o.kode), h('td', null, o.judul), h('td', { class: 'angka' }, o.jumlah), h('td', { class: 'angka' }, rp(o.terima)), h('td', null, STATUS[o.status]))))));
  }

  async function muat() {
    try {
      const d = await api.get('/vendor/dashboard');
      gambarUang(d);
      gambarListing(d);
      gambarPesanan(d);
    } catch (err) {
      listingEl.replaceChildren(galat(pesanGalat(err), muat));
    }
  }

  // ---- Verifikasi kode ----
  const hasilKode = h('div', { class: 'verifikasi__hasil', role: 'status' });
  const kodeInput = h('input', { id: 'f-kode', class: 'kolom verifikasi__kode', maxlength: 8, autocomplete: 'off', autocapitalize: 'characters', spellcheck: 'false', inputmode: 'text', 'aria-describedby': 'bantu-kode' });
  const verifikasi = h('form', { class: 'verifikasi', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    const tombol = e.currentTarget.querySelector('button');
    tombol.disabled = true;
    hasilKode.replaceChildren();
    try {
      const r = await api.post(`/orders/${encodeURIComponent(kodeInput.value.trim())}/pickup`, {});
      hasilKode.append(cap('Diambil', { baru: true, besar: true }), h('p', null, `${r.pesanan.jumlah} ${kecil(r.pesanan.judul)}, kode ${r.pesanan.kode}. ${rp(r.pesanan.terima)} masuk ke pendapatanmu.`));
      kodeInput.value = '';
      muat();
    } catch (err) {
      hasilKode.append(h('p', { class: 'galat-teks' }, err.message));
      kodeInput.setAttribute('aria-invalid', 'true');
    }
    tombol.disabled = false;
    kodeInput.focus();
  } },
    h('div', { class: 'isian' },
      h('label', { for: 'f-kode' }, 'Kode dari pembeli'),
      kodeInput,
      h('small', { id: 'bantu-kode' }, 'Enam huruf dan angka, tertera besar di tiket. Huruf kecil juga diterima.')),
    h('button', { class: 'tombol tombol--merah tombol--besar', type: 'submit' }, 'Cek kode dan tandai diambil'),
    hasilKode);
  kodeInput.addEventListener('input', () => kodeInput.removeAttribute('aria-invalid'));

  // ---- Unggah porsi ----
  // Jam bawaan mengikuti jam yang berlaku: mulai di menit lima berikutnya, selesai pukul 20.00 atau satu jam sesudahnya.
  const hhmm = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  const menitMulai = Math.min(Math.ceil(menitHariIni() / 5) * 5, 23 * 60);
  const nilai = { judul: '', ket: '', foto: '', harga: 10000, stok: 8, mulai: hhmm(menitMulai), selesai: hhmm(Math.min(Math.max(20 * 60, menitMulai + 60), 23 * 60 + 55)) };
  const pratinjau = h('div', { class: 'unggah__pratinjau' });
  const galatEl = h('div', { 'aria-live': 'polite' });

  const jendelaIso = (hhmm) => `${hariIniJakarta()}T${hhmm}:00+07:00`;
  function gambarPratinjau() {
    pratinjau.replaceChildren();
    const mulai = Date.parse(jendelaIso(nilai.mulai));
    const selesai = Date.parse(jendelaIso(nilai.selesai));
    if (!(selesai > mulai) || !(nilai.harga >= 1000)) {
      pratinjau.append(h('p', { class: 'nota' }, 'Isi harga dasar dan jam ambil yang masuk akal untuk melihat jadwal tahapnya.'));
      return;
    }
    pratinjau.append(
      h('h3', null, 'Yang akan kamu terima'),
      garisHarga({ judul: nilai.judul || 'porsi baru', hargaDasar: nilai.harga, jendela: { mulai: new Date(mulai).toISOString(), selesai: new Date(selesai).toISOString() } }, { peran: 'penjual', bentuk: 'lajur' }));
  }

  const isian = (id, label, atribut, kunci, { area = false, bantu } = {}) => h('div', { class: 'isian' },
    h('label', { for: id }, label),
    h(area ? 'textarea' : 'input', { id, ...atribut, value: area ? null : nilai[kunci], oninput: (e) => { nilai[kunci] = atribut.type === 'number' ? Number(e.target.value) : e.target.value; gambarPratinjau(); } }, area ? nilai[kunci] : null),
    bantu && h('small', null, bantu));

  const unggah = h('form', { class: 'unggah', novalidate: true, onsubmit: async (e) => {
    e.preventDefault();
    galatEl.replaceChildren();
    for (const id of Object.values(KOLOM)) unggah.querySelector(`#${id}`)?.removeAttribute('aria-invalid');
    try {
      const r = await api.post('/listings', { judul: nilai.judul, deskripsi: nilai.ket, hargaDasar: nilai.harga, stok: nilai.stok, foto: nilai.foto || undefined, mulai: jendelaIso(nilai.mulai), selesai: jendelaIso(nilai.selesai) });
      kabari(`${r.listing.judul} sudah tayang. Harganya turun otomatis.`);
      nilai.judul = ''; nilai.ket = ''; nilai.foto = '';
      unggah.reset();
      gambarPratinjau();
      muat();
    } catch (err) {
      galatEl.append(h('p', { class: 'galat-teks' }, err.message));
      unggah.querySelector(`#${KOLOM[err.kolom]}`)?.setAttribute('aria-invalid', 'true');
      unggah.querySelector(`#${KOLOM[err.kolom]}`)?.focus();
    }
  } },
    isian('f-judul', 'Nama porsi', { type: 'text', maxlength: 80, autocomplete: 'off' }, 'judul'),
    isian('f-ket', 'Keterangan (boleh kosong)', { maxlength: 300 }, 'ket', { area: true }),
    h('div', { class: 'isian' },
      h('label', { for: 'f-foto' }, 'Foto hidangan (boleh kosong)'),
      h('select', { id: 'f-foto', onchange: (e) => { nilai.foto = e.target.value; } }, h('option', { value: '' }, 'Tanpa foto'), FOTO.map((f) => h('option', { value: f.slug }, f.nama))),
      h('small', null, 'Foto ilustrasi dari pustaka, bukan foto porsimu.')),
    h('div', { class: 'unggah__dua' },
      isian('f-harga', 'Harga dasar (Rp)', { type: 'number', min: 1000, max: 200000, step: 500, inputmode: 'numeric' }, 'harga', { bantu: 'Harga tahap Segar. Tahap berikutnya dihitung dari sini.' }),
      isian('f-stok', 'Jumlah porsi', { type: 'number', min: 1, max: 200, inputmode: 'numeric' }, 'stok')),
    h('div', { class: 'unggah__dua' },
      isian('f-mulai', 'Mulai bisa diambil', { type: 'time' }, 'mulai'),
      isian('f-selesai', 'Selesai (kantin tutup)', { type: 'time' }, 'selesai')),
    galatEl,
    h('button', { class: 'tombol tombol--merah tombol--besar', type: 'submit' }, 'Tayangkan porsi'));
  unggah.querySelector('#f-ket')?.setAttribute('rows', '3');

  uangEl.append(memuat('Memuat pendapatan'));
  el.append(
    uangEl,
    h('div', { class: 'dasbor__atas' },
      h('section', { 'aria-labelledby': 'judul-ver' }, h('h2', { id: 'judul-ver' }, 'Pembeli datang membawa kode'), verifikasi),
      h('section', { 'aria-labelledby': 'judul-unggah' }, h('h2', { id: 'judul-unggah' }, 'Unggah porsi sisa'), unggah, pratinjau)),
    h('section', { 'aria-labelledby': 'judul-aktif' }, h('h2', { id: 'judul-aktif' }, 'Porsi yang tayang'), listingEl),
    h('section', { 'aria-labelledby': 'judul-pesanan' }, h('h2', { id: 'judul-pesanan' }, 'Pesanan'), pesananEl));
  gambarPratinjau();
  await muat();
  return { judul: 'Dashboard penjual', el, perbarui: muat };
}
