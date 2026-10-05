import os
import glob

files = [
    "src/app/admin/ads/page.tsx",
    "src/app/admin/layout.tsx",
    "src/app/admin/posts/new/page.tsx",
    "src/app/admin/posts/page.tsx",
    "src/app/admin/resources/new/page.tsx",
    "src/app/admin/resources/page.tsx"
]

for f in files:
    with open(f, 'r') as file:
        content = file.read()
    
    # Replace the bypasses block
    content = content.replace("// TEMPORARILY DISABLED FOR LOCAL DEV\n  // const session = await auth();\n  // if (!session?.user || session.user.role !== \"ADMIN\") {\n  //   redirect(\"/\");\n  // }", "const session = await auth();\n  if (!session?.user || session.user.role !== \"ADMIN\") {\n    redirect(\"/\");\n  }")
    
    content = content.replace("// TEMPORARILY DISABLED FOR LOCAL DEV\n  // if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {\n  //   redirect('/');\n  // }", "if (!session?.user?.id || (session.user.role !== 'ADMIN' && session.user.role !== 'EDITOR')) {\n    redirect('/');\n  }")
    
    with open(f, 'w') as file:
        file.write(content)

print("Done")
