# Notion as content staging area, GitHub as published source of truth

Authors and reviewers draft content (blog posts, stories, team members, tools, jobs) in Notion databases — one DB per content type, with properties mapped to the markdown frontmatter. A Claude Code skill imports each Notion page into the repo (frontmatter + body + assets), opens a PR, and from that point the markdown file in `main` is read-only relative to Notion: corrections happen in GitHub, not in Notion.

We picked this over "edit markdown directly in GitHub" because the dominant authors are non-tech Ocobo team members who already work in Notion and use NotionAI; asking them to write YAML+markdown in a terminal would block adoption. We picked the unidirectional sync (Notion → GitHub, then GitHub is canonical) over bidirectional sync because two-way sync against Notion is brittle and would require infrastructure beyond a Claude Code skill.

## Consequences

- Each user needs an MCP Notion connection authenticated against the Ocobo workspace (setup doc: `docs/mcp-notion-setup.md`).
- Notion DB schemas must stay aligned with the Zod schemas in `scripts/schemas/`. Drift is detected at import time (validation fails).
- Notion pages become stale after import — they are not the source of truth for what's live on the website.
- An interview fallback in each skill covers cases where Notion is impractical (urgent fix, very short content).
