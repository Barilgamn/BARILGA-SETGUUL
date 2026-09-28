with open("src/pages/Subscribe.tsx", "r") as f:
    content = f.read()

content = content.replace("createdAt: Date.now(),", "createdAt: Date.now(),\n        endDate: Date.now() + (formData.plan === 'yearly' ? 31536000000 : formData.plan === 'half-year' ? 15768000000 : 7884000000),")

with open("src/pages/Subscribe.tsx", "w") as f:
    f.write(content)
