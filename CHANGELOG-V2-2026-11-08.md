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
