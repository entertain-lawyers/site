import re
import json

file_path = '/tmp/wp-audit-tmp/english/entertainlawyers-english.sql'

terms = {}
term_taxonomy = {}
term_relationships = {}
posts = {}

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

print("File loaded, parsing terms...")
term_matches = re.findall(r"INSERT INTO `wpfn_terms`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in term_matches:
    rows = m.split('),(')
    for row in rows:
        parts = row.replace('(', '').replace(')', '').replace("'", '').split(',')
        if len(parts) >= 2:
            term_id = parts[0].strip()
            name = parts[1].strip()
            terms[term_id] = name

print("Parsing term taxonomy...")
tax_matches = re.findall(r"INSERT INTO `wpfn_term_taxonomy`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in tax_matches:
    rows = m.split('),(')
    for row in rows:
        parts = row.replace('(', '').replace(')', '').replace("'", '').split(',')
        if len(parts) >= 2:
            term_tax_id = parts[0].strip()
            term_id = parts[1].strip()
            term_taxonomy[term_tax_id] = term_id

print("Parsing term relationships...")
rel_matches = re.findall(r"INSERT INTO `wpfn_term_relationships`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in rel_matches:
    rows = m.split('),(')
    for row in rows:
        parts = row.replace('(', '').replace(')', '').replace("'", '').split(',')
        if len(parts) >= 2:
            object_id = parts[0].strip()
            term_tax_id = parts[1].strip()
            if object_id not in term_relationships:
                term_relationships[object_id] = []
            term_relationships[object_id].append(term_tax_id)

print("Parsing posts...")
post_matches = re.findall(r"INSERT INTO `wpfn_posts`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in post_matches:
    # Use split by line or specific tuple end
    # A single insert can contain many tuples. Let's just find all (id, ..., 'publish', ... 'post')
    tuples = re.findall(r"\((\d+),.*?'publish'.*?'post'.*?\)", m, re.IGNORECASE)
    # This regex is too strict, let's just split by "\n(" because mysqldump starts new tuples on a new line often
    rows = re.split(r'\),\n\(', m)
    for row in rows:
        if "'publish'" in row and "'post'" in row:
             parts = row.split(',')
             if len(parts) > 5:
                 post_id = parts[0].replace('(', '').strip()
                 # Post title is usually the 6th item
                 title = parts[5].replace("'", "").strip()
                 posts[post_id] = {'id': post_id, 'title': title, 'categories': []}
                 
                 if post_id in term_relationships:
                     for tax_id in term_relationships[post_id]:
                         if tax_id in term_taxonomy:
                             posts[post_id]['categories'].append(int(term_taxonomy[tax_id]))

print(f"Extracted {len(posts)} published posts.")
with open('posts_data.json', 'w') as out:
    json.dump(posts, out, indent=2)
