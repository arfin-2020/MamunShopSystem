import {useState,useContext} from 'react'
import {sb,Ctx,F,Err,Modal,Badge,Empty,Stat,bn,money,r2,dt,today,sum,run,toast,useForm,UNITS,CATS} from './lib.jsx'
import Bill from './Bill.jsx'
import {PartyModal} from './Parties.jsx'

function ProdModal({item,su,close}){
  const {refresh}=useContext(Ctx),[f,s]=useForm({name:item?.name||'',category:item?.category||'',unit:item?.unit||'কেজি',sell:item?.sell??'',min:item?.min_stock??5,sku:item?.sku||'',stock:'',buy:item?.buy??''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const go=async()=>{
    if(!f.name.trim())return setErr('মালের নাম দাও')
    if(!f.unit.trim())return setErr('ইউনিট দাও (যেমন কেজি, পিস)')
    if(f.sell===''||+f.sell<0)return setErr('বিক্রি দাম দাও')
    if(!item&&f.stock!==''&&+f.stock<0)return setErr('স্টক ঋণাত্মক হতে পারে না')
    const row={name:f.name.trim(),category:f.category.trim()||null,unit:f.unit.trim(),sell:+f.sell,min_stock:+f.min||0,sku:f.sku.trim()||null}
    setBusy(true)
    const r=item?await sb.from('products').update(row).eq('id',item.id).select().single():await sb.from('products').insert({...row,stock:+f.stock||0}).select().single()
    if(r.error){setBusy(false);return setErr(r.error.code==='23505'?'এই নামে মাল আছে':r.error.message)}
    if(f.buy!=='')await sb.from('product_costs').upsert({product_id:r.data.id,buy:+f.buy})
    setBusy(false);toast('সেভ হইছে ✅');refresh();close()
  }
  return <Modal t={item?'✏️ মাল এডিট':'➕ নতুন মাল'} close={close}>
    <F l="নাম *"><input autoFocus {...s('name')}/></F>
    <div className="row"><F l="ক্যাটাগরি"><input list="cats" {...s('category')}/></F><F l="ইউনিট * (কেজি/পিস/লিটার...)"><input list="units" {...s('unit')}/></F></div>
    <datalist id="cats">{CATS.map(c=><option key={c} value={c}/>)}</datalist><datalist id="units">{UNITS.map(c=><option key={c} value={c}/>)}</datalist>
    <div className="row"><F l="বিক্রি দাম (প্রতি ইউনিট) *"><input type="number" step="any" {...s('sell')}/></F>{su&&<F l="কেনা দাম (গড়)"><input type="number" step="any" {...s('buy')}/></F>}</div>
    <div className="row">{!item&&<F l="শুরুর স্টক"><input type="number" step="any" {...s('stock')}/></F>}<F l="কম স্টক সতর্কতা"><input type="number" step="any" {...s('min')}/></F><F l="কোড / বারকোড"><input {...s('sku')}/></F></div>
    <Err m={err}/><button className="btn w" disabled={busy} onClick={go}>সেভ করো</button></Modal>
}
function Restock({p,close}){
  const {refresh}=useContext(Ctx),[q,setQ]=useState('')
  return <Modal t={'➕ স্টক যোগ: '+p.name} close={close}><p className="sm">এখন আছে {bn(p.stock,3)} {p.unit}। দাম সহ ক্রয় এন্ট্রি করতে "ক্রয়" ট্যাব ব্যবহার করো।</p>
    <F l={`পরিমাণ (${p.unit})`}><input autoFocus type="number" step="any" value={q} onChange={e=>setQ(e.target.value)}/></F>
    <button className="btn w" disabled={!(+q>0)} onClick={async()=>{if(await run(sb.rpc('restock',{pid:p.id,q:+q}),'স্টক যোগ হইছে ✅',refresh))close()}}>যোগ করো</button></Modal>
}
function Purchase({d,refresh}){
  const sups=d.parties.filter(p=>p.kind==='supplier'&&p.active),prods=d.products.filter(p=>p.active)
  const [cart,setCart]=useState([]),[pk,setPk]=useState({pid:'',qty:'',cost:''}),[party,setParty]=useState(''),[paidS,setPaidS]=useState(''),[note,setNote]=useState(''),[day,setDay]=useState(today()),[perr,setPerr]=useState(''),[busy,setBusy]=useState(false),[np,setNp]=useState(false),[show,setShow]=useState(null)
  const choose=id=>{const p=prods.find(x=>x.id===id);setPk({pid:id,qty:'',cost:p?p.buy:''})}
  const add=()=>{const p=prods.find(x=>x.id===pk.pid),q=+pk.qty,c=+pk.cost;if(!p)return setPerr('মাল বেছে নাও');if(!(q>0))return setPerr('পরিমাণ দাও');if(pk.cost===''||c<0)return setPerr('কেনা দাম দাও');setCart(x=>[...x,{pid:p.id,qty:q,cost:c}]);setPk({pid:'',qty:'',cost:''});setPerr('')}
  const total=r2(sum(cart,i=>r2(i.qty*i.cost))),paid=paidS===''?total:+paidS,due=r2(total-paid),errs=[]
  if(paid>total)errs.push(`টাকা বেশি! মোট ${money(total)}, তুমি ${money(paid)} দিয়েছ — ${money(r2(paid-total))} বেশি`)
  if(paid<0)errs.push('টাকার পরিমাণ ঠিক নয়')
  if(due>0&&!party)errs.push('বাকি রাখতে সরবরাহকারী বেছে নাও')
  const sp=pk.pid&&prods.find(x=>x.id===pk.pid)
  const save=async()=>{setBusy(true);const r=await sb.rpc('create_purchase',{p_party:party||null,p_name:null,p_paid:paid,p_note:note||null,p_day:day,p_items:cart.map(i=>({pid:i.pid,qty:i.qty,cost:i.cost}))});setBusy(false);if(r.error)return toast(r.error.message,1);toast('ক্রয় সেভ হইছে ✅ স্টক বেড়েছে');setShow(r.data);setCart([]);setPaidS('');setNote('');refresh()}
  const bill=d.purchases.find(x=>x.id===show)
  return <><div className="card"><h2>📥 মাল কেনা (সরবরাহকারী থেকে)</h2>
    <div className="row"><F l="মাল"><select value={pk.pid} onChange={e=>choose(e.target.value)}><option value="">— বেছে নাও —</option>{prods.map(p=><option key={p.id} value={p.id}>{p.name} ({bn(p.stock,3)} {p.unit})</option>)}</select></F><F l={`পরিমাণ ${sp?'('+sp.unit+')':''}`}><input type="number" step="any" value={pk.qty} onChange={e=>setPk({...pk,qty:e.target.value})}/></F><F l={`কেনা দাম ${sp?'(প্রতি '+sp.unit+')':''}`}><input type="number" step="any" value={pk.cost} onChange={e=>setPk({...pk,cost:e.target.value})}/></F></div>
    <Err m={perr}/><button className="btn w" onClick={add}>➕ তালিকায় যোগ করো</button>
    {cart.map((i,k)=>{const p=d.products.find(x=>x.id===i.pid);return <div className="li" key={k}><span><b>{p?.name}</b><br/><span className="sm">{bn(i.qty,3)} {p?.unit} × {money(i.cost)}</span></span><span><b>{money(r2(i.qty*i.cost))}</b> <button className="mini r" onClick={()=>setCart(c=>c.filter((_,j)=>j!==k))}>✕</button></span></div>})}
    {cart.length>0&&<><div className="row"><F l="সরবরাহকারী (খালি = নগদ ক্রয়)"><select value={party} onChange={e=>setParty(e.target.value)}><option value="">নগদ ক্রয়</option>{sups.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' • '+c.phone:''}</option>)}</select></F><F l="তারিখ"><input type="date" value={day} max={today()} onChange={e=>setDay(e.target.value)}/></F></div>
      <button className="mini" style={{marginTop:8}} onClick={()=>setNp(true)}>➕ নতুন সরবরাহকারী</button>
      <div className="row"><F l="কত টাকা দিলে? (খালি = পুরা)"><input type="number" step="any" value={paidS} placeholder={String(total)} onChange={e=>setPaidS(e.target.value)}/></F><F l="নোট"><input value={note} onChange={e=>setNote(e.target.value)}/></F></div>
      <div className="tot"><div className="big"><span>মোট</span><span>{money(total)}</span></div><div><span>পরিশোধ</span><span className="pos">{money(paid)}</span></div><div><span>বাকি (দিবো)</span><span className={due>0?'neg':'pos'}>{money(due)}</span></div></div>
      {errs.map(e=><Err key={e} m={e}/>)}<button className="btn ok w" disabled={busy||errs.length>0} onClick={save}>✅ ক্রয় সেভ করো</button></>}</div>
    <div className="card"><h2>📜 ক্রয়ের তালিকা</h2>{d.purchases.slice(0,60).map(p=><div className="li k" key={p.id} onClick={()=>setShow(p.id)}><span><b>#{p.no} • {p.party_name}</b><br/><span className="sm">{dt(p.created_at)} • {p.by_name}</span></span><span style={{textAlign:'right'}}><b>{money(p.total)}</b><br/>{p.total-p.paid>0?<Badge c="r">বাকি {money(p.total-p.paid)}</Badge>:<Badge c="g">পরিশোধ</Badge>}</span></div>)}{!d.purchases.length&&<Empty t="এখনো কোনো ক্রয় নাই"/>}</div>
    {bill&&<Bill b={bill} kind="purchase" su shop={d.set.shop} phone={d.parties.find(p=>p.id===bill.party_id)?.phone} close={()=>setShow(null)} del={async()=>{if(confirm('ক্রয় মুছবো? স্টক কমে যাবে।')&&await run(sb.from('purchases').delete().eq('id',bill.id),'মুছেছে',refresh))setShow(null)}}/>}
    {np&&<PartyModal kind="supplier" close={()=>setNp(false)} saved={id=>{setParty(id);refresh()}}/>}</>
}
export default function Stock({d,me}){
  const {refresh}=useContext(Ctx),su=me.role==='super',[tab,setTab]=useState('prod'),[q,setQ]=useState(''),[cat,setCat]=useState(''),[m,setM]=useState(null),[hid,setHid]=useState(false)
  const cats=[...new Set(d.products.map(p=>p.category).filter(Boolean))]
  const list=d.products.filter(p=>(hid||p.active)&&(!cat||p.category===cat)&&(p.name+(p.sku||'')).toLowerCase().includes(q.toLowerCase()))
  const del=async p=>{if(confirm(`${p.name} মুছবো?\nআগের বিক্রির হিসাব থাকবে।`))run(sb.from('products').delete().eq('id',p.id),'মুছেছে',refresh)}
  return <div className="view"><div className="hd"><div><h1>📦 মাল ও ক্রয়</h1><p>স্টক, ইউনিট, কেনা-বেচার দাম</p></div>{tab==='prod'&&su&&<button className="btn" onClick={()=>setM({t:'form'})}>➕ নতুন মাল</button>}</div>
    {su&&<div className="seg"><button className={'mini '+(tab==='prod'?'on':'')} onClick={()=>setTab('prod')}>📦 মাল তালিকা</button><button className={'mini '+(tab==='buy'?'on':'')} onClick={()=>setTab('buy')}>📥 ক্রয় এন্ট্রি</button></div>}
    {tab==='buy'&&su?<Purchase d={d} refresh={refresh}/>:<>
      <div className="grid"><Stat l="মোট মাল" v={d.products.filter(p=>p.active).length} i="📦" c="#6366f1" n/><Stat l="স্টক কম" v={d.products.filter(p=>p.active&&p.stock<=p.min_stock).length} i="⚠️" c="#e11d48" n/>{su&&<Stat l="মজুদ মালের দাম" v={sum(d.products,p=>p.stock*p.buy)} i="💎" c="#8b5cf6"/>}{su&&<Stat l="বিক্রি হলে পাবো" v={sum(d.products,p=>p.stock*p.sell)} i="🏷️" c="#059669"/>}</div>
      <div className="card"><div className="row"><input placeholder="🔍 মালের নাম / কোড" value={q} onChange={e=>setQ(e.target.value)}/><select value={cat} onChange={e=>setCat(e.target.value)}><option value="">সব ক্যাটাগরি</option>{cats.map(c=><option key={c}>{c}</option>)}</select></div>
        <label className="sm"><input type="checkbox" style={{width:16,height:16}} checked={hid} onChange={e=>setHid(e.target.checked)}/> লুকানো মালও দেখাও</label>
        {list.map((p,i)=>{const mx=Math.max(p.min_stock*3,p.stock,1),pc=Math.min(100,p.stock/mx*100),lowS=p.stock<=p.min_stock;return <div className="li" key={p.id} style={{animationDelay:i*20+'ms',opacity:p.active?1:.5}}>
          <span><b>{p.name}</b> {p.category&&<Badge c="b">{p.category}</Badge>} {!p.active&&<Badge c="n">লুকানো</Badge>}<br/><span className="sm">বিক্রি {money(p.sell)}/{p.unit}{su&&<> • কেনা {money(p.buy)} • মার্জিন <b className={p.sell>=p.buy?'pos':'neg'}>{p.buy>0?bn((p.sell-p.buy)/p.buy*100,1)+'%':'-'}</b></>}</span><div className="prog"><i style={{width:pc+'%',background:p.stock<=0?'#e11d48':lowS?'#f59e0b':'#10b981'}}/></div></span>
          <span style={{textAlign:'right'}}><Badge c={p.stock<=0?'r':lowS?'a':'g'}>{bn(p.stock,3)} {p.unit}</Badge><br/><span style={{display:'inline-flex',gap:4,marginTop:6}}><button className="mini gr" onClick={()=>setM({t:'re',p})}>➕</button>{su&&<><button className="mini" onClick={()=>setM({t:'form',p})}>✏️</button><button className="mini" title="লুকাও/দেখাও" onClick={()=>run(sb.from('products').update({active:!p.active}).eq('id',p.id),'',refresh)}>{p.active?'🙈':'👁️'}</button><button className="mini r" onClick={()=>del(p)}>🗑️</button></>}</span></span></div>})}
        {!list.length&&<Empty t={su?'কোনো মাল নাই। ➕ নতুন মাল চাপো':'কোনো মাল নাই (সুপার অ্যাডমিন যোগ করবে)'}/>}</div></>}
    {m?.t==='form'&&<ProdModal item={m.p} su={su} close={()=>setM(null)}/>}{m?.t==='re'&&<Restock p={m.p} close={()=>setM(null)}/>}</div>
}
