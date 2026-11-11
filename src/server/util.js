export class ApiError extends Error {
  constructor(status, pesan, kolom) {
    super(pesan);
    this.status = status;
    this.kolom = kolom;
  }
}

export const DEMO = process.env.DEMO_MODE !== '0';
export const SURAT_DEMO = '@deliraya.example';

/** Waktu yang berlaku untuk permintaan ini: header X-Jam-Demo hanya dihormati di mode demo. */
export function waktu(req) {
  const h = req.get('x-jam-demo');
  if (!DEMO || !h) return new Date();
  const d = new Date(h);
  if (Number.isNaN(+d)) throw new ApiError(400, 'Jam demo tidak valid.');
  return d;
}

export const tanggalJakarta = (d) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(d);
export const jamJakarta = (ms) => new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(ms).replace(':', '.');

export function bilangan(v, { min, max, nama }) {
  if (!Number.isInteger(v) || v < min || v > max) throw new ApiError(400, `${nama} harus bilangan bulat ${min} sampai ${max}.`, nama);
  return v;
}

export function teks(v, { min = 1, max, nama }) {
  const s = typeof v === 'string' ? v.trim() : '';
  if (s.length < min || s.length > max) throw new ApiError(400, min > 0 && !s ? `${nama} wajib diisi.` : `${nama} maksimal ${max} huruf.`, nama);
  return s;
}

export function tanggalWaktu(v, nama) {
  const d = new Date(v);
  if (typeof v !== 'string' || Number.isNaN(+d)) throw new ApiError(400, `${nama} bukan tanggal dan jam yang valid.`, nama);
  return d;
}

export function jarakMeter(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const a = Math.sin(((lat2 - lat1) * rad) / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return Math.round(12_742_000 * Math.asin(Math.sqrt(a)));
}
