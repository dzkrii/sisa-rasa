// Pembuat elemen DOM. Teks selalu masuk sebagai text node, jadi isi dari pengguna tidak pernah dibaca sebagai HTML.
export function h(tag, attrs, ...anak) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs ?? {})) {
    if (v == null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2).toLowerCase(), v);
    else el.setAttribute(k, v === true ? '' : v);
  }
  tambah(el, anak);
  return el;
}

function tambah(el, anak) {
  for (const a of anak.flat(Infinity)) {
    if (a == null || a === false) continue;
    el.append(a instanceof Node ? a : document.createTextNode(String(a)));
  }
}

export const kosongkan = (el) => el.replaceChildren();
