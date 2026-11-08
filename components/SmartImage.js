'use client';

import { useMemo, useState } from 'react';
import { getImageCandidates } from '@/lib/supabase';

export default function SmartImage({ src, alt = '', className, loading = 'lazy', fetchPriority, onLoad, onError }) {
  const candidates = useMemo(() => getImageCandidates(src), [src]);
  const [candidateIndex, setCandidateIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  if (!candidates.length || failed) {
    return <div className={`${className || ''} image-load-fallback`} role="img" aria-label={alt || 'Gambar tidak tersedia'}>✿<small>Foto tidak dapat dimuat</small></div>;
  }

  return (
    <img
      className={className}
      src={candidates[candidateIndex]}
      alt={alt}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding={loading === 'eager' ? 'sync' : 'async'}
      referrerPolicy="no-referrer"
      onLoad={onLoad}
      onError={(event) => {
        if (candidateIndex + 1 < candidates.length) setCandidateIndex((index) => index + 1);
        else {
          setFailed(true);
          onError?.(event);
        }
      }}
    />
  );
}
