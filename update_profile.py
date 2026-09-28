import re

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

# I need to add state for subscriptions
content = content.replace("const [orders, setOrders] = useState<Order[]>([]);", 
                          "const [orders, setOrders] = useState<Order[]>([]);\n  const [subscriptions, setSubscriptions] = useState<any[]>([]);")

# I need to fetch subscriptions in useEffect
fetch_logic = """
      const qOrders = query(collection(db, 'orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      const qSubs = query(collection(db, 'subscription_orders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'));
      
      const [snapOrders, snapSubs] = await Promise.all([getDocs(qOrders), getDocs(qSubs)]);
      
      const ordersData = snapOrders.docs.map(doc => ({ id: doc.id, ...doc.data() } as Order));
      const subsData = snapSubs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setOrders(ordersData);
      setSubscriptions(subsData);
"""
# Replace original fetch
content = re.sub(r"const q = query\(collection\(db, 'orders'\).*?setOrders\(ordersData\);", fetch_logic, content, flags=re.DOTALL)

# Add UI for subscriptions
subs_ui = """
      {/* Сэтгүүлийн захиалгууд */}
      {subscriptions.length > 0 && (
        <section className="mb-12">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-6 border-b border-slate-100 pb-4">Миний захиалгууд (Багц)</h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="bg-amber-100 text-amber-800 text-xs font-bold px-3 py-1 rounded">
                      {sub.plan === 'quarterly' ? 'Улирал' : sub.plan === 'half-year' ? 'Хагас жил' : 'Жил'}
                    </span>
                    <span className="text-slate-500 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-bold text-[#0F172A] mb-2">{sub.price.toLocaleString()}₮</h3>
                  <div className="text-sm text-slate-600 mb-2">
                    <span className="font-medium">Хүргэлтийн төлөв:</span> 
                    {sub.deliveryStatus === 'pending' ? ' Хүлээгдэж буй' : sub.deliveryStatus === 'delivering' ? ' Хүргэлтэнд' : ' Хүргэгдсэн'}
                  </div>
                  {sub.digitalCode && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded mt-2">
                      <span className="font-medium">Цахим код:</span> <span className="font-bold text-[#0F172A]">{sub.digitalCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
"""

content = content.replace("      <section className=\"mb-12\">", subs_ui + "\n      <section className=\"mb-12\">")

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)
