import { h } from '../h.js';
import { galat } from '../ui.js';

export default async function kredit() {
  let daftar;
  try {
    const res = await fetch('/img/kredit.json');
    if (!res.ok) throw new Error('Daftar kredit tidak ditemukan.');
    daftar = await res.json();
  } catch (err) {
    return { judul: 'Kredit foto', el: h('section', { class: 'kredit' }, h('h1', null, 'Kredit foto'), galat(err.message)) };
  }
  const el = h('article', { class: 'kredit', 'aria-labelledby': 'judul-kredit' },
    h('h1', { id: 'judul-kredit' }, 'Kredit foto'),
    h('p', null, 'Foto hidangan di Sisa Rasa berasal dari Wikimedia Commons dan dipakai sesuai lisensinya masing-masing. Fotonya hanya ilustrasi jenis hidangan, bukan foto porsi kantin yang sebenarnya. Ukurannya dikecilkan, dipotong menyesuaikan tata letak, dan warnanya disesuaikan dengan halaman.'),
    h('ul', { class: 'kredit__daftar' }, daftar.map((k) => h('li', null,
      h('img', { class: 'foto kredit__kecil', src: `/img/foto/${k.slug}.webp`, alt: '', width: 160, height: 120, loading: 'lazy' }),
      h('div', null,
        h('h2', null, k.judul),
        h('p', null, `Foto oleh ${k.pembuat}. `, h('a', { href: k.lisensiUrl, rel: 'noopener' }, k.lisensi), '. ', h('a', { href: k.sumber, rel: 'noopener' }, 'Halaman sumber'), '.'))))));
  return { judul: 'Kredit foto', el };
}
