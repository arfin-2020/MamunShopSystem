import {useState,useContext} from 'react'
import {sb,Ctx,F,Err,Badge,Empty,bn,money,r2,dt,today,sum,run,toast,balances,useForm} from './lib.jsx'
import Bill from './Bill.jsx'
import {PartyModal} from './Parties.jsx'

export default function Sales({d,me}){
  const {refresh}=useContext(Ctx),su=me.role==='super'
  const prods=d.products.filter(p=>p.active),custs=d.parties.filter(p=>p.kind==='customer'&&p.active),bal=balances(d)
  const [cart,setCart]=useState([]),[pick,setPick]=useState({pid:'',qty:'',price:''}),[party,setParty]=useState(''),[disc,setDisc]=useState(''),[paidS,setPaidS]=useState(''),[note,setNote]=useState(''),[day,setDay]=useState(today())
  const [perr,setPerr]=useState(''),[busy,setBusy]=useState(false),[showId,setShowId]=useState(null),[np,setNp]=useState(false)
  const [fd,setFd]=useState(today()),[all,setAll]=useState(false),[q,setQ]=useState('')
  const sel=prods.find(p=>p.id===pick.pid)
  const choose=id=>{const p=prods.find(x=>x.id===id);setPick({pid:id,qty:'',price:p?p.sell:''});setPerr('')}
  const inCart=id=>sum(cart.filter(i=>i.pid===id),i=>i.qty)
  const add=()=>{
    const p=sel,qty=+pick.qty,price=+pick.price
    if(!p)return setPerr('আগে মাল বেছে নাও')
    if(!(qty>0))return setPerr('পরিমাণ দাও (০ এর বেশি)')
    if(!(price>=0)||pick.price==='')return setPerr('দাম দাও')
    const avail=r2(p.stock-inCart(p.id))
    if(qty>avail)return setPerr(`${p.name} - স্টকে আছে মাত্র ${bn(avail,3)} ${p.unit}, তুমি ${bn(qty,3)} ${p.unit} চেয়েছ`)
    setCart(c=>{const x=c.find(i=>i.pid===p.id&&i.price===price);return x?c.map(i=>i===x?{...i,qty:r2(i.qty+qty)}:i):[...c,{pid:p.id,qty,price}]})
    setPick({pid:'',qty:'',price:''});setPerr('')
  }
  const sub=r2(sum(cart,i=>r2(i.qty*i.price))),dc=+disc||0,total=r2(sub-dc),paid=paidS===''?total:+paidS,due=r2(total-paid)
  const errs=[]
  if(dc<0||dc>sub)errs.push(`ছাড় ঠিক নয় (সর্বোচ্চ ${money(sub)})`)
  if(paid<0)errs.push('টাকার পরিমাণ ঠিক নয়')
  if(paid>total)errs.push(`টাকা বেশি! মোট ${money(total)}, তুমি ${money(paid)} দিয়েছ — ${money(r2(paid-total))} বেশি`)
  if(due>0&&!party)errs.push('বাকি রাখতে কাস্টমার বেছে নাও')
  const stockErr=cart.map(i=>{const p=d.products.find(x=>x.id===i.pid);return p&&inCart(i.pid)>p.stock?`${p.name} - স্টকে আছে মাত্র ${bn(p.stock,3)} ${p.unit}`:null}).find(Boolean)
  if(stockErr)errs.push(stockErr)
  const save=async()=>{
    setBusy(true)
    const r=await sb.rpc('create_sale',{p_party:party||null,p_name:null,p_discount:dc,p_paid:paid,p_note:note||null,p_day:day,p_items:cart.map(i=>({pid:i.pid,qty:i.qty,price:i.price}))})
    setBusy(false);if(r.error)return toast(r.error.message,1)
    toast('বিক্রি সেভ হইছে ✅');setShowId(r.data);setCart([]);setDisc('');setPaidS('');setNote('');refresh()
  }
  const list=d.sales.filter(s=>(all||s.day===fd)&&(`${s.no} ${s.party_name}`.toLowerCase().includes(q.toLowerCase())))
  const bill=d.sales.find(s=>s.id===showId)
  const del=async b=>{if(!confirm(`#${b.no} ইনভয়েস মুছবো?\nস্টক ফেরত আসবে। কাস্টমারের জমা টাকা থাকলে সেটা অগ্রিম হিসেবে থাকবে।`))return;if(await run(sb.from('sales').delete().eq('id',b.id),'ইনভয়েস মুছেছে',refresh))setShowId(null)}
  return <div className="view"><div className="hd"><div><h1>🧾 বিক্রি</h1><p>নতুন ইনভয়েস বানাও, একসাথে অনেক মাল</p></div></div>
    <div className="card"><h2>১. মাল যোগ করো</h2>
      <div className="row"><F l="মাল"><select value={pick.pid} onChange={e=>choose(e.target.value)}><option value="">— বেছে নাও —</option>{prods.map(p=><option key={p.id} value={p.id}>{p.name} ({bn(p.stock,3)} {p.unit})</option>)}</select></F>
        <F l={`পরিমাণ ${sel?'('+sel.unit+')':''}`}><input type="number" step="any" inputMode="decimal" value={pick.qty} onChange={e=>setPick({...pick,qty:e.target.value})}/></F>
        <F l={`দাম ${sel?'(প্রতি '+sel.unit+')':''}`}><input type="number" step="any" inputMode="decimal" value={pick.price} onChange={e=>setPick({...pick,price:e.target.value})}/></F></div>
      <Err m={perr}/><button className="btn w" onClick={add}>➕ তালিকায় যোগ করো</button></div>
    {cart.length>0&&<div className="card view"><h2>২. ইনভয়েস</h2>
      {cart.map((i,k)=>{const p=d.products.find(x=>x.id===i.pid);return <div className="li" key={k}><span><b>{p?.name}</b><br/><span className="sm">{money(i.price)} / {p?.unit}</span></span>
        <span style={{display:'flex',gap:6,alignItems:'center'}}><input style={{width:84}} type="number" step="any" value={i.qty} onChange={e=>setCart(c=>c.map((x,j)=>j===k?{...x,qty:+e.target.value}:x))}/><b style={{minWidth:70,textAlign:'right'}}>{money(r2(i.qty*i.price))}</b><button className="mini r" onClick={()=>setCart(c=>c.filter((_,j)=>j!==k))}>✕</button></span></div>})}
      <div className="row"><F l="কাস্টমার (খালি = নগদ ক্রেতা)"><select value={party} onChange={e=>setParty(e.target.value)}><option value="">নগদ ক্রেতা</option>{custs.map(c=><option key={c.id} value={c.id}>{c.name}{c.phone?' • '+c.phone:''}</option>)}</select></F>
        <F l="তারিখ"><input type="date" value={day} max={today()} onChange={e=>setDay(e.target.value)}/></F></div>
      <button className="mini" style={{marginTop:8}} onClick={()=>setNp(true)}>➕ নতুন কাস্টমার</button>{party&&bal[party]!==0&&<span className="sm"> • আগের {bal[party]>0?'বাকি':'অগ্রিম'}: <b className={bal[party]>0?'neg':'pos'}>{money(Math.abs(bal[party]))}</b></span>}
      <div className="row"><F l="ছাড় (৳)"><input type="number" step="any" value={disc} onChange={e=>setDisc(e.target.value)}/></F><F l="কত টাকা দিলো? (খালি = পুরা)"><input type="number" step="any" value={paidS} placeholder={String(total)} onChange={e=>setPaidS(e.target.value)}/></F></div>
      <F l="নোট"><input value={note} onChange={e=>setNote(e.target.value)}/></F>
      <div className="tot"><div><span>সাবটোটাল</span><span>{money(sub)}</span></div>{dc>0&&<div><span>ছাড়</span><span className="neg">− {money(dc)}</span></div>}<div className="big"><span>মোট</span><span>{money(total)}</span></div><div><span>পরিশোধ</span><span className="pos">{money(paid)}</span></div><div><span>বাকি</span><span className={due>0?'neg':'pos'}>{money(due)}</span></div></div>
      {errs.map(e=><Err key={e} m={e}/>)}
      <button className="btn ok w" disabled={busy||errs.length>0} onClick={save}>{busy?'সেভ হচ্ছে...':'✅ ইনভয়েস সেভ করো'}</button></div>}
    <div className="card"><h2>📜 বিক্রির তালিকা</h2>
      <div className="row"><F l="তারিখ"><input type="date" value={fd} disabled={all} onChange={e=>setFd(e.target.value)}/></F><F l="খুঁজো (নাম / নম্বর)"><input value={q} onChange={e=>setQ(e.target.value)}/></F></div>
      <div className="seg"><button className={'mini '+(!all?'on':'')} onClick={()=>setAll(false)}>এই তারিখ</button><button className={'mini '+(all?'on':'')} onClick={()=>setAll(true)}>সব বিক্রি</button></div>
      <p className="sm">{bn(list.length)}টি ইনভয়েস • মোট {money(sum(list,s=>s.total))} • বাকি {money(sum(list,s=>s.total-s.paid))}</p>
      {list.slice(0,100).map((s,i)=><div className="li k" key={s.id} style={{animationDelay:i*25+'ms'}} onClick={()=>setShowId(s.id)}><span><b>#{s.no} • {s.party_name}</b><br/><span className="sm">{dt(s.created_at)} • {s.by_name} • {bn(s.sale_items.length)}টি মাল</span></span><span style={{textAlign:'right'}}><b>{money(s.total)}</b><br/>{s.total-s.paid>0?<Badge c="r">বাকি {money(s.total-s.paid)}</Badge>:<Badge c="g">পরিশোধ</Badge>}</span></div>)}
      {!list.length&&<Empty t="এই তারিখে কোনো বিক্রি নাই"/>}</div>
    {bill&&<Bill b={bill} kind="sale" su={su} shop={d.set.shop} phone={d.parties.find(p=>p.id===bill.party_id)?.phone} close={()=>setShowId(null)} del={()=>del(bill)}/>}
    {np&&<PartyModal kind="customer" close={()=>setNp(false)} saved={id=>{setParty(id);refresh()}}/>}</div>
}
