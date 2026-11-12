import {useState,useContext,useMemo} from 'react'
import {sb,Ctx,F,Err,Modal,Badge,Empty,Stat,bn,money,r2,dt,today,sum,run,toast,balances,useForm,copy,wa} from './lib.jsx'

export function PartyModal({kind,item,close,saved}){
  const {refresh}=useContext(Ctx),[f,s]=useForm({name:item?.name||'',phone:item?.phone||'',address:item?.address||'',note:item?.note||'',opening:item?.opening||''}),[act,setAct]=useState(item?item.active:true),[err,setErr]=useState(''),[busy,setBusy]=useState(false)
  const sup=(item?.kind||kind)==='supplier'
  const go=async()=>{
    if(!f.name.trim())return setErr('নাম দিতেই হবে')
    if(f.opening!==''&&+f.opening<0)return setErr('শুরুর বাকি ঋণাত্মক হতে পারে না')
    const row={name:f.name.trim(),phone:f.phone.trim()||null,address:f.address.trim()||null,note:f.note.trim()||null,opening:+f.opening||0,active:act}
    setBusy(true)
    const r=item?await sb.from('parties').update(row).eq('id',item.id).select().single():await sb.from('parties').insert({...row,kind}).select().single()
    setBusy(false);if(r.error)return setErr(r.error.message)
    toast(item?'আপডেট হইছে ✅':'যোগ হইছে ✅');refresh();saved&&saved(r.data.id);close()
  }
  return <Modal t={(item?'✏️ এডিট: ':'➕ নতুন ')+(sup?'সরবরাহকারী':'কাস্টমার')} close={close}>
    <F l="নাম *"><input autoFocus {...s('name')}/></F><F l="ফোন নম্বর"><input type="tel" inputMode="tel" {...s('phone')}/></F><F l="ঠিকানা / এলাকা"><input {...s('address')}/></F>
    <F l={sup?'শুরুর বাকি (আমি তাকে দিবো)':'শুরুর বাকি (সে আমাকে দিবে)'}><input type="number" step="any" {...s('opening')}/></F>
    <F l="নোট"><input {...s('note')}/></F>
    {item&&<label className="f"><input type="checkbox" style={{width:20,height:20}} checked={act} onChange={e=>setAct(e.target.checked)}/> চালু (বন্ধ করলে তালিকা থেকে লুকাবে, হিসাব থাকবে)</label>}
    {item&&item.edited_at&&<p className="sm">সর্বশেষ এডিট: {dt(item.edited_at)}</p>}
    <Err m={err}/><button className="btn w" disabled={busy} onClick={go}>{busy?'...':'সেভ করো'}</button></Modal>
}

function PayModal({p,bal,close}){
  const {refresh}=useContext(Ctx),[a,setA]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),sup=p.kind==='supplier'
  const amt=+a,err=a===''?'':!(amt>0)?'ঠিক পরিমাণ দাও':amt>bal?`টাকা বেশি! বাকি মাত্র ${money(bal)}, তুমি ${money(amt)} দিয়েছ — ${money(r2(amt-bal))} বেশি`:''
  const go=async()=>{setBusy(true);const ok=await run(sb.from('payments').insert({day:today(),party_id:p.id,amt,note:note||null}),sup?'পরিশোধ সেভ হইছে ✅':'জমা সেভ হইছে ✅',refresh);setBusy(false);ok&&close()}
  return <Modal t={(sup?'📤 পরিশোধ: ':'💵 জমা নিন: ')+p.name} close={close}>
    <div className="tot"><div className="big"><span>বর্তমান বাকি</span><span className="neg">{money(bal)}</span></div></div>
    <F l="টাকা"><input autoFocus type="number" step="any" inputMode="decimal" value={a} onChange={e=>setA(e.target.value)}/></F>
    <button className="mini" style={{marginTop:6}} onClick={()=>setA(String(bal))}>পুরা বাকি ({money(bal)})</button>
    <F l="নোট (যেমন: বিকাশ / নগদ)"><input value={note} onChange={e=>setNote(e.target.value)}/></F>
    <Err m={err}/><p className="sm">📅 {dt(new Date())}</p><button className="btn ok w" disabled={busy||!(amt>0)||!!err} onClick={go}>সেভ করো</button></Modal>
}

function Ledger({p,d,su,bal,close,pay}){
  const {refresh}=useContext(Ctx),sup=p.kind==='supplier'
  const rows=useMemo(()=>{
    const r=[];if(+p.opening>0)r.push({t:p.created_at,x:'শুরুর বাকি',db:+p.opening,cr:0})
    ;(sup?d.purchases:d.sales).filter(s=>s.party_id===p.id).forEach(s=>r.push({t:s.created_at,x:`${sup?'ক্রয়':'বিক্রি'} #${s.no}`,sub:(sup?s.purchase_items:s.sale_items).map(i=>`${i.pname} ${bn(i.qty,3)}${i.unit||''}`).join(', '),db:s.total,cr:s.paid,by:s.by_name}))
    d.pays.filter(x=>x.party_id===p.id).forEach(x=>r.push({t:x.created_at,x:sup?'পরিশোধ করেছি':'জমা নিয়েছি',sub:x.note,db:0,cr:x.amt,by:x.by_name,pid:x.id,ed:x.edited_at}))
    r.sort((a,b)=>new Date(a.t)-new Date(b.t));let run=0;r.forEach(x=>{run=r2(run+x.db-x.cr);x.run=run});return r.reverse()
  },[p,d])
  const text=()=>`${d.set.shop}\n${p.name} - হিসাব\n`+[...rows].reverse().map(x=>`${dt(x.t)} • ${x.x}${x.db?' বিল '+x.db:''}${x.cr?' জমা '+x.cr:''}`).join('\n')+`\n${bal>=0?'মোট বাকি':'অগ্রিম জমা'}: ${Math.abs(bal)} টাকা`
  const delPay=async id=>{if(confirm('এই জমা এন্ট্রি মুছবো? বাকি আবার বেড়ে যাবে।'))run(sb.from('payments').delete().eq('id',id),'মুছেছে',refresh)}
  return <Modal t={'📒 '+p.name} close={close} w={680}>
    <p className="sm" style={{margin:'6px 0'}}>{p.phone&&'📞 '+p.phone+'  '}{p.address&&'📍 '+p.address}</p>
    <div className="tot"><div className="big"><span>{bal<0?'অগ্রিম জমা':sup?'আমি দিবো':'আমি পাবো'}</span><span className={bal>0?'neg':'pos'}>{money(Math.abs(bal))}</span></div></div>
    <div className="row" style={{marginTop:10}}>{bal>0&&<button className="mini gr" onClick={pay}>{sup?'📤 পরিশোধ':'💵 জমা নিন'}</button>}<button className="mini" onClick={async()=>toast(await copy(text())?'কপি হইছে ✅':'কপি হয়নি')}>📋 কপি</button><button className="mini" onClick={()=>wa(p.phone,text())}>💬 WhatsApp</button><button className="mini" onClick={()=>window.print()}>🖨️ প্রিন্ট</button></div>
    <div style={{overflowX:'auto'}}><table><thead><tr><th>তারিখ ও সময়</th><th>বিবরণ</th><th>বিল</th><th>জমা</th><th>ব্যালেন্স</th>{su&&<th></th>}</tr></thead><tbody>{rows.map((x,i)=><tr key={i}><td style={{whiteSpace:'nowrap'}}>{dt(x.t)}</td><td style={{textAlign:'left'}}><b>{x.x}</b>{x.ed&&<Badge c="a">এডিটেড</Badge>}<br/><span className="sm">{x.sub}{x.by&&' • '+x.by}</span></td><td>{x.db?money(x.db):'-'}</td><td className="pos">{x.cr?money(x.cr):'-'}</td><td className={x.run>0?'neg':'pos'}>{money(x.run)}</td>{su&&<td>{x.pid&&<button className="mini r" onClick={()=>delPay(x.pid)}>🗑️</button>}</td>}</tr>)}</tbody></table></div>
    {!rows.length&&<Empty t="এখনো কোনো লেনদেন নাই"/>}</Modal>
}

const hue=n=>['#6366f1','#0ea5e9','#10b981','#f59e0b','#e11d48','#8b5cf6','#14b8a6'][[...n].reduce((t,c)=>t+c.charCodeAt(0),0)%7]
export default function Parties({d,me}){
  const {refresh}=useContext(Ctx),su=me.role==='super',[kind,setKind]=useState('customer'),[q,setQ]=useState(''),[m,setM]=useState(null),[hid,setHid]=useState(false)
  const bal=balances(d),list=d.parties.filter(p=>p.kind===kind&&(hid||p.active)&&`${p.name} ${p.phone||''} ${p.address||''}`.toLowerCase().includes(q.toLowerCase())).sort((a,b)=>bal[b.id]-bal[a.id])
  const last=p=>[...d.sales,...d.purchases,...d.pays].filter(x=>x.party_id===p.id).map(x=>x.created_at).sort().pop()
  const all=d.parties.filter(p=>p.kind===kind),owed=sum(all,p=>Math.max(0,bal[p.id])),adv=sum(all,p=>Math.max(0,-bal[p.id]))
  const del=async p=>{if(!confirm(p.name+' কে মুছবো?'))return;const {error}=await sb.from('parties').delete().eq('id',p.id);if(error)toast(error.code==='23503'?'এর লেনদেন আছে, মুছা যাবে না। এডিটে গিয়ে "চালু" বন্ধ করো।':error.message,1);else{toast('মুছেছে');refresh()}}
  const sup=kind==='supplier'
  return <div className="view"><div className="hd"><div><h1>👥 পার্টি</h1><p>কাস্টমার ও সরবরাহকারীর পুরা হিসাব</p></div><button className="btn" onClick={()=>setM({t:'form'})}>➕ নতুন {sup?'সরবরাহকারী':'কাস্টমার'}</button></div>
    {su&&<div className="seg"><button className={'mini '+(!sup?'on':'')} onClick={()=>setKind('customer')}>👤 কাস্টমার</button><button className={'mini '+(sup?'on':'')} onClick={()=>setKind('supplier')}>🏭 সরবরাহকারী</button></div>}
    <div className="grid"><Stat l={sup?'মোট আমি দিবো':'মোট আমি পাবো'} v={owed} i={sup?'📤':'📥'} c="#e11d48"/><Stat l="অগ্রিম জমা" v={adv} i="🪙" c="#059669"/><Stat l="মোট পার্টি" v={all.length} i="👥" c="#6366f1" n/></div>
    <div className="card"><input placeholder="🔍 নাম / ফোন / ঠিকানা দিয়ে খুঁজো" value={q} onChange={e=>setQ(e.target.value)}/><label className="sm"><input type="checkbox" style={{width:16,height:16}} checked={hid} onChange={e=>setHid(e.target.checked)}/> বন্ধ করা পার্টিও দেখাও</label>
      {list.map((p,i)=>{const b=bal[p.id];return <div className="li" key={p.id} style={{animationDelay:i*25+'ms',opacity:p.active?1:.55}}>
        <span style={{display:'flex',gap:12,alignItems:'center',cursor:'pointer',minWidth:0}} onClick={()=>setM({t:'ledger',p})}><div className="av" style={{'--c':hue(p.name)}}>{p.name[0]}</div><span style={{minWidth:0}}><b>{p.name}</b> {!p.active&&<Badge c="n">বন্ধ</Badge>}<br/><span className="sm">{p.phone&&'📞 '+p.phone+' '}{p.address&&'📍 '+p.address}<br/>🕒 শেষ লেনদেন: {dt(last(p))}</span></span></span>
        <span style={{textAlign:'right',flex:'none'}}>{b>0?<Badge c="r">{sup?'দিবো':'বাকি'} {money(b)}</Badge>:b<0?<Badge c="g">অগ্রিম {money(-b)}</Badge>:<Badge c="n">পরিষ্কার</Badge>}<br/>
          <span style={{display:'inline-flex',gap:4,marginTop:6}}><button className="mini" onClick={()=>setM({t:'ledger',p})}>📒</button>{b>0&&<button className="mini gr" onClick={()=>setM({t:'pay',p})}>{sup?'📤':'💵'}</button>}{su&&<><button className="mini" onClick={()=>setM({t:'form',p})}>✏️</button><button className="mini r" onClick={()=>del(p)}>🗑️</button></>}</span></span></div>})}
      {!list.length&&<Empty i="👤" t="কেউ নাই। উপরে ➕ চেপে যোগ করো"/>}</div>
    {m?.t==='form'&&<PartyModal kind={kind} item={m.p} close={()=>setM(null)}/>}
    {m?.t==='pay'&&<PayModal p={m.p} bal={bal[m.p.id]} close={()=>setM(null)}/>}
    {m?.t==='ledger'&&<Ledger p={d.parties.find(x=>x.id===m.p.id)||m.p} d={d} su={su} bal={bal[m.p.id]} close={()=>setM(null)} pay={()=>setM({t:'pay',p:m.p})}/>}</div>
}
