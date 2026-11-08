# Finger Dance Florist V2

Website katalog kedua yang menggunakan project Next.js terpisah, tetapi terhubung ke Supabase yang sama dengan website V1.

## Pemisahan data

- Katalog V1 tetap menggunakan `florist_categories` dan `products`.
- Katalog V2 menggunakan `florist_v2_categories` dan `florist_v2_products`.
- Foto produk V2 disimpan sebagai URL pada `florist_v2_products.image`; tidak mengambil atau mengubah foto V1.
- Keuangan tetap bersama melalui `florist_orders` dan `florist_order_items`.
- Pesanan yang dibuat dari admin V2 otomatis menggunakan `source_website = 'Finger Dance Florist V2'`.
- Baris detail produk V2 menyimpan `product_id = NULL` dan menyimpan nama serta harga produk sebagai snapshot. Ini disengaja karena `product_id` pada tabel keuangan mengarah ke tabel produk V1.
- Admin memakai Supabase Auth dan allowlist `florist_admins` yang sama.

## Persiapan Supabase

1. Buka Supabase project yang sama dengan website V1.
2. Buka SQL Editor.
3. Jalankan file `supabase/v2-catalog-migration.sql`.
4. Pastikan schema dan finance module V1 yang membuat `is_florist_admin()`, `florist_orders`, `florist_order_items`, serta `florist_admins` sudah diterapkan.
5. Tidak perlu membuat akun admin baru jika akun admin V1 sudah terdaftar pada `florist_admins`.

## Environment variables

Buat `.env.local` berdasarkan `.env.example`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=SUPABASE_ANON_KEY
NEXT_PUBLIC_WHATSAPP_NUMBER=628xxxxxxxxxx
```

Gunakan URL dan anon/publishable key dari Supabase project V1 yang sama. Jangan pernah memasukkan `service_role` key ke variabel `NEXT_PUBLIC_` atau ke kode browser.

## Menjalankan lokal

```bash
npm install
npm run dev
```

## Deploy Vercel

1. Buat repository GitHub baru untuk website V2 agar tidak menimpa repository V1.
2. Import repository baru tersebut ke Vercel.
3. Isi environment variables yang sama seperti `.env.local` pada Vercel.
4. Deploy.
5. Buka `/admin`, masuk menggunakan akun admin Supabase yang sudah terdaftar pada `florist_admins`.
6. Tambahkan kategori dan produk V2. Katalog V2 tidak otomatis menyalin katalog V1.

## Catatan

Modul laporan saat ini merupakan rekap transaksi/pesanan dari tabel bersama. SQL yang diberikan belum menyediakan tabel buku kas/pengeluaran operasional, sehingga aplikasi ini tidak menyebut omzet sebagai laba bersih dan tidak menambahkan modul pengeluaran fiktif.

## Perbaikan paket V2 (8 November 2026)

- Quick View kini memakai state `selectedProduct`; dialog menampilkan foto, nama, kategori, deskripsi, harga, dan tombol pemesanan WhatsApp.
- Dialog dapat ditutup melalui tombol X, klik area luar dialog, atau tombol Escape.
- Referensi `{modal}` yang tidak terdefinisi sudah dihapus.
- Filter pencarian tersembunyi dihapus agar pengalaman katalog sesuai konsep tanpa search bar.
- Komponen gambar tetap menormalisasi tautan berbagi Google Drive melalui `SmartImage`.

Paket ini belum dinyatakan lolos `next build`: pemasangan dependensi pada lingkungan pemeriksaan mengalami timeout, sehingga perintah build tidak dapat menemukan executable `next`. Jalankan `npm ci` lalu `npm run build` di lingkungan lokal atau pipeline Vercel sebelum deployment.


## Pengaturan Hero Wallpaper (V2)

Menu Admin → **Hero Wallpaper** mengelola gambar layar penuh secara independen dari foto produk. Isi URL wallpaper desktop; URL wallpaper HP bersifat opsional dan akan memakai gambar desktop jika kosong. Admin juga dapat mengatur intensitas overlay.

Sebelum deploy versi ini, jalankan ulang file `supabase/v2-catalog-migration.sql` pada Supabase SQL Editor. Migrasi menambahkan tabel `florist_v2_site_settings` saja dan tidak mengubah tabel katalog V1 maupun transaksi bersama. Gunakan URL Google Drive publik dengan akses **Anyone with the link**.

### Troubleshooting: tombol wallpaper terus "Menyimpan..."

Versi terbaru memastikan status tombol selalu dipulihkan melalui `finally`, membatasi request tulis hingga 15 detik, memeriksa sesi Supabase serta fungsi `is_florist_admin()`, dan menampilkan pesan yang membedakan masalah izin RLS, akun admin, tabel yang belum dimigrasikan, dan timeout koneksi. Jika muncul pesan izin admin, pastikan UUID pengguna Auth yang sedang login sudah tercatat pada `public.florist_admins`. Jalankan ulang bagian migrasi V2 untuk menerapkan grant dan policy tabel `florist_v2_site_settings`.

### Navigasi kategori dan subkategori
Tombol kategori utama berada di area wallpaper. Tombol subkategori akan muncul tepat di bawahnya berdasarkan nilai `subcategory` pada produk di kategori aktif. Memilih tombol akan memfilter katalog; tombol `SEMUA` menampilkan seluruh produk kategori aktif. Caption nama/jenis produk di bawah gambar disembunyikan agar foto tampil tanpa label, sementara tombol foto tetap membuka Quick View.
