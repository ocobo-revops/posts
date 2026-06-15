# translate-content

Translate an existing Ocobo content file to the other language. Produces a validated, ready-to-publish file.

## When to invoke

When a user has an existing content file in French or English and wants the other-language version.

## Args

`<path>` — required. Path to the source content file. Examples:

    translate-content blog/fr/some-post.md
    translate-content stories/fr/citron.md
    translate-content team/alice-dupont.md

---

## Step 1 — Detect type and language

Parse the file path:

| Path pattern | Type | Source lang |
|---|---|---|
| `blog/fr/<slug>.md` | blog-post | fr |
| `blog/en/<slug>.md` | blog-post | en |
| `stories/fr/<slug>.md` | story | fr |
| `stories/en/<slug>.md` | story | en |
| `jobs/fr/<slug>.md` | job | fr |
| `jobs/en/<slug>.md` | job | en |
| `team/<slug>.md` | team-member | (detect from file) |
| `tools/<slug>.md` | tool | — |

**If type is `tool`:** stop immediately.
> Tools are monolingual — `translate-content` does not apply to tool entries.

**If the path does not match any known pattern:** stop.
> Cannot determine content type from path: `<path>`

**Target language:** the opposite of source lang (`fr` → `en`, `en` → `fr`).

---

## Step 2 — Load source file

Read the source file. Parse frontmatter and body.

**For path-based types** (blog-post, story, job): check whether the target file already exists:

```bash
ls <target-path> 2>/dev/null
```

If it exists, warn: `<target-path> already exists — overwrite? [y/n]` Stop if the user says no.

---

## Step 3 — Translate

Translate the fields listed below into the target language. General rules:

- Preserve markdown formatting exactly — headers, bold, links, lists, code blocks, emojis, line breaks.
- Do **not** translate: proper nouns (company names, people names, tool names, brand names, Ocobo), URLs, slugs, email addresses, code snippets, YAML keys.
- Markdoc tags (`{% ... %}`): preserve tag names and `#anchor` IDs verbatim; translate human-readable text attributes (e.g. `title="..."`) where present.
- Translate body prose as a whole — do not split by paragraph.
- **If the source file has no body:** warn before proceeding — `Source file has no body — translate frontmatter fields only? [y/n]`

### Blog post

Translate:
- `title`
- `description`
- `exerpt` (if present)
- Body

Preserve verbatim:
- `author`, `date`, `image`, `read`, `podcastId`, `tags`

Target path: `blog/<target-lang>/<slug>.md`

### Story

Translate:
- `title`
- `subtitle`
- `description`
- `role` (speaker's job title — translatable prose, e.g. "Directeur commercial" → "Sales Director")
- Each entry in `scopes[]` individually (displayed text on the site — translate each value)
- Each entry in `quotes[]` individually (if present)
- Each entry in `deliverables[]` individually (if present)
- Body

Preserve verbatim:
- `name`, `date`, `speaker`, `duration`, `tools`, `featuredTool`
  (`tools` and `featuredTool` are slugs validated by the schema — never translate them)

Target path: `stories/<target-lang>/<slug>.md`

### Job

Translate:
- `title`
- `intro` (if present)
- Body (all three sections — La Mission, Responsabilités, Profil recherché — preserving the section headings and Markdown anchors `{% #... %}` verbatim)

Preserve verbatim:
- `icon`, `contractType`, `seniority`, `location`, `startDate`, `hiringContact`, `applyEmail`, `tallyFormId`, `status`, `publishedAt`

Target path: `jobs/<target-lang>/<slug>.md`

### Team member (in-place)

For each field (`role` and `bio`) independently, check which language key is missing and fill only that key. Never overwrite an existing value.

| `role.fr` | `role.en` | Action |
|---|---|---|
| present | absent | translate `role.fr` → `role.en` |
| absent | present | translate `role.en` → `role.fr` |
| present | present | skip (nothing to add) |

Apply the same logic for `bio`.

If **both** `role` and `bio` already have both languages → stop:
> Both languages already present in `<path>` — nothing to translate.

If `role` and `bio` require translation in **opposite directions** (e.g. `role` missing EN, `bio` missing FR) — handle each field independently and show both additions in the Step 4 preview.

Edit the **existing file** in-place. Do not create a sibling file.

---

## Step 4 — Preview

Show the full output before writing anything.

**Path-based types:** render the complete new file (frontmatter + body preview, first ~300 chars if body is long).

**Team member:** show only the lines being added in diff format (omit fields where nothing changes):
```
  role:
    fr: <original>
+   en: <translated>          ← only if role.en was missing
  bio:
    fr: <original>
+   en: <translated>          ← only if bio.en was missing
```

Ask: **Looks good? [y / n / edit]**
- `y` — proceed
- `n` — abort, nothing written
- `edit` — ask which translated field to revise, collect the new value, re-render the preview

---

## Step 5 — Write

**Path-based types:**

Create the target directory if it does not exist:

```bash
mkdir -p <target-dir>
```

Write the assembled file to `<target-path>`.

YAML rules:
- Multi-line strings: use `|` block scalar.
- Strings containing `:` or `"`: wrap in double quotes.
- Arrays: YAML list format (`- item`), not inline.
- Dates: bare `YYYY-MM-DD` (no quotes).
- Booleans: bare `true` / `false`.

**Team member:** edit the file in-place — update `role` and `bio` to include both language keys.

---

## Step 6 — Validate

```bash
pnpm validate
```

If validation passes, confirm:
> Written: `<target-path>` — `pnpm validate` passed.
> Run `publish-content <target-path>` when ready to open a PR.

If validation fails, show the exact errors and offer to fix inline — edit the relevant translated fields and re-run `pnpm validate` until green.
