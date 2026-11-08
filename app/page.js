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

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#catalog" aria-label="Fingerdance Florist home">
          <span className="brand-mark">F<span>✳</span></span>
          <span className="brand-word">fingerdance<small>FLOWER STUDIO · BANDAR LAMPUNG</small></span>
        </a>
        <nav className="desktop-nav"><a href="#catalog">Shop flowers</a><a href="#footer">Find us</a></nav>
        <a className="header-order" href={waLink(null)} target="_blank" rel="noreferrer">Chat florist <span>↗</span></a>
      </header>

      <section className="catalog-section" id="catalog">
        <div className="catalog-topline"><span>02 / THE FLOWER SHOP</span><span>SCROLL, CHOOSE, SEND LOVE</span></div>
        <div className="catalog-title-row"><div><span className="section-kicker">FIND YOUR SOMETHING SPECIAL</span><h2>Shop the <em>feeling.</em></h2></div><p>Temukan hadiah yang paling<br/>pas untuk ceritamu.</p></div>
        <div className="shop-tools">
          <div className="category-tabs" role="tablist" aria-label="Kategori produk">
            {categories.map((cat, i) => <button role="tab" aria-selected={activeCategory === categoryName(cat)} key={cat.id || categoryName(cat)} className={activeCategory === categoryName(cat) ? 'category-tab active' : 'category-tab'} onClick={() => setActiveCategory(categoryName(cat))}><span>{cat.icon || ['💐','🌷','🎁'][i % 3]}</span><b>{categoryName(cat)}</b><small>0{i + 1}</small></button>)}
          </div>
          <label className="product-search"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari rangkaian bunga..." aria-label="Cari produk"/></label>
        </div>
        {active && <div className="category-description"><span>{active.icon || '✳'}</span><p>{active.description || `Pilihan spesial dari koleksi ${categoryName(active)} kami.`}</p></div>}
        {subcategories.length > 1 && <div className="sub-filter">{subcategories.map((sub) => <button key={sub} className={activeSubcategory === sub ? 'selected' : ''} onClick={() => setActiveSubcategory(sub)}>{sub}</button>)}</div>}
        <div className="catalog-result-line"><span>{activeCategory || 'OUR COLLECTION'}</span><span>{visibleProducts.length} ITEMS <i>↘</i></span></div>
        {loading ? <div className="empty-state">Menyiapkan koleksi bunga untukmu…</div> : loadError && !products.length ? <div className="empty-state">{loadError}<small>Produk dapat dikelola setelah konfigurasi Supabase selesai.</small></div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product, index) => <button className="product-card" key={product.id} onClick={() => setSelectedProduct(product)}><div className="product-photo">{product.image ? <ProductMedia src={product.image} alt={product.name || product.subcategory || 'Fingerdance Florist'} /> : <div className="photo-placeholder">✳</div>}<span className="product-count">0{index + 1}</span><span className="photo-view">QUICK VIEW ↗</span></div><div className="product-meta"><div><span>{product.subcategory || categoryName(active)}</span><h3>{product.name || product.subcategory || 'Flower arrangement'}</h3></div><b>{money(product.price)}</b></div></button>)}</div> : <div className="empty-state">Koleksi ini sedang disiapkan.<small>Coba kata kunci atau kategori lain, atau hubungi florist untuk request custom.</small><a href={waLink(null)} target="_blank" rel="noreferrer">Tanya melalui WhatsApp ↗</a></div>}
      </section>

      <section className="closing-banner"><div><span className="section-kicker">A LITTLE SOMETHING GOES A LONG WAY</span><h2>Make someone’s<br/><em>day bloom.</em></h2></div><a href={waLink(null)} target="_blank" rel="noreferrer">Mulai pesan <span>↗</span></a></section>
      <footer className="site-footer" id="footer"><div className="footer-main"><a className="brand" href="#catalog"><span className="brand-mark">F<span>✳</span></span><span className="brand-word">fingerdance<small>FLOWER STUDIO · BANDAR LAMPUNG</small></span></a><p>Merangkai keindahan,<br/>merayakan setiap cerita.</p><a className="footer-wa" href={waLink(null)} target="_blank" rel="noreferrer">LET'S TALK ↗</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FINGERDANCE FLORIST</span><span>MADE WITH LOVE, ALWAYS.</span><a href="/admin">ADMIN PORTAL ↗</a></div></footer>
      <nav className="mobile-dock" aria-label="Navigasi utama"><a href="#catalog"><span>✳</span><small>Shop</small></a><a href="#footer"><span>⌂</span><small>Info</small></a><a href={waLink(null)} target="_blank" rel="noreferrer"><span>♡</span><small>Chat</small></a></nav>

      {selectedProduct && <div className="modal-backdrop" onClick={() => setSelectedProduct(null)}><div className="product-modal" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setSelectedProduct(null)}>×</button>{selectedProduct.image && <div className="modal-media"><ProductMedia src={selectedProduct.image} alt={selectedProduct.name || 'Produk'} /></div>}<div className="modal-info"><span className="eyebrow">{selectedProduct.subcategory || selectedProduct.category}</span><h2>{selectedProduct.name || selectedProduct.subcategory}</h2><strong>{money(selectedProduct.price)}</strong><p>{selectedProduct.description || 'Rangkaian spesial yang dibuat dengan penuh perhatian. Hubungi kami untuk detail dan pilihan custom.'}</p><a className="hero-button" href={waLink(selectedProduct)} target="_blank" rel="noreferrer">Order via WhatsApp ↗</a></div></div></div>}
    </main>
  );
}
