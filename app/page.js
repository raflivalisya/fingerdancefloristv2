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
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState('Semua');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function loadCatalog() {
      if (!supabase) { setLoading(false); setLoadError('Hubungkan Supabase untuk menampilkan katalog.'); return; }
      const [catResult, productResult] = await Promise.all([
        supabase.from('florist_v2_categories').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('florist_v2_products').select('*').order('id', { ascending: false }),
      ]);
      if (catResult.data?.length) setCategories(catResult.data);
      if (productResult.error) setLoadError('Katalog belum dapat dimuat. Periksa konfigurasi database.');
      else setProducts((productResult.data || []).filter((p) => p.is_active !== false));
      setLoading(false);
    }
    loadCatalog();
  }, []);

  const categoryName = (category) => typeof category === 'string' ? category : category?.name;
  const active = categories.find((c) => categoryName(c) === activeCategory) || categories[0];
  const categoryProducts = useMemo(() => products.filter((p) => p.category === activeCategory), [products, activeCategory]);
  const subcategories = useMemo(() => ['Semua', ...new Set(categoryProducts.map((p) => p.subcategory).filter(Boolean))], [categoryProducts]);
  const visibleProducts = categoryProducts.filter((p) =>
    (activeSubcategory === 'Semua' || p.subcategory === activeSubcategory) &&
    `${p.name || ''} ${p.subcategory || ''}`.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => { if (categories.length && !activeCategory) setActiveCategory(categoryName(categories[0])); }, [categories, activeCategory]);
  useEffect(() => { setActiveSubcategory('Semua'); }, [activeCategory]);

  const waLink = (product) => {
    const message = encodeURIComponent(`Halo Fingerdance Florist, saya tertarik dengan ${product?.name || product?.subcategory || 'produk'}${product?.price ? ` (${money(product.price)})` : ''}. Bisa minta informasi dan cara pemesanannya?`);
    return WA_NUMBER ? `https://wa.me/${WA_NUMBER.replace(/\D/g, '')}?text=${message}` : `https://wa.me/?text=${message}`;
  };

  const heroProduct = products.find((p) => p.image) || null;

  return (
    <main className="site-shell v2-wallpaper-shop">
      <section className="wallpaper-hero" aria-label="Finger Dance Florist">
        {heroProduct?.image ? <div className="wallpaper-hero-image"><ProductMedia src={heroProduct.image} alt="Finger Dance Florist collection" /></div> : <div className="wallpaper-hero-placeholder">Fingerdance Florist</div>}
        <div className="wallpaper-hero-shade" />
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
                {items.filter((product) => `${product.name || ''} ${product.subcategory || ''}`.toLowerCase().includes(search.toLowerCase())).map((product, index) => (
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
      {modal}
    </main>
  );

}
