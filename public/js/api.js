import { headerJam } from './waktu.js';

export class GalatApi extends Error {
  constructor(status, pesan, kolom) {
    super(pesan);
    this.status = status;
    this.kolom = kolom;
  }
}

async function minta(method, path, body) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: { ...(method !== 'GET' && { 'content-type': 'application/json' }), ...headerJam() },
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
  } catch {
    throw new GalatApi(0, 'Tidak bisa terhubung ke server. Periksa sambunganmu, lalu coba lagi.');
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new GalatApi(res.status, data?.error ?? 'Permintaan gagal. Coba lagi sebentar.', data?.kolom);
  return data;
}

export const api = {
  get: (path) => minta('GET', path),
  post: (path, body) => minta('POST', path, body),
  patch: (path, body) => minta('PATCH', path, body),
};
