This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## Redesign November 2026
- Homepage and admin now share a pastel rose design system.
- Homepage catalog uses a compact ecommerce-style product grid and mobile layout.
- Admin includes a welcome banner, summary cards, and vertical desktop navigation.
- Supabase authentication, product/category CRUD, and WhatsApp ordering logic are preserved.


## Modul Invoice dan Laporan Keuangan

1. Buka Supabase Dashboard → SQL Editor.
2. Jalankan seluruh isi `supabase/finance-module.sql` satu kali.
3. Deploy ulang project Next.js.
4. Login ke `/admin`, lalu pilih menu `Invoice & Laporan`.
5. Gunakan `Transaksi baru` untuk mencatat pesanan yang diterima melalui WhatsApp atau kanal lain.

Modul menyediakan nomor invoice otomatis, rincian item, biaya pengiriman, diskon, pencatatan DP/pelunasan, status pesanan, cetak invoice melalui Print / Save as PDF, filter transaksi, rekap omzet bulanan, dan ekspor CSV yang dapat dibuka di Excel.

**Catatan integrasi:** versi project ini menggunakan pemesanan melalui WhatsApp dan belum menyimpan checkout website ke database. Karena itu pesanan WhatsApp perlu dicatat melalui menu `Transaksi baru`. Agar order dari dua website masuk otomatis, alur pemesanan/checkout kedua website harus diintegrasikan ke tabel `florist_orders` dan `florist_order_items`.
