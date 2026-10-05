import gzip
import json

file_path = '/home/amrit/Projects/Entertain Lawyer/wordpress-migration-source/english/entertainlawyers-english.sql.gz'
with gzip.open(file_path, 'rt', encoding='utf-8', errors='ignore') as f:
    sql = f.read()

def extract_values(table_name):
    start_str = f"INSERT INTO `{table_name}`"
    idx = sql.find(start_str)
    tuples_list = []
    
    while idx != -1:
        val_start = sql.find('VALUES', idx)
        if val_start == -1: break
        val_start += 6
        end_idx = sql.find(';', val_start)
        
        in_string = False
        escape = False
        current_tuple = []
        current_val = []
        
        i = val_start
        while i < end_idx and sql[i] != '(': i += 1
        i += 1 
        
        while i < end_idx:
            c = sql[i]
            if escape: current_val.append(c); escape = False
            elif c == '\\': current_val.append(c); escape = True
            elif c == "'": in_string = not in_string; current_val.append(c)
            elif c == ',' and not in_string: current_tuple.append("".join(current_val).strip()); current_val = []
            elif c == ')' and not in_string:
                current_tuple.append("".join(current_val).strip())
                tuples_list.append(current_tuple)
                current_tuple = []
                current_val = []
                while i < end_idx and sql[i] != '(': i += 1
            else: current_val.append(c)
            i += 1
        idx = sql.find(start_str, end_idx)
    return tuples_list

terms = extract_values('wpfn_terms')
term_tax = extract_values('wpfn_term_taxonomy')

# build maps
terms_map = {}
for t in terms:
    if len(t) >= 3:
        tid = int(t[0])
        terms_map[tid] = {
            'term_id': tid,
            'name': t[1].strip("'").strip(),
            'slug': t[2].strip("'").strip()
        }

tax_map = {}
for tax in term_tax:
    if len(tax) >= 6:
        tid = int(tax[1])
        tax_map[tid] = {
            'taxonomy': tax[2].strip("'").strip(),
            'parent': int(tax[4]),
            'count': int(tax[5])
        }

target_categories = [
    "Criminology and Penology",
    "Election Law",
    "Fiscal Law",
    "Gender and Inclusive Justice",
    "Interpretation of Law",
    "Juvenile Delinquency",
    "Socio Economic Crime",
    "Corporate Law and Management",
    "Family Law",
    "Civil",
    "Criminal",
    "Writs",
    "Precedent"
]

results = []

for target in target_categories:
    matched = False
    for tid, t in terms_map.items():
        name = t['name'].replace('&amp;', '&')
        if target.lower() == name.lower():
            tax_info = tax_map.get(tid, {})
            res = {
                'term_id': tid,
                'name': name,
                'slug': t['slug'],
                'taxonomy': tax_info.get('taxonomy'),
                'parent': tax_info.get('parent'),
                'count': tax_info.get('count')
            }
            results.append(res)
            matched = True
            break
            
print(json.dumps(results, indent=2))
