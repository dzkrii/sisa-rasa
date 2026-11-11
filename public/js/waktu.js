// Jam aplikasi: jam sungguhan, atau jam demo yang tetap berdetik dari titik yang dipilih juri.
const KUNCI = 'sr_jam_selisih';
let selisih = null;
try {
  const simpan = sessionStorage.getItem(KUNCI);
  if (simpan !== null) selisih = Number(simpan);
} catch { /* penyimpanan diblokir: jam demo berlaku sampai halaman dimuat ulang */ }

export const sekarang = () => new Date(Date.now() + (selisih ?? 0));
export const sedangDemo = () => selisih !== null;
export const headerJam = () => (selisih === null ? {} : { 'X-Jam-Demo': sekarang().toISOString() });

const kabari = () => window.dispatchEvent(new CustomEvent('jam'));

function simpan() {
  try {
    if (selisih === null) sessionStorage.removeItem(KUNCI);
    else sessionStorage.setItem(KUNCI, String(selisih));
  } catch { /* lihat di atas */ }
}

const tanggalJakarta = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

/** Menyetel jam demo ke `menit` (menit sejak tengah malam WIB) pada hari ini. */
export function setJamDemo(menit) {
  const hh = String(Math.floor(menit / 60)).padStart(2, '0');
  const mm = String(menit % 60).padStart(2, '0');
  selisih = Date.parse(`${tanggalJakarta()}T${hh}:${mm}:00+07:00`) - Date.now();
  simpan();
  kabari();
}

export function setJamSungguhan() {
  selisih = null;
  simpan();
  kabari();
}

export function menitHariIni(d = sekarang()) {
  const [jj, mm] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d).split(':');
  return Number(jj) * 60 + Number(mm);
}

/** Alas halaman mengikuti jam: kertas nasi siang, kertas yang lebih gelap di sore, kresek hitam di malam. */
export function fase(d = sekarang()) {
  const m = menitHariIni(d);
  if (m >= 18 * 60 || m < 5 * 60) return 'malam';
  return m >= 15 * 60 + 30 ? 'sore' : 'siang';
}
