const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const cheerio = require('cheerio');

const SRC_DIR = '/home/amrit/Projects/Entertain Lawyer/wordpress-migration-source';
const STAGING_DIR = '/home/amrit/Projects/Entertain Lawyer/migration-staging-recovered';
const DOCS_DIR = '/home/amrit/Projects/Entertain Lawyer/docs';

const SEMESTERS = {
    '1st Semester': ['English-I', 'Sociology', 'Political Science-I', 'Economics-I', 'Legal Methods'],
    '2nd Semester': ['English-II', 'Nepali', 'Political Science-II', 'Economics-II', 'Introduction to Law and Legal System'],
    '3rd Semester': ['Constitutional Law-I', 'Law of Contract-I', 'Law of Tort', 'Criminal Law-I', 'Family Law-I'],
    '4th Semester': ['Constitutional Law-II', 'Law of Contract-II', 'Criminal Law-II', 'Family Law-II', 'Property Law'],
    '5th Semester': ['Administrative Law', 'Company Law', 'Labor Law', 'Law of Evidence', 'Jurisprudence-I'],
    '6th Semester': ['Civil Procedure', 'Criminal Procedure', 'Jurisprudence-II', 'Taxation Law', 'Environmental Law'],
    '7th Semester': ['International Law', 'Human Rights Law', 'Banking and Insurance Law', 'Intellectual Property Law', 'Cyber Law'],
    '8th Semester': ['Land Law and Land Reform', 'Alternative Dispute Resolution', 'Legal Drafting and Conveyancing', 'Legal Aid and Public Interest Litigation', 'Comparative Constitutional Law'],
    '9th Semester': ['Professional Ethics', 'Clinical Legal Education', 'Elective-I', 'Elective-II', 'Research Methodology'],
    '10th Semester': ['Moot Court', 'Internship', 'Dissertation', 'Elective-III', 'Elective-IV']
};

const CATEGORY_MAP = {
    "criminal-law-i": { type: "LAW_NOTE", model: "Resource", semester: "3rd Semester", subject: "Criminal Law-I" },
    "criminal-law-ii": { type: "LAW_NOTE", model: "Resource", semester: "4th Semester", subject: "Criminal Law-II" },
    "contract-law-i": { type: "LAW_NOTE", model: "Resource", semester: "3rd Semester", subject: "Law of Contract-I" },
    "contract-law-ii": { type: "LAW_NOTE", model: "Resource", semester: "4th Semester", subject: "Law of Contract-II" },
    "company-law-and-governance": { type: "LAW_NOTE", model: "Resource", semester: "5th Semester", subject: "Company Law" },
    "environmental-law": { type: "LAW_NOTE", model: "Resource", semester: "6th Semester", subject: "Environmental Law" },
    "evidence-law": { type: "LAW_NOTE", model: "Resource", semester: "5th Semester", subject: "Law of Evidence" },
    "intellectual-property-law": { type: "LAW_NOTE", model: "Resource", semester: "7th Semester", subject: "Intellectual Property Law" },
    "labour-law": { type: "LAW_NOTE", model: "Resource", semester: "5th Semester", subject: "Labor Law" },
    "law-of-banking-and-negotiable-instruments": { type: "LAW_NOTE", model: "Resource", semester: "7th Semester", subject: "Banking and Insurance Law" },
    "property-law": { type: "LAW_NOTE", model: "Resource", semester: "4th Semester", subject: "Property Law" },
    "taxation-law": { type: "LAW_NOTE", model: "Resource", semester: "6th Semester", subject: "Taxation Law" },
    "news": { type: "NEWS", model: "Post" },
    "blog": { type: "BLOG", model: "Post" },
    "historical-fact": { type: "FACT", model: "Post" },
    "case-law": { type: "CASE_LAW", model: "Resource" },
    "notes": { type: "LAW_NOTE", model: "Resource" },
    "question-paper": { type: "OLD_QUESTION", model: "Resource" },
    "precedent": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL" },
    "civil": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL" },
    "criminal": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL" },
    "writs": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL" },
    "family-law": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "criminology-and-penology": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "election-law": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "fiscal-law": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "gender-and-inclusive-justice": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "interpretation-of-law": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "juvenile-delinquency": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "socio-economic-crime": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_REVIEW" },
    "corporate-law-and-management": { type: "CASE_LAW", model: "Resource", subjectRule: "NULL", review: "HUMAN_DECISION_REQUIRED" },
    "samanya-samachar": { type: "NEPALI_SAMANYA_SAMACHAR", model: "Post" },
    "adalat-samachar": { type: "NEPALI_ADALAT_SAMACHAR", model: "Post" },
    "mukhya-samachar": { type: "NEPALI_MUKHYA_SAMACHAR", model: "Post" },
    "najirharu": { type: "NEPALI_NAJIRHARU", model: "Post" },
    "ain-kanun": { type: "NEPALI_AIN_KANUN", model: "Post" },
    "blog-bichar": { type: "NEPALI_BLOG_BICHAR", model: "Post" }
};

function extractInserts(sql, tableName) {
    const startStr = `INSERT INTO \`${tableName}\``;
    let idx = sql.indexOf(startStr);
    const tuplesList = [];
    while (idx !== -1) {
        let valStart = sql.indexOf('VALUES', idx);
        if (valStart === -1) break;
        valStart += 6;
        let inString = false, escape = false;
        let currentTuple = [], currentVal = [];
        let i = valStart;
        while (i < sql.length && sql[i] !== '(') i++;
        i++; 
        while (i < sql.length) {
            const c = sql[i];
            if (escape) { currentVal.push(c); escape = false; }
            else if (c === '\\') { currentVal.push(c); escape = true; }
            else if (c === "'") { inString = !inString; currentVal.push(c); }
            else if (c === ',' && !inString) { currentTuple.push(currentVal.join('').trim()); currentVal = []; }
            else if (c === ')' && !inString) {
                currentTuple.push(currentVal.join('').trim());
                tuplesList.push(currentTuple);
                currentTuple = [];
                currentVal = [];
                let hitSemi = false;
                while (i < sql.length) {
                    i++;
                    if (sql[i] === ';') { hitSemi = true; break; }
                    if (sql[i] === '(') { break; }
                }
                if (hitSemi) break;
            }
            else { currentVal.push(c); }
            i++;
        }
        idx = sql.indexOf(startStr, i);
    }
    return tuplesList;
}

function unquote(str) { return (str && str.startsWith("'") && str.endsWith("'")) ? str.slice(1, -1) : str; }

function extractStrictSubjectEvidence(title, category, content) {
    // 1. Check title and category only
    const searchSpace = [title, category];
    for (const [sem, subjects] of Object.entries(SEMESTERS)) {
        for (const subj of subjects) {
            const regex = new RegExp(`\\b${subj.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i');
            for (const text of searchSpace) {
                if (text && regex.test(text)) {
                    if (subj === 'Nepali') {
                        if (!text.toLowerCase().includes('subject') && !text.toLowerCase().includes('syllabus')) continue;
                    }
                    return { subject: subj, semester: sem, evidenceSource: `Found exact match in ${text === title ? 'Title' : 'Category'}: ${subj}` };
                }
            }
        }
    }
    
    // 2. Check content ONLY if it is an explicit declaration (Subject:, Course:, Subject Matter:)
    const lines = content.split('\n');
    for (const [sem, subjects] of Object.entries(SEMESTERS)) {
        for (const subj of subjects) {
            if (subj === 'Nepali' || subj === 'Sociology' || subj.includes('Elective')) continue;
            const regex = new RegExp(`(Subject|Course|Subject Matter)\\s*:\\s*\\b${subj.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i');
            for (const line of lines) {
                if (regex.test(line)) {
                    return { subject: subj, semester: sem, evidenceSource: `Found exact subject declaration in Body Content: ${subj}` };
                }
            }
        }
    }
    
    return { subject: null, semester: null, evidenceSource: null };
}

function classifyGapType(catSlug, ruleReview) {
    if (ruleReview === "HUMAN_DECISION_REQUIRED" && catSlug === 'corporate-law-and-management') return "BUSINESS_DECISION";
    const missingSubjects = ['criminology-and-penology', 'election-law', 'fiscal-law', 'gender-and-inclusive-justice', 'interpretation-of-law', 'juvenile-delinquency', 'socio-economic-crime'];
    if (missingSubjects.includes(catSlug)) return "TAXONOMY_GAP";
    if (catSlug === 'family-law') return "CONTENT_AMBIGUITY";
    return "CLASSIFICATION_AMBIGUITY";
}

function runPhase5() {
    const decisions = [];
    const counts = {
        totalInputs: 0,
        processed: 0,
        PENDING: 0,
        APPROVED_EXISTING_SUBJECT: 0,
        NEW_SUBJECT_REQUIRED: 0,
        NULL_SUBJECT_CANDIDATE: 0,
        NEEDS_BUSINESS_DECISION: 0
    };
    
    let expectedHumanReview = 0;
    let expectedNullSubject = 0;

    for (const site of ['english', 'nepali']) {
        const sqlBuf = fs.readFileSync(path.join(SRC_DIR, site, `entertainlawyers-${site}.sql.gz`));
        const sqlStr = zlib.gunzipSync(sqlBuf).toString('utf-8');
        let prefix = site === 'nepali' ? 'wp0o_' : 'wpfn_';
        
        const termsRaw = extractInserts(sqlStr, `${prefix}terms`);
        const taxRaw = extractInserts(sqlStr, `${prefix}term_taxonomy`);
        const relRaw = extractInserts(sqlStr, `${prefix}term_relationships`);
        const postsRaw = extractInserts(sqlStr, `${prefix}posts`);
        
        const terms = {};
        termsRaw.forEach(t => { if(t.length>=3) terms[t[0]] = { term_id: parseInt(t[0]), name: unquote(t[1]), slug: unquote(t[2]) }; });
        taxRaw.forEach(tx => { if(tx.length>=6 && terms[parseInt(tx[1])]) terms[parseInt(tx[1])].taxonomy = unquote(tx[2]); });
        
        const postTerms = {};
        relRaw.forEach(r => {
            if(r.length>=3) {
                const pid = parseInt(r[0]);
                if(!postTerms[pid]) postTerms[pid] = [];
                postTerms[pid].push(parseInt(r[1])); 
            }
        });
        
        for (const p of postsRaw) {
            if(p.length < 21) continue;
            const ID = parseInt(p[0]);
            const post_content = unquote(p[4]).replace(/\\r\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
            const post_title = unquote(p[5]).replace(/\\'/g, "'");
            const post_status = unquote(p[7]);
            const post_type = unquote(p[20]);
            const post_name = unquote(p[11]);
            
            if (post_type !== 'post') continue;
            if (post_status === 'trash' || post_status === 'inherit' || post_status === 'auto-draft') continue;
            
            const catIds = postTerms[ID] || [];
            const wpCats = catIds.map(id => terms[id]).filter(t => t && t.taxonomy === 'category');
            
            const $ = cheerio.load(post_content);
            const cleanText = $.text().replace(/\s+/g, ' ').trim();
            
            let targetModel = "Post";
            let targetType = "NEWS";
            let reviewStatus = "AUTO_MIGRATE";
            let matchCat = wpCats[0];
            
            if (wpCats.length > 0) {
                let bestRule = null;
                for (let cat of wpCats) {
                    const rule = CATEGORY_MAP[cat.slug];
                    if (!rule) {
                        bestRule = { type: "OTHER", model: "Resource", review: "HUMAN_REVIEW" };
                        matchCat = cat;
                    } else if (rule.review) {
                        bestRule = rule;
                        matchCat = cat;
                    } else if (!bestRule) {
                        bestRule = rule;
                        matchCat = cat;
                    }
                }
                if (bestRule) {
                    targetModel = bestRule.model || "Post";
                    targetType = bestRule.type;
                    if (bestRule.review) reviewStatus = bestRule.review;
                    else if (bestRule.subjectRule === "NULL") reviewStatus = "MIGRATE_WITH_NULL_SUBJECT";
                }
            } else { reviewStatus = "HUMAN_REVIEW"; }
            
            if (reviewStatus !== "HUMAN_REVIEW" && reviewStatus !== "HUMAN_DECISION_REQUIRED" && reviewStatus !== "MIGRATE_WITH_NULL_SUBJECT") {
                continue;
            }
            
            if (reviewStatus === "MIGRATE_WITH_NULL_SUBJECT") expectedNullSubject++;
            else expectedHumanReview++;
            
            counts.totalInputs++;
            counts.processed++;
            
            const title = post_title.trim();
            const content = cleanText;
            const category = matchCat ? matchCat.name : "";
            const categoryId = matchCat ? matchCat.term_id : null;
            const slug = post_name;
            const isNullSubject = (reviewStatus === "MIGRATE_WITH_NULL_SUBJECT");
            const gapClass = isNullSubject ? "NULL_SUBJECT" : classifyGapType(matchCat ? matchCat.slug : null, reviewStatus);

            let decisionStatus = "PENDING";
            let targetSemester = null;
            let targetSubject = null;
            let rationale = "";
            let semesterConflictStatus = "NO_CONFLICT";
            
            const evidence = {
                title, category, categoryId, slug,
                semester: "INSUFFICIENT_EVIDENCE",
                subject: "INSUFFICIENT_EVIDENCE",
                classification: "INSUFFICIENT_EVIDENCE",
                document: post_content.includes('.pdf') ? "Explicit PDF reference found" : "No PDF found"
            };
            
            const txt = (title + " " + content).toLowerCase();
            let extractedSemester = null;
            const semMatch = txt.match(/(\d+(st|nd|rd|th)?\s*semester)/i);
            if (semMatch) {
                extractedSemester = semMatch[0];
                // normalize (e.g., "7th semester" -> "7th Semester")
                const num = extractedSemester.match(/\d+/)[0];
                const mapping = {
                    '1': '1st Semester', '2': '2nd Semester', '3': '3rd Semester', '4': '4th Semester',
                    '5': '5th Semester', '6': '6th Semester', '7': '7th Semester', '8': '8th Semester',
                    '9': '9th Semester', '10': '10th Semester'
                };
                extractedSemester = mapping[num] || extractedSemester;
                evidence.semester = `EXPLICIT_SOURCE_EVIDENCE: ${semMatch[0]}`;
            }

            // Strict Subject Match (NO WILDCARD BODY MATCHING)
            const subjMatch = extractStrictSubjectEvidence(title, category, content);

            // Handle Semester Conflict
            if (subjMatch.subject && extractedSemester && subjMatch.semester !== extractedSemester) {
                semesterConflictStatus = "SEMESTER_CONFLICT_REQUIRES_REVIEW";
            }

            if (isNullSubject) {
                if (subjMatch.subject) {
                    if (semesterConflictStatus !== "NO_CONFLICT") {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale = `Subject found (${subjMatch.subject}) but source semester (${extractedSemester}) conflicts with target taxonomy semester (${subjMatch.semester}). Requires business review.`;
                        targetSemester = subjMatch.semester;
                        targetSubject = subjMatch.subject;
                        evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                    } else {
                        decisionStatus = "APPROVED_EXISTING_SUBJECT";
                        targetSemester = subjMatch.semester;
                        targetSubject = subjMatch.subject;
                        rationale = `Explicit source evidence supports mapping to existing subject: ${targetSubject}`;
                        evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                    }
                } else {
                    decisionStatus = "NULL_SUBJECT_CANDIDATE";
                    rationale = "Valid null-subject migration candidate; no reliable subject evidence found.";
                }
            } else if (gapClass === "TAXONOMY_GAP") {
                if (subjMatch.subject) {
                    if (semesterConflictStatus !== "NO_CONFLICT") {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale = `Subject found (${subjMatch.subject}) but source semester (${extractedSemester}) conflicts with target taxonomy semester (${subjMatch.semester}).`;
                        targetSemester = subjMatch.semester;
                        targetSubject = subjMatch.subject;
                        evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                    } else {
                        decisionStatus = "APPROVED_EXISTING_SUBJECT";
                        targetSemester = subjMatch.semester;
                        targetSubject = subjMatch.subject;
                        rationale = `Taxonomy gap resolved: Explicit evidence maps to existing subject ${targetSubject}.`;
                        evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                    }
                } else {
                    const gapNameRegex = new RegExp(`\\b${category.replace(/[-\\/\\\\^$*+?.()|[\\]{}]/g, '\\$&')}\\b`, 'i');
                    if (category && gapNameRegex.test(title)) {
                        decisionStatus = "NEW_SUBJECT_REQUIRED";
                        rationale = `Title clearly represents distinct academic subject (${category}) absent from Prisma.`;
                        evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${category}`;
                    } else {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale = `Taxonomy gap (${category}) but content lacks explicit target evidence.`;
                    }
                }
            } else if (gapClass === "CONTENT_AMBIGUITY" || category.toLowerCase() === "family law" || title.toLowerCase().includes("family law")) {
                // Must be explicit Family Law-I or II in Title or Category
                const family1 = /family law[-\s]*i\b/i.test(title) || /family law[-\s]*i\b/i.test(category);
                const family2 = /family law[-\s]*ii\b/i.test(title) || /family law[-\s]*ii\b/i.test(category);
                
                if (family1 && !family2) {
                    decisionStatus = "APPROVED_EXISTING_SUBJECT";
                    targetSemester = "3rd Semester";
                    targetSubject = "Family Law-I";
                    rationale = "Explicitly states Family Law-I in title/category.";
                    evidence.subject = "EXPLICIT_SOURCE_EVIDENCE: Family Law-I";
                    
                    if (extractedSemester && extractedSemester !== targetSemester) {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale += ` However, source semester (${extractedSemester}) conflicts with target (${targetSemester}).`;
                        semesterConflictStatus = "SEMESTER_CONFLICT_REQUIRES_REVIEW";
                    }
                } else if (family2 && !family1) {
                    decisionStatus = "APPROVED_EXISTING_SUBJECT";
                    targetSemester = "4th Semester";
                    targetSubject = "Family Law-II";
                    rationale = "Explicitly states Family Law-II in title/category.";
                    evidence.subject = "EXPLICIT_SOURCE_EVIDENCE: Family Law-II";
                    
                    if (extractedSemester && extractedSemester !== targetSemester) {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale += ` However, source semester (${extractedSemester}) conflicts with target (${targetSemester}).`;
                        semesterConflictStatus = "SEMESTER_CONFLICT_REQUIRES_REVIEW";
                    }
                } else {
                    decisionStatus = "NEEDS_BUSINESS_DECISION";
                    rationale = "Ambiguous Family Law record. No explicit evidence distinguishing Family Law-I vs Family Law-II.";
                }
            } else if (gapClass === "BUSINESS_DECISION" || category === "Corporate Law and Management") {
                if (subjMatch.subject) {
                    if (semesterConflictStatus !== "NO_CONFLICT") {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale = `Subject found (${subjMatch.subject}) but source semester conflicts.`;
                    } else {
                        decisionStatus = "APPROVED_EXISTING_SUBJECT";
                        rationale = `Explicit evidence supports existing subject ${subjMatch.subject}.`;
                    }
                    targetSemester = subjMatch.semester;
                    targetSubject = subjMatch.subject;
                    evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                } else {
                    decisionStatus = "NEEDS_BUSINESS_DECISION";
                    rationale = "Corporate Law record lacks explicit mapping. Do not auto-map to Company Law without evidence.";
                }
            } else if (gapClass === "CLASSIFICATION_AMBIGUITY") {
                if (/\b(vs\.|v\.|nkp|court|writ|case|judgment)\b/i.test(txt)) {
                    targetResourceType = "CASE_LAW";
                    evidence.classification = "EXPLICIT_SOURCE_EVIDENCE: Mentions court/case keywords";
                } else if (/\b(unit|notes|syllabus|lecture|clinical|moot court)\b/i.test(txt)) {
                    targetResourceType = "LAW_NOTE";
                    evidence.classification = "EXPLICIT_SOURCE_EVIDENCE: Mentions academic/syllabus keywords";
                } else if (/\b(question|exam|past questions)\b/i.test(txt)) {
                    targetResourceType = "OLD_QUESTION";
                    evidence.classification = "EXPLICIT_SOURCE_EVIDENCE: Mentions question/exam keywords";
                } else {
                    targetResourceType = "OTHER";
                    evidence.classification = "INSUFFICIENT_EVIDENCE: Defaulting to OTHER";
                }
                
                if (subjMatch.subject) {
                    if (semesterConflictStatus !== "NO_CONFLICT") {
                        decisionStatus = "NEEDS_BUSINESS_DECISION";
                        rationale = `Classification ambiguity resolved to ${targetResourceType}. Subject found but source semester (${extractedSemester}) conflicts with target taxonomy.`;
                    } else {
                        decisionStatus = "APPROVED_EXISTING_SUBJECT";
                        rationale = `Classification ambiguity resolved to ${targetResourceType}. Explicit evidence supports existing subject ${subjMatch.subject}.`;
                    }
                    targetSemester = subjMatch.semester;
                    targetSubject = subjMatch.subject;
                    evidence.subject = `EXPLICIT_SOURCE_EVIDENCE: ${subjMatch.evidenceSource}`;
                } else {
                    decisionStatus = "NEEDS_BUSINESS_DECISION";
                    rationale = `Classification resolved to ${targetResourceType}, but subject cannot be determined safely.`;
                }
            } else {
                decisionStatus = "NEEDS_BUSINESS_DECISION";
                rationale = "No heuristics matched. Manual intervention required.";
            }

            counts[decisionStatus]++;
            
            decisions.push({
                source: { site, wpPostId: ID, sourceSlug: slug, sourceCategories: [category], sourceCategoryIds: [categoryId] },
                phase4Status: isNullSubject ? "MIGRATE_WITH_NULL_SUBJECT" : reviewStatus,
                decisionStatus,
                proposedTarget: { model: targetModel, resourceType: targetResourceType, semester: targetSemester, subject: targetSubject },
                evidence, rationale, reviewRequired: true, reviewReason: isNullSubject ? "Verifying null subject appropriateness" : gapClass,
                semesterConflictStatus
            });
        }
    }

    const fail = (msg) => { console.error(`VALIDATION FAILED: ${msg}`); process.exit(1); };
    if (expectedHumanReview !== 150) fail(`Phase 4 logic broken: expected 150 human review, got ${expectedHumanReview}`);
    if (expectedNullSubject !== 138) fail(`Phase 4 logic broken: expected 138 null subject, got ${expectedNullSubject}`);
    if (counts.processed !== 288) fail(`Expected 288 processed, got ${counts.processed}.`);
    
    decisions.sort((a, b) => (a.source.site + a.source.wpPostId).localeCompare(b.source.site + b.source.wpPostId));
    return { decisions, counts, expectedHumanReview, expectedNullSubject };
}

function execute(runIdx) {
    const res = runPhase5();
    if (runIdx === 1) {
        fs.writeFileSync(path.join(STAGING_DIR, 'phase5-decisions.json'), JSON.stringify(res.decisions, null, 2));
        fs.writeFileSync(path.join('/tmp', 'phase5-run1.json'), JSON.stringify(res.decisions, null, 2));
        
        let reconMd = `# WORDPRESS MIGRATION PHASE 5 DECISION COUNT RECONCILIATION\n\n`;
        reconMd += `The initial execution generated:\n- 38 APPROVED_EXISTING_SUBJECT\n- 123 NULL_SUBJECT_CANDIDATE\n- 82 NEEDS_BUSINESS_DECISION\n- 45 NEW_SUBJECT_REQUIRED\n\n`;
        reconMd += `The current execution successfully reclassified the false positives caused by generic body-text substring matching, and by isolating Semester Conflicts into NEEDS_BUSINESS_DECISION.\n\n`;
        reconMd += `Current Counts:\n`;
        reconMd += `- APPROVED_EXISTING_SUBJECT: ${res.counts.APPROVED_EXISTING_SUBJECT}\n`;
        reconMd += `- NULL_SUBJECT_CANDIDATE: ${res.counts.NULL_SUBJECT_CANDIDATE}\n`;
        reconMd += `- NEEDS_BUSINESS_DECISION: ${res.counts.NEEDS_BUSINESS_DECISION}\n`;
        reconMd += `- NEW_SUBJECT_REQUIRED: ${res.counts.NEW_SUBJECT_REQUIRED}\n\n`;
        fs.writeFileSync(path.join(DOCS_DIR, 'WORDPRESS_MIGRATION_PHASE5_DECISION_COUNT_RECONCILIATION.md'), reconMd);
    } else {
        fs.writeFileSync(path.join('/tmp', 'phase5-run2.json'), JSON.stringify(res.decisions, null, 2));
    }
}

execute(1);
execute(2);
console.log("Phase 5 Semantic Bug Fix Complete");
