// Pustaka foto hidangan (public/img/foto). Dipakai server untuk memvalidasi pilihan penjual dan front-end untuk daftar pilihannya.
export const FOTO = [
  { slug: 'lontong-medan', nama: 'Lontong Medan' },
  { slug: 'nasi-gurih', nama: 'Nasi gurih' },
  { slug: 'soto-medan', nama: 'Soto Medan' },
  { slug: 'ayam-penyet', nama: 'Ayam penyet' },
  { slug: 'bika-ambon', nama: 'Bika ambon' },
  { slug: 'kue-talam', nama: 'Kue talam' },
  { slug: 'mie-goreng', nama: 'Mi goreng' },
  { slug: 'nasi-goreng', nama: 'Nasi goreng' },
  { slug: 'pisang-goreng', nama: 'Pisang goreng' },
  { slug: 'bubur-pedas', nama: 'Bubur pedas' },
];

export const urlFoto = (slug) => `/img/foto/${slug}.webp`;
export const slugValid = (slug) => FOTO.some((f) => f.slug === slug);
