import { h, kosongkan } from '../h.js';
import { api } from '../api.js';
import { harga, jam, jarak, rp, sampai } from '../format.js';
import { konfigurasi } from '../sesi.js';
import { setJamDemo, sekarang } from '../waktu.js';
import { galat, kabari, kosong, memuat, pesanGalat } from '../ui.js';
import { cap } from '../komponen/cap.js';
import { foto } from '../komponen/foto.js';

let leafletMuat;
function muatLeaflet() {
  leafletMuat ??= new Promise((selesai, gagal) => {
    if (window.L) return selesai(window.L);
    document.head.append(h('link', { rel: 'stylesheet', href: '/vendor/leaflet/leaflet.css' }));
    const s = h('script', { src: '/vendor/leaflet/leaflet.js' });
    s.onload = () => selesai(window.L);
    s.onerror = () => { leafletMuat = null; gagal(new Error('Peta tidak bisa dimuat.')); };
    document.head.append(s);
  });
  return leafletMuat;
}

const harga0 = (l) => l.kondisi.harga;

function teksHarga(l, ukuran = 'sedang') {
  const k = l.kondisi;
  if (k.status === 'belum') return h('p', { class: 'nota' }, `Buka ${jam(l.jendela.mulai)}`);
  if (k.status === 'tutup') return h('p', { class: 'nota' }, 'Tutup');
  if (l.stokSisa === 0) return h('p', { class: 'nota' }, 'Habis');
  return k.bantuan ? harga(0, { ukuran }) : harga(harga0(l), { ukuran, merah: true });
}

export default async function jelajah({ query }) {
  const kampus = konfigurasi().kampus;
  const state = { titik: { lat: kampus.lat, lng: kampus.lng, label: `pusat ${kampus.name}` }, urut: 'tutup', jarakMaks: 0, hargaMaks: 0, sembunyi: false, tab: 'daftar', dipilih: null, data: [] };
  let peta = null;
  let lapis = null;
  const penanda = new Map();

  const daftarEl = h('div', { class: 'jelajah__daftar', id: 'daftar-porsi' });
  const petaEl = h('div', { class: 'jelajah__peta', id: 'peta-kantin', role: 'region', 'aria-label': 'Peta kantin dan harga porsi' });
  const ringkasan = h('p', { class: 'nota', role: 'status' });

  const pilih = (nama, label, opsi, kunci) => h('div', { class: 'isian' },
    h('label', { for: `f-${kunci}` }, label),
    h('select', { id: `f-${kunci}`, onchange: (e) => { state[kunci] = e.target.value === '' ? 0 : isNaN(e.target.value) ? e.target.value : Number(e.target.value); if (kunci === 'urut') muat(); else gambar(); } },
      opsi.map(([v, t]) => h('option', { value: v, selected: String(state[kunci]) === String(v) || (v === '' && state[kunci] === 0) }, t))));

  const saring = h('form', { class: 'saring', onsubmit: (e) => e.preventDefault() },
    pilih('urut', 'Urutkan', [['tutup', 'Paling cepat tutup'], ['harga', 'Paling murah'], ['jarak', 'Paling dekat']], 'urut'),
    pilih('jarakMaks', 'Jarak', [['', 'Berapa pun'], ['300', 'Sampai 300 m'], ['500', 'Sampai 500 m'], ['1000', 'Sampai 1 km']], 'jarakMaks'),
    pilih('hargaMaks', 'Harga sekarang', [['', 'Berapa pun'], ['5000', 'Sampai Rp 5.000'], ['8000', 'Sampai Rp 8.000'], ['10000', 'Sampai Rp 10.000']], 'hargaMaks'),
    h('div', { class: 'isian isian--centang' },
      h('input', { type: 'checkbox', id: 'f-sembunyi', onchange: (e) => { state.sembunyi = e.target.checked; gambar(); } }),
      h('label', { for: 'f-sembunyi' }, 'Sembunyikan yang belum buka atau habis')),
    h('button', { class: 'tombol', type: 'button', onclick: pakaiLokasi }, 'Pakai lokasiku'));
  // Di ponsel panel filter dilipat supaya daftar tidak terdorong ke bawah layar.
  const wadahSaring = h('details', { class: 'saring-wadah', open: matchMedia('(min-width: 62rem)').matches }, h('summary', null, 'Filter dan urutkan'), saring);

  const tab = h('div', { class: 'tab', role: 'tablist', 'aria-label': 'Tampilan' },
    ['daftar', 'peta'].map((t) => h('button', { class: 'tombol', role: 'tab', type: 'button', id: `tab-${t}`, 'aria-controls': t === 'daftar' ? 'daftar-porsi' : 'peta-kantin', 'aria-selected': String(state.tab === t), onclick: () => ubahTab(t) }, t === 'daftar' ? 'Daftar' : 'Peta')));

  function ubahTab(t) {
    state.tab = t;
    for (const b of tab.children) b.setAttribute('aria-selected', String(b.id === `tab-${t}`));
    daftarEl.classList.toggle('jelajah__daftar--sembunyi', t !== 'daftar');
    petaEl.classList.toggle('jelajah__peta--sembunyi', t !== 'peta');
    if (t === 'peta') pastikanPeta().then(() => peta?.invalidateSize());
  }

  async function pakaiLokasi() {
    if (!navigator.geolocation) return kabari('Peramban ini tidak bisa membaca lokasi. Jaraknya tetap dihitung dari pusat kampus.', { galat: true });
    navigator.geolocation.getCurrentPosition(
      (p) => { state.titik = { lat: p.coords.latitude, lng: p.coords.longitude, label: 'lokasimu' }; kabari('Jarak sekarang dihitung dari lokasimu.'); muat(); },
      () => kabari('Lokasi tidak bisa dibaca. Jaraknya tetap dihitung dari pusat kampus.', { galat: true }),
      { timeout: 8000 });
  }

  function tersaring() {
    return state.data.filter((l) => {
      if (state.jarakMaks && l.jarakM > state.jarakMaks) return false;
      if (state.hargaMaks && !(harga0(l) !== null && harga0(l) <= state.hargaMaks) && !l.kondisi.bantuan) return false;
      if (state.sembunyi && !(l.kondisi.status === 'buka' && l.stokSisa > 0)) return false;
      return true;
    });
  }

  function baris(l, indeks) {
    const k = l.kondisi;
    const habis = l.stokSisa === 0;
    const kelas = ['nota-baris', indeks === 0 && 'nota-baris--utama', l.foto && 'nota-baris--foto', k.bantuan && 'nota-baris--bantuan', (k.status !== 'buka' || habis) && 'nota-baris--belum', state.dipilih === l.id && 'dipilih'].filter(Boolean).join(' ');
    const sisaTutup = +new Date(l.jendela.selesai);
    return h('article', { class: kelas, 'data-fase': k.bantuan ? 'malam' : null, 'data-id': l.id },
      l.foto && h('div', { class: 'nota-baris__foto bingkai bingkai--kecil' }, foto(l.foto, { lebar: 480, tinggi: 480 })),
      h('div', { class: 'nota-baris__info' },
        h('h3', null, h('a', { href: `/porsi/${l.id}` }, l.judul)),
        h('p', { class: 'nota-baris__meta' }, `${l.kantin.nama}, ${jarak(l.jarakM)}. `,
          habis ? 'Porsi habis.' : `Tinggal ${l.stokSisa} dari ${l.stok} porsi. `,
          k.status === 'buka' && !habis && h('span', null, k.tahapBerikut ? 'Harga turun lagi dalam ' : 'Tutup dalam ', sampai(k.tahapBerikut ? k.tahapBerikut.mulaiMs : sisaTutup)))),
      h('div', { class: 'nota-baris__harga' }, teksHarga(l, indeks === 0 ? 'besar' : 'sedang'), k.status === 'buka' && !habis && cap(k.bantuan ? 'Bantuan' : k.nama, { tinta: true, miring: indeks % 2 ? 3 : -3 })),
      h('div', { class: 'nota-baris__aksi' },
        h('a', { class: `tombol${indeks === 0 ? ' tombol--merah' : ''}`, href: `/porsi/${l.id}` }, k.bantuan ? 'Klaim atau lihat jadwal' : 'Lihat jadwal harga'),
        h('button', { class: 'tombol', type: 'button', onclick: () => { pilihListing(l.id, true); } }, 'Lihat di peta')));
  }

  function gambar() {
    const daftar = tersaring();
    kosongkan(daftarEl);
    ringkasan.textContent = `${daftar.length} dari ${state.data.length} porsi. Jam ${jam(sekarang())} WIB, jarak dari ${state.titik.label}.`;
    if (!state.data.length) {
      daftarEl.append(kosong('Belum ada porsi sisa hari ini', 'Kantin mengunggah porsi sisa sekitar sejam sebelum tutup. Atur jam ke sore hari untuk melihat harga yang sedang turun.',
        h('button', { class: 'tombol tombol--merah', type: 'button', onclick: () => setJamDemo(16 * 60 + 40) }, 'Atur jam ke 16.40')));
    } else if (!daftar.length) {
      daftarEl.append(kosong('Tidak ada porsi yang cocok dengan filter', 'Longgarkan jarak atau harga, atau tampilkan lagi porsi yang belum buka.',
        h('button', { class: 'tombol', type: 'button', onclick: () => { Object.assign(state, { jarakMaks: 0, hargaMaks: 0, sembunyi: false }); saring.reset(); gambar(); } }, 'Hapus filter')));
    } else {
      daftarEl.append(...daftar.map(baris));
    }
    gambarPenanda(daftar);
  }

  function pilihListing(id, keTab) {
    state.dipilih = id;
    gambar();
    const l = state.data.find((x) => x.id === id);
    if (keTab) ubahTab('peta');
    pastikanPeta().then(() => { if (peta && l) { peta.setView([l.kantin.lat, l.kantin.lng], 17); penanda.get(id)?.openPopup(); } });
  }

  async function pastikanPeta() {
    if (peta) return peta;
    try {
      const L = await muatLeaflet();
      if (peta || !petaEl.isConnected) return peta;
      peta = L.map(petaEl, { zoomControl: true }).setView([kampus.lat, kampus.lng], 16);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; kontributor <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(peta);
      L.marker([kampus.lat, kampus.lng], { icon: L.divIcon({ className: 'penanda-bungkus', html: '<span class="penanda penanda--kampus">Kampus</span>', iconSize: [76, 44], iconAnchor: [38, 22] }), title: kampus.name, keyboard: false }).addTo(peta);
      lapis = L.layerGroup().addTo(peta);
      gambarPenanda(tersaring());
    } catch (err) {
      petaEl.replaceChildren(galat('Peta memakai OpenStreetMap dan butuh internet. Daftar porsi tetap lengkap di tab Daftar.'));
    }
    return peta;
  }

  function gambarPenanda(daftar) {
    const L = window.L;
    if (!peta || !L) return;
    lapis.clearLayers();
    penanda.clear();
    for (const l of daftar) {
      const k = l.kondisi;
      const teks = k.bantuan ? 'Gratis' : k.status !== 'buka' ? 'Belum' : rp(harga0(l)).replace('Rp ', '');
      const m = L.marker([l.kantin.lat, l.kantin.lng], {
        icon: L.divIcon({ className: 'penanda-bungkus', html: `<span class="penanda${k.bantuan ? ' penanda--bantuan' : ''}${state.dipilih === l.id ? ' penanda--pilih' : ''}">${teks}</span>`, iconSize: [76, 44], iconAnchor: [38, 22] }),
        title: `${l.judul}, ${l.kantin.nama}`,
      }).addTo(lapis);
      m.bindPopup(() => h('div', { class: 'popup' }, h('strong', null, l.judul), h('p', null, `${l.kantin.nama}, ${jarak(l.jarakM)}`), h('a', { href: `/porsi/${l.id}` }, 'Buka jadwal harga')));
      m.on('click', () => { state.dipilih = l.id; daftarEl.querySelector('.dipilih')?.classList.remove('dipilih'); daftarEl.querySelector(`[data-id="${l.id}"]`)?.classList.add('dipilih'); });
      penanda.set(l.id, m);
    }
  }

  async function muat() {
    try {
      const r = await api.get(`/listings?lat=${state.titik.lat}&lng=${state.titik.lng}&sort=${state.urut}`);
      state.data = r.listing;
      gambar();
    } catch (err) {
      daftarEl.replaceChildren(galat(pesanGalat(err), muat));
    }
  }

  daftarEl.append(memuat('Memuat porsi'));
  const el = h('section', { class: 'jelajah', 'aria-labelledby': 'judul-jelajah' },
    h('div', { class: 'jelajah__kepala' },
      h('h1', { id: 'judul-jelajah' }, 'Porsi sisa di sekitar kampus'),
      ringkasan),
    wadahSaring,
    tab,
    h('h2', { class: 'sr-saja' }, 'Daftar porsi dan peta'),
    h('div', { class: 'jelajah__isi' }, daftarEl, petaEl,
      h('p', { class: 'nota jelajah__catatan' }, 'Peta memakai OpenStreetMap dan butuh internet.')));
  petaEl.classList.add('jelajah__peta--sembunyi');
  daftarEl.setAttribute('role', 'tabpanel');
  petaEl.setAttribute('role', 'tabpanel');

  await muat();
  // Di layar lebar daftar dan peta tampil berdampingan; peta dibuat setelah elemennya ada di dokumen.
  queueMicrotask(() => requestAnimationFrame(() => { if (matchMedia('(min-width: 62rem)').matches) { petaEl.classList.remove('jelajah__peta--sembunyi'); pastikanPeta(); } }));

  return {
    judul: 'Jelajah porsi sisa',
    el,
    perbarui: muat,
    hancur: () => { peta?.remove(); peta = null; },
  };
}
