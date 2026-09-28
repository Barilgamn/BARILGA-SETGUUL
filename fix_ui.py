import sys

with open("src/pages/Profile.tsx", "r") as f:
    content = f.read()

subs_ui = """
      {/* Сэтгүүлийн захиалгууд */}
      {subscriptions.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-bold text-[#0F172A] mb-4">Сэтгүүлийн захиалгууд (Багц)</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {subscriptions.map(sub => (
              <div key={sub.id} className="bg-white rounded-xl border border-slate-200 p-5 flex flex-col justify-between shadow-sm">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-[#F59E0B] text-white text-xs font-bold px-2 py-1 rounded">
                      {sub.plan === 'quarterly' ? 'Улирал' : sub.plan === 'half-year' ? 'Хагас жил' : 'Жил'}
                    </span>
                    <span className="text-slate-500 text-sm">{new Date(sub.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-extrabold text-[#0F172A] text-lg mb-1">{sub.price.toLocaleString()}₮</h3>
                  <div className="text-sm text-slate-600 mb-2">
                    <span className="font-medium">Хүргэлтийн төлөв:</span> 
                    {sub.deliveryStatus === 'pending' ? ' Хүлээгдэж буй' : sub.deliveryStatus === 'delivering' ? ' Хүргэлтэнд' : ' Хүргэгдсэн'}
                  </div>
                  {sub.digitalCode && (
                    <div className="text-sm text-slate-600 bg-slate-50 p-2 rounded border border-slate-100 mt-2">
                      <span className="font-medium">Цахим код:</span> <span className="font-bold text-[#0F172A] ml-1">{sub.digitalCode}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
"""

content = content.replace("{/* Tabs */}", subs_ui + "\n      {/* Tabs */}")

with open("src/pages/Profile.tsx", "w") as f:
    f.write(content)
