# TASK CHECKLIST: Part A (Admin Resource Editor + List) & Part B (Consult a Lawyer Redesign)

- [x] Run full multi-viewport E2E matrix across all 5 projects (desktop, laptop, small-laptop, tablet, mobile) for consultation, resource-workflow, and rich-text-editor
- [x] Verify test cleanup: confirm 0 residual test records in `Resource` and `ConsultationRequest`
- [x] Run static type check: `npx tsc --noEmit`
- [x] Run lint on touched files (`eslint` clean with 0 errors)
- [x] Run unit/integration test suite: `npx vitest run` (5/5 passed)
- [x] Run production build verification: `next build` (73/73 static & dynamic routes compiled)
- [x] Implement image crop editor (`ImageCropperModal`) in admin photo selection with touch/drag/zoom and aspect ratio presets
- [x] Connect authentic social media SVG logos (Facebook, Instagram, LinkedIn, Website)
- [x] Align detail paragraph text to heading titles (not logos)
- [x] Arrange profile action buttons in a balanced 2-up, 2-down grid
- [x] Remove specialization from public lawyer directory cards
- [x] Redesign Court Fee Calculator promo with premium legal balance watermark and feature tags
- [x] Stage and commit changes to `feat/resource-editor-consult-redesign`
