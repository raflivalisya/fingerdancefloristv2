import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
export const supabase = url && key ? createClient(url, key) : null;

// Accept Google Drive share links and normalize them to embeddable image URLs.
export function getGoogleDriveFileId(input) {
  if (!input) return '';
  const value = String(input).trim();
  const patterns = [
    /drive\.google\.com\/file\/d\/([\w-]+)/i,
    /drive\.google\.com\/uc\?(?:[^#]*&)?id=([\w-]+)/i,
    /drive\.google\.com\/thumbnail\?(?:[^#]*&)?id=([\w-]+)/i,
    /drive\.google\.com\/open\?(?:[^#]*&)?id=([\w-]+)/i,
    /[?&]id=([\w-]+)/i,
    /lh3\.googleusercontent\.com\/d\/([\w-]+)/i,
  ];
  for (const pattern of patterns) {
    const match = value.match(pattern);
    if (match?.[1]) return match[1];
  }
  return '';
}

export function getImageCandidates(input) {
  if (!input) return [];
  const value = String(input).trim();
  const driveId = getGoogleDriveFileId(value);
  if (driveId) {
    // thumbnail endpoint is generally more reliable for embedding than uc?export=view.
    return [
      `https://drive.google.com/thumbnail?id=${driveId}&sz=w2000`,
      `https://lh3.googleusercontent.com/d/${driveId}=w2000`,
      `https://drive.google.com/uc?export=view&id=${driveId}`,
    ];
  }
  return [value];
}

export function formatImageUrl(input) {
  return getImageCandidates(input)[0] || '';
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
