# Kanun Saathi — AI Knowledge Base

Kanun Saathi (कानुन साथी) is the floating AI assistant on Entertain Lawyers. It is a
**retrieval-augmented** assistant: it answers from an index of the site's own content plus a
deterministic "site facts" layer. It is not fine-tuned; "training" the model means **building the
knowledge index** after content changes.

## What the assistant can answer

| Category | Examples |
|---|---|
| Team profiles | "Who is Ram Babu Das?", "Tell me about Sushma", "Who is the Head of Website?" |
| Contact & location | "What is your phone number?", "Where is your office?", "What are your office hours?" |
| Site & services | "What is Entertain Lawyers?", "Do you offer consultation?", "What practice areas?" |
| Study library | "Where can I find law notes?", "Which subjects are in the 1st semester?" |
| Pricing & access | "How much is a subscription?", "Is the site free?", "How do I pay?", "Can I download a PDF?" |
| Billing | "Do you offer refunds?", "My payment failed but money was deducted" |
| Navigation & search | "What can I find on this site?", "How do I search the site?", "What is the latest news?" |
| News & updates | "Where is the latest legal news?", "Do you have blogs or historical facts?" |
| Accounts & privacy | "How do I reset my password?", "How do I delete my account?" |
| Contributions | "Can I write for you?", "I found a typo" |
| Languages | "Which languages do you support?", questions written in Devanagari or romanized Nepali |
| Legal education | Law notes, case laws, acts, old questions, news, blogs and historical facts |

For questions about a real legal matter it points the user to `/consultation` instead of giving
personal legal advice. The assistant is deliberately **grounded**: if a legal topic is not in the
index, it says so instead of answering from the model's general knowledge.

## Architecture

```
User question
   │
   ├─ Greeting?                 → instant canned reply
   ├─ Site-facts layer          → team / contact / services / pricing / billing /
   │   (src/lib/ai/site-facts.ts)  navigation / downloads / privacy / contributions /
   │                               semester subjects / news, answered from Prisma +
   │                               site-knowledge.ts, 0 tokens. Follow-ups ("his email?",
   │                               "tell me more") resolve against the conversation.
   │
   └─ RAG path
       ├─ Embed the question            (Gemini `gemini-embedding-001`)
       ├─ Hybrid retrieval              (cosine + IDF-weighted title/name match)
       ├─ Relevance gate                (site pages need a real title match;
       │                                 weak vector hits are discarded)
       ├─ Canonical facts + context     (contact, hours, team roster always present)
       ├─ LLM answer                    (Groq → Gemini → OpenRouter)
       ├─ Reply cleanup                 (strip Markdown, URLs, source footers)
       └─ Sources attached to the reply (clickable page links)
```

Key files:

- `src/lib/ai/site-knowledge.ts` — canonical facts about the site (about, contact, services,
  navigation, study library, pricing, billing, privacy, downloads, contributions, policies) plus
  `SITE_FACT_SHEET`, the always-injected prompt facts. **Edit this when site info changes.**
- `src/lib/ai/site-facts.ts` — deterministic, bilingual answers for team, contact, pricing,
  billing, navigation, downloads, privacy and more. Includes Devanagari name matching and
  follow-up resolution.
- `src/lib/ai/corpus.ts` — builds the corpus for every content source.
- `src/lib/ai/semantic.ts` — vector table, hybrid retrieval, query expansion, content hashing.
- `src/lib/ai/reply.ts` — final reply cleanup (plain text, no Markdown/URLs/source footers).
- `src/app/api/ai/chat/route.ts` — the chat endpoint (rate limits, retrieval, grounding prompt).
- `src/app/api/ai/search-index/route.ts` — batched index ingestion (ADMIN/EDITOR).
- `src/app/admin/ai/page.tsx` — admin UI to inspect and rebuild the index.
- `scripts/rebuild-ai-index.ts` — CLI index rebuild.

## What gets indexed

`buildCorpus()` in `src/lib/ai/corpus.ts` collects:

1. **Site knowledge** — 21 hand-written docs from `site-knowledge.ts`: about, contact,
   consultation, navigation, study library, calculator, pricing, accounts, the assistant itself,
   policies, the team directory, FAQ, search, Nepali content, disclaimer, billing, secure reader,
   contributions, contacting a member, and privacy.
2. **Team members** — every published `TeamMember`, with designation, short bio, full biography,
   qualifications, experience, achievements, practice areas, languages, email/phone and social
   links. Asking for a name returns all of these fields.
3. **Team roster** — a single doc listing all members and their profile URLs.
4. **FAQs** — every `PUBLISHED` FAQ (question + answer).
5. **Plans** — every active subscription plan (name, price, duration).
6. **Semester taxonomy** — one doc per semester listing its subjects (10 docs today).
7. **Study resources** — every `PUBLISHED` resource, with semester/subject/unit and premium status.
8. **CMS posts** — published news, blogs, facts and Nepali posts from Prisma.
9. **Publications** and **events**.
10. **WordPress posts** — English and Nepali REST API posts.

## Build / rebuild the index

### From the admin UI (recommended)

1. Sign in as ADMIN or EDITOR.
2. Open **Admin → System → AI Index** (`/admin/ai`).
3. Click **Update index** (incremental) or **Reset & rebuild** (clears stale vectors first).
4. Wait for the progress bar to finish. Content that has not changed is skipped by hash.

### From the command line

```bash
# Incremental: embed only new/changed content
npm run ai:index

# Full rebuild: clear the vector table first
npm run ai:index -- --reset

# Only one source (useful for testing)
npm run ai:index -- --only=team
npm run ai:index -- --only=site --limit=5
```

Requires `DATABASE_URL` and `GEMINI_API_KEY` in `.env`.

The index lives in the `AIEmbedding` Postgres table (created automatically; no Prisma migration
needed). Each row stores a content hash so edits to a bio or page are detected even when the title
is unchanged.

### Incremental batching

For serverless deployments, `POST /api/ai/search-index` processes at most 80 items per call and
returns `{ offset, done }`. Keep calling with the returned offset until `done: true`. The admin UI
does this loop automatically.

## Adding or changing content

| Change | What to do |
|---|---|
| New team member | Add it in **Admin → Team**. It is answered immediately from the database; run an index update so it is also retrieved semantically. |
| Contact details / address / hours changed | Update `SITE_CONTACT` in `src/lib/ai/site-knowledge.ts` and the visible pages. Team-facts answers update instantly. |
| New FAQ | Add it in **Admin → FAQs**; it is indexed on the next update. |
| New semester subject | No action for the subject list — it is generated from the taxonomy. Run an index update. |
| New study resource / post | Run an index update (incremental). |
| Navigation or pricing policy changed | Update the matching doc in `site-knowledge.ts` and run an index update. |

## Testing

Run the unit tests (no database or API key needed):

```bash
npx vitest run src/lib/ai/__tests__
```

They cover the knowledge docs, every deterministic intent, follow-ups, Devanagari name matching,
query expansion, retrieval scoring helpers, and reply cleanup.

Try these questions in the widget:

- "Who is Ram Babu Das?" → a short, conversational intro (role, tagline, a two-sentence
  background excerpt, profile link) with an offer to share more — never the whole profile.
- "Show me the full profile of Ram Babu Das" → every stored detail (experience, achievements,
  languages, email, socials).
- "Tell me more" (after the intro) → a longer biography excerpt plus experience, achievements,
  interests and languages, still without contact details.
- "What is his email?" (after the question above) → just that member's email.
- "राम बाबु दास को हुन्?" → matched from Devanagari, answered with Nepali labels.
- "अझै भन्नुहोस्" (after the Nepali intro) → Nepali "tell me more"; English stored biographies are
  not injected into a Nepali answer.
- "Tell me about Sushma" → matched by first name.
- "Who is the Head of Website?" → matched by designation (not treated as a social-link request).
- "Who is on your team?" → roster with profile links.
- "How can I contact you?" → phone, WhatsApp, email, address, chambers, hours, socials.
- "Do you offer consultation?" → services + booking link.
- "How much is a subscription?" → active plans and payment info.
- "How do I pay?" → eSewa/Khalti, checkout and access activation.
- "Is the site free?" → free vs premium, account requirements.
- "Can I download notes?" → secure reader explanation.
- "Do you offer refunds?" → billing next steps (deterministic, no tokens).
- "Who are the researchers?" → roster filtered by designation.
- "How do I delete my account?" → privacy route.
- "Can I write for you?" → contribution route.
- "How do I search the site?" → search, semesters and filters.
- "What is the latest news?" → news, blogs, historical facts, publications and events.
- "What can I find on this site?" → full navigation guide.
- "Which subjects are in the 1st semester?" → exact subject list from the taxonomy
  (duplicate source rows collapsed).
- "What is the doctrine of basic structure?" → politely declines if that topic is not indexed
  (never answers from the model's general legal knowledge).

## Reply quality rules

These are enforced in code, not left to the model:

- **Language mirroring.** English questions get English answers; Devanagari questions get
  Devanagari; romanized Nepali gets Nepali. A leading Nepali greeting or address is stripped from
  English replies.
- **Plain text.** `polishReply()` removes Markdown (`**`, `##`, code fences, Markdown links),
  normalizes bullets, collapses blank lines, removes parenthetical/footer source notes, and caps
  runaway replies at a sentence boundary.
- **No invented sources.** Site pages are only cited when they share a distinctive title word with
  the question (or are a very strong vector match). Summary-only mentions are capped below the
  citation threshold.
- **No general legal knowledge.** If retrieval finds nothing relevant, the endpoint returns a
  short "not in the notes yet" reply and suggests search or consultation. The prompt repeats this
  rule so the model cannot fill the gap from memory.
- **Follow-ups.** The last user turn is folded into the retrieval query, and the deterministic
  layer resolves "his/her/their/that member" against the conversation.
- **Exact lists.** Semester subject answers come from the live taxonomy, with near-duplicate
  source rows ("Legal Method"/"Legal Methods") collapsed. A designation question ("who are the
  researchers?") lists only members with that designation, not the whole team.
- **Exact facts.** `SITE_FACT_SHEET` (phone, email, address, hours, sections, assistant identity)
  and the live team roster are injected into every LLM prompt, so contact details and names can
  never be hallucinated.

## Operational notes

- The vector table is cached in-process for 5 minutes per server instance. After a CLI rebuild,
  a running server may serve the previous index for up to 5 minutes; the admin UI rebuild
  invalidates its own process immediately.
- AI is optional: without `GEMINI_API_KEY` the embeddings and semantic search degrade gracefully,
  and the site-facts layer still answers team/contact/pricing/navigation questions.
- Chat is rate-limited per IP: 5 requests/minute and 40/day (fails open if Upstash is not
  configured).
- Never put API keys in client code; all providers are called server-side only.
