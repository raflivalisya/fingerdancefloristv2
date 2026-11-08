import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;

// Google Drive: accepts /file/d/ID/view and ?id=ID share links.
// Canva: use a publicly accessible direct image/export URL, not an editor URL.
export function formatImageUrl(input) {
  if (!input) return '';
  const url = String(input).trim();
  const driveId = url.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?.*id=)([a-zA-Z0-9_-]+)/)?.[1]
    || url.match(/[?&]id=([a-zA-Z0-9_-]+)/)?.[1];
  if (driveId) return `https://drive.google.com/uc?export=view&id=${driveId}`;
  return url;
}

export function formatCanvaEmbedUrl(input) {
  try {
    const parsed = new URL(String(input));
    if (!/canva\.com$/i.test(parsed.hostname) && !parsed.hostname.endsWith('.canva.com')) return '';
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts[0] !== 'design' || !parts[1]) return '';
    return `https://www.canva.com/design/${parts[1]}/view?embed`;
  } catch { return ''; }
}
