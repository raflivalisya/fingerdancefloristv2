'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, formatCanvaEmbedUrl } from '@/lib/supabase';
import SmartImage from '@/components/SmartImage';

const DEFAULT_CATEGORIES = [
  { name: 'Bouquet', icon: '💐', description: 'Rangkaian bunga untuk setiap momen' },
  { name: 'Flower Box', icon: '🌷', description: 'Hadiah bunga dalam box yang elegan' },
  { name: 'Special Gifts', icon: '🎁', description: 'Hadiah spesial yang dibuat dengan cinta' },
];
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';
const money = (value) => value ? `Rp ${Number(value).toLocaleString('id-ID')}` : 'Hubungi kami';

function ProductMedia({ src, alt }) {
  const embed = formatCanvaEmbedUrl(src);
  return embed ? <iframe src={embed} title={alt} loading="lazy" allow="fullscreen" /> : <SmartImage src={src} alt={alt} loading="lazy" />;
}

export default function Home() {
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [products, setProducts] = useState([]);
  const [heroSettings, setHeroSettings] = useState(null);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    async function loadCatalog() {
      if (!supabase) { setLoading(false); setLoadError('Hubungkan Supabase untuk menampilkan katalog.'); return; }
      const [catResult, productResult, heroResult] = await Promise.all([
        supabase.from('florist_v2_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('florist_v2_products').select('*').order('id', { ascending: false }),
        supabase.from('florist_v2_site_settings').select('hero_desktop_image, hero_mobile_image, hero_overlay_opacity').eq('id', 1).maybeSingle(),
      ]);
      if (catResult.data?.length) setCategories(catResult.data);
      if (productResult.error) setLoadError('Katalog belum dapat dimuat. Periksa konfigurasi database.');
      else setProducts((productResult.data || []).filter((p) => p.is_active !== false));
      if (heroResult.data) setHeroSettings(heroResult.data);
      setLoading(false);
    }
    loadCatalog();
  }, []);

  const categoryName = (category) => typeof category === 'string' ? category : category?.name;
  const active = categories.find((c) => categoryName(c) === activeCategory) || categories[0];
  const categoryProducts = useMemo(() => products.filter((p) => p.category === activeCategory), [products, activeCategory]);
  const subcategories = useMemo(() => ['Semua', ...new Set(categoryProducts.map((p) => p.subcategory).filter(Boolean))], [categoryProducts]);
  const visibleProducts = categoryProducts.filter((p) => activeSubcategory === 'Semua' || p.subcategory === activeSubcategory);

  useEffect(() => { if (categories.length && !activeCategory) setActiveCategory(categoryName(categories[0])); }, [categories, activeCategory]);
  useEffect(() => { setActiveSubcategory('Semua'); }, [activeCategory]);

  useEffect(() => {
    if (!selectedProduct) return undefined;
    const handleKeyDown = (event) => { if (event.key === 'Escape') setSelectedProduct(null); };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedProduct]);

  const waLink = (product) => {
    const message = encodeURIComponent(`Halo Fingerdance Florist, saya ingin memesan ${product?.name || product?.subcategory || 'produk'}${product?.price != null ? ` dengan harga ${money(product.price)}` : ''}. Mohon informasi ketersediaan dan cara pemesanannya.`);
    return WA_NUMBER ? `https://wa.me/${WA_NUMBER.replace(/\D/g, '')}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const heroProduct = products.find((p) => p.is_active !== false && p.image) || null;
  const desktopWallpaper = heroSettings?.hero_desktop_image || heroProduct?.image || '';
  const mobileWallpaper = heroSettings?.hero_mobile_image || desktopWallpaper;

  return (
    <main className="site-shell v2-wallpaper-shop">
      <section className="wallpaper-hero" aria-label="Finger Dance Florist">
        {desktopWallpaper ? <div className="wallpaper-hero-image">
          <div className="wallpaper-hero-desktop"><ProductMedia src={desktopWallpaper} alt="Finger Dance Florist wallpaper" /></div>
          <div className="wallpaper-hero-mobile"><ProductMedia src={mobileWallpaper} alt="Finger Dance Florist wallpaper mobile" /></div>
        </div> : <div className="wallpaper-hero-placeholder">Fingerdance Florist</div>}
        <div className="wallpaper-hero-shade" style={heroSettings?.hero_overlay_opacity != null ? { background: `rgba(12,17,14,${Number(heroSettings.hero_overlay_opacity)})` } : undefined} />
        <div className="wallpaper-hero-content">
          <div className="wallpaper-brand">FINGER DANCE <span>FLORIST</span></div>
          <nav className="wallpaper-category-nav" aria-label="Pilih kategori">
            {categories.map((cat, i) => <a key={cat.id || categoryName(cat)} href={`#category-${i}`} className="wallpaper-category-button"><span>{cat.icon || ['💐','🌷','🎁'][i % 3]}</span>{categoryName(cat)}</a>)}
          </nav>
          <a className="wallpaper-chat-button" href={waLink(null)} target="_blank" rel="noreferrer">CHAT FLORIST ↗</a>
          <div className="wallpaper-scroll">SCROLL TO EXPLORE ↓</div>
        </div>
      </section>

      <div className="wallpaper-catalog">
        {loading ? <div className="empty-state">Menyiapkan koleksi bunga untukmu…</div> : loadError && !products.length ? <div className="empty-state">{loadError}<small>Produk dapat dikelola setelah konfigurasi Supabase selesai.</small></div> : categories.map((cat, i) => {
          const name = categoryName(cat);
          const items = products.filter((product) => product.category === name);
          return (
            <section className="wallpaper-category-section" id={`category-${i}`} key={cat.id || name}>
              <div className="wallpaper-category-heading">
                <span>{cat.icon || '✿'} &nbsp; COLLECTION 0{i + 1}</span>
                <h2>{name}</h2>
                <p>{cat.description || `Koleksi spesial ${name} dari Fingerdance Florist.`}</p>
              </div>
              {items.length ? <div className="wallpaper-product-list">
                {items.map((product, index) => (
                  <button className="wallpaper-product" key={product.id} onClick={() => setSelectedProduct(product)}>
                    <div className="wallpaper-product-image">{product.image ? <ProductMedia src={product.image} alt={product.name || name} /> : <div className="photo-placeholder">✿</div>}<span className="wallpaper-product-number">0{index + 1}</span><span className="wallpaper-product-quick">QUICK VIEW ↗</span></div>
                    <div className="wallpaper-product-caption"><div><small>{product.subcategory || name}</small><h3>{product.name || product.subcategory || name}</h3></div><b>{money(product.price)}</b></div>
                  </button>
                ))}
              </div> : <div className="wallpaper-empty">Koleksi {name} akan segera hadir.</div>}
            </section>
          );
        })}
      </div>

      <footer className="wallpaper-footer"><span>FINGERDANCE FLORIST · BANDAR LAMPUNG</span><a href={waLink(null)} target="_blank" rel="noreferrer">ORDER VIA WHATSAPP ↗</a><a href="/admin">ADMIN ↗</a></footer>
      {selectedProduct && (
        <div className="v2-product-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedProduct(null); }}>
          <section className="v2-product-modal" role="dialog" aria-modal="true" aria-labelledby="v2-product-modal-title">
            <button type="button" className="v2-product-modal-close" onClick={() => setSelectedProduct(null)} aria-label="Tutup detail produk">×</button>
            <div className="v2-product-modal-media">
              {selectedProduct.image ? <ProductMedia src={selectedProduct.image} alt={selectedProduct.name || selectedProduct.subcategory || 'Foto produk'} /> : <div className="photo-placeholder">✿</div>}
            </div>
            <div className="v2-product-modal-info">
              <span className="v2-product-modal-kicker">{selectedProduct.subcategory || selectedProduct.category || 'FINGERDANCE COLLECTION'}</span>
              <h2 id="v2-product-modal-title">{selectedProduct.name || selectedProduct.subcategory || 'Produk Finger Dance Florist'}</h2>
              <strong>{money(selectedProduct.price)}</strong>
              {selectedProduct.description && <p>{selectedProduct.description}</p>}
              <a className="v2-product-modal-order" href={waLink(selectedProduct)} target="_blank" rel="noreferrer">PESAN VIA WHATSAPP ↗</a>
            </div>
          </section>
        </div>
      )}
    </main>
  );

}
