
# WORDPRESS MIGRATION DRY-RUN REPORT

## 1. Safety Assertions
- PostgreSQL writes: 0
- Prisma Client initialized: 0
- R2 Uploads: 0
- WordPress writes: 0
- DNS Changes: 0

## 2. Source Integrity Result
Source hashes verified perfectly against Phase 2 Forensic Audit.

## 3. Counts
- Total English Content: 350
- Total Nepali Content: 13
- Post Targets: 57
- Resource Targets: 306
- AUTO_MIGRATE: 90
- MIGRATE_WITH_NULL_SUBJECT: 246
- HUMAN_REVIEW: 27
- HUMAN_DECISION_REQUIRED: 0

## 4. Human Review Workload
A total of 27 records require manual intervention in the Admin UI before deployment. See `WORDPRESS_MIGRATION_REVIEW_QUEUE.md` for details.

## 5. Conclusion
The Phase 4 Output is deterministic and ready for human review.
