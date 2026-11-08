'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const money = (value) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0));
const dateLabel = (value) => value ? new Date(`${String(value).slice(0,10)}T00:00:00`).toLocaleDateString('id-ID', { day:'2-digit', month:'long', year:'numeric' }) : '-';
const today = () => new Date().toISOString().slice(0,10);
const blankItem = () => ({ product_id:'', product_name:'', quantity:1, unit_price:0 });

export default function FinanceAdminPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [tab, setTab] = useState('overview');
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [editId, setEditId] = useState(null);
  const [filterMonth, setFilterMonth] = useState(today().slice(0,7));
  const [filterSource, setFilterSource] = useState('Semua website');
  const [filterPayment, setFilterPayment] = useState('Semua status');
  const [form, setForm] = useState({ customer_name:'', customer_phone:'', customer_address:'', source_website:'Finger Dance Florist V2', order_date:today(), payment_status:'Belum dibayar', order_status:'Menunggu', delivery_fee:'0', discount:'0', amount_paid:'0', notes:'' });
  const [items, setItems] = useState([blankItem()]);

  useEffect(() => {
    if (!supabase) { setLoading(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session || !supabase) return;
    loadAll();
  }, [session]);

  async function loadAll() {
    setLoading(true);
    const [o,p] = await Promise.all([
      supabase.from('florist_orders').select('*, florist_order_items(*)').order('created_at',{ascending:false}),
      supabase.from('florist_v2_products').select('id,name,subcategory,price,is_active').order('name')
    ]);
    if (o.error) setMessage(`Gagal memuat transaksi: ${o.error.message}`);
    if (p.error) setMessage(`Gagal memuat produk: ${p.error.message}`);
    setOrders(o.data || []); setProducts((p.data || []).filter(x => x.is_active !== false)); setLoading(false);
  }

  async function createOrder(e) {
    e.preventDefault();
    if (!form.customer_name.trim()) return setMessage('Nama pelanggan wajib diisi.');
    const validItems = items.filter(x => x.product_name.trim() && Number(x.quantity) > 0);
    if (!validItems.length) return setMessage('Tambahkan minimal satu produk ke transaksi.');
    setBusy(true); setMessage('');
    const subtotal = validItems.reduce((sum,x) => sum + Number(x.quantity) * Number(x.unit_price),0);
    const delivery = Number(form.delivery_fee || 0), discount = Number(form.discount || 0);
    const total = Math.max(0, subtotal + delivery - discount);
    const amountPaid = form.payment_status === 'Lunas' ? total : Math.min(total, Math.max(0, Number(form.amount_paid || 0)));
    const payload = { ...form, amount_paid:amountPaid, customer_name:form.customer_name.trim(), customer_phone:form.customer_phone.trim(), customer_address:form.customer_address.trim(), delivery_fee:delivery, discount, subtotal, total, payment_status:form.payment_status, order_status:form.order_status };
    const { data: order, error } = await supabase.from('florist_orders').insert(payload).select('*').single();
    if (error) { setBusy(false); setMessage(`Transaksi gagal disimpan: ${error.message}`); return; }
    const itemRows = validItems.map(x => ({ order_id:order.id, product_id:x.product_id || null, product_name:x.product_name, quantity:Number(x.quantity), unit_price:Number(x.unit_price), line_total:Number(x.quantity)*Number(x.unit_price) }));
    const result = await supabase.from('florist_order_items').insert(itemRows);
    if (result.error) {
      await supabase.from('florist_orders').delete().eq('id',order.id);
      setBusy(false); setMessage(`Detail produk gagal disimpan. Transaksi dibatalkan: ${result.error.message}`); return;
    }
    setBusy(false); setForm({ customer_name:'', customer_phone:'', customer_address:'', source_website:'Finger Dance Florist V2', order_date:today(), payment_status:'Belum dibayar', order_status:'Menunggu', delivery_fee:'0', discount:'0', amount_paid:'0', notes:'' }); setItems([blankItem()]);
    setMessage(`Transaksi ${order.invoice_number} berhasil dibuat.`); setSelected({ ...order, florist_order_items:itemRows }); setTab('invoices'); await loadAll();
  }


  function startEdit(order) {
    setEditId(order.id);
    setForm({
      customer_name:order.customer_name || '', customer_phone:order.customer_phone || '',
      customer_address:order.customer_address || '', source_website:order.source_website || 'Finger Dance Florist V2',
      order_date:String(order.order_date || today()).slice(0,10), payment_status:order.payment_status || 'Belum dibayar',
      order_status:order.order_status || 'Menunggu', delivery_fee:String(order.delivery_fee || 0),
      discount:String(order.discount || 0), amount_paid:String(order.amount_paid || 0), notes:order.notes || ''
    });
    const existingItems = (order.florist_order_items || []).map(x => ({ product_id:x.product_id ? String(x.product_id) : '', product_name:x.product_name || '', quantity:x.quantity || 1, unit_price:x.unit_price || 0 }));
    setItems(existingItems.length ? existingItems : [blankItem()]);
    setTab('edit'); setMessage('');
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editId) return;
    if (!form.customer_name.trim()) return setMessage('Nama pelanggan wajib diisi.');
    const validItems = items.filter(x => x.product_name.trim() && Number(x.quantity) > 0);
    if (!validItems.length) return setMessage('Tambahkan minimal satu produk ke transaksi.');
    setBusy(true); setMessage('');
    const subtotal = validItems.reduce((sum,x) => sum + Number(x.quantity) * Number(x.unit_price),0);
    const delivery = Math.max(0,Number(form.delivery_fee || 0));
    const discount = Math.max(0,Number(form.discount || 0));
    const total = Math.max(0,subtotal + delivery - discount);
    const amountPaid = form.payment_status === 'Lunas' ? total : Math.min(total,Math.max(0,Number(form.amount_paid || 0)));
    const payload = {
      customer_name:form.customer_name.trim(), customer_phone:form.customer_phone.trim(),
      customer_address:form.customer_address.trim(), source_website:form.source_website,
      order_date:form.order_date, subtotal, delivery_fee:delivery, discount, total,
      amount_paid:amountPaid, payment_status:form.payment_status, order_status:form.order_status, notes:form.notes
    };
    const { error:updateError } = await supabase.from('florist_orders').update(payload).eq('id',editId);
    if (updateError) { setBusy(false); setMessage(`Gagal memperbarui transaksi: ${updateError.message}`); return; }
    const { error:deleteItemsError } = await supabase.from('florist_order_items').delete().eq('order_id',editId);
    if (deleteItemsError) { setBusy(false); setMessage(`Data utama tersimpan, tetapi detail produk lama gagal diganti: ${deleteItemsError.message}. Periksa transaksi sebelum melanjutkan.`); await loadAll(); return; }
    const itemRows = validItems.map(x => ({ order_id:editId, product_id:x.product_id || null, product_name:x.product_name.trim(), quantity:Number(x.quantity), unit_price:Number(x.unit_price), line_total:Number(x.quantity)*Number(x.unit_price) }));
    const { error:insertItemsError } = await supabase.from('florist_order_items').insert(itemRows);
    if (insertItemsError) { setBusy(false); setMessage(`Data transaksi tersimpan, tetapi detail produk gagal disimpan: ${insertItemsError.message}. Silakan edit kembali untuk memperbaikinya.`); await loadAll(); return; }
    setBusy(false); setEditId(null); setMessage('Transaksi dan invoice berhasil diperbarui. Nomor invoice tetap sama.');
    await loadAll();
    const { data:refreshed } = await supabase.from('florist_orders').select('*, florist_order_items(*)').eq('id',editId).single();
    setSelected(refreshed || null); setTab('invoices');
  }

  async function updateOrder(id, updates) {
    if (updates.payment_status === 'Lunas' && selected) updates = { ...updates, amount_paid:Number(selected.total || 0) };
    if (updates.amount_paid !== undefined && selected) updates = { ...updates, amount_paid:Math.min(Number(selected.total || 0), Math.max(0, Number(updates.amount_paid || 0))) };
    const { error } = await supabase.from('florist_orders').update(updates).eq('id',id);
    if (error) setMessage(`Gagal memperbarui transaksi: ${error.message}`);
    else { setMessage('Status transaksi diperbarui.'); await loadAll(); if (selected?.id === id) setSelected({...selected,...updates}); }
  }

  async function deleteOrder(order) {
    if (!confirm(`Hapus transaksi ${order.invoice_number}? Tindakan ini tidak dapat dibatalkan.`)) return;
    const { error } = await supabase.from('florist_orders').delete().eq('id',order.id);
    if (error) setMessage(`Gagal menghapus transaksi: ${error.message}`);
    else { setSelected(null); setMessage('Transaksi dihapus.'); await loadAll(); }
  }

  const monthOrders = useMemo(() => orders.filter(o => String(o.order_date).slice(0,7) === filterMonth), [orders,filterMonth]);
  const filteredOrders = useMemo(() => monthOrders.filter(o => (filterSource === 'Semua website' || o.source_website === filterSource) && (filterPayment === 'Semua status' || o.payment_status === filterPayment)), [monthOrders,filterSource,filterPayment]);
  const paidOrders = monthOrders.filter(o => o.payment_status === 'Lunas');
  const paidRevenue = paidOrders.reduce((s,o) => s + Number(o.total || 0),0);
  const monthTotal = monthOrders.reduce((s,o) => s + Number(o.total || 0),0);
  const pendingAmount = monthOrders.filter(o => o.payment_status !== 'Dibatalkan').reduce((s,o) => s + Math.max(0, Number(o.total || 0) - Number(o.amount_paid || 0)),0);
  const monthlyTrend = useMemo(() => Array.from({length:6},(_,i) => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - (5-i)); const key = d.toISOString().slice(0,7);
    const rows = orders.filter(o => String(o.order_date).slice(0,7) === key && o.payment_status === 'Lunas');
    return { key, label:d.toLocaleDateString('id-ID',{month:'short'}), revenue:rows.reduce((s,o)=>s+Number(o.total||0),0), count:rows.length };
  }),[orders]);
  const maxRevenue = Math.max(1,...monthlyTrend.map(x=>x.revenue));

  function exportCSV() {
    const rows = [['No Invoice','Tanggal','Pelanggan','Telepon','Sumber','Subtotal','Ongkir','Diskon','Total','Pembayaran','Status Pesanan'], ...filteredOrders.map(o => [o.invoice_number,o.order_date,o.customer_name,o.customer_phone,o.source_website,o.subtotal,o.delivery_fee,o.discount,o.total,o.payment_status,o.order_status])];
    const csv = '\uFEFF' + rows.map(row => row.map(v => `"${String(v ?? '').replaceAll('"','""')}"`).join(';')).join('\r\n');
    const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'}); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href=url; a.download=`rekap-transaksi-${filterMonth}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function printInvoice(order) { setSelected(order); setTimeout(()=>window.print(),100); }

  if (!supabase) return <main className="admin-page"><section className="admin-login"><h1>Finance <i>Admin</i></h1><p>Supabase belum dikonfigurasi. Periksa environment variables.</p><a href="/admin">Kembali ke admin</a></section></main>;
  if (loading && !session) return <main className="admin-page"><div className="finance-loading">Memeriksa sesi admin…</div></main>;
  if (!session) return <main className="admin-page"><section className="admin-login"><h1>Login <i>Admin</i></h1><p>Silakan masuk melalui halaman admin utama.</p><button className="admin-submit" onClick={()=>router.push('/admin')}>Ke halaman login admin</button></section></main>;

  return <main className="admin-page finance-page">
    <header className="admin-top"><div><a className="back-link" href="/admin">← Kembali ke dashboard</a><h1>Fingerdance <i>Finance</i></h1><p>Invoice, transaksi, dan laporan bisnis dalam satu tempat.</p></div><button className="admin-logout" onClick={async()=>{await supabase.auth.signOut();router.push('/admin');}}>Logout ↗</button></header>
    <section className="finance-heading"><div><span className="eyebrow">FINANCE & BUSINESS REPORT</span><h2>Ringkasan keuangan</h2><p>Kelola transaksi dari website dan siapkan invoice pelanggan.</p></div><button className="finance-primary" onClick={()=>setTab('create')}>＋ Buat transaksi</button></section>
    <nav className="finance-nav"><button className={tab==='overview'?'active':''} onClick={()=>setTab('overview')}>Ringkasan</button><button className={tab==='create'?'active':''} onClick={()=>setTab('create')}>＋ Transaksi baru</button><button className={tab==='invoices'?'active':''} onClick={()=>setTab('invoices')}>Invoice & faktur</button><button className={tab==='reports'?'active':''} onClick={()=>setTab('reports')}>Laporan bulanan</button></nav>
    {message && <div className="finance-message">{message}<button onClick={()=>setMessage('')}>×</button></div>}

    {tab==='overview' && <>
      <div className="finance-filter-row"><label>Periode laporan<input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/></label><button className="finance-outline" onClick={loadAll}>↻ Perbarui data</button></div>
      <div className="finance-kpis"><article><span>Omzet lunas</span><b>{money(paidRevenue)}</b><small>Transaksi berstatus lunas</small></article><article><span>Total transaksi</span><b>{monthOrders.length}</b><small>Pesanan pada periode ini</small></article><article><span>Belum tertagih</span><b>{money(pendingAmount)}</b><small>Belum lunas / menunggu pembayaran</small></article><article><span>Nilai seluruh pesanan</span><b>{money(monthTotal)}</b><small>Termasuk transaksi belum lunas</small></article></div>
      <div className="finance-grid"><section className="finance-card"><div className="finance-card-head"><div><span className="eyebrow">RECENT ACTIVITY</span><h3>Transaksi terbaru</h3></div><button className="finance-text-button" onClick={()=>setTab('invoices')}>Lihat semua →</button></div>{monthOrders.slice(0,6).map(o=><button className="finance-order-row" key={o.id} onClick={()=>{setSelected(o);setTab('invoices');}}><span className="finance-order-icon">▤</span><span className="finance-order-main"><b>{o.customer_name}</b><small>{o.invoice_number} · {dateLabel(o.order_date)}</small></span><span className="finance-order-end"><b>{money(o.total)}</b><small className={`status status-${o.payment_status==='Lunas'?'paid':o.payment_status==='Dibatalkan'?'cancel':'pending'}`}>{o.payment_status}</small></span></button>)}{!monthOrders.length&&<div className="finance-empty">Belum ada transaksi pada periode ini. Buat transaksi pertama untuk mulai mencatat penjualan.</div>}</section>
      <section className="finance-card"><div className="finance-card-head"><div><span className="eyebrow">REVENUE OVERVIEW</span><h3>Omzet 6 bulan</h3></div></div><div className="finance-bars">{monthlyTrend.map(m=><div className="finance-bar-col" key={m.key}><div className="finance-bar-value">{m.revenue ? (m.revenue>=1000000?`${(m.revenue/1000000).toFixed(1)}jt`:`${Math.round(m.revenue/1000)}rb`) : '–'}</div><div className="finance-bar-track"><div className="finance-bar" style={{height:`${Math.max(m.revenue?4:0,(m.revenue/maxRevenue)*100)}%`}}/></div><small>{m.label}</small></div>)}</div><p className="finance-chart-note">Grafik menghitung transaksi yang sudah berstatus lunas.</p></section></div>
    </>}

    {(tab==='create' || tab==='edit') && <section className="finance-card finance-create"><div className="finance-card-head"><div><span className="eyebrow">NEW SALES RECORD</span><h3>{editId ? 'Edit transaksi & invoice' : 'Buat transaksi & invoice'}</h3><p>{editId ? 'Perbaiki informasi pelanggan, produk, harga, dan pembayaran. Nomor invoice tidak berubah.' : 'Catat pesanan yang diterima melalui WhatsApp atau kanal penjualan lainnya.'}</p></div></div><form onSubmit={editId ? saveEdit : createOrder} className="finance-form">
      <div className="finance-form-section"><h4>Informasi pelanggan</h4><div className="finance-form-grid"><label>Nama pelanggan *<input required value={form.customer_name} onChange={e=>setForm({...form,customer_name:e.target.value})} placeholder="Nama lengkap"/></label><label>Nomor WhatsApp<input value={form.customer_phone} onChange={e=>setForm({...form,customer_phone:e.target.value})} placeholder="08xxxxxxxxxx"/></label><label className="span-two">Alamat / detail pengiriman<textarea rows="2" value={form.customer_address} onChange={e=>setForm({...form,customer_address:e.target.value})} placeholder="Alamat penerima atau catatan pengiriman"/></label><label>Sumber pesanan<select value={form.source_website} onChange={e=>setForm({...form,source_website:e.target.value})}><option>Fingerdance Florist</option><option>Finger Dance Florist V2</option><option>WhatsApp / Offline</option></select></label><label>Tanggal transaksi<input type="date" value={form.order_date} onChange={e=>setForm({...form,order_date:e.target.value})}/></label></div></div>
      <div className="finance-form-section"><div className="finance-section-title"><h4>Rincian produk</h4><button type="button" className="finance-outline" onClick={()=>setItems([...items,blankItem()])}>＋ Tambah produk</button></div>{items.map((item,i)=><div className="finance-item-row" key={i}><label className="item-product">Produk<select value={item.product_id} onChange={e=>{const p=products.find(x=>String(x.id)===e.target.value);setItems(items.map((x,j)=>j===i?{...x,product_id:'',product_name:p?.name||p?.subcategory||'',unit_price:Number(p?.price||0)}:x));}}><option value="">Pilih produk tersimpan</option>{products.map(p=><option key={p.id} value={p.id}>{p.name||p.subcategory}</option>)}</select><input value={item.product_name} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,product_name:e.target.value}:x))} placeholder="Atau ketik nama produk/custom"/></label><label>Qty<input type="number" min="1" value={item.quantity} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,quantity:e.target.value}:x))}/></label><label>Harga satuan<input type="number" min="0" value={item.unit_price} onChange={e=>setItems(items.map((x,j)=>j===i?{...x,unit_price:e.target.value}:x))}/></label><div className="finance-item-total"><small>Jumlah</small><b>{money(Number(item.quantity||0)*Number(item.unit_price||0))}</b></div>{items.length>1&&<button type="button" className="finance-remove" onClick={()=>setItems(items.filter((_,j)=>j!==i))}>×</button>}</div>)}</div>
      <div className="finance-form-section"><h4>Pembayaran & status</h4><div className="finance-form-grid"><label>Biaya pengiriman<input type="number" min="0" value={form.delivery_fee} onChange={e=>setForm({...form,delivery_fee:e.target.value})}/></label><label>Diskon<input type="number" min="0" value={form.discount} onChange={e=>setForm({...form,discount:e.target.value})}/></label><label>Status pembayaran<select value={form.payment_status} onChange={e=>setForm({...form,payment_status:e.target.value,amount_paid:e.target.value==='Lunas'?'0':form.amount_paid})}><option>Belum dibayar</option><option>DP</option><option>Lunas</option><option>Dibatalkan</option></select></label><label>Nominal sudah dibayar (DP)<input type="number" min="0" value={form.payment_status==='Lunas'?'':form.amount_paid} disabled={form.payment_status==='Lunas'} onChange={e=>setForm({...form,amount_paid:e.target.value})} placeholder="0"/></label><label>Status pesanan<select value={form.order_status} onChange={e=>setForm({...form,order_status:e.target.value})}><option>Menunggu</option><option>Diproses</option><option>Siap dikirim</option><option>Selesai</option><option>Dibatalkan</option></select></label><label className="span-two">Catatan pada invoice<textarea rows="2" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Catatan tambahan (opsional)"/></label></div></div>
      <div className="finance-create-footer"><div><small>Estimasi total transaksi</small><b>{money(items.reduce((s,x)=>s+Number(x.quantity||0)*Number(x.unit_price||0),0)+Number(form.delivery_fee||0)-Number(form.discount||0))}</b></div>{editId && <button type="button" className="finance-outline" onClick={()=>{setEditId(null);setTab('invoices');}}>Batal</button>}<button className="finance-primary" disabled={busy}>{busy?'Menyimpan…':(editId?'Simpan perubahan transaksi':'Simpan transaksi & buat invoice')}</button></div>
    </form></section>}

    {tab==='invoices' && <div className="finance-invoice-layout"><section className="finance-card"><div className="finance-card-head"><div><span className="eyebrow">INVOICE REGISTER</span><h3>Daftar invoice & transaksi</h3></div><button className="finance-outline" onClick={()=>setTab('create')}>＋ Buat baru</button></div><div className="finance-filter-grid"><label>Bulan<input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/></label><label>Sumber<select value={filterSource} onChange={e=>setFilterSource(e.target.value)}><option>Semua website</option><option>Fingerdance Florist</option><option>Finger Dance Florist V2</option><option>WhatsApp / Offline</option></select></label><label>Pembayaran<select value={filterPayment} onChange={e=>setFilterPayment(e.target.value)}><option>Semua status</option><option>Belum dibayar</option><option>DP</option><option>Lunas</option><option>Dibatalkan</option></select></label></div><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>Invoice</th><th>Pelanggan</th><th>Tanggal</th><th>Total</th><th>Status</th><th></th></tr></thead><tbody>{filteredOrders.map(o=><tr key={o.id} className={selected?.id===o.id?'selected':''}><td><b>{o.invoice_number}</b><small>{o.source_website}</small></td><td>{o.customer_name}<small>{o.customer_phone||'No. telepon belum diisi'}</small></td><td>{dateLabel(o.order_date)}</td><td><b>{money(o.total)}</b></td><td><span className={`status status-${o.payment_status==='Lunas'?'paid':o.payment_status==='Dibatalkan'?'cancel':'pending'}`}>{o.payment_status}</span></td><td><div className="finance-row-actions"><button className="finance-text-button" onClick={()=>setSelected(o)}>Detail</button><button className="finance-text-button" onClick={()=>startEdit(o)}>Edit</button><button className="finance-text-button finance-delete-link" onClick={()=>deleteOrder(o)}>Hapus</button></div></td></tr>)}</tbody></table>{!filteredOrders.length&&<div className="finance-empty">Tidak ada transaksi yang sesuai filter.</div>}</div></section>
      {selected&&<section className="finance-card invoice-preview" id="invoice-print"><div className="invoice-preview-actions"><span className="eyebrow">INVOICE PREVIEW</span><div><button className="finance-outline" onClick={()=>printInvoice(selected)}>Cetak / Simpan PDF</button><button className="finance-text-button" onClick={()=>startEdit(selected)}>Edit transaksi</button><button className="finance-text-button" onClick={()=>setSelected(null)}>Tutup</button></div></div><div className="invoice-paper"><div className="invoice-paper-head"><div><b>FINGERDANCE <i>FLORIST</i></b><small>FLOWER STUDIO · BANDAR LAMPUNG</small></div><strong>INVOICE</strong></div><div className="invoice-paper-meta"><div><small>NO. INVOICE</small><b>{selected.invoice_number}</b></div><div><small>TANGGAL</small><b>{dateLabel(selected.order_date)}</b></div></div><div className="invoice-billto"><small>DITAGIHKAN KEPADA</small><b>{selected.customer_name}</b><span>{selected.customer_phone||'-'}</span><span>{selected.customer_address||'-'}</span></div><table className="invoice-lines"><thead><tr><th>Produk</th><th>Qty</th><th>Harga</th><th>Jumlah</th></tr></thead><tbody>{(selected.florist_order_items||[]).map((it,i)=><tr key={it.id||i}><td>{it.product_name}</td><td>{it.quantity}</td><td>{money(it.unit_price)}</td><td>{money(it.line_total)}</td></tr>)}</tbody></table><div className="invoice-calcs"><div><span>Subtotal</span><b>{money(selected.subtotal)}</b></div><div><span>Pengiriman</span><b>{money(selected.delivery_fee)}</b></div><div><span>Diskon</span><b>− {money(selected.discount)}</b></div><div><span>Sudah dibayar</span><b>{money(selected.amount_paid)}</b></div><div className="invoice-grand"><span>TOTAL</span><b>{money(selected.total)}</b></div></div><div className="invoice-payment"><span>Status pembayaran</span><b>{selected.payment_status} · Sisa {money(Math.max(0,Number(selected.total||0)-Number(selected.amount_paid||0)))}</b></div>{selected.notes&&<p className="invoice-note">Catatan: {selected.notes}</p>}<div className="invoice-thanks">Terima kasih telah berbelanja di Fingerdance Florist.</div></div><div className="invoice-admin-actions"><label>Nominal dibayar<input type="number" min="0" max={selected.total} value={selected.amount_paid || 0} onChange={e=>setSelected({...selected,amount_paid:e.target.value})}/></label><button className="finance-outline" onClick={()=>updateOrder(selected.id,{amount_paid:Number(selected.amount_paid||0)})}>Simpan pembayaran</button><label>Status pembayaran<select value={selected.payment_status} onChange={e=>updateOrder(selected.id,{payment_status:e.target.value})}><option>Belum dibayar</option><option>DP</option><option>Lunas</option><option>Dibatalkan</option></select></label><label>Status pesanan<select value={selected.order_status} onChange={e=>updateOrder(selected.id,{order_status:e.target.value})}><option>Menunggu</option><option>Diproses</option><option>Siap dikirim</option><option>Selesai</option><option>Dibatalkan</option></select></label><button className="finance-danger" onClick={()=>deleteOrder(selected)}>Hapus transaksi</button></div></section>}
    </div>}

    {tab==='reports' && <section className="finance-card"><div className="finance-card-head"><div><span className="eyebrow">MONTHLY BUSINESS REPORT</span><h3>Laporan transaksi bulanan</h3><p>Ringkasan penjualan berdasarkan tanggal transaksi dan status pembayaran.</p></div><button className="finance-primary" onClick={exportCSV}>↓ Ekspor Excel / CSV</button></div><div className="finance-filter-row"><label>Pilih bulan<input type="month" value={filterMonth} onChange={e=>setFilterMonth(e.target.value)}/></label><button className="finance-outline" onClick={()=>window.print()}>Cetak laporan / PDF</button></div><div className="report-summary"><article><small>Omzet terealisasi</small><b>{money(paidRevenue)}</b><span>Hanya transaksi lunas</span></article><article><small>Total nilai pesanan</small><b>{money(monthTotal)}</b><span>Semua status pesanan</span></article><article><small>Belum tertagih</small><b>{money(pendingAmount)}</b><span>Belum lunas / DP</span></article><article><small>Jumlah transaksi</small><b>{monthOrders.length}</b><span>Pesanan tercatat</span></article></div><div className="finance-table-wrap"><table className="finance-table"><thead><tr><th>No. Invoice</th><th>Tanggal</th><th>Pelanggan</th><th>Sumber</th><th>Total</th><th>Pembayaran</th></tr></thead><tbody>{monthOrders.map(o=><tr key={o.id}><td><b>{o.invoice_number}</b></td><td>{dateLabel(o.order_date)}</td><td>{o.customer_name}</td><td>{o.source_website}</td><td><b>{money(o.total)}</b></td><td>{o.payment_status}</td></tr>)}</tbody></table>{!monthOrders.length&&<div className="finance-empty">Belum ada data untuk bulan ini.</div>}</div><p className="finance-footnote">Catatan: omzet terealisasi hanya menghitung transaksi berstatus “Lunas”. Status DP belum dihitung sebagai omzet lunas penuh pada ringkasan ini.</p></section>}
    <p className="finance-footnote finance-bottom-note">Data transaksi disimpan pada Supabase yang sama dengan katalog produk. Pesanan WhatsApp yang belum masuk ke sistem perlu dicatat melalui menu “Transaksi baru”.</p>
  </main>;
}
