import { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react'
import { createClient } from '@supabase/supabase-js'

const sb = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://x.invalid', import.meta.env.VITE_SUPABASE_ANON_KEY || 'x')
const bn = n => Math.round(+n || 0).toLocaleString('bn-BD')
const money = n => '৳' + bn(n)
const today = () => new Date().toLocaleDateString('en-CA')
const sum = (a, f) => a.reduce((t, x) => t + f(x), 0)
const one = x => Array.isArray(x) ? x[0] : x
const toast = (m, bad) => window.dispatchEvent(new CustomEvent('toast', { detail: { m, bad } }))
const Ctx = createContext()
const profit = s => (s.price - s.cost) * s.qty
const ROLE = { super: 'সুপার অ্যাডমিন', admin: 'অ্যাডমিন', pending: 'অপেক্ষায়', off: 'বন্ধ' }

async function copy(t) { try { await navigator.clipboard.writeText(t); return true } catch { return false } }
function Num({ v, pre = '' }) {
  const [x, setX] = useState(0)
  useEffect(() => { let f; const s = performance.now(), a = x; const t = ms => { const p = Math.min(1, (ms - s) / 600); setX(a + (v - a) * (1 - Math.pow(1 - p, 3))); if (p < 1) f = requestAnimationFrame(t) }; f = requestAnimationFrame(t); return () => cancelAnimationFrame(f) }, [v])
  return pre + bn(x)
}
const Stat = ({ l, v, c }) => <div className="stat" style={{ '--c': c }}><span>{l}</span><b><Num v={v} pre="৳" /></b></div>

/* ---------- data layer ---------- */
function useData(me) {
  const [d, setD] = useState(null), su = me.role === 'super'
  const load = useCallback(async () => {
    const q = await Promise.all([
      sb.from('products').select('*,product_costs(buy)').order('name'),
      sb.from('sales').select(su ? '*,sale_costs(cost)' : '*').order('created_at', { ascending: false }).limit(10000),
      sb.from('payments').select('*').order('created_at', { ascending: false }),
      sb.from('expenses').select('*').order('created_at', { ascending: false }),
      su ? sb.from('profiles').select('*').order('name') : Promise.resolve({ data: [] })])
    const e = q.find(r => r.error); if (e) return toast(e.error.message, 1)
    const [p, s, pa, ex, u] = q.map(r => r.data)
    setD({ products: p.map(x => ({ ...x, buy: one(x.product_costs)?.buy ?? 0 })), sales: s.map(x => ({ ...x, cost: one(x.sale_costs)?.cost ?? 0 })), pays: pa, exps: ex, users: u })
  }, [su])
  useEffect(() => {
    load(); let t
    const ch = sb.channel('live').on('postgres_changes', { event: '*', schema: 'public' }, () => { clearTimeout(t); t = setTimeout(load, 400) }).subscribe()
    return () => { clearTimeout(t); sb.removeChannel(ch) }
  }, [load])
  return [d, load]
}
async function run(p, ok, done) { const { error } = await p; if (error) return toast(error.message, 1); ok && toast(ok); done && done() }

/* ---------- small ui ---------- */
function Ask({ a, close }) {
  const [f, setF] = useState(() => Object.fromEntries(a.fields.map(x => [x.k, x.def ?? ''])))
  return <div className="modal" onClick={close}><div onClick={e => e.stopPropagation()}>
    <h2 style={{ margin: 0, color: 'var(--p2)' }}>{a.title}</h2>
    {a.fields.map(x => <label key={x.k}>{x.label}<input autoFocus={x === a.fields[0]} type="number" inputMode="decimal" value={f[x.k]} onChange={e => setF({ ...f, [x.k]: e.target.value })} /></label>)}
    <div className="row"><button className="btn g" onClick={close}>বাতিল</button><button className="btn" onClick={() => { a.ok(f); close() }}>ঠিক আছে</button></div></div></div>
}
function Chart({ b }) {
  const W = b.length * 44 + 20, H = 180, mx = Math.max(...b.map(x => x.s), 1), mn = Math.min(...b.map(x => x.n), 0), r = mx - mn || 1
  const y = q => 10 + (mx - q) / r * (H - 36), z = y(0)
  return <div style={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
    {b.map((x, i) => {
      const X = 10 + i * 44, ny = Math.min(y(x.n), z); return <g key={x.k}>
        <rect className="bar" style={{ transformOrigin: '50% 100%', animationDelay: i * 40 + 'ms' }} x={X} y={y(x.s)} width="18" height={z - y(x.s)} rx="4" fill="#5eead4" />
        <rect className="bar" style={{ transformOrigin: x.n < 0 ? '50% 0' : '50% 100%', animationDelay: i * 40 + 60 + 'ms' }} x={X + 19} y={ny} width="18" height={Math.abs(y(x.n) - z)} rx="4" fill={x.n < 0 ? '#ef4444' : '#0f766e'} />
        <text x={X + 18} y={H - 8} fontSize="11" textAnchor="middle" fill="#64748b">{x.l}</text></g>
    })}
    <line x1="0" x2={W} y1={z} y2={z} stroke="#94a3b8" strokeOpacity=".4" /></svg></div>
}

/* ---------- auth ---------- */
function Login() {
  const [m, setM] = useState('in'), [f, setF] = useState({ name: '', email: '', pw: '' }), [busy, setBusy] = useState(false)
  const go = async () => {
    setBusy(true)
    const r = m === 'in' ? await sb.auth.signInWithPassword({ email: f.email, password: f.pw }) : await sb.auth.signUp({ email: f.email, password: f.pw, options: { data: { name: f.name } } })
    setBusy(false); if (r.error) toast(r.error.message, 1); else if (m === 'up' && !r.data.session) toast('ইমেইল ভেরিফাই করে লগইন করো')
  }
  const s = k => e => setF({ ...f, [k]: e.target.value })
  return <div className="wrap view"><div className="top"><div><h1>AR Enterprise</h1><small>দোকানের পুরা হিসাব</small></div></div>
    <div className="card"><h2>{m === 'in' ? 'লগইন' : 'নতুন অ্যাকাউন্ট'}</h2>
      {m === 'up' && <label>নাম<input value={f.name} onChange={s('name')} /></label>}
      <label>ইমেইল<input type="email" value={f.email} onChange={s('email')} /></label>
      <label>পাসওয়ার্ড (৬+)<input type="password" value={f.pw} onChange={s('pw')} /></label>
      <button className="btn" disabled={busy} onClick={go}>{busy ? '...' : m === 'in' ? 'লগইন' : 'অ্যাকাউন্ট খোলো'}</button>
      <button className="btn g" onClick={() => setM(m === 'in' ? 'up' : 'in')}>{m === 'in' ? 'নতুন অ্যাকাউন্ট' : 'লগইনে ফিরো'}</button>
      {m === 'up' && <p className="sm">প্রথম অ্যাকাউন্ট সুপার অ্যাডমিন হয়। বাকিরা সুপার অ্যাডমিনের অনুমতির পরে ঢুকতে পারবে।</p>}</div></div>
}

/* ---------- views ---------- */
function Dash({ d, me }) {
  const t = today(), S = d.sales.filter(s => s.day === t), su = me.role === 'super'
  const ex = sum(d.exps.filter(x => x.day === t), x => x.amt), p = sum(S, profit)
  const cashIn = sum(S, s => s.paid) + sum(d.pays.filter(x => x.day === t), x => x.amt)
  const due = sum(Object.values(custs(d)), x => Math.max(0, x)), low = d.products.filter(x => x.stock <= 5)
  return <div className="card view"><h2>আজকের হিসাব</h2><p className="sm">{new Date().toLocaleDateString('bn-BD', { dateStyle: 'full' })} • {bn(S.length)}টি বিক্রি</p>
    <div className="grid"><Stat l="আজকের বিক্রি" v={sum(S, s => s.total)} /><Stat l="আজ ক্যাশ পেলাম" v={cashIn} c="#3b82f6" /><Stat l="মোট বাকি (পাবো)" v={due} c="#dc2626" /><Stat l="আজকের খরচ" v={ex} c="#f59e0b" />
      {su && <><Stat l="আজকের লাভ" v={p} c="#15803d" /><Stat l="আজকের নেট লাভ" v={p - ex} c="#15803d" /><Stat l="মালের দাম (কেনা)" v={sum(d.products, x => x.stock * x.buy)} c="#64748b" /><Stat l="মোট বিক্রি (সব)" v={sum(d.sales, s => s.total)} c="#64748b" /></>}</div>
    {low.length > 0 && <p className="neg">⚠️ স্টক কম: {low.map(x => `${x.name} (${bn(x.stock)})`).join(', ')}</p>}</div>
}
function custs(d) { const m = {}; d.sales.forEach(s => { if (s.cust) m[s.cust] = (m[s.cust] || 0) + s.total - s.paid }); d.pays.forEach(p => m[p.cust] = (m[p.cust] || 0) - p.amt); return m }

function Sales({ d, me }) {
  const { refresh } = useContext(Ctx), su = me.role === 'super'
  const [f, setF] = useState({ pid: '', qty: '', price: '', cust: '', paid: '' }), [busy, setBusy] = useState(false)
  const pid = f.pid || d.products[0]?.id, p = d.products.find(x => x.id === pid)
  useEffect(() => { if (p) setF(o => ({ ...o, price: p.sell })) }, [pid])
  const total = (+f.qty || 0) * (+f.price || 0)
  const save = async () => {
    const q = +f.qty, pr = +f.price, paid = f.paid === '' ? total : +f.paid
    if (!p || !(q > 0) || !(pr > 0)) return toast('মাল, পরিমাণ আর দাম দাও', 1)
    if (q > p.stock) return toast('স্টকে আছে মাত্র ' + p.stock, 1)
    if (paid > total) return toast('দেওয়া টাকা মোটের বেশি', 1)
    if (paid < total && !f.cust.trim()) return toast('বাকি হলে কাস্টমারের নাম দাও', 1)
    setBusy(true)
    await run(sb.from('sales').insert({ day: today(), by_name: me.name, product_id: p.id, pname: p.name, qty: q, price: pr, total, paid, cust: f.cust.trim() }), 'বিক্রি সেভ হইছে ✅', () => { setF({ ...f, qty: '', cust: '', paid: '' }); refresh() })
    setBusy(false)
  }
  const S = d.sales.filter(s => s.day === today())
  return <div className="view"><div className="card"><h2>🛒 নতুন বিক্রি</h2>
    <label>মাল<select value={pid || ''} onChange={e => setF({ ...f, pid: e.target.value })}>{d.products.map(x => <option key={x.id} value={x.id}>{x.name} (স্টক {bn(x.stock)})</option>)}</select></label>
    <div className="row"><label>পরিমাণ<input type="number" inputMode="decimal" value={f.qty} onChange={e => setF({ ...f, qty: e.target.value })} /></label><label>দাম (প্রতি পিস)<input type="number" inputMode="decimal" value={f.price} onChange={e => setF({ ...f, price: e.target.value })} /></label></div>
    <label>কাস্টমার (খালি = নগদ)<input list="cl" value={f.cust} onChange={e => setF({ ...f, cust: e.target.value })} /></label><datalist id="cl">{Object.keys(custs(d)).map(c => <option key={c} value={c} />)}</datalist>
    <label>টাকা দিছে (খালি = পুরা)<input type="number" inputMode="decimal" value={f.paid} onChange={e => setF({ ...f, paid: e.target.value })} /></label>
    <p style={{ textAlign: 'center', fontWeight: 700 }}>মোট: <Num v={total} pre="৳" /></p>
    <button className="btn" disabled={busy || !p} onClick={save}>{busy ? 'সেভ হচ্ছে...' : 'বিক্রি সেভ করো'}</button></div>
    <div className="card"><h2>আজকের বিক্রি ({bn(S.length)}টি)</h2>{S.map((s, i) => <div className="li" key={s.id} style={{ animationDelay: i * 30 + 'ms' }}><span><b>{s.pname}</b> {bn(s.qty)} × {bn(s.price)} = <b>{bn(s.total)}</b><br /><span className="sm">{s.cust || 'নগদ'} • দিছে {bn(s.paid)} • {s.by_name}{su && <> • লাভ <span className="pos">{bn(profit(s))}</span></>}</span></span>
      {su && <button className="mini r" onClick={() => confirm('বিক্রি মুছবো? স্টক ফেরত যাবে') && run(sb.from('sales').delete().eq('id', s.id), 'মুছেছে', refresh)}>🗑️</button>}</div>)}{!S.length && <p className="sm">আজ এখনো বিক্রি নাই</p>}</div></div>
}

function Products({ d, me, ask }) {
  const { refresh } = useContext(Ctx), su = me.role === 'super', [f, setF] = useState({ name: '', stock: '', buy: '', sell: '' })
  const restock = x => ask({
    title: x.name + ' - স্টক যোগ', fields: [{ k: 'q', label: 'পরিমাণ' }, ...(su ? [{ k: 'b', label: 'কেনা দাম (প্রতি পিস)', def: x.buy }] : [])], ok: async v => {
      if (!(+v.q > 0)) return toast('পরিমাণ দাও', 1)
      if (su && v.b !== '') await sb.from('product_costs').upsert({ product_id: x.id, buy: +v.b })
      run(sb.rpc('restock', { pid: x.id, q: +v.q }), 'স্টক যোগ হইছে ✅', refresh)
    }
  })
  const add = async () => {
    if (!f.name.trim()) return toast('নাম দাও', 1)
    const ex = d.products.find(x => x.name === f.name.trim()); let id = ex?.id
    if (ex) await sb.from('products').update({ sell: +f.sell || 0 }).eq('id', id)
    else { const r = await sb.from('products').insert({ name: f.name.trim(), stock: +f.stock || 0, sell: +f.sell || 0 }).select().single(); if (r.error) return toast(r.error.message, 1); id = r.data.id }
    await run(sb.from('product_costs').upsert({ product_id: id, buy: +f.buy || 0 }), 'সেভ হইছে ✅', () => { setF({ name: '', stock: '', buy: '', sell: '' }); refresh() })
  }
  return <div className="view"><div className="card"><h2>📦 মাল ও স্টক</h2>{d.products.map((x, i) => <div className="li" key={x.id} style={{ animationDelay: i * 30 + 'ms' }}><span><b>{x.name}</b><br /><span className="sm">স্টক {bn(x.stock)} • বিক্রি {bn(x.sell)}{su && <> • কেনা {bn(x.buy)} • লাভ/পিস <span className="pos">{bn(x.sell - x.buy)}</span></>}</span></span>
    <span><button className="mini gr" onClick={() => restock(x)}>➕ স্টক</button> {su && <button className="mini r" onClick={() => confirm(x.name + ' মুছবো?') && run(sb.from('products').delete().eq('id', x.id), 'মুছেছে', refresh)}>🗑️</button>}</span></div>)}{!d.products.length && <p className="sm">কোনো মাল নাই</p>}</div>
    {su && <div className="card"><h2>নতুন মাল / দাম বদলাও</h2><p className="sm">একই নামে দিলে শুধু দাম বদলাবে।</p>
      <label>নাম<input value={f.name} onChange={e => setF({ ...f, name: e.target.value })} /></label>
      <div className="row"><label>শুরুর স্টক<input type="number" value={f.stock} onChange={e => setF({ ...f, stock: e.target.value })} /></label><label>কেনা<input type="number" value={f.buy} onChange={e => setF({ ...f, buy: e.target.value })} /></label><label>বিক্রি<input type="number" value={f.sell} onChange={e => setF({ ...f, sell: e.target.value })} /></label></div>
      <button className="btn" onClick={add}>সেভ করো</button></div>}</div>
}

function Customers({ d, me, ask }) {
  const { refresh } = useContext(Ctx), m = custs(d), names = Object.keys(m).sort((a, b) => m[b] - m[a]), [q, setQ] = useState('')
  const pay = k => ask({
    title: k + ' - জমা নিলাম (বাকি ' + bn(m[k]) + ')', fields: [{ k: 'a', label: 'টাকা' }], ok: v => {
      if (!(+v.a > 0) || +v.a > m[k]) return toast('ঠিক পরিমাণ দাও', 1)
      run(sb.from('payments').insert({ day: today(), cust: k, amt: +v.a, by_name: me.name }), 'জমা হইছে ✅', refresh)
    }
  })
  const stmt = async (k, wa) => {
    let t = `AR Enterprise\n${k} - হিসাব\n`
    d.sales.filter(s => s.cust === k).reverse().forEach(s => t += `• ${s.day} ${s.pname} ${s.qty}×${s.price}=${s.total}, দিছে ${s.paid}\n`)
    d.pays.filter(p => p.cust === k).reverse().forEach(p => t += `• ${p.day} জমা ${p.amt}\n`)
    t += `মোট বাকি: ${Math.round(m[k])} টাকা`
    if (wa) window.open('https://wa.me/?text=' + encodeURIComponent(t), '_blank'); else toast(await copy(t) ? 'কপি হইছে ✅' : 'কপি হয়নি', 0)
  }
  return <div className="card view"><h2>👥 কাস্টমার ও বাকি</h2><p className="sm">মোট বাকি: <b className="neg">{money(sum(names, k => Math.max(0, m[k])))}</b></p>
    <input placeholder="🔍 নাম খুঁজো" value={q} onChange={e => setQ(e.target.value)} />
    {names.filter(k => k.toLowerCase().includes(q.toLowerCase())).map((k, i) => <div className="li" key={k} style={{ animationDelay: i * 30 + 'ms' }}><span><b>{k}</b><br />বাকি <span className={m[k] > 0 ? 'neg' : 'pos'}>{bn(m[k])}</span> ৳</span>
      <span><button className="mini gr" onClick={() => pay(k)} disabled={m[k] <= 0}>💵</button> <button className="mini" onClick={() => stmt(k)}>📋</button> <button className="mini" onClick={() => stmt(k, 1)}>💬</button></span></div>)}
    {!names.length && <p className="sm">বাকিতে বিক্রি করলে কাস্টমার এখানে আসবে</p>}</div>
}

function Expenses({ d, me }) {
  const { refresh } = useContext(Ctx), su = me.role === 'super', [f, setF] = useState({ t: '', a: '' })
  const add = () => { if (!f.t.trim() || !(+f.a > 0)) return toast('বিবরণ আর টাকা দাও', 1); run(sb.from('expenses').insert({ day: today(), title: f.t.trim(), amt: +f.a, by_name: me.name }), 'খরচ যোগ হইছে ✅', () => { setF({ t: '', a: '' }); refresh() }) }
  return <div className="view"><div className="card"><h2>💸 খরচ</h2><label>কিসের খরচ<input value={f.t} onChange={e => setF({ ...f, t: e.target.value })} /></label><label>টাকা<input type="number" inputMode="decimal" value={f.a} onChange={e => setF({ ...f, a: e.target.value })} /></label><button className="btn a" onClick={add}>খরচ যোগ করো</button></div>
    <div className="card"><h2>সাম্প্রতিক খরচ</h2>{d.exps.slice(0, 40).map(x => <div className="li" key={x.id}><span><b>{x.title}</b> - {bn(x.amt)} ৳<br /><span className="sm">{x.day} • {x.by_name}</span></span>{su && <button className="mini r" onClick={() => confirm('মুছবো?') && run(sb.from('expenses').delete().eq('id', x.id), 'মুছেছে', refresh)}>🗑️</button>}</div>)}{!d.exps.length && <p className="sm">কোনো খরচ নাই</p>}</div></div>
}

function Reports({ d }) {
  const [rng, setRng] = useState('day')
  const b = useMemo(() => {
    const out = [], len = rng === 'day' ? 10 : 7, now = new Date()
    for (let i = rng === 'day' ? 13 : 11; i >= 0; i--) {
      const x = rng === 'day' ? new Date(now.getFullYear(), now.getMonth(), now.getDate() - i) : new Date(now.getFullYear(), now.getMonth() - i, 1)
      out.push({ k: x.toLocaleDateString('en-CA').slice(0, len), l: rng === 'day' ? bn(x.getDate()) : x.toLocaleDateString('bn-BD', { month: 'short' }), s: 0, p: 0, e: 0, n: 0 })
    }
    const f = k => out.find(y => y.k === k.slice(0, len)), top = {}
    d.sales.forEach(s => { const y = f(s.day); if (y) { y.s += s.total; y.p += profit(s); top[s.pname] = (top[s.pname] || 0) + profit(s) } })
    d.exps.forEach(x => { const y = f(x.day); if (y) y.e += x.amt })
    out.forEach(y => y.n = y.p - y.e); out.top = Object.entries(top).sort((a, c) => c[1] - a[1]).slice(0, 5); return out
  }, [d, rng])
  const T = k => sum(b, x => x[k])
  const csv = () => {
    const r = ['তারিখ,মাল,পরিমাণ,দাম,মোট,দিছে,কাস্টমার,লাভ', ...d.sales.map(s => [s.day, s.pname, s.qty, s.price, s.total, s.paid, s.cust, profit(s)].join(','))].join('\n')
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + r], { type: 'text/csv' })); a.download = 'sales-' + today() + '.csv'; a.click()
  }
  return <div className="card view"><h2>📈 রিপোর্ট ও গ্রাফ</h2>
    <div className="seg"><button className={'mini ' + (rng === 'day' ? 'on' : '')} onClick={() => setRng('day')}>দৈনিক (১৪ দিন)</button><button className={'mini ' + (rng === 'month' ? 'on' : '')} onClick={() => setRng('month')}>মাসিক (১২ মাস)</button></div>
    <Chart key={rng} b={b} /><p className="sm">হালকা = বিক্রি, গাঢ় = নেট লাভ, লাল = লোকসান</p>
    <div className="grid"><Stat l="বিক্রি" v={T('s')} /><Stat l="মোট লাভ" v={T('p')} c="#15803d" /><Stat l="খরচ" v={T('e')} c="#f59e0b" /><Stat l="নেট লাভ" v={T('n')} c={T('n') < 0 ? '#dc2626' : '#15803d'} /></div>
    {b.top.length > 0 && <><h2 style={{ marginTop: 16 }}>🏆 সবচেয়ে বেশি লাভের মাল</h2>{b.top.map(([n, v]) => <div className="li" key={n}><b>{n}</b><span className="pos">{money(v)}</span></div>)}</>}
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>{rng === 'day' ? 'তারিখ' : 'মাস'}</th><th>বিক্রি</th><th>লাভ</th><th>খরচ</th><th>নেট</th></tr></thead><tbody>{[...b].reverse().map(x => <tr key={x.k}><td>{x.k}</td><td>{bn(x.s)}</td><td>{bn(x.p)}</td><td>{bn(x.e)}</td><td className={x.n < 0 ? 'neg' : 'pos'}>{bn(x.n)}</td></tr>)}</tbody></table></div>
    <button className="btn g" onClick={csv}>⬇️ সব বিক্রি CSV (Excel)</button></div>
}

function Team({ d, me }) {
  const { refresh } = useContext(Ctx)
  return <div className="card view"><h2>🔐 টিম ও অনুমতি</h2><p className="sm">নতুন কেউ অ্যাকাউন্ট খুললে "অপেক্ষায়" থাকবে। এখান থেকে অ্যাডমিন বা সুপার অ্যাডমিন করো।</p>
    {d.users.map(u => <div className="li" key={u.id}><span><b>{u.name}</b>{u.id === me.id && <span className="sm"> (তুমি)</span>}</span>
      <select style={{ width: 'auto' }} disabled={u.id === me.id} value={u.role} onChange={e => run(sb.from('profiles').update({ role: e.target.value }).eq('id', u.id), 'বদলেছে ✅', refresh)}>{Object.entries(ROLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>)}</div>
}

/* ---------- shell ---------- */
function Shell({ me }) {
  const [d, refresh] = useData(me), [tab, setTab] = useState('dash'), [a, setA] = useState(null), su = me.role === 'super'
  const tabs = [['dash', '🏠', 'হোম'], ['sale', '🛒', 'বিক্রি'], ['prod', '📦', 'মাল'], ['cust', '👥', 'কাস্টমার'], ['exp', '💸', 'খরচ'], ...(su ? [['rep', '📈', 'রিপোর্ট'], ['team', '🔐', 'টিম']] : [])]
  const P = { d, me, ask: setA }
  const View = { dash: Dash, sale: Sales, prod: Products, cust: Customers, exp: Expenses, rep: Reports, team: Team }[tab]
  return <Ctx.Provider value={{ refresh }}><div className="wrap">
    <div className="top"><div><h1>AR Enterprise</h1><small>{me.name} • {ROLE[me.role]}</small></div><button className="mini" onClick={() => sb.auth.signOut()}>বের হও</button></div>
    {d ? <View key={tab} {...P} /> : <><div className="skel" /><div className="skel" /><div className="skel" /></>}
    <nav className="nav">{tabs.map(([k, i, l]) => <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}><b>{i}</b>{l}</button>)}</nav>
    {a && <Ask a={a} close={() => setA(null)} />}</div></Ctx.Provider>
}

export default function App() {
  const [ses, setSes] = useState(undefined), [me, setMe] = useState(null), [toasts, setT] = useState([])
  useEffect(() => { sb.auth.getSession().then(r => setSes(r.data.session)); const { data } = sb.auth.onAuthStateChange((_, s) => setSes(s)); return () => data.subscription.unsubscribe() }, [])
  useEffect(() => { const h = e => { const id = Math.random(); setT(t => [...t, { id, ...e.detail }]); setTimeout(() => setT(t => t.filter(x => x.id !== id)), 3200) }; window.addEventListener('toast', h); return () => window.removeEventListener('toast', h) }, [])
  useEffect(() => {
    if (!ses) { setMe(null); return }
    const l = () => sb.from('profiles').select('*').eq('id', ses.user.id).single().then(r => setMe(r.data)); l()
    const ch = sb.channel('me').on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: 'id=eq.' + ses.user.id }, l).subscribe(); return () => sb.removeChannel(ch)
  }, [ses])
  let body
  if (ses === undefined || (ses && !me)) body = <div className="wrap"><div className="skel" /><div className="skel" /></div>
  else if (!ses) body = <Login />
  else if (me.role === 'pending' || me.role === 'off') body = <div className="wrap view"><div className="card"><h2>{me.role === 'off' ? 'অ্যাকাউন্ট বন্ধ' : 'অনুমতির অপেক্ষায়'}</h2><p>সুপার অ্যাডমিন অনুমতি দিলে এখানে সব চালু হবে।</p><button className="btn g" onClick={() => sb.auth.signOut()}>বের হও</button></div></div>
  else body = <Shell me={me} />
  return <>{body}{toasts.map(t => <div key={t.id} className={'toast ' + (t.bad ? 'bad' : '')}>{t.m}</div>)}</>
}
