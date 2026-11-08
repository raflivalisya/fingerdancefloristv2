'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase, formatCanvaEmbedUrl } from '@/lib/supabase';
import SmartImage from '@/components/SmartImage';

const blankProduct = { category: '', subcategory: '', name: '', price: '', description: '', image: '', is_active: true };
const blankCategory = { name: '', icon: '✿', description: '', sort_order: 1, is_active: true };
const blankHero = { hero_desktop_image: '', hero_mobile_image: '', hero_overlay_opacity: 0.28 };

export default function AdminPage() {
  const [session, setSession] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [tab, setTab] = useState('products');
  const [productForm, setProductForm] = useState(blankProduct);
  const [categoryForm, setCategoryForm] = useState(blankCategory);
  const [heroForm, setHeroForm] = useState(blankHero);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editingCategory, setEditingCategory] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('Semua kategori');

  async function loadData() {
    if (!supabase) return;
    const [c, p, h] = await Promise.all([supabase.from('florist_v2_categories').select('*').order('sort_order'), supabase.from('florist_v2_products').select('*').order('id', { ascending: false }), supabase.from('florist_v2_site_settings').select('*').eq('id', 1).maybeSingle()]);
    if (c.error || p.error) setMessage(`Gagal memuat data: ${c.error?.message || p.error?.message}`);
    if (h.error) setMessage(`Pengaturan wallpaper belum tersedia. Jalankan migrasi SQL V2 terbaru: ${h.error.message}`);
    setCategories(c.data || []); setProducts(p.data || []);
    if (h.data) setHeroForm({ ...blankHero, ...h.data });
  }
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => setSession(nextSession));
    return () => listener.subscription.unsubscribe();
  }, []);
  useEffect(() => { if (session) loadData(); }, [session]);

  async function login(e) {
    e.preventDefault(); setBusy(true); setMessage('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false); if (error) setMessage(error.message);
  }
  async function logout() { await supabase.auth.signOut(); setSession(null); }
  async function saveProduct(e) {
    e.preventDefault(); if (!supabase) return;
    if (!productForm.category) { setMessage('Pilih kategori produk terlebih dahulu.'); return; }
    setBusy(true); setMessage('');
    const payload = { ...productForm, price: productForm.price === '' ? null : Number(productForm.price), name: productForm.name || productForm.subcategory || 'Produk' };
    const result = editingProduct ? await supabase.from('florist_v2_products').update(payload).eq('id', editingProduct) : await supabase.from('florist_v2_products').insert(payload);
    setBusy(false);
    if (result.error) setMessage(`Gagal menyimpan produk: ${result.error.message}`);
    else { setMessage('Produk berhasil disimpan.'); setProductForm({ ...blankProduct, category: categories[0]?.name || '' }); setEditingProduct(null); loadData(); }
  }
  async function saveCategory(e) {
    e.preventDefault(); if (!supabase) return;
    setBusy(true); setMessage('');
    const payload = { ...categoryForm, sort_order: Number(categoryForm.sort_order) || 1 };
    const oldCategory = categories.find((item) => item.id === editingCategory);
    const result = editingCategory ? await supabase.from('florist_v2_categories').update(payload).eq('id', editingCategory) : await supabase.from('florist_v2_categories').insert(payload);
    if (!result.error && editingCategory && oldCategory && oldCategory.name !== payload.name) {
      const moveResult = await supabase.from('florist_v2_products').update({ category: payload.name }).eq('category', oldCategory.name);
      if (moveResult.error) setMessage(`Kategori berubah, tetapi produk lama belum berhasil dipindahkan: ${moveResult.error.message}`);
    }
    setBusy(false);
    if (result.error) setMessage(`Gagal menyimpan kategori: ${result.error.message}`);
    else { setMessage('Kategori berhasil disimpan.'); setCategoryForm(blankCategory); setEditingCategory(null); loadData(); }
  }
  async function saveHero(e) {
    e.preventDefault();
    if (!supabase) { setMessage('Supabase belum dikonfigurasi. Periksa environment variables Vercel.'); return; }

    const desktopUrl = String(heroForm.hero_desktop_image || '').trim();
    const mobileUrl = String(heroForm.hero_mobile_image || '').trim();
    if (!desktopUrl) { setMessage('Masukkan URL wallpaper desktop terlebih dahulu.'); return; }
    try {
      new URL(desktopUrl);
      if (mobileUrl) new URL(mobileUrl);
    } catch {
      setMessage('URL wallpaper tidak valid. Gunakan alamat lengkap yang diawali https://');
      return;
    }

    setBusy(true);
    setMessage('Memeriksa sesi admin dan menyimpan wallpaper…');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    try {
      // Pastikan sesi masih aktif sebelum menulis ke tabel yang dilindungi RLS.
      const { data: authData, error: authError } = await supabase.auth.getSession();
      if (authError) throw new Error(`Sesi admin tidak dapat diperiksa: ${authError.message}`);
      if (!authData?.session) throw new Error('Sesi login berakhir. Silakan logout lalu login kembali.');

      // Beri pesan yang jelas bila akun belum terdaftar di florist_admins.
      const { data: isAdmin, error: adminError } = await supabase.rpc('is_florist_admin').abortSignal(controller.signal);
      if (adminError) throw new Error(`Tidak dapat memverifikasi hak admin: ${adminError.message}. Pastikan fungsi is_florist_admin() tersedia.`);
      if (isAdmin !== true) throw new Error('Akun ini belum memiliki izin admin. Tambahkan UUID akun ke tabel florist_admins.');

      const payload = {
        id: 1,
        hero_desktop_image: desktopUrl,
        hero_mobile_image: mobileUrl || null,
        hero_overlay_opacity: Math.min(0.7, Math.max(0, Number(heroForm.hero_overlay_opacity) || 0)),
        updated_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from('florist_v2_site_settings')
        .upsert(payload, { onConflict: 'id' })
        .select('id, hero_desktop_image, hero_mobile_image, hero_overlay_opacity')
        .single()
        .abortSignal(controller.signal);
      if (error) {
        if (error.code === '42501' || /row-level security|permission denied/i.test(error.message || '')) {
          throw new Error('Ditolak oleh Row Level Security. Pastikan akun login terdaftar di florist_admins dan policy "Admins manage V2 site settings" sudah dijalankan.');
        }
        if (error.code === '42P01' || /does not exist/i.test(error.message || '')) {
          throw new Error('Tabel florist_v2_site_settings belum tersedia. Jalankan migrasi supabase/v2-catalog-migration.sql di Supabase SQL Editor.');
        }
        throw new Error(error.message || 'Supabase menolak penyimpanan wallpaper.');
      }
      if (!data) throw new Error('Supabase tidak mengembalikan data setelah penyimpanan. Periksa policy INSERT/UPDATE tabel wallpaper.');
      setHeroForm({ ...blankHero, ...data });
      setMessage('Wallpaper website berhasil disimpan. Muat ulang website V2 untuk melihat perubahan.');
    } catch (error) {
      const isTimeout = error?.name === 'AbortError';
      setMessage(isTimeout
        ? 'Penyimpanan melewati batas 15 detik dan dibatalkan. Periksa koneksi Supabase, URL project, dan status layanan lalu coba lagi.'
        : `Gagal menyimpan wallpaper: ${error?.message || 'Terjadi kesalahan yang tidak diketahui.'}`);
    } finally {
      clearTimeout(timeoutId);
      setBusy(false);
    }
  }
  async function deleteProduct(id) {
    if (!confirm('Hapus produk ini?')) return;
    const { error } = await supabase.from('florist_v2_products').delete().eq('id', id);
    setMessage(error ? error.message : 'Produk dihapus.'); loadData();
  }
  async function deleteCategory(cat) {
    const count = products.filter((p) => p.category === cat.name).length;
    if (count) { setMessage(`Kategori masih memiliki ${count} produk. Pindahkan atau hapus produknya terlebih dahulu.`); return; }
    if (!confirm(`Hapus kategori ${cat.name}?`)) return;
    const { error } = await supabase.from('florist_v2_categories').delete().eq('id', cat.id);
    setMessage(error ? error.message : 'Kategori dihapus.'); loadData();
  }
  const visibleProducts = useMemo(() => filter === 'Semua kategori' ? products : products.filter((p) => p.category === filter), [products, filter]);

  if (!supabase) return <div className="admin-page"><div className="admin-login"><h1>Fingerdance <i>Florist</i></h1><p>Supabase belum dikonfigurasi.</p><p>Isi <code>NEXT_PUBLIC_SUPABASE_URL</code> dan <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> pada file environment Vercel atau .env.local.</p><a href="/">← Kembali ke website</a></div></div>;
  if (!session) return <div className="admin-page"><form className="admin-login" onSubmit={login}><a className="back-link" href="/">← Lihat website</a><span className="eyebrow">FINGERDANCE FLORIST</span><h1>Admin <i>portal.</i></h1><p>Masuk untuk mengelola katalog dan tampilan toko.</p><label>Email admin<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="admin@email.com" /></label><label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password akun admin" /></label>{message && <div className="admin-message">{message}</div>}<button className="admin-submit" disabled={busy}>{busy ? 'Memproses…' : 'Masuk dashboard →'}</button><small>Gunakan akun yang dibuat melalui Supabase Authentication.</small></form></div>;

  return <main className="admin-page"><header className="admin-top"><div><a className="back-link" href="/">← Buka website</a><h1>Fingerdance <i>Florist</i></h1><p>Kelola katalog Finger Dance Florist V2.</p></div><button className="admin-logout" onClick={logout}>Logout ↗</button></header>
    <section className="admin-welcome">
      <div className="admin-welcome-copy">
        <span className="admin-welcome-tag">✧ &nbsp; FINGERDANCE FLORIST</span>
        <h2>Kelola toko bunga Anda<br/>dengan mudah dan cepat</h2>
        <p>Pantau koleksi, atur produk, dan kembangkan bisnis bunga Anda.</p>
        <a href="#admin-workspace">Mulai Kelola <span>→</span></a>
      </div>
      <div className="admin-welcome-art" aria-hidden="true">✿</div>
    </section>
    <div className="admin-stats"><div><span>Total produk</span><b>{products.length}</b></div><div><span>Kategori</span><b>{categories.length}</b></div><div><span>Produk aktif</span><b>{products.filter((p) => p.is_active !== false).length}</b></div></div>
    <div className="admin-tabs" id="admin-workspace"><button className={tab === 'products' ? 'on' : ''} onClick={() => setTab('products')}>Produk & Foto</button><button className={tab === 'categories' ? 'on' : ''} onClick={() => setTab('categories')}>Kategori</button><button className={tab === 'wallpaper' ? 'on' : ''} onClick={() => setTab('wallpaper')}>Hero Wallpaper</button><a className="admin-finance-link" href="/admin/finance">Keuangan Bersama ↗</a></div>
    {message && <div className="admin-message">{message}<button onClick={() => setMessage('')}>×</button></div>}
    {tab === 'products' ? <div className="admin-layout"><form className="admin-panel admin-form" onSubmit={saveProduct}><span className="eyebrow">CATALOG MANAGEMENT</span><h2>{editingProduct ? 'Edit produk' : 'Tambah produk'}</h2><label>Kategori<select value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} required><option value="">Pilih kategori</option>{categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}</select></label><label>Subkategori / jenis produk<input value={productForm.subcategory} onChange={(e) => setProductForm({ ...productForm, subcategory: e.target.value })} placeholder="Contoh: Rose Bouquet" /></label><label>Nama produk<input value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} placeholder="Contoh: Sweet Blush" required /></label><label>Harga (angka)<input type="number" min="0" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} placeholder="150000" /></label><label>Deskripsi<textarea rows="4" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} placeholder="Ceritakan detail produk…" /></label><label>Link gambar<input value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })} placeholder="Link Google Drive / direct image URL" /></label><div className="image-help"><b>Tips gambar</b><p>Google Drive: ubah akses file menjadi “Anyone with the link”. Canva: gunakan link hasil ekspor PNG/JPG yang dapat diakses publik. Link desain/editor Canva biasa belum tentu tampil.</p></div>{productForm.image && (formatCanvaEmbedUrl(productForm.image) ? <iframe className="admin-preview" src={formatCanvaEmbedUrl(productForm.image)} title="Preview Canva" /> : <SmartImage className="admin-preview" src={productForm.image} alt="Preview produk" loading="eager" />)}<label className="check-label"><input type="checkbox" checked={productForm.is_active} onChange={(e) => setProductForm({ ...productForm, is_active: e.target.checked })}/> Tampilkan di website</label><div className="form-actions"><button className="admin-submit" disabled={busy}>{busy ? 'Menyimpan…' : editingProduct ? 'Simpan perubahan' : 'Tambah produk +'}</button>{editingProduct && <button type="button" className="cancel-button" onClick={() => { setProductForm({ ...blankProduct, category: categories[0]?.name || '' }); setEditingProduct(null); }}>Batal</button>}</div></form>
      <section className="admin-panel"><div className="list-heading"><div><span className="eyebrow">YOUR COLLECTION</span><h2>Daftar produk <small>({visibleProducts.length})</small></h2></div><select value={filter} onChange={(e) => setFilter(e.target.value)}><option>Semua kategori</option>{categories.map((c) => <option key={c.id}>{c.name}</option>)}</select></div><div className="admin-product-list">{visibleProducts.map((p) => <article className="admin-product" key={p.id}><div className="admin-thumb">{p.image ? (formatCanvaEmbedUrl(p.image) ? <iframe src={formatCanvaEmbedUrl(p.image)} title={p.name || 'Canva preview'} /> : <SmartImage src={p.image} alt={p.name || "Foto produk"} />) : '✿'}</div><div className="admin-product-copy"><b>{p.name || p.subcategory}</b><span>{p.category} {p.subcategory ? `· ${p.subcategory}` : ''}</span><small>{p.price ? `Rp ${Number(p.price).toLocaleString('id-ID')}` : 'Harga belum diatur'} · {p.is_active === false ? 'Disembunyikan' : 'Tayang'}</small></div><div className="admin-row-actions"><button onClick={() => { setProductForm({ ...blankProduct, ...p, name: p.name || '', subcategory: p.subcategory || '', description: p.description || '', image: p.image || '', price: p.price ?? '' }); setEditingProduct(p.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>Edit</button><button className="delete" onClick={() => deleteProduct(p.id)}>Hapus</button></div></article>)}{!visibleProducts.length && <div className="empty-state">Belum ada produk. Tambahkan produk pertama melalui formulir.</div>}</div></section></div> : tab === 'categories' ? <div className="admin-layout category-layout"><form className="admin-panel admin-form" onSubmit={saveCategory}><span className="eyebrow">COLLECTION MANAGEMENT</span><h2>{editingCategory ? 'Edit kategori' : 'Tambah kategori'}</h2><label>Nama kategori<input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} placeholder="Contoh: Premium Bouquet" /></label><label>Ikon / emoji<input value={categoryForm.icon} onChange={(e) => setCategoryForm({ ...categoryForm, icon: e.target.value })} /></label><label>Deskripsi singkat<textarea rows="3" value={categoryForm.description} onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })} /></label><label>Urutan tampil<input type="number" min="1" value={categoryForm.sort_order} onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}/></label><label className="check-label"><input type="checkbox" checked={categoryForm.is_active} onChange={(e) => setCategoryForm({ ...categoryForm, is_active: e.target.checked })}/> Aktif di website</label><button className="admin-submit" disabled={busy}>{editingCategory ? 'Simpan kategori' : 'Tambah kategori +'}</button>{editingCategory && <button type="button" className="cancel-button" onClick={() => { setCategoryForm(blankCategory); setEditingCategory(null); }}>Batal</button>}</form><section className="admin-panel"><span className="eyebrow">PRODUCT GROUPS</span><h2>Kategori katalog</h2><div className="category-admin-list">{categories.map((c) => <article key={c.id}><span className="category-emoji">{c.icon || '✿'}</span><div><b>{c.name}</b><small>{products.filter((p) => p.category === c.name).length} produk · {c.is_active ? 'Aktif' : 'Nonaktif'}</small></div><div className="admin-row-actions"><button onClick={() => { setCategoryForm({ ...blankCategory, ...c }); setEditingCategory(c.id); }}>Edit</button><button className="delete" onClick={() => deleteCategory(c)}>Hapus</button></div></article>)}</div></section></div> : null}
    {tab === 'wallpaper' && <div className="admin-layout category-layout"><form className="admin-panel admin-form" onSubmit={saveHero}><span className="eyebrow">WEBSITE APPEARANCE</span><h2>Hero Wallpaper</h2><p>Atur foto layar penuh paling atas secara terpisah dari foto produk katalog.</p><label>URL wallpaper desktop<input type="url" required value={heroForm.hero_desktop_image} onChange={(e) => setHeroForm({ ...heroForm, hero_desktop_image: e.target.value })} placeholder="https://drive.google.com/file/d/..." /></label><label>URL wallpaper HP (opsional)<input type="url" value={heroForm.hero_mobile_image || ''} onChange={(e) => setHeroForm({ ...heroForm, hero_mobile_image: e.target.value })} placeholder="Kosongkan untuk memakai wallpaper desktop" /></label><label>Gelap overlay <b>{Math.round(Number(heroForm.hero_overlay_opacity) * 100)}%</b><input type="range" min="0" max="0.7" step="0.05" value={heroForm.hero_overlay_opacity} onChange={(e) => setHeroForm({ ...heroForm, hero_overlay_opacity: e.target.value })} /></label><div className="image-help"><b>Petunjuk gambar</b><p>Gunakan link gambar Google Drive dengan akses Anyone with the link. Wallpaper desktop dan HP dapat menggunakan foto berbeda. Jika URL HP dikosongkan, wallpaper desktop digunakan otomatis.</p></div><button className="admin-submit" disabled={busy}>{busy ? 'Menyimpan…' : 'Simpan wallpaper'}</button></form><section className="admin-panel"><span className="eyebrow">LIVE PREVIEW</span><h2>Preview wallpaper</h2>{heroForm.hero_desktop_image ? <SmartImage className="admin-preview" src={heroForm.hero_desktop_image} alt="Preview wallpaper desktop" loading="eager" /> : <div className="empty-state">Masukkan URL untuk melihat preview wallpaper.</div>}<small>Preview menggunakan gambar desktop. Untuk melihat hasil akhir, buka website V2 setelah menyimpan.</small></section></div>}
    <p className="admin-footnote">Perubahan disimpan langsung ke Supabase. Pastikan kebijakan Row Level Security database sudah diterapkan.</p>
  </main>;
}
