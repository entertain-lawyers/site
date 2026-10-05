import os

with open('src/components/editor/RichTextEditor.tsx', 'r') as f:
    content = f.read()

content = content.replace("import React, { useMemo, useState } from 'react';", "import React, { useMemo, useState, useRef, useCallback } from 'react';\nimport { initiateMediaUploadAction } from '@/modules/admin/admin-media.actions';")

old_modules = """  // Modules configuration for Quill
  const modules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      [{ indent: '-1' }, { indent: '+1' }],
      ['link', 'image', 'video'],
      [{ color: [] }, { background: [] }],
      ['clean'],
    ],
  }), []);"""

new_modules = """  const reactQuillRef = useRef<any>(null);

  const imageHandler = useCallback(() => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/jpeg,image/png,image/webp,image/gif');
    input.click();

    input.onchange = async () => {
      const file = input.files ? input.files[0] : null;
      if (!file) return;

      try {
        const res = await initiateMediaUploadAction({
          filename: file.name,
          mimeType: file.type as any,
          size: file.size,
          type: 'RICH_TEXT',
        });

        if (!res?.success || !res.data) {
          throw new Error((res as any)?.error || 'Upload initialization failed');
        }

        const uploadRes = await fetch(res.data.uploadUrl, {
          method: 'PUT',
          body: file,
          headers: { 'Content-Type': file.type },
        });

        if (!uploadRes.ok) throw new Error('Failed to upload file');

        const editor = reactQuillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection();
          editor.insertEmbed(range ? range.index : 0, 'image', res.data.publicUrl);
        }
      } catch (err) {
        alert('Failed to upload image: ' + (err as Error).message);
      }
    };
  }, []);

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, 5, 6, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ indent: '-1' }, { indent: '+1' }],
        ['link', 'image', 'video'],
        [{ color: [] }, { background: [] }],
        ['clean'],
      ],
      handlers: {
        image: imageHandler,
      }
    }
  }), [imageHandler]);"""

content = content.replace(old_modules, new_modules)
content = content.replace('<ReactQuill\n        theme="snow"', '<ReactQuill\n        ref={reactQuillRef}\n        theme="snow"')

with open('src/components/editor/RichTextEditor.tsx', 'w') as f:
    f.write(content)
