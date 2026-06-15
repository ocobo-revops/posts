# Tool — Notion template

## Property mapping

| Notion property | Notion type | Frontmatter field | Required |
|----------------|-------------|-------------------|----------|
| Name | Title | `name` | ✅ |
| Category | Select | `category` | ✅ |
| Icon URL | Files & media | `iconUrl` | optional |

**Accepted aliases:**
- Name → `Nom`
- Category → `Catégorie`
- Icon URL → `Icon`, `IconUrl`

**Category** — warn on new values during interview (show existing categories). Category is a free-form string, not a fixed enum.

**Icon URL** — upload the tool icon as a Notion file attachment or external URL. The adapter downloads it to `assets/tools/<slug>.<ext>` during import.

No page body for tools.

## NotionAI scaffold prompt

> Create a database called "Tools" with these properties:
> - Name (title) — the tool display name, e.g. HubSpot
> - Category (select) — e.g. CRM, Analytics, Automation
> - Icon URL (files & media)

## Sample page

| Property | Value |
|----------|-------|
| Name | HubSpot |
| Category | CRM |
| Icon URL | [hubspot.svg] |
