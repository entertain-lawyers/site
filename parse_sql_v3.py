import json

file_path = '/tmp/wp-audit-tmp/english/entertainlawyers-english.sql'

with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

def extract_values(table_name):
    print(f"Extracting {table_name}...")
    start_str = f"INSERT INTO `{table_name}`"
    idx = sql.find(start_str)
    tuples_list = []
    
    while idx != -1:
        val_start = sql.find('VALUES', idx)
        if val_start == -1:
            break
        val_start += 6
        
        end_idx = sql.find(';', val_start)
        
        # We need to parse tuples from val_start to end_idx safely
        # State machine
        in_string = False
        escape = False
        current_tuple = []
        current_val = []
        
        i = val_start
        # skip to first '('
        while i < end_idx and sql[i] != '(':
            i += 1
        i += 1 # skip '('
        
        while i < end_idx:
            c = sql[i]
            if escape:
                current_val.append(c)
                escape = False
            elif c == '\\':
                current_val.append(c)
                escape = True
            elif c == "'":
                in_string = not in_string
                current_val.append(c)
            elif c == ',' and not in_string:
                current_tuple.append("".join(current_val).strip())
                current_val = []
            elif c == ')' and not in_string:
                current_tuple.append("".join(current_val).strip())
                current_val = []
                tuples_list.append(current_tuple)
                current_tuple = []
                # Skip to next tuple
                while i < end_idx and sql[i] != '(':
                    i += 1
            else:
                current_val.append(c)
            i += 1
        
        idx = sql.find(start_str, end_idx)
    return tuples_list


term_tax = extract_values('wpfn_term_taxonomy')
term_rel = extract_values('wpfn_term_relationships')
posts = extract_values('wpfn_posts')
terms = extract_values('wpfn_terms')

print(f"Extracted {len(posts)} posts, {len(term_tax)} taxonomies, {len(term_rel)} relations, {len(terms)} terms.")

tax_to_term = {}
for t in term_tax:
    if len(t) >= 2:
        tax_to_term[t[0]] = t[1]

term_names = {}
for t in terms:
    if len(t) >= 2:
        term_names[t[0]] = t[1].strip("'")

post_cats = {}
for rel in term_rel:
    if len(rel) >= 2:
        pid = rel[0]
        tid = rel[1]
        if pid not in post_cats:
            post_cats[pid] = []
        if tid in tax_to_term:
            term_id = tax_to_term[tid]
            if term_id in term_names:
                post_cats[pid].append((term_id, term_names[term_id]))

parsed_posts = {}
for p in posts:
    if len(p) > 20:
        post_id = p[0]
        title = p[5].strip("'")
        content = p[4].strip("'")
        status = p[7].strip("'")
        post_type = p[20].strip("'")
        if status == 'publish' and post_type == 'post':
            parsed_posts[post_id] = {
                'title': title,
                'content_preview': content[:200].replace('\n', ' '),
                'categories': post_cats.get(post_id, [])
            }

print(f"Total published posts: {len(parsed_posts)}")

with open('posts_data.json', 'w', encoding='utf-8') as out:
    json.dump(parsed_posts, out, indent=2)

