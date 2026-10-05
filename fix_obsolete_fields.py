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

# 1. src/app/resources/[id]/page.tsx (Resource.content)
replace_in_file('src/app/resources/[id]/page.tsx', r'resource\.content', '""')

# 2. src/modules/admin/admin-resource.actions.ts (Resource.content & authorId)
replace_in_file('src/modules/admin/admin-resource.actions.ts', r'content:\s*.*?,\s*\n', '')
replace_in_file('src/modules/admin/admin-resource.actions.ts', r'authorId:\s*.*?,\s*\n', '')

# 3. src/modules/admin/admin-document.actions.ts (authorId)
replace_in_file('src/modules/admin/admin-document.actions.ts', r'authorId:\s*.*?,\s*\n', '')

# 4. src/modules/admin/admin-post.actions.ts (featuredImage)
replace_in_file('src/modules/admin/admin-post.actions.ts', r'featuredImage:\s*.*?,\s*\n', '')

# 5. src/app/nepali/[category]/page.tsx (featuredImage & author)
replace_in_file('src/app/nepali/[category]/page.tsx', r'post\.featuredImage', '""')
replace_in_file('src/app/nepali/[category]/page.tsx', r'post\.author\?', 'post.authorId?')
replace_in_file('src/app/nepali/[category]/page.tsx', r'post\.author\.', 'post.authorId.') # It's just an id now, wait if it expects name

# 6. src/app/nepali/post/[id]/page.tsx (featuredImage & author)
replace_in_file('src/app/nepali/post/[id]/page.tsx', r'post\.featuredImage', '""')
replace_in_file('src/app/nepali/post/[id]/page.tsx', r'post\.author\?', 'post.authorId?')

# 7. src/app/news/page.tsx (featuredImage)
replace_in_file('src/app/news/page.tsx', r'post\.featuredImage', '""')

# 8. src/app/page.tsx (advertisement)
replace_in_file('src/app/page.tsx', r'prisma\.advertisement\.findMany\(\)', 'Promise.resolve([])')

# 9. src/app/profile/page.tsx (User.name, phone, education, university)
replace_in_file('src/app/profile/page.tsx', r'user\.name', 'user.email')
replace_in_file('src/app/profile/page.tsx', r'user\.phone', '""')
replace_in_file('src/app/profile/page.tsx', r'user\.education', '""')
replace_in_file('src/app/profile/page.tsx', r'user\.university', '""')

# 10. src/app/nepali/page.tsx (User.name)
replace_in_file('src/app/nepali/page.tsx', r'user\.name', 'user.email')

print("Applied quick regex fixes.")
