# Blog post — Notion template

## Property mapping

| Notion property | Notion type | Frontmatter field | Required |
|----------------|-------------|-------------------|----------|
| Title | Title | `title` | ✅ |
| Author | Select | `author` | ✅ |
| Description | Text | `description` | ✅ |
| Date | Date | `date` | ✅ |
| Image | Files & media | `image` | ✅ |
| Lang | Select | `lang` | recommended |
| Tags | Multi-select | `tags` | optional |
| Read | Text | `read` | optional |
| Exerpt | Text | `exerpt` | optional |
| Podcast ID | Text | `podcastId` | optional |

**Accepted aliases** (adapter tries these in order if exact name is not found):
- Title → `Titre`, `Name`
- Author → `Auteur`
- Image → `Cover`, `Couverture`
- Lang → `Language`, `Langue`
- Read → `Reading time`, `Temps de lecture`
- Exerpt → `Excerpt`, `Résumé`
- Podcast ID → `PodcastId`, `Podcast`

**Author** values must match an active team member slug (e.g. `jerome-boileux`). The skill validates this during the interview.

**Image** — upload the cover image directly as a Notion file attachment, or link an external URL. The adapter takes the first file.

**Page body** — write the article body in the Notion page itself (below properties). The `notion-fetch` MCP call returns this as markdown.

## NotionAI scaffold prompt

Use this prompt in a new Notion page with NotionAI (/ → AI) to create the database:

> Create a database called "Blog posts" with these properties:
> - Title (title)
> - Author (select) — options: [add your team slugs]
> - Description (text)
> - Date (date)
> - Image (files & media)
> - Lang (select) — options: fr, en
> - Tags (multi-select)
> - Read (text)
> - Exerpt (text)
> - Podcast ID (text)

## Sample page

| Property | Value |
|----------|-------|
| Title | Comment Yousign a transformé sa RevOps |
| Author | jerome-boileux |
| Description | Un retour d'expérience sur la structuration RevOps de Yousign. |
| Date | 2024-03-15 |
| Image | [cover.jpg] |
| Lang | fr |
| Tags | strategy, ops |
| Read | 6 min |
