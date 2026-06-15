# Ocobo Content Repository — agent instructions

This repo holds the markdown content consumed by the Ocobo website. Read `CONTEXT.md` for the domain glossary and `docs/adr/` for past architectural decisions before doing non-trivial work.

## Agent skills

### Issue tracker

Issues and PRDs live as GitHub issues in `ocobo-revops/posts`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default Pocock label vocabulary, one-to-one with canonical roles. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context. `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

### Content authoring

Three skills cover the full authoring lifecycle:

- `new-content` (`.claude/skills/new-content/`) — create any of the 5 types (`blog-post | story | team-member | tool | job`). Source-agnostic: interview, local file, or Notion URL.
- `publish-content` — validate and open a PR against `main`.
- `translate-content` — translate an existing file to the other language.

Canonical workflow: `/new-content [--type X] [source]` → review preview → `/publish-content`. Source modes: **interview** (no setup), **local file** (`/new-content draft.md`), **Notion URL** (optional MCP, see `docs/mcp-notion-setup.md`).

Traps to respect when editing content directly:

- **`exerpt`** — the blog frontmatter key is intentionally misspelled; perpetuate it, do not "fix" it.
- **Slugs are identity** — kebab-case, and the cross-reference key for authors, tools, hiringContacts. Renaming a slug breaks references.
- **Blob URLs** — image fields (`avatar`, `image`, `iconUrl`) must resolve to Vercel Blob URLs; CI rewrites local paths on PR. `pnpm validate` fails on local paths until then — expected pre-sync.
- **Multi-language paradigm** — blog/story/job live under `<type>/<lang>/<slug>.md` (`fr` default). Team members carry both languages inline (`role.fr/en`, `bio.fr/en`); tools are language-agnostic (`name`, `category`, no translatable copy). Neither has a per-lang directory.
- **Cross-refs are strict** — `author`, `tools`, `featuredTool`, `hiringContact` must point to existing slugs; validation rejects dangling references.
