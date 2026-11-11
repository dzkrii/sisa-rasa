drop table if exists ledger, orders, listings, vendors, users, campuses cascade;

create table campuses (
  id   serial primary key,
  name text not null,
  city text not null,
  lat  double precision not null,
  lng  double precision not null
);

create table users (
  id               serial primary key,
  campus_id        int not null references campuses(id),
  name             text not null,
  email            text not null,
  password_hash    text not null,
  role             text not null check (role in ('buyer', 'recipient', 'donor', 'vendor', 'admin')),
  student_verified boolean not null default false,
  created_at       timestamptz not null default now()
);
create unique index users_email_uq on users (lower(email));

create table vendors (
  id          serial primary key,
  user_id     int not null unique references users(id),
  campus_id   int not null references campuses(id),
  name        text not null,
  description text not null,
  lat         double precision not null,
  lng         double precision not null,
  address     text not null,
  photo_url   text
);

create table listings (
  id           serial primary key,
  vendor_id    int not null references vendors(id),
  title        text not null,
  description  text not null,
  photo_url    text,
  base_price   int not null check (base_price > 0),
  qty_total    int not null check (qty_total > 0),
  qty_left     int not null,
  pickup_start timestamptz not null,
  pickup_end   timestamptz not null,
  status       text not null default 'active' check (status in ('active', 'closed')),
  created_at   timestamptz not null default now(),
  check (qty_left between 0 and qty_total),
  check (pickup_end > pickup_start)
);
create index listings_status_end_idx on listings (status, pickup_end);

-- price_each adalah rupiah yang diterima penjual per porsi: harga bayar untuk purchase, 50% harga dasar dari kolam untuk aid_claim.
create table orders (
  id           serial primary key,
  listing_id   int not null references listings(id),
  user_id      int not null references users(id),
  kind         text not null check (kind in ('purchase', 'aid_claim')),
  qty          int not null default 1 check (qty > 0),
  price_each   int not null check (price_each >= 0),
  funded_by    text not null check (funded_by in ('buyer', 'pool')),
  code         text not null unique,
  status       text not null check (status in ('reserved', 'picked_up', 'expired', 'cancelled')),
  claim_day    date,
  created_at   timestamptz not null default now(),
  picked_up_at timestamptz,
  check ((kind = 'purchase' and funded_by = 'buyer' and claim_day is null)
      or (kind = 'aid_claim' and funded_by = 'pool' and claim_day is not null and qty = 1)),
  check ((status = 'picked_up') = (picked_up_at is not null))
);
create index orders_listing_idx on orders (listing_id);
create index orders_user_idx on orders (user_id, created_at desc);
-- Satu klaim bantuan per mahasiswa per hari; klaim yang dibatalkan membebaskan hari itu.
create unique index orders_claim_per_day_uq on orders (user_id, claim_day)
  where kind = 'aid_claim' and status <> 'cancelled';

-- Saldo kolam = jumlah amount per kampus. Donasi positif, pembayaran bantuan negatif.
-- API publik tidak boleh menggabungkan order_id ke pengguna: buku besar tidak memuat penerima.
create table ledger (
  id         serial primary key,
  campus_id  int not null references campuses(id),
  kind       text not null check (kind in ('donation', 'aid_payout')),
  amount     int not null,
  order_id   int references orders(id),
  donor_id   int references users(id),
  anonymous  boolean not null default false,
  message    text,
  created_at timestamptz not null default now(),
  check ((kind = 'donation' and amount > 0 and order_id is null)
      or (kind = 'aid_payout' and amount < 0 and order_id is not null and donor_id is null))
);
create unique index ledger_payout_order_uq on ledger (order_id) where kind = 'aid_payout';
create index ledger_campus_time_idx on ledger (campus_id, created_at desc);
