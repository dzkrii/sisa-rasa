// Menyalin huruf, Leaflet, dan GSAP dari node_modules ke public/ agar situs jalan tanpa CDN.
import { cpSync, mkdirSync } from 'node:fs';

const salin = (dari, ke) => {
  mkdirSync(new URL('../public/' + ke.split('/').slice(0, -1).join('/') + '/', import.meta.url), { recursive: true });
  cpSync(new URL('../node_modules/' + dari, import.meta.url), new URL('../public/' + ke, import.meta.url), { recursive: true });
};

salin('@fontsource-variable/archivo/files/archivo-latin-wdth-normal.woff2', 'fonts/archivo.woff2');
salin('@fontsource-variable/hanken-grotesk/files/hanken-grotesk-latin-wght-normal.woff2', 'fonts/hanken-grotesk.woff2');
salin('@fontsource/courier-prime/files/courier-prime-latin-400-normal.woff2', 'fonts/courier-prime-400.woff2');
salin('@fontsource/courier-prime/files/courier-prime-latin-700-normal.woff2', 'fonts/courier-prime-700.woff2');
salin('leaflet/dist/leaflet.js', 'vendor/leaflet/leaflet.js');
salin('leaflet/dist/leaflet.css', 'vendor/leaflet/leaflet.css');
salin('leaflet/dist/images', 'vendor/leaflet/images');
salin('gsap/dist/gsap.min.js', 'vendor/gsap.min.js');
console.log('Aset vendor tersalin ke public/.');
