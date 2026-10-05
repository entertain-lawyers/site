import re
import json

file_path = '/tmp/wp-audit-tmp/english/entertainlawyers-english.sql'

terms = {}
term_taxonomy = {}
term_relationships = {}
posts = {}

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

# Helper to extract tuples from INSERT INTO ... VALUES (...)
def extract_tuples(insert_str):
    tuples = []
    # Find all top level (...)
    # Since strings can contain parentheses, a regex like \((.*?)\)(?=,|;) is too naive.
    # We will just split by "),(" or "),\n(" which covers 99% of mysqldump output
    raw_tuples = re.split(r'\)\s*,\s*\(', insert_str)
    for rt in raw_tuples:
        clean_tuple = rt.strip().strip('()')
        tuples.append(clean_tuple)
    return tuples

print("File loaded, parsing terms...")
term_matches = re.findall(r"INSERT INTO `wpfn_terms`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in term_matches:
    for row in extract_tuples(m):
        parts = row.replace("'", '').split(',')
        if len(parts) >= 2:
            term_id = parts[0].strip()
            name = parts[1].strip()
            terms[term_id] = name

print("Parsing term taxonomy...")
tax_matches = re.findall(r"INSERT INTO `wpfn_term_taxonomy`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in tax_matches:
    for row in extract_tuples(m):
        parts = row.replace("'", '').split(',')
        if len(parts) >= 2:
            term_tax_id = parts[0].strip()
            term_id = parts[1].strip()
            term_taxonomy[term_tax_id] = term_id

print("Parsing term relationships...")
rel_matches = re.findall(r"INSERT INTO `wpfn_term_relationships`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in rel_matches:
    for row in extract_tuples(m):
        parts = row.replace("'", '').split(',')
        if len(parts) >= 2:
            object_id = parts[0].strip()
            term_tax_id = parts[1].strip()
            if object_id not in term_relationships:
                term_relationships[object_id] = []
            term_relationships[object_id].append(term_tax_id)

print("Parsing posts...")
post_matches = re.findall(r"INSERT INTO `wpfn_posts`.*?VALUES\s*(.*?);", sql, re.DOTALL | re.IGNORECASE)
for m in post_matches:
    for row in extract_tuples(m):
        # We need to extract the title (usually after date_gmt which is 4th field, content is 5th, title is 6th)
        # However, content has commas.
        # Let's extract ID and check if it's a published post
        if "'publish'" in row and "'post'" in row:
            # We can extract the ID from the very start
            id_match = re.match(r'^(\d+),', row)
            if id_match:
                post_id = id_match.group(1)
                
                # Title heuristic: look for `,'title string',` pattern right before the excerpt (empty string or so)
                # It's better to just extract anything between the 5th and 6th comma if we assume content doesn't break it
                # Actually, post_title comes after post_content. post_content can be HUGE and contain commas and quotes.
                # A safer heuristic is using regex to find post_name (slug) which is near the end
                # Instead of title, let's grab post_name or excerpt. 
                # Actually, `post_title` is immediately followed by `post_excerpt`, `post_status`, `comment_status`
                # So we can look for: `','([^']*)','','publish'` or `','([^']*)','[^']*','publish'`
                title_match = re.search(r",'([^']*)','[^']*','publish'", row)
                title = title_match.group(1) if title_match else "Unknown Title"
                
                posts[post_id] = {'id': post_id, 'title': title, 'categories': []}
                if post_id in term_relationships:
                     for tax_id in term_relationships[post_id]:
                         if tax_id in term_taxonomy:
                             posts[post_id]['categories'].append(int(term_taxonomy[tax_id]))

print(f"Extracted {len(posts)} published posts.")
with open('posts_data.json', 'w') as out:
    json.dump(posts, out, indent=2)
