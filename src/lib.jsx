import { useState, useEffect, createContext } from 'react'
import { createClient } from '@supabase/supabase-js'
export const sb = createClient(import.meta.env.VITE_SUPABASE_URL || 'http://x.invalid', import.meta.env.VITE_SUPABASE_ANON_KEY || 'x')
export const Ctx = createContext()
export const bn = (n, d = 2) => (+n || 0).toLocaleString('bn-BD', { maximumFractionDigits: d })
export const money = n => '৳' + bn(n)
export const r2 = n => Math.round((+n || 0) * 100) / 100
export const today = () => new Date().toLocaleDateString('en-CA')
export const dt = t => t ? new Date(t).toLocaleString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true }) : '-'
export const dd = t => new Date(String(t).length === 10 ? t + 'T00:00' : t).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })
export const sum = (a, f) => a.reduce((t, x) => t + (+f(x) || 0), 0)
export const one = x => Array.isArray(x) ? x[0] : x
export const toast = (m, bad) => window.dispatchEvent(new CustomEvent('toast', { detail: { m, bad } }))
export const UNITS = ['কেজি', 'গ্রাম', 'পিস', 'ডজন', 'হালি', 'লিটার', 'মি.লি.', 'প্যাকেট', 'বস্তা', 'কার্টন', 'বোতল', 'পোর্শন', 'গজ', 'মিটার']
export const CATS = ['চাল-ডাল', 'তেল-মসলা', 'মুদি', 'পানীয়', 'সবজি-ফল', 'প্রসাধনী', 'অন্যান্য']
export const XCATS = ['দোকান ভাড়া', 'বেতন', 'বিদ্যুৎ', 'পরিবহন', 'নাস্তা-খাবার', 'মেরামত', 'অন্যান্য']
export const ROLE = { super: 'সুপার অ্যাডমিন', admin: 'অ্যাডমিন', pending: 'অপেক্ষায়', off: 'বন্ধ' }
export const profitOf = s => sum(s.sale_items || [], i => (i.price - i.cost) * i.qty) - s.discount
export function balances(d) {
  const m = {}; d.parties.forEach(p => m[p.id] = +p.opening)
  d.sales.forEach(s => { if (s.party_id in m) m[s.party_id] += s.total - s.paid })
  d.purchases.forEach(s => { if (s.party_id in m) m[s.party_id] += s.total - s.paid })
  d.pays.forEach(p => { if (p.party_id in m) m[p.party_id] -= p.amt })
  Object.keys(m).forEach(k => m[k] = r2(m[k])); return m
}
export function device(u = '') {
  const o = /Android/.test(u) ? 'Android' : /iPhone|iPad/.test(u) ? 'iPhone' : /Windows/.test(u) ? 'Windows' : /Mac/.test(u) ? 'Mac' : /Linux/.test(u) ? 'Linux' : '?'
  const b = /Edg\//.test(u) ? 'Edge' : /OPR\//.test(u) ? 'Opera' : /Chrome\//.test(u) ? 'Chrome' : /Firefox\//.test(u) ? 'Firefox' : /Safari\//.test(u) ? 'Safari' : '?'
  return o + ' • ' + b
}
export async function run(p, ok, done) { const { error } = await p; if (error) { toast(error.message, 1); return false } ok && toast(ok); done && done(); return true }
export async function copy(t) { try { await navigator.clipboard.writeText(t); return true } catch { return false } }
export const wa = (phone, t) => { const n = (phone || '').replace(/\D/g, '').replace(/^0/, '880'); window.open(`https://wa.me/${n}?text=${encodeURIComponent(t)}`, '_blank') }

export function useForm(init) { const [f, setF] = useState(init); return [f, k => ({ value: f[k] ?? '', onChange: e => setF(o => ({ ...o, [k]: e.target.value })) }), setF] }
export function Num({ v, pre = '৳' }) {
  const [x, setX] = useState(0)
  useEffect(() => { let f; const s = performance.now(), a = x; const t = ms => { const p = Math.min(1, (ms - s) / 700); setX(p >= 1 ? v : a + (v - a) * (1 - Math.pow(1 - p, 3))); if (p < 1) f = requestAnimationFrame(t) }; f = requestAnimationFrame(t); return () => cancelAnimationFrame(f) }, [v])
  return pre + bn(x, x === v ? 2 : 0)
}
export const Stat = ({ l, v, c = '#6366f1', i, sub, n }) => <div className="stat" style={{ '--c': c }}><div className="ic">{i}</div><div><span>{l}</span><b>{n ? bn(v) : <Num v={v} />}</b>{sub && <small>{sub}</small>}</div></div>
export const F = ({ l, children }) => <label className="f"><span>{l}</span>{children}</label>
export const Err = ({ m }) => m ? <div className="err">⚠️ {m}</div> : null
export const Badge = ({ c, children }) => <span className={'badge ' + c}>{children}</span>
export const Empty = ({ i = '📭', t }) => <div className="empty"><div>{i}</div>{t}</div>
export function Modal({ t, close, children, w }) {
  useEffect(() => { const h = e => e.key === 'Escape' && close(); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])
  return <div className="modal" onClick={close}><div style={{ maxWidth: w || 440 }} onClick={e => e.stopPropagation()}><div className="mh"><h3>{t}</h3><button className="x" onClick={close}>✕</button></div>{children}</div></div>
}
export function Chart({ b }) {
  const W = Math.max(b.length * 46 + 20, 300), H = 190, mx = Math.max(...b.map(x => x.s), 1), mn = Math.min(...b.map(x => x.n), 0), r = mx - mn || 1
  const y = q => 12 + (mx - q) / r * (H - 40), z = y(0)
  return <div style={{ overflowX: 'auto' }}><svg viewBox={`0 0 ${W} ${H}`} width={W} height={H}>
    <defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#38bdf8" /><stop offset="1" stopColor="#6366f1" /></linearGradient><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#34d399" /><stop offset="1" stopColor="#059669" /></linearGradient></defs>
    {b.map((x, i) => {
      const X = 10 + i * 46; return <g key={x.k}>
        <rect className="bar" style={{ transformOrigin: '50% 100%', animationDelay: i * 40 + 'ms' }} x={X} y={y(x.s)} width="19" height={Math.max(0, z - y(x.s))} rx="5" fill="url(#g1)"><title>{x.k} বিক্রি {money(x.s)}</title></rect>
        <rect className="bar" style={{ transformOrigin: x.n < 0 ? '50% 0' : '50% 100%', animationDelay: i * 40 + 80 + 'ms' }} x={X + 21} y={Math.min(y(x.n), z)} width="19" height={Math.abs(y(x.n) - z)} rx="5" fill={x.n < 0 ? '#f43f5e' : 'url(#g2)'}><title>{x.k} নেট {money(x.n)}</title></rect>
        <text x={X + 20} y={H - 10} fontSize="11" textAnchor="middle" fill="#94a3b8">{x.l}</text></g>
    })}
    <line x1="0" x2={W} y1={z} y2={z} stroke="#94a3b8" strokeOpacity=".35" /></svg></div>
}
