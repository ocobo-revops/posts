# Notion templates — overview

Templates for staging Ocobo content in Notion before importing via `new-content`.

## Flow

```
Author drafts page in Notion database
        ↓
new-content https://notion.so/<page-url>
        ↓
Notion MCP fetches page properties + content
        ↓
notion.js maps properties → frontmatter fields
        ↓
Claude interviews for any missing required fields
        ↓
pnpm validate → publish-content → PR
```

## Property naming conventions

Each Notion database should use the exact property names listed in the per-type template files. The adapter also accepts common French and English variants — see each file for the full alias list.

The Notion page **title** (the primary `Title` property) always maps to the main identifier of the content:
- Blog post → `title` (article title)
- Story → `name` (client company name)
- Team member → `name` (full name)
- Tool → `name` (display name)
- Job → `title` (job title)

## Per-type templates

| Type | File |
|------|------|
| Blog post | [blog-post.md](blog-post.md) |
| Story | [story.md](story.md) |
| Team member | [team-member.md](team-member.md) |
| Tool | [tool.md](tool.md) |
| Job | [job.md](job.md) |

## Setup

1. Follow `docs/mcp-notion-setup.md` to connect the Notion MCP.
2. Create a Notion database for the content type you need.
3. Add the properties listed in the relevant template file.
4. Use the NotionAI prompt in the template to scaffold the database automatically.
