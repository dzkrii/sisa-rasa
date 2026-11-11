import { galat, memuat, pesanGalat } from './ui.js';

const RUTE = [
  { pola: /^\/$/, muat: () => import('./halaman/beranda.js') },
  { pola: /^\/jelajah$/, muat: () => import('./halaman/jelajah.js') },
  { pola: /^\/porsi\/(\d+)$/, muat: () => import('./halaman/porsi.js'), nama: ['id'] },
  { pola: /^\/tiket$/, muat: () => import('./halaman/tiket.js') },
  { pola: /^\/bantuan$/, muat: () => import('./halaman/bantuan.js') },
  { pola: /^\/donasi$/, muat: () => import('./halaman/donasi.js') },
  { pola: /^\/dasbor$/, muat: () => import('./halaman/dasbor.js') },
  { pola: /^\/kredit$/, muat: () => import('./halaman/kredit.js') },
  { pola: /^\/dampak$/, muat: () => import('./halaman/dampak.js') },
  { pola: /^\/admin$/, muat: () => import('./halaman/admin.js') },
  { pola: /^\/cara-kerja$/, muat: () => import('./halaman/caraKerja.js') },
];

export function mulaiRouter({ isi, padaRute }) {
  let aktif = null;
  let nomor = 0;
  let pertama = true;

  const jalur = () => location.pathname.replace(/\/+$/, '') || '/';

  async function tampil({ tenang = false } = {}) {
    const no = ++nomor;
    const path = jalur();
    const rute = RUTE.find((r) => r.pola.test(path));
    padaRute?.(path);
    if (!tenang) {
      isi.replaceChildren(memuat('Memuat halaman'));
      isi.setAttribute('aria-busy', 'true');
    }
    try {
      if (!rute) throw Object.assign(new Error('Alamat ini tidak ada di Sisa Rasa.'), { status: 404 });
      const param = Object.fromEntries((rute.nama ?? []).map((n, i) => [n, path.match(rute.pola)[i + 1]]));
      const modul = await rute.muat();
      const hasil = await modul.default({ param, query: new URLSearchParams(location.search), pergi, tampilUlang: () => tampil({ tenang: true }) });
      if (no !== nomor) return hasil.hancur?.();
      aktif?.hancur?.();
      aktif = hasil;
      isi.replaceChildren(hasil.el);
      document.title = `${hasil.judul} | Sisa Rasa`;
    } catch (err) {
      if (no !== nomor) return;
      aktif?.hancur?.();
      aktif = null;
      document.title = err.status === 404 ? 'Tidak ditemukan | Sisa Rasa' : 'Gagal memuat | Sisa Rasa';
      isi.replaceChildren(galat(pesanGalat(err), err.status === 404 ? null : () => tampil()));
    }
    isi.removeAttribute('aria-busy');
    const awal = pertama;
    pertama = false;
    if (!tenang) {
      isi.classList.remove('masuk');
      void isi.offsetWidth;
      isi.classList.add('masuk');
    }
    if (!tenang && !awal) {
      window.scrollTo(0, 0);
      const judul = isi.querySelector('h1') ?? isi;
      judul.setAttribute('tabindex', '-1');
      judul.focus({ preventScroll: true });
    }
  }

  function pergi(path, { ganti = false } = {}) {
    history[ganti ? 'replaceState' : 'pushState'](null, '', path);
    alamatTerakhir = location.pathname + location.search;
    window.dispatchEvent(new CustomEvent('rute'));
    return tampil();
  }

  document.addEventListener('click', (e) => {
    const a = e.target.closest?.('a[href]');
    if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    // Tautan ke bagian di halaman yang sama (#faq, lompat ke isi) diserahkan ke peramban.
    if (a.getAttribute('href').startsWith('#')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || a.target || a.hasAttribute('download') || /^\/(api|shared)\//.test(url.pathname)) return;
    e.preventDefault();
    if (url.pathname + url.search !== location.pathname + location.search) pergi(url.pathname + url.search);
  });
  // Pindah ke #bagian di halaman yang sama ikut memicu popstate di sebagian peramban; hanya perubahan alamat yang menggambar ulang.
  let alamatTerakhir = location.pathname + location.search;
  window.addEventListener('popstate', () => {
    const alamat = location.pathname + location.search;
    if (alamat === alamatTerakhir) return;
    alamatTerakhir = alamat;
    tampil();
  });
  // Jam berubah: halaman yang punya `perbarui` memperbarui bagiannya, yang lain digambar ulang tanpa menggeser fokus.
  window.addEventListener('jam', () => (aktif?.perbarui ? aktif.perbarui() : tampil({ tenang: true })));
  window.addEventListener('pengguna', () => tampil({ tenang: true }));

  return { mulai: () => tampil(), pergi, jalur };
}
