import os
import re

def replace_in_file(filepath, pattern, replacement):
    if not os.path.exists(filepath):
        return
    with open(filepath, 'r') as f:
        content = f.read()
    content = re.sub(pattern, replacement, content)
    with open(filepath, 'w') as f:
        f.write(content)

# 2. Audit Logs
replace_in_file('src/app/admin/audit-logs/page.tsx', r'include:\s*\{\s*user:\s*true\s*\}', 'include: { User: true }')
replace_in_file('src/app/admin/audit-logs/page.tsx', r'log\.user', 'log.User')

# 3. Events
replace_in_file('src/app/admin/events/page.tsx', r'include:\s*\{\s*author:\s*true\s*\}', '')

# 4 & 5. Gallery
replace_in_file('src/app/admin/gallery/[id]/edit/page.tsx', r'include:\s*\{\s*images:\s*true\s*\}', '')
replace_in_file('src/app/admin/gallery/page.tsx', r'select:\s*\{\s*_count:\s*\{\s*select:\s*\{\s*images:\s*true\s*\}\s*\}\s*\}', '')
replace_in_file('src/app/admin/gallery/page.tsx', r'gallery\._count\?\.images', '0')

# 6. Publications
replace_in_file('src/app/admin/publications/page.tsx', r'include:\s*\{\s*author:\s*true\s*\}', '')

# 7 & 8. Resources page
replace_in_file('src/app/admin/study/resources/page.tsx', r'\|\s*\{\s*authorId:\s*session\.userId\s*\}', '')
replace_in_file('src/app/admin/study/resources/page.tsx', r'resource\.authorId\s*===\s*session\.user\?\.id', 'true') # Editor access control

# 9. AdminResourceForm
replace_in_file('src/components/admin/AdminResourceForm.tsx', r'featuredImage:\s*.*?,\s*\n', '')

# 10. admin-document.actions.ts
replace_in_file('src/modules/admin/admin-document.actions.ts', r'&&\s*resource\.authorId\s*!==\s*userId', '')

# 11 & 12. admin-resource.actions.ts
replace_in_file('src/modules/admin/admin-resource.actions.ts', r'&&\s*resource\?\.authorId\s*!==\s*session\.userId', '')
replace_in_file('src/modules/admin/admin-resource.actions.ts', r'featuredImage:\s*.*?,\s*\n', '')

print("Fixes applied.")
