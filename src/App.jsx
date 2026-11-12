import {useState,useEffect,useCallback} from 'react'
import {sb,Ctx,toast,one,sum,ROLE,run,F,useForm} from './lib.jsx'
import Dash from './Dash.jsx'
import Sales from './Sales.jsx'
import Stock from './Stock.jsx'
import Parties from './Parties.jsx'
import Money from './Money.jsx'
import Team from './Team.jsx'

const ok=d=>Promise.resolve({data:d})
function useData(me){
  const [d,setD]=useState(null),su=me.role==='super'
  const load=useCallback(async()=>{
    const r=await Promise.all([
      sb.from('settings').select('*').single(),
      sb.from('parties').select('*').order('name'),
      sb.from('products').select('*,product_costs(buy)').order('name'),
      sb.from('sales').select(su?'*,sale_items(*,sale_costs(cost))':'*,sale_items(*)').order('created_at',{ascending:false}).limit(5000),
      sb.from('payments').select('*').order('created_at',{ascending:false}),
      sb.from('expenses').select('*').order('created_at',{ascending:false}),
      su?sb.from('purchases').select('*,purchase_items(*)').order('created_at',{ascending:false}).limit(5000):ok([]),
      su?sb.from('profiles').select('*').order('created_at'):ok([])])
    const e=r.find(x=>x.error);if(e)return toast(e.error.message,1)
    const [st,pa,pr,sa,py,ex,pu,us]=r.map(x=>x.data)
    setD({set:st,parties:pa,
      products:pr.map(x=>({...x,buy:one(x.product_costs)?.buy??0})),
      sales:sa.map(s=>({...s,sale_items:(s.sale_items||[]).map(i=>({...i,cost:one(i.sale_costs)?.cost??0}))})),
      pays:py,exps:ex,purchases:pu,users:us})
  },[su])
  useEffect(()=>{
    load();let t
    const ch=sb.channel('live').on('postgres_changes',{event:'*',schema:'public'},()=>{clearTimeout(t);t=setTimeout(load,400)}).subscribe()
    const vis=()=>document.visibilityState==='visible'&&load();document.addEventListener('visibilitychange',vis)
    return()=>{clearTimeout(t);sb.removeChannel(ch);document.removeEventListener('visibilitychange',vis)}
  },[load])
  return [d,load]
}

function Login(){
  const [m,setM]=useState('in'),[f,s]=useForm({name:'',email:'',pw:''}),[busy,setBusy]=useState(false)
  const go=async()=>{
    setBusy(true)
    const r=m==='in'?await sb.auth.signInWithPassword({email:f.email,password:f.pw}):await sb.auth.signUp({email:f.email,password:f.pw,options:{data:{name:f.name}}})
    setBusy(false);if(r.error)toast(r.error.message,1);else if(m==='up'&&!r.data.session)toast('ইমেইল ভেরিফাই করে লগইন করো')
  }
  return <div className="login"><div className="card view"><div className="brand" style={{color:'var(--tx)'}}><div className="logo">🛒</div><div><b>দোকান ম্যানেজার</b><small>বিক্রি • স্টক • বাকি • লাভ</small></div></div>
    <h2>{m==='in'?'লগইন':'নতুন অ্যাকাউন্ট'}</h2>
    {m==='up'&&<F l="নাম"><input {...s('name')}/></F>}
    <F l="ইমেইল"><input type="email" {...s('email')}/></F>
    <F l="পাসওয়ার্ড (৬+ অক্ষর)"><input type="password" {...s('pw')} onKeyDown={e=>e.key==='Enter'&&go()}/></F>
    <button className="btn w" disabled={busy} onClick={go}>{busy?'অপেক্ষা করো...':m==='in'?'লগইন':'অ্যাকাউন্ট খোলো'}</button>
    <button className="btn g w" onClick={()=>setM(m==='in'?'up':'in')}>{m==='in'?'নতুন অ্যাকাউন্ট':'লগইনে ফিরো'}</button>
    {m==='up'&&<p className="sm">নতুন অ্যাকাউন্ট সুপার অ্যাডমিনের অনুমতির পরে চালু হবে।</p>}</div></div>
}

function Shell({me}){
  const [d,refresh]=useData(me),[tab,setTab]=useState('dash'),su=me.role==='super'
  const tabs=[['dash','🏠','হোম'],['sale','🧾','বিক্রি'],['stock','📦','মাল ও ক্রয়'],['party','👥','পার্টি'],['exp','💸','হিসাব'],...(su?[['team','🔐','টিম']]:[])]
  const View={dash:Dash,sale:Sales,stock:Stock,party:Parties,exp:Money,team:Team}[tab]
  const out=async()=>{await sb.rpc('log_login',{p_event:'logout',p_ua:navigator.userAgent});sessionStorage.removeItem('lg');sb.auth.signOut()}
  useEffect(()=>{if(!sessionStorage.getItem('lg')){sessionStorage.setItem('lg','1');sb.rpc('log_login',{p_event:'login',p_ua:navigator.userAgent})}},[])
  return <Ctx.Provider value={{refresh,me,go:setTab}}><div className="app">
    <aside className="side"><div className="brand"><div className="logo">🛒</div><div><b>{d?.set.shop||'...'}</b><small>দোকান ম্যানেজার</small></div></div>
      {tabs.map(([k,i,l])=><button key={k} className={'nv '+(tab===k?'on':'')} onClick={()=>setTab(k)}><span>{i}</span>{l}</button>)}
      <div className="me"><b>{me.name}</b>{ROLE[me.role]}<br/><button className="mini" style={{marginTop:8}} onClick={out}>বের হও</button></div></aside>
    <div><div className="bar-top"><b>🛒 {d?.set.shop||''}</b><button className="mini" onClick={out}>বের হও</button></div>
    <main className="main">{d?<View key={tab} d={d} me={me}/>:<><div className="skel"/><div className="skel"/><div className="skel"/></>}</main></div>
    <nav className="bnav">{tabs.map(([k,i,l])=><button key={k} className={tab===k?'on':''} onClick={()=>setTab(k)}><b>{i}</b>{l}</button>)}</nav></div></Ctx.Provider>
}

export default function App(){
  const [ses,setSes]=useState(undefined),[me,setMe]=useState(null),[ts,setT]=useState([])
  useEffect(()=>{
    sb.auth.getSession().then(r=>setSes(r.data.session));const{data}=sb.auth.onAuthStateChange((_,s)=>setSes(s))
    if(!sessionStorage.getItem('vs')){sessionStorage.setItem('vs','1');let sid=localStorage.getItem('sid');if(!sid){sid=Math.random().toString(36).slice(2);localStorage.setItem('sid',sid)};sb.from('visits').insert({sid,path:location.pathname,ua:navigator.userAgent}).then(()=>{})}
    return()=>data.subscription.unsubscribe()},[])
  useEffect(()=>{const h=e=>{const id=Math.random();setT(t=>[...t,{id,...e.detail}]);setTimeout(()=>setT(t=>t.filter(x=>x.id!==id)),4200)};window.addEventListener('toast',h);return()=>window.removeEventListener('toast',h)},[])
  useEffect(()=>{if(!ses){setMe(null);return}
    const l=()=>sb.from('profiles').select('*').eq('id',ses.user.id).single().then(r=>setMe(r.data));l()
    const ch=sb.channel('me').on('postgres_changes',{event:'*',schema:'public',table:'profiles',filter:'id=eq.'+ses.user.id},l).subscribe();return()=>sb.removeChannel(ch)},[ses])
  let body
  if(ses===undefined||(ses&&!me))body=<div className="main"><div className="skel"/><div className="skel"/></div>
  else if(!ses)body=<Login/>
  else if(me.role==='pending'||me.role==='off')body=<div className="login"><div className="card view"><h2>{me.role==='off'?'🚫 অ্যাকাউন্ট বন্ধ':'⏳ অনুমতির অপেক্ষায়'}</h2><p>সুপার অ্যাডমিন অনুমতি দিলে সব চালু হবে।</p><button className="btn g w" onClick={()=>sb.auth.signOut()}>বের হও</button></div></div>
  else body=<Shell me={me}/>
  return <>{body}{ts.map(t=><div key={t.id} className={'toast '+(t.bad?'bad':'')}>{t.m}</div>)}</>
}
