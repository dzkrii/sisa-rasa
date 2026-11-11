import { scrypt, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);

export async function hashPassword(sandi) {
  const garam = randomBytes(16);
  const kunci = await scryptAsync(sandi, garam, 64);
  return `scrypt$${garam.toString('hex')}$${kunci.toString('hex')}`;
}

export async function verifyPassword(sandi, tersimpan) {
  const [algoritma, garam, kunci] = tersimpan.split('$');
  if (algoritma !== 'scrypt' || !garam || !kunci) return false;
  const hitung = await scryptAsync(sandi, Buffer.from(garam, 'hex'), 64);
  return timingSafeEqual(hitung, Buffer.from(kunci, 'hex'));
}
