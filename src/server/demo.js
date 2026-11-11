import { pool, transaksi } from './db.js';
import { tanggalJakarta } from './util.js';

const HARI = 24 * 60 * 60_000;

/** Menutup listing yang lewat, menghanguskan pesanan yang tak diambil, dan memastikan tiap kantin punya listing hari ini. */
export async function pelihara(sekarang = new Date()) {
  return transaksi(async (db) => {
    const ditutup = await db.query(`update listings set status = 'closed' where status = 'active' and pickup_end <= $1`, [sekarang]);

    // Klaim yang hangus melepas pembayaran bantuan yang sempat dipesan, supaya dana bantuan kembali.
    const hangus = await db.query(
      `with kd as (
         update orders o set status = 'expired' from listings l
          where o.listing_id = l.id and o.status = 'reserved' and l.pickup_end <= $1
          returning o.id, o.kind)
       delete from ledger where kind = 'aid_payout' and order_id in (select id from kd where kind = 'aid_claim')`, [sekarang]);

    // shortcut: listing hari ini disalin dari listing terakhir tiap kantin supaya demo tidak basi, bukan data nyata.
    const awalHariIni = Date.parse(`${tanggalJakarta(sekarang)}T00:00:00+07:00`);
    const { rows: terakhir } = await db.query(
      `select distinct on (l.vendor_id) l.*
         from listings l
        where not exists (select 1 from listings x where x.vendor_id = l.vendor_id and x.pickup_start >= $1)
        order by l.vendor_id, l.pickup_start desc`, [new Date(awalHariIni)]);
    for (const l of terakhir) {
      const geser = awalHariIni - Date.parse(`${tanggalJakarta(l.pickup_start)}T00:00:00+07:00`);
      await db.query(
        `insert into listings(vendor_id, title, description, photo_url, base_price, qty_total, qty_left, pickup_start, pickup_end, status)
         values ($1, $2, $3, $8, $4, $5, $5, $6, $7, 'active')`,
        [l.vendor_id, l.title, l.description, l.base_price, l.qty_total, new Date(+l.pickup_start + geser), new Date(+l.pickup_end + geser), l.photo_url]);
    }
    return { ditutup: ditutup.rowCount, pesananHangus: hangus.rowCount, listingBaru: terakhir.length };
  });
}

export function jadwalkanPemeliharaan() {
  const jalan = () => pelihara().catch((err) => console.error('Pemeliharaan gagal:', err));
  jalan();
  setInterval(jalan, 5 * 60_000).unref();
}
