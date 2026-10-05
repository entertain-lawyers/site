#!/bin/bash
function query_cat {
  echo -e "\n=== Category: $2 (ID: $1) ==="
  docker exec -i wp_audit_db mysql -uroot -proot wp_audit -e "
    SELECT p.ID, SUBSTRING(p.post_title, 1, 50) as Title
    FROM wpfn_posts p
    JOIN wpfn_term_relationships tr ON p.ID = tr.object_id
    JOIN wpfn_term_taxonomy tt ON tr.term_taxonomy_id = tt.term_taxonomy_id
    WHERE tt.term_id = $1 AND p.post_status = 'publish' AND p.post_type = 'post'
    LIMIT 10;
  "
}

query_cat 114 "Criminal Law-II"
query_cat 137 "Intellectual Property Law"
query_cat 142 "Labour Law"
query_cat 122 "Family Law"
query_cat 104 "Civil (Precedent)"
query_cat 105 "Criminal (Precedent)"
query_cat 106 "Writs (Precedent)"
query_cat 129 "Criminology and Penology"
query_cat 143 "Election Law"
query_cat 150 "Fiscal Law"
query_cat 151 "Gender and Inclusive Justice"
query_cat 147 "Interpretation of Law"
query_cat 128 "Juvenile Delinquency"
query_cat 139 "Law of Banking and Negotiable Instruments"
query_cat 148 "Social Work and Social Welfare Law"
query_cat 146 "Socio Economic Crime"
query_cat 149 "Corporate Law and Management"

