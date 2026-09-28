with open("src/pages/Admin.tsx", "r") as f:
    content = f.read()

# Add end date calculation
content = content.replace("createdAt: Date.now()", "createdAt: Date.now(), endDate: Date.now() + (formData.plan === 'yearly' ? 31536000000 : formData.plan === 'half-year' ? 15768000000 : 7884000000)")

# Add "Expiring soon" filter option
content = content.replace("<option value=\"delivered\">Хүргэгдсэн</option>", "<option value=\"delivered\">Хүргэгдсэн</option>\n            <option value=\"expiring\">Хугацаа дуусч буй</option>")

# Update filter logic
new_filter_logic = """
  const filteredOrders = orders.filter(o => {
    const matchSearch = (o.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.phone?.includes(searchTerm));
    
    let matchStatus = true;
    if (filterStatus !== 'all') {
      if (filterStatus === 'expiring') {
        const now = Date.now();
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;
        // End date exists and is within the next 30 days or already expired
        matchStatus = o.endDate ? (o.endDate - now <= thirtyDays) : false;
      } else {
        matchStatus = o.deliveryStatus === filterStatus;
      }
    }
    
    return matchSearch && matchStatus;
  });
"""
content = content.replace("  const filteredOrders = orders.filter(o => {\n    const matchSearch = (o.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) || o.phone?.includes(searchTerm));\n    const matchStatus = filterStatus === 'all' || o.deliveryStatus === filterStatus;\n    return matchSearch && matchStatus;\n  });", new_filter_logic)


# Update table columns to show end date
content = content.replace("<th className=\"px-4 py-3 font-medium\">Хүргэлт</th>", "<th className=\"px-4 py-3 font-medium\">Хүргэлт</th>\n                <th className=\"px-4 py-3 font-medium\">Хүчинтэй</th>")
content = content.replace("<td className=\"px-4 py-4\">\n                      {getStatusBadge(order.deliveryStatus)}\n                    </td>", "<td className=\"px-4 py-4\">\n                      {getStatusBadge(order.deliveryStatus)}\n                    </td>\n                    <td className=\"px-4 py-4 text-sm text-slate-500\">\n                      {order.endDate ? new Date(order.endDate).toLocaleDateString() : '-'}\n                    </td>")

with open("src/pages/Admin.tsx", "w") as f:
    f.write(content)
