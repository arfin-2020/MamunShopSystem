import {useState,useContext,useMemo} from 'react'
import {sb,Ctx,F,Err,Modal,Badge,Empty,Stat,Chart,bn,money,dt,dd,today,sum,run,toast,useForm,profitOf,XCATS} from './lib.jsx'

export function buckets(d,rng){
  const out=[],len=rng==='day'?10:7,now=new Date()
  for(let i=rng==='day'?13:11;i>=0;i--){const x=rng==='day'?new Date(now.getFullYear(),now.getMonth(),now.getDate()-i):new Date(now.getFullYear(),now.getMonth()-i,1)
    out.push({k:x.toLocaleDateString('en-CA').slice(0,len),l:rng==='day'?bn(x.getDate(),0):x.toLocaleDateString('bn-BD',{month:'short'}),s:0,p:0,e:0,b:0,n:0})}
  const f=k=>out.find(y=>y.k===k.slice(0,len))
  d.sales.forEach(s=>{const y=f(s.day);if(y){y.s+=s.total;y.p+=profitOf(s)}})
  d.exps.forEach(x=>{const y=f(x.day);if(y)y.e+=x.amt})
  d.purchases.forEach(x=>{const y=f(x.day);if(y)y.b+=x.total})
  out.forEach(y=>y.n=y.p-y.e);return out
}
function ExpModal({item,close}){
  const {refresh}=useContext(Ctx),[f,s]=useForm({title:item?.title||'',amt:item?.amt||'',category:item?.category||'অন্যান্য',day:item?.day||today(),note:item?.note||''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const go=async()=>{
    if(!f.title.trim())return setErr('খরচের বিবরণ দাও')
    if(!(+f.amt>0))return setErr('টাকার পরিমাণ দাও (০ এর বেশি)')
    const row={title:f.title.trim(),amt:+f.amt,category:f.category,day:f.day,note:f.note.trim()||null}
    setBusy(true);const r=item?await sb.from('expenses').update(row).eq('id',item.id):await sb.from('expenses').insert(row);setBusy(false)
    if(r.error)return setErr(r.error.message);toast(item?'আপডেট হইছে ✅':'খরচ যোগ হইছে ✅');refresh();close()
  }
  return <Modal t={item?'✏️ খরচ এডিট':'💸 নতুন খরচ'} close={close}><F l="কিসের খরচ *"><input autoFocus {...s('title')}/></F>
    <div className="row"><F l="টাকা *"><input type="number" step="any" inputMode="decimal" {...s('amt')}/></F><F l="ক্যাটাগরি"><select {...s('category')}>{XCATS.map(c=><option key={c}>{c}</option>)}</select></F></div>
    <div className="row"><F l="তারিখ"><input type="date" max={today()} {...s('day')}/></F><F l="নোট"><input {...s('note')}/></F></div>
    {item&&<p className="sm">যোগ: {dt(item.created_at)} • {item.by_name}{item.edited_at&&' • এডিট: '+dt(item.edited_at)}</p>}<Err m={err}/><button className="btn w" disabled={busy} onClick={go}>সেভ করো</button></Modal>
}
export default function Money({d,me}){
  const {refresh}=useContext(Ctx),su=me.role==='super',[tab,setTab]=useState('exp'),[rng,setRng]=useState('day'),[m,setM]=useState(null),[fd,setFd]=useState(today()),[all,setAll]=useState(false)
  const b=useMemo(()=>buckets(d,rng),[d,rng]),T=k=>sum(b,x=>x[k]),len=rng==='day'?10:7,keys=b.map(x=>x.k)
  const top=useMemo(()=>{const t={};d.sales.filter(s=>keys.includes(s.day.slice(0,len))).forEach(s=>s.sale_items.forEach(i=>t[i.pname]=(t[i.pname]||0)+(i.price-i.cost)*i.qty));return Object.entries(t).sort((a,c)=>c[1]-a[1]).slice(0,6)},[d,rng])
  const cats=useMemo(()=>{const t={};d.exps.filter(x=>keys.includes(x.day.slice(0,len))).forEach(x=>t[x.category]=(t[x.category]||0)+x.amt);return Object.entries(t).sort((a,c)=>c[1]-a[1])},[d,rng])
  const list=d.exps.filter(x=>all||x.day===fd),csv=()=>{const r=['ইনভয়েস,তারিখ-সময়,কাস্টমার,মাল,ইউনিট,পরিমাণ,দাম,মোট,পরিশোধ,লাভ',...d.sales.flatMap(s=>s.sale_items.map(i=>[s.no,new Date(s.created_at).toLocaleString('en-GB'),s.party_name,i.pname,i.unit,i.qty,i.price,s.total,s.paid,(i.price-i.cost)*i.qty].join(',')))].join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+r],{type:'text/csv'}));a.download='sales-'+today()+'.csv';a.click()}
  return <div className="view"><div className="hd"><div><h1>💸 হিসাব</h1><p>খরচ ও রিপোর্ট</p></div>{tab==='exp'&&<button className="btn am" onClick={()=>setM({})}>➕ নতুন খরচ</button>}</div>
    {su&&<div className="seg"><button className={'mini '+(tab==='exp'?'on':'')} onClick={()=>setTab('exp')}>💸 খরচ</button><button className={'mini '+(tab==='rep'?'on':'')} onClick={()=>setTab('rep')}>📈 রিপোর্ট ও গ্রাফ</button></div>}
    {tab==='exp'||!su?<div className="card"><h2>খরচের তালিকা</h2><div className="row"><F l="তারিখ"><input type="date" value={fd} disabled={all} onChange={e=>setFd(e.target.value)}/></F></div>
      <div className="seg"><button className={'mini '+(!all?'on':'')} onClick={()=>setAll(false)}>এই তারিখ</button><button className={'mini '+(all?'on':'')} onClick={()=>setAll(true)}>সব খরচ</button></div>
      <p className="sm">{bn(list.length)}টি • মোট <b>{money(sum(list,x=>x.amt))}</b></p>
      {list.slice(0,150).map((x,i)=><div className="li" key={x.id} style={{animationDelay:i*20+'ms'}}><span><b>{x.title}</b> <Badge c="a">{x.category}</Badge><br/><span className="sm">🕒 {dt(x.created_at)} • {x.by_name}{x.edited_at&&<> • <Badge c="n">এডিট {dt(x.edited_at)}</Badge></>}{x.note&&' • 📝 '+x.note}</span></span>
        <span style={{textAlign:'right'}}><b className="neg">{money(x.amt)}</b>{su&&<><br/><span style={{display:'inline-flex',gap:4,marginTop:6}}><button className="mini" onClick={()=>setM(x)}>✏️</button><button className="mini r" onClick={()=>confirm(`"${x.title}" খরচ মুছবো?`)&&run(sb.from('expenses').delete().eq('id',x.id),'মুছেছে',refresh)}>🗑️</button></span></>}</span></div>)}
      {!list.length&&<Empty i="🧾" t="কোনো খরচ নাই"/>}</div>
    :<><div className="seg"><button className={'mini '+(rng==='day'?'on':'')} onClick={()=>setRng('day')}>দৈনিক (১৪ দিন)</button><button className={'mini '+(rng==='month'?'on':'')} onClick={()=>setRng('month')}>মাসিক (১২ মাস)</button></div>
      <div className="grid"><Stat l="বিক্রি" v={T('s')} i="🧾" c="#6366f1"/><Stat l="মোট লাভ" v={T('p')} i="📈" c="#059669"/><Stat l="খরচ" v={T('e')} i="💸" c="#f59e0b"/><Stat l="নেট লাভ" v={T('n')} i="💰" c={T('n')<0?'#e11d48':'#10b981'}/><Stat l="মাল কেনা" v={T('b')} i="📥" c="#8b5cf6"/></div>
      <div className="card"><h2>📊 গ্রাফ</h2><Chart key={rng} b={b}/><p className="sm">নীল = বিক্রি, সবুজ = নেট লাভ (লাভ − খরচ), লাল = লোকসান</p></div>
      <div className="row"><div className="card"><h2>🏆 সবচেয়ে বেশি লাভের মাল</h2>{top.map(([n,v])=><div className="li" key={n}><b>{n}</b><span className="pos">{money(v)}</span></div>)}{!top.length&&<Empty t="ডাটা নাই"/>}</div>
        <div className="card"><h2>🥧 খরচ কোথায় যাচ্ছে</h2>{cats.map(([n,v])=><div className="li" key={n}><b>{n}</b><span className="neg">{money(v)}</span></div>)}{!cats.length&&<Empty t="ডাটা নাই"/>}</div></div>
      <div className="card"><h2>📋 {rng==='day'?'দিনের':'মাসের'} হিসাব</h2><div style={{overflowX:'auto'}}><table><thead><tr><th>{rng==='day'?'তারিখ':'মাস'}</th><th>বিক্রি</th><th>লাভ</th><th>খরচ</th><th>নেট</th></tr></thead><tbody>{[...b].reverse().map(x=><tr key={x.k}><td>{x.k}</td><td>{money(x.s)}</td><td>{money(x.p)}</td><td>{money(x.e)}</td><td className={x.n<0?'neg':'pos'}>{money(x.n)}</td></tr>)}</tbody></table></div><button className="btn g w" onClick={csv}>⬇️ সব বিক্রি Excel (CSV)</button></div></>}
    {m&&<ExpModal item={m.id?m:null} close={()=>setM(null)}/>}</div>
}
