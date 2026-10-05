with open("src/app/resources/[id]/page.tsx", "r") as f:
    content = f.read()
content = content.replace("{!resource.documentId && !&& (", "{!resource.documentId && (")
content = content.replace("{hasAccess && && (", "{hasAccess && false && (")
content = content.replace("dangerouslySetInnerHTML={{ __html:  }}", "dangerouslySetInnerHTML={{ __html: \"\" }}")
with open("src/app/resources/[id]/page.tsx", "w") as f:
    f.write(content)
