# WORDPRESS MEDIA INVENTORY

## 1. Archives Analyzed
- `english/entertainlawyers-english-uploads.zip` (837MB uncompressed)
- `nepali/entertainlawyers-nepali-uploads.zip` (229MB uncompressed)

## 2. File Statistics

### English Media (wp-content/uploads/)
- **Total Files:** 6,524
- **PDF Documents (`*.pdf`):** 21
- **Word Documents (`*.doc`, `*.docx`):** 0
- **Images:** >6,400 (The vast majority are automatically generated WordPress thumbnails for various image sizes like `150x150`, `300x200`, `1024x768`, etc.)
- **Duplicate Images:** Because WordPress generates responsive thumbnails, a single uploaded featured image results in 5–8 files on disk.

### Nepali Media (wp-content/uploads/)
- **Total Files:** 3,925
- **PDF Documents (`*.pdf`):** 0
- **Word Documents (`*.doc`, `*.docx`):** 0
- **Images:** >3,900 (Again, standard WordPress thumbnail explosion).

## 3. Directory Structure
Both archives follow the standard WordPress date-based structure:
`wp-content/uploads/YYYY/MM/filename.ext`

## 4. Relationship Between English and Nepali Media
There are zero PDFs in the Nepali uploads directory. This suggests:
1. Educational resources containing PDFs are primarily managed/uploaded on the English site.
2. The Nepali site may link directly to PDFs hosted on the English site's domain.
3. Or the Nepali site exclusively focuses on translated News/Blogs without accompanying PDF study materials.

## 5. Migration Strategy & Missing Media
When migrating media to the new R2 architecture:
1. **Ignore Thumbnails:** The migration script must *only* upload the original source images to R2. Thumbnails (e.g., `image-150x150.jpg`) should be ignored. The new Next.js application leverages dynamic `next/image` optimization instead of static pre-rendered thumbnails.
2. **Extracting PDFs:** Since there are exactly 21 PDFs in the English `uploads/` folder, and potentially hundreds of study materials, many study materials may either:
   - Not have a PDF.
   - Embed PDFs from external services (e.g., Google Drive, external links).
   - Use Elementor to render text directly rather than linking a document.
   The migration pipeline must handle all these edge cases.
