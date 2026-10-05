import os

with open('src/app/admin/posts/[id]/edit/EditPostClient.tsx', 'r') as f:
    content = f.read()

content = content.replace("import RichTextEditor from '@/components/editor/RichTextEditor';", "import RichTextEditor from '@/components/editor/RichTextEditor';\nimport ImageUpload from '@/components/admin/ImageUpload';")

old_image_block = """            <div>
              <label htmlFor="featuredImage" className="block text-sm font-bold text-navy dark:text-white mb-2 text-text-muted">Image URL</label>
              <input
                type="url"
                id="featuredImage"
                value={featuredImage}
                onChange={(e) => setFeaturedImage(e.target.value)}
                placeholder="https://example.com/image.jpg"
                className="block w-full rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-900 px-4 py-3 text-navy dark:text-white shadow-sm focus:border-accent focus:ring-1 focus:ring-accent transition-colors sm:text-sm"
              />
              {featuredImage && (
                <div className="mt-4 rounded-xl overflow-hidden border border-black/10 dark:border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={featuredImage} alt="Featured Preview" className="w-full h-auto object-cover aspect-video" onError={(e) => (e.currentTarget.style.display = 'none')} onLoad={(e) => (e.currentTarget.style.display = 'block')} />
                </div>
              )}
            </div>"""

new_image_block = """            <ImageUpload 
              value={featuredImage} 
              onChange={setFeaturedImage} 
              type="POST" 
            />"""

content = content.replace(old_image_block, new_image_block)

with open('src/app/admin/posts/[id]/edit/EditPostClient.tsx', 'w') as f:
    f.write(content)
