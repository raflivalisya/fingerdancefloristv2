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
