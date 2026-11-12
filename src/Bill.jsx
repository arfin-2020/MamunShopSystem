import { Modal, Badge, money, bn, dt, wa, copy, toast } from './lib.jsx'
export default function Bill({ b, kind, su, close, del, phone, shop }) {
  const sale = kind === 'sale', items = (sale ? b.sale_items : b.purchase_items) || [], due = b.total - b.paid
  const text = () => `${shop || ''}\n${sale ? 'ইনভয়েস' : 'ক্রয়'} #${b.no}\n${dt(b.created_at)}\n${b.party_name}\n` + items.map(i => `• ${i.pname} ${i.qty} ${i.unit || ''} × ${sale ? i.price : i.cost} = ${i.line}`).join('\n') + `\n${sale && b.discount > 0 ? 'ছাড়: ' + b.discount + '\n' : ''}মোট: ${b.total}\nদিয়েছে: ${b.paid}\nবাকি: ${due}`
  return <Modal t={(sale ? '🧾 ইনভয়েস #' : '📥 ক্রয় #') + b.no} close={close} w={580}>
    <p className="sm" style={{ margin: '6px 0' }}>📅 {dt(b.created_at)} • ✍️ {b.by_name || '-'}</p><b style={{ fontSize: 17 }}>{b.party_name}</b>
    <div style={{ overflowX: 'auto' }}><table><thead><tr><th>মাল</th><th>পরিমাণ</th><th>দাম</th><th>মোট</th></tr></thead><tbody>{items.map(i => <tr key={i.id}><td>{i.pname}</td><td>{bn(i.qty, 3)} {i.unit}</td><td>{money(sale ? i.price : i.cost)}</td><td>{money(i.line)}</td></tr>)}</tbody></table></div>
    <div className="tot">{sale && b.discount > 0 && <><div><span>সাবটোটাল</span><span>{money(b.subtotal)}</span></div><div><span>ছাড়</span><span className="neg">− {money(b.discount)}</span></div></>}
      <div className="big"><span>মোট</span><span>{money(b.total)}</span></div><div><span>পরিশোধ</span><span className="pos">{money(b.paid)}</span></div><div><span>বাকি</span><span className={due > 0 ? 'neg' : 'pos'}>{money(due)}</span></div>
      {sale && su && <div><span>এই বিক্রির লাভ</span><span className="pos">{money(items.reduce((t, i) => t + (i.price - i.cost) * i.qty, 0) - b.discount)}</span></div>}</div>
    {b.note && <p className="sm">📝 {b.note}</p>}
    <div className="row" style={{ marginTop: 12 }}><button className="mini" onClick={async () => toast(await copy(text()) ? 'কপি হইছে ✅' : 'কপি হয়নি')}>📋 কপি</button><button className="mini" onClick={() => wa(phone, text())}>💬 WhatsApp</button><button className="mini" onClick={() => window.print()}>🖨️ প্রিন্ট</button>{su && <button className="mini r" onClick={del}>🗑️ মুছো</button>}</div></Modal>
}
