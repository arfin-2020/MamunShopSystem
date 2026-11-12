import {Stat,Chart,sum,money,bn,dt,today,balances,profitOf,Badge,Empty} from './lib.jsx'
import {buckets} from './Money.jsx'
export default function Dash({d,me}){
  const t=today(),su=me.role==='super',S=d.sales.filter(s=>s.day===t),E=d.exps.filter(x=>x.day===t),PI=d.pays.filter(p=>p.day===t&&p.kind==='in'),PO=d.pays.filter(p=>p.day===t&&p.kind==='out'),PU=d.purchases.filter(p=>p.day===t)
  const bal=balances(d),recv=sum(d.parties.filter(p=>p.kind==='customer'),p=>Math.max(0,bal[p.id])),pay=sum(d.parties.filter(p=>p.kind==='supplier'),p=>Math.max(0,bal[p.id]))
  const cashIn=sum(S,s=>s.paid)+sum(PI,p=>p.amt),cashOut=sum(E,x=>x.amt)+sum(PO,p=>p.amt)+sum(PU,p=>p.paid)
  const gp=sum(S,profitOf),low=d.products.filter(p=>p.active&&p.stock<=p.min_stock),b=su?buckets(d,'day').slice(-7):[]
  return <div className="view"><div className="hd"><div><h1>আজকের হিসাব</h1><p>{new Date().toLocaleDateString('bn-BD',{dateStyle:'full'})} • {bn(S.length)}টি ইনভয়েস</p></div></div>
    <div className="grid">
      <Stat l="আজকের বিক্রি" v={sum(S,s=>s.total)} i="🧾" c="#6366f1" sub={bn(S.length)+'টি বিক্রি'}/>
      <Stat l="আজ নগদ ঢুকেছে" v={cashIn} i="💵" c="#0ea5e9" sub="বিক্রি + বাকি আদায়"/>
      <Stat l="আজ নগদ বের হয়েছে" v={cashOut} i="📤" c="#f59e0b" sub="খরচ + ক্রয় + পরিশোধ"/>
      <Stat l="কাস্টমারের কাছে পাবো" v={recv} i="📥" c="#e11d48"/>
      {su&&<><Stat l="আমি দিবো (সরবরাহকারী)" v={pay} i="🏭" c="#f97316"/><Stat l="আজকের লাভ" v={gp} i="📈" c="#059669"/><Stat l="আজকের নেট লাভ" v={gp-sum(E,x=>x.amt)} i="💰" c="#10b981" sub="লাভ − খরচ"/><Stat l="মালের দাম (কেনা)" v={sum(d.products,p=>p.stock*p.buy)} i="📦" c="#8b5cf6"/></>}</div>
    {su&&<div className="card"><h2>📊 শেষ ৭ দিন</h2><Chart b={b}/><p className="sm">নীল = বিক্রি, সবুজ = নেট লাভ, লাল = লোকসান</p></div>}
    <div className="row">
      <div className="card"><h2>⚠️ স্টক কম ({bn(low.length)})</h2>{low.slice(0,8).map(p=><div className="li" key={p.id}><b>{p.name}</b><Badge c={p.stock<=0?'r':'a'}>{bn(p.stock,3)} {p.unit}</Badge></div>)}{!low.length&&<Empty i="✅" t="সব মালের স্টক ঠিক আছে"/>}</div>
      <div className="card"><h2>🕒 সাম্প্রতিক বিক্রি</h2>{d.sales.slice(0,6).map(s=><div className="li" key={s.id}><span><b>#{s.no} {s.party_name}</b><br/><span className="sm">{dt(s.created_at)} • {s.by_name}</span></span><b>{money(s.total)}</b></div>)}{!d.sales.length&&<Empty t="এখনো কোনো বিক্রি নাই"/>}</div></div></div>
}
