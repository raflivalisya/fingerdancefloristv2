# Change log — Finger Dance Florist V2

## Hero wallpaper management
- Added a dedicated `Hero Wallpaper` tab in the authenticated admin dashboard.
- Desktop wallpaper can be managed independently from catalog product photos.
- Optional mobile-specific wallpaper; mobile falls back to desktop when blank.
- Admin can tune the dark overlay opacity.
- Added `florist_v2_site_settings` migration with public read and florist-admin write policies.
- Homepage reads the settings row and falls back to the first active product image if no hero wallpaper is configured.
- No V1 catalog, invoice, or shared transaction tables are modified.

## Deployment note
Run `supabase/v2-catalog-migration.sql` in Supabase SQL Editor before deploying this version.

## Hero wallpaper save reliability

- Save handler now validates desktop/mobile URLs, checks the active Supabase session and `is_florist_admin()` authorization before writing.
- Adds a 15-second abort timeout for the admin check and wallpaper upsert, actionable error messages for RLS/missing-table failures, and `try/catch/finally` so the save button always leaves its busy state.
- Wallpaper migration explicitly grants public read and authenticated insert/update table privileges; RLS remains the authorization boundary.

## 2026-11-08 – Navigasi subkategori di hero
- Tombol kategori utama kini memilih kategori aktif tanpa anchor link.
- Tombol subkategori dinamis ditampilkan tepat di bawah tombol kategori pada area wallpaper.
- Katalog menampilkan produk sesuai kategori dan subkategori terpilih.
- Caption nama/subjenis produk di bawah foto dihilangkan; foto produk tetap dapat dibuka melalui Quick View.
- Tidak ada perubahan skema database atau tabel website V1.

## Hero wallpaper loading polish
- Load only the wallpaper matching the current viewport (mobile or desktop), instead of mounting both responsive wallpaper images at once.
- Add a high-priority image preload for the selected non-Canva wallpaper and eager image loading.
- Keep hero navigation/content hidden until the selected wallpaper has loaded; show a neutral floral gradient placeholder during loading and reveal content with a subtle opacity transition.
- Respect reduced-motion preferences and reveal the hero fallback if the image cannot be loaded.
- No database schema or V1 catalog changes.


## 2026-11-08 — Fix katalog kosong pada iOS/semua perangkat
- Normalisasi nama kategori dan subkategori (trim, spasi, dan huruf besar/kecil) saat filter katalog.
- Mendukung pencocokan berdasarkan `category_id` bila kolom tersebut tersedia pada record.
- Filter `Semua` tidak lagi bergantung pada kecocokan string kosong.
- Pesan katalog kosong dibuat lebih jelas agar admin dapat membedakan produk belum tersedia dari jenis produk yang kosong.
