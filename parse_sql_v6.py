import json

file_path = '/tmp/wp-audit-tmp/english/entertainlawyers-english.sql'
with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
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
                while i < end_idx and sql[i] != '(': i += 1
            else:
                current_val.append(c)
            i += 1
        
        idx = sql.find(start_str, end_idx)
    return tuples_list

terms = extract_values('wpfn_terms')
term_tax = extract_values('wpfn_term_taxonomy')

term_map = {}
for t in terms:
    if len(t) >= 2:
        term_map[t[0]] = t[1].strip("'")

for tax in term_tax:
    if len(tax) >= 6:
        term_id = tax[1]
        name = term_map.get(term_id, "Unknown")
        count = tax[5]
        print(f"Term: {name} (ID: {term_id}) -> Count: {count}")
