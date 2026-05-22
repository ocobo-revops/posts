# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

This repo is **single-context**.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — domain glossary (Content, Blog post, Story, Team member, Tool, Job, Slug, Frontmatter) and relationships between content types.
- **`docs/adr/`** — read ADRs that touch the area you're about to work in.

If any of these files don't exist, **proceed silently**. Don't flag their absence; don't suggest creating them upfront.

## File structure

```
/
├── CONTEXT.md
├── docs/adr/
│   └── 0001-notion-as-content-staging.md
└── (assets, blog, jobs, legal, stories, team, tools)
```

## Use the glossary's vocabulary

When output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids — notably:

- "Content" (umbrella), not "posts" (which refers specifically to the repo dir `assets/posts/` kept for backward compat)
- "Blog post" for articles, not "article" or "post" alone
- "Story" for case studies, not "case study" or "success story"
- "Team member" for people, not "member" or "author" alone
- "Tool" for third-party software, not "vendor" or "product"

If the concept you need isn't in the glossary yet, that's a signal — either you're inventing language the project doesn't use (reconsider) or there's a real gap.

## Flag ADR conflicts

If output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (Notion as content staging) — but worth reopening because…_
