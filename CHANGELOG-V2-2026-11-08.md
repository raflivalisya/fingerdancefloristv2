# Changelog — Finger Dance Florist V2

## Perbaikan Quick View
- Mengganti referensi JSX `{modal}` yang tidak didefinisikan dengan dialog produk berbasis `selectedProduct`.
- Dialog menampilkan gambar produk (termasuk URL Google Drive melalui `SmartImage`), nama, kategori/subkategori, harga, dan deskripsi.
- Tombol pemesanan membuka WhatsApp dengan nama produk dan harga.
- Dialog mendukung tutup melalui tombol, klik backdrop, dan tombol Escape.

## Penyesuaian katalog
- Menghapus filter pencarian yang state-nya tidak memiliki kontrol UI; tidak menambahkan search bar/header.
- Memastikan wallpaper memilih foto dari produk aktif.
- Mempertahankan navigasi kategori di atas wallpaper dan daftar foto full-width.

## Database
- Tidak mengubah skema, tabel, policy, atau data Supabase V1.
- Katalog tetap menggunakan `florist_v2_categories` dan `florist_v2_products`.
- Keuangan tetap menggunakan tabel bersama `florist_orders` dan `florist_order_items`.

## Status pengujian
- Pemeriksaan sintaks JS/JSX melalui TypeScript transpile: lolos untuk halaman katalog, admin, keuangan, dan komponen gambar.
- `npm ci`: timeout pada lingkungan pemeriksaan.
- `npm run build`: belum dapat dijalankan karena dependensi Next.js tidak terpasang (`next: not found`).
- Jangan anggap build/deployment sudah berhasil sebelum `npm ci` dan `npm run build` lolos di lokal atau Vercel.
