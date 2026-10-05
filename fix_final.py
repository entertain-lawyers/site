import re

def rep(file, old, new):
    with open(file, 'r') as f:
        c = f.read()
    c = c.replace(old, new)
    with open(file, 'w') as f:
        f.write(c)

rep('src/app/admin/audit-logs/page.tsx', 'include: {\n      user: {\n        select: { name: true, email: true, role: true }\n      }\n    }', 'include: { User: { select: { email: true, role: true } } }')
rep('src/app/admin/audit-logs/page.tsx', 'log.User ? (log.User.name || log.User.email)', 'log.User ? log.User.email')

rep('src/app/admin/events/page.tsx', 'include: { author: { select: { email: true } } }', '')
rep('src/app/admin/gallery/[id]/edit/page.tsx', "include: { images: { orderBy: { order: 'asc' } } }", "")
rep('src/app/admin/gallery/page.tsx', 'include: { _count: { select: { images: true } } }', '')
rep('src/app/admin/gallery/page.tsx', '{gal._count.images} images', '')

rep('src/app/admin/publications/page.tsx', 'include: { author: { select: { email: true } }, document: true }', 'include: { document: true }')

rep('src/app/admin/study/resources/page.tsx', '| { authorId: session.user.id }', '')
rep('src/app/admin/study/resources/page.tsx', '{ authorId: session.user.id }', 'undefined /* removed authorId */')
rep('src/app/admin/study/resources/page.tsx', '|| resource.authorId === session?.user?.id', '')

print("Done")
