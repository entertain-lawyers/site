# Phase 6 Divergent Staging Forensic Report
Generated at: Friday 02 October 2026 11:30:10 AM IST

## Inventory of `migration-staging/`
```
./documents.json | Size: 9706 bytes | Modified: 2026-10-02 08:49:33.321103901 +0530
./errors.json | Size: 2 bytes | Modified: 2026-10-02 07:47:12.620548074 +0530
./manifest.json | Size: 888 bytes | Modified: 2026-10-02 07:47:12.620548074 +0530
./media.json | Size: 5568335 bytes | Modified: 2026-10-02 08:49:33.313103826 +0530
./phase5-decisions.json | Size: 357782 bytes | Modified: 2026-10-02 08:17:05.693271362 +0530
./posts.json | Size: 260892 bytes | Modified: 2026-10-02 08:46:47.911730855 +0530
./redirects.json | Size: 162216 bytes | Modified: 2026-10-02 08:49:46.945231731 +0530
./resources.json | Size: 788648 bytes | Modified: 2026-10-02 08:46:47.923730942 +0530
./review_queue.json | Size: 6929 bytes | Modified: 2026-10-02 07:47:12.620548074 +0530
./review-queue.json | Size: 932294 bytes | Modified: 2026-10-02 08:46:47.931730999 +0530
./skipped.json | Size: 17222766 bytes | Modified: 2026-10-02 08:46:48.023731659 +0530
./source-extracted.json | Size: 18995376 bytes | Modified: 2026-10-02 08:46:40.435677617 +0530
```

## Checksums (SHA-256)
```
10e3935b7b3761a67bf016ea45be50868d77b43dc20b6e39d43ede2fe99c0874  ./resources.json
194dc17de65abb8c681a9f4ebe1b70e10ac0b5cfceeb39e67d74462f15e549c6  ./skipped.json
2404de88a4dd26b8a890f2e9818d2ad1912a8f7a762c6be0fc31e6744d54da7d  ./manifest.json
257d798e48609f765b802e5b6ba8cfdaa9fd27053debcad36291173a8bc80488  ./source-extracted.json
3626a2ec7acd1ea7f0219672b36d2531634a9dbd37aa08b520bf957203aeb873  ./phase5-decisions.json
4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945  ./errors.json
4f7e6bb0c08617ffcfc8616a28e066d85279f85bd844e16f5421976a78b3ee30  ./review-queue.json
563b6d98f01ec95ad4019e11fc8c5e86a693a4c241e7a79088dfe7ed98d73cf2  ./redirects.json
5a075179f7658458bd1c5e6b04b4fc845ebde0af752c99d84c2d2269981285fa  ./documents.json
b5a2b4da19e18e238cb2e02fbda6e39371d9c984ede011cadc5986de82412ded  ./media.json
f763005def60e1ba0fc7f25f5e8b27ac3b9e0167425305cbb3f9d4af77ff58bf  ./posts.json
ff1f5670b50ec4e1651534af74f9446366fe022fc095aca66001d80583a5d1fc  ./review_queue.json
```

## Manifest Contents
```json
{
  "executionTimestamp": "2026-10-02T02:17:12.608Z",
  "sourceHashes": {
    "entertainlawyers-english.sql.gz": "e2315ce6f85ed46b63623ae05ea86bd966d84e28485a3701f6468fd8a276c868",
    "entertainlawyers-english-uploads.zip": "db5b7a5eba050adc09e5db988d2cd638fb7c26a22021a18e4d00a1d07cf707c3",
    "entertainlawyers-nepali.sql.gz": "88f7cc72462671e29ffafdeaedabc49119b46f877616dc5f01269c8833b219c0",
    "entertainlawyers-nepali-uploads.zip": "16f89293b5e984c572f324b69ca5189734e1c587f1c79bd1d4a1a34109aa96c7"
  },
  "counts": {
    "english": 350,
    "nepali": 13,
    "Post": 57,
    "Resource": 306,
    "AUTO_MIGRATE": 90,
    "MIGRATE_WITH_NULL_SUBJECT": 246,
    "HUMAN_REVIEW": 27,
    "missingMedia": 0,
    "HUMAN_DECISION_REQUIRED": 0
  },
  "safety": {
    "postgresWrites": 0,
    "prismaConnections": 0,
    "r2Uploads": 0,
    "wordpressWrites": 0,
    "dnsChanges": 0
  }
}```
