# new-content

Create a new Ocobo content file via interactive interview. Writes a validated markdown file ready for `publish-content`.

## When to invoke

When a user wants to create a new blog post, story, team member profile, tool entry, or job posting.

## Args

`--type <type>` — skip the type prompt. Valid: `blog-post | story | team-member | tool | job`.

`[source]` — optional positional arg. Can be:
- A **Notion URL** — `https://notion.so/...` or `https://www.notion.so/...` — triggers the Notion adapter.
- A **local file path** — any other non-flag argument — triggers the local-file adapter.

Pre-filled fields from either adapter reduce the interview to only what's missing.

Examples:

    new-content https://notion.so/Mon-article-abc123
    new-content --type blog-post https://notion.so/abc123
    new-content path/to/draft.md
    new-content --type blog-post path/to/draft.md

---

## Step 0 — Parse source

_Skip this step if no source arg was provided._

**Detect source type** — check if the arg matches `^https?://(www\.)?notion\.(so|site)/`:
- Yes → **Notion path** (Step 0A)
- No → **Local file path** (Step 0B)

Store the result (from whichever path) as `prefilled`:
- `prefilled.fields` — extracted key-value pairs (may be empty)
- `prefilled.body` — extracted prose (may be empty)
- `prefilled.assets` — image URLs to download (Notion only; empty for local files)

If any step below exits non-zero, stop and show the error — do not proceed to Step 1.

---

### Step 0A — Notion adapter

1. **Check MCP availability** — verify the Notion MCP is connected by attempting a simple call. If not available:
   > Notion MCP is not configured. To use Notion import, follow `docs/mcp-notion-setup.md`. Falling back — use interview mode or pass a local file path instead.
   Then proceed to Step 1 with empty `prefilled`.

2. **Fetch the page** — use the `notion-fetch` MCP tool with the URL. This returns the page properties and content.

3. **Determine type** — if `--type` was passed, use it. Otherwise check `prefilled.fields` for a recognisable type hint, or fall back to Step 1 prompt after extracting fields.

4. **Map properties** — save the page JSON from `notion-fetch` to a temp file, then run:
   ```bash
   node scripts/source-adapters/notion.js /tmp/notion-page.json <type> [/tmp/notion-body.txt]
   ```
   The adapter outputs `{"fields": {...}, "body": "...", "assets": [...]}`.

5. **Download images** — for each entry in `assets[]`, download the URL to the correct local path before Step 6:
   ```bash
   curl -L "<url>" -o "<target-path>"
   ```
   Target paths follow the same convention as Step 6 (slug-based). Record each downloaded path.

   > **Note:** Notion file URLs (type `file`) are temporary S3 URLs that expire in ~1 hour — download immediately.

---

### Step 0B — Local file adapter

Run:

```bash
node scripts/source-adapters/local-file.js "<path>"
```

The adapter outputs `{"fields": {...}, "body": "..."}` to stdout. `assets` is always `[]` for local files.

If the command exits non-zero (file not found, unreadable), stop and show the error.

---

## Step 1 — Determine type

If `--type` was passed and is valid, use it. Otherwise ask:

> Which content type do you want to create?
> `blog-post` | `story` | `team-member` | `tool` | `job`

---

## Step 2 — Load reference data

Run these commands before starting the interview. Store results for use during interviews.

**Active team slugs** (author / hiringContact pickers):
```bash
for f in team/*.md; do
  grep -q "^active: false" "$f" || echo "$(basename "$f" .md)"
done
```

**All tool slugs** (story tools / featuredTool):
```bash
ls tools/*.md | xargs -I{} basename {} .md
```

**Existing blog tags** (autocomplete):
```bash
awk '/^tags:/{f=1;next} f && /^  - /{sub(/^  - /,"");print} f && !/^  - /{f=0}' \
  blog/fr/*.md 2>/dev/null | sort -u
```

**Existing story scopes** (autocomplete):
```bash
awk '/^scopes:/{f=1;next} f && /^  - /{sub(/^  - /,"");print} f && !/^  - /{f=0}' \
  stories/fr/*.md 2>/dev/null | sort -u
```

**Existing tool categories** (autocomplete):
```bash
grep "^category:" tools/*.md | awk -F': ' '{print $2}' | sort -u
```

**Next displayOrder for team members** (used as default when creating a team member):
```bash
grep -h "^displayOrder:" team/*.md 2>/dev/null | awk '{print $2}' | sort -n | tail -1
```
Store as `maxDisplayOrder`. Suggested next value = `maxDisplayOrder + 1` (default to `1` if no files exist).

---

## Step 3 — Interview

**Pre-filled fields (when a source file was parsed in Step 0):** Before asking questions, check `prefilled`. For each field already present, show the extracted value and ask to confirm:

> `title: "Mon article"` — keep? [y / edit]

Accept on Enter. Only ask from scratch for fields that are missing or rejected. If `prefilled.body` is non-empty, show a short preview and confirm before using it as the body.

If no path arg was given, `prefilled` is empty — proceed with the full interview as normal.

---

Ask one or two related questions at a time — never dump the full list. For required fields: do not proceed without a non-empty value. For optional fields: accept Enter to skip.

### Tool

1. **slug** — kebab-case (e.g. `hubspot`). Warn if `tools/<slug>.md` already exists.
2. **name** — display name (e.g. `HubSpot`).
3. **category** — show existing categories, ask to pick or type a new one. Warn on new: `"<value>" is new — continue? [y/n]`
4. **iconUrl (optional)** — drag icon file path here, or Enter to skip. If provided, copy to `assets/tools/<slug>/` and record for sync.

No body for tools.

### Team member

1. **slug** — kebab-case (e.g. `marie-dupont`). Warn if `team/<slug>.md` already exists.
2. **name** — full name.
3. **track** — existing values: `architect | builder | expert-engineer`. Ask to pick or type a new one.
4. **avatar** (required) — drag image path here. Copy to `assets/team/` and record for sync.
5. **role.fr** — French job title.
6. **role.en** — English job title.
7. **bio.fr** — French one-sentence bio.
8. **bio.en** — English one-sentence bio.
9. **linkedin (optional)** — full LinkedIn URL.
10. **displayOrder** — integer for ordering on the team page. Suggest `maxDisplayOrder + 1` (computed in Step 2) as the default; accept Enter to use it. **Do not skip** — this field is required by the website schema. If the contributor has no preference, use the suggested value.
11. **active (optional, default `true`)** — `true | false`.
12. **featuredOnAboutUs (optional, default `false`)** — `true | false`.
13. **color (optional)** — `yellow | coral | sky`.

No body for team members.

### Blog post

1. **lang** — `fr` (default) or `en`.
2. **title** — article title (used to suggest the slug).
3. **slug** — kebab-case, suggested from title. Warn if `blog/<lang>/<slug>.md` already exists.
4. **author** — show active team slugs, ask to pick one.
5. **description** — short summary sentence.
6. **date** — publication date (`YYYY-MM-DD`, default today).
7. **image** (required) — drag cover image path here. Copy to `assets/posts/<slug>/` and record for sync.
8. **exerpt (optional)** — note: this spelling is intentional (perpetuated from existing content). Multi-line OK.
9. **read (optional)** — reading time, e.g. `5 min`.
10. **podcastId (optional)** — podcast episode ID if applicable.
11. **tags (optional)** — show existing tags, let user pick and/or type new ones. Warn on new: `"<tag>" is new — adding it.`
12. **body** (required) — ask user to paste or dictate the article body in markdown.

### Story

1. **lang** — `fr` (default) or `en`.
2. **name** — client company name (e.g. `Yousign`). Used to suggest the slug.
3. **slug** — kebab-case. Warn if `stories/<lang>/<slug>.md` already exists.
4. **date** — case study date (`YYYY-MM-DD`).
5. **title** — full case study title.
6. **subtitle** — one-line description of the client.
7. **description** — longer client description.
8. **speaker** — name of the client contact quoted in the case study.
9. **role** — that person's job title.
10. **duration** — mission length (e.g. `2 mois`).
11. **scopes** — show existing scopes, let user pick and/or add new ones. Warn on new.
12. **tools** — show all tool slugs, let user pick one or more.
13. **featuredTool** — must be one of the tools picked above; if only one was picked, default to it.
14. **quotes (optional)** — ask for quotes one at a time; empty Enter stops.
15. **deliverables (optional)** — ask for deliverables one at a time; empty Enter stops.
16. **body** (required) — mission description in markdown.

### Job

1. **lang** — `fr` (default) or `en`.
2. **title** — job title. Used to suggest the slug.
3. **slug** — kebab-case. Warn if `jobs/<lang>/<slug>.md` already exists.
4. **icon (optional)** — a single emoji.
5. **contractType** — e.g. `CDI`. Show values seen in existing jobs.
6. **seniority** — e.g. `3-5 ans`.
7. **location** — e.g. `Paris (On site)`.
8. **startDate** — `YYYY-MM-DD`.
9. **hiringContact** — show active team slugs, ask to pick.
10. **applyEmail (optional)** — email address for applications.
11. **tallyFormId** — Tally form ID string (e.g. `mK0Q4g`).
12. **status** — `published | draft | closed` (default `published`).
13. **publishedAt** — `YYYY-MM-DD` (default today).
14. **intro (optional)** — introductory paragraph (multi-line OK).
15. **body** — ask for each of the three required sections separately, then assemble:
    - `### La Mission {% #mission %}`
    - `### Responsabilités {% #responsabilites %}`
    - `### Profil recherché {% #profil %}`

---

## Step 4 — Preview

Render the complete frontmatter and a short body preview (first ~200 chars if long):

```
---
<assembled YAML>
---

<body preview>
```

Ask: **Looks good? [y / n / edit]**
- `y` — continue
- `n` — abort, nothing written
- `edit` — ask which field to update, collect new value, re-render preview

---

## Step 5 — Output path and directory

| Type | Path |
|------|------|
| tool | `tools/<slug>.md` |
| team-member | `team/<slug>.md` |
| blog-post | `blog/<lang>/<slug>.md` |
| story | `stories/<lang>/<slug>.md` |
| job | `jobs/<lang>/<slug>.md` |

Create the directory if it does not exist:
```bash
mkdir -p <directory>
```

---

## Step 6 — Copy local assets

For each image path collected during the interview, rename it to the slug-based convention so `update-urls:new` can rewrite the reference:

```bash
mkdir -p <target-dir>
cp "<source-path>" "<target-dir>/<slug>.<ext>"
```

Preserve the source file extension; use the content slug as the basename. Target paths:

| Type | Local asset path |
|------|-----------------|
| blog-post cover | `assets/posts/<slug>/<slug>.<ext>` |
| team-member avatar | `assets/team/<slug>.<ext>` |
| tool icon | `assets/tools/<slug>.<ext>` |

Record each written local path (needed for the sync step).

---

## Step 7 — Write content file

Write the assembled file to the output path.

- Types with body (blog-post, story, job): `---\n<frontmatter>\n---\n\n<body>`
- Types without body (tool, team-member): `---\n<frontmatter>\n---\n`

YAML rules:
- Multi-line strings: use `|` block scalar.
- Strings containing `:` or `"`: wrap in double quotes.
- Arrays: YAML list format (`- item`), not inline.
- Dates: bare `YYYY-MM-DD` (no quotes).
- Booleans: bare `true` / `false`.

**Image URL fields** (`avatar`, `image`, `iconUrl`): write the relative local asset path (e.g. `assets/team/marie-dupont.jpg`), not a blob URL. `update-urls:new` rewrites these to blob URLs in the next step. This means `pnpm validate` will fail on these fields until sync completes successfully.

---

## Step 8 — Commit and let CI handle asset sync

**The GitHub Actions workflow (`.github/workflows/content-sync.yml`) handles blob upload and URL rewriting automatically on every PR.** Contributors do not need `BLOB_READ_WRITE_TOKEN` locally.

If you have the token available locally and want to sync before pushing:
```bash
node scripts/upload-assets.js --target new && pnpm update-urls:new && pnpm validate
```

Otherwise, skip straight to `publish-content`. CI will:
1. Upload any `assets/...` files to Vercel Blob
2. Rewrite local paths in the content file to blob URLs (commit back to the branch)
3. Run `pnpm validate` as a required check — the PR cannot merge until it passes

**Note:** `pnpm validate` will fail locally on `avatar` / `image` fields that are still local paths — this is expected and will be resolved by CI after push.

---

## On success

Confirm:
- File written to `<path>`
- Assets copied: list local target paths
- `pnpm validate` status

Remind: when ready to open a PR, run `publish-content`.
