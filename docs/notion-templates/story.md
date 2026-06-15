# Story (case study) — Notion template

## Property mapping

| Notion property | Notion type | Frontmatter field | Required |
|----------------|-------------|-------------------|----------|
| Name | Title | `name` (client company) | ✅ |
| Date | Date | `date` | ✅ |
| Title | Text | `title` | ✅ |
| Subtitle | Text | `subtitle` | ✅ |
| Description | Text | `description` | ✅ |
| Speaker | Text | `speaker` | ✅ |
| Role | Text | `role` | ✅ |
| Duration | Text | `duration` | ✅ |
| Scopes | Multi-select | `scopes` | ✅ |
| Tools | Multi-select | `tools` | ✅ |
| Featured tool | Select | `featuredTool` | ✅ |
| Lang | Select | `lang` | recommended |
| Quotes | Text | `quotes` | optional |
| Deliverables | Text | `deliverables` | optional |

**Accepted aliases:**
- Name → `Client`, `Nom`
- Title → `Titre`
- Subtitle → `Sous-titre`
- Speaker → `Contact`, `Interlocuteur`
- Role → `Rôle`, `Job title`
- Duration → `Durée`
- Scopes → `Périmètres`
- Tools → `Outils`
- Featured tool → `Outil principal`, `Featured Tool`
- Lang → `Language`, `Langue`

**Tools / Scopes** — values must match existing tool slugs and scope names in the repo. The skill shows existing values during the interview.

**Featured tool** must be one of the values in Tools.

**Page body** — write the mission description (markdown) in the Notion page body.

## NotionAI scaffold prompt

> Create a database called "Stories" with these properties:
> - Name (title) — the client company name
> - Date (date)
> - Title (text) — the case study headline
> - Subtitle (text)
> - Description (text)
> - Speaker (text)
> - Role (text)
> - Duration (text)
> - Scopes (multi-select)
> - Tools (multi-select)
> - Featured tool (select)
> - Lang (select) — options: fr, en
> - Quotes (text)
> - Deliverables (text)

## Sample page

| Property | Value |
|----------|-------|
| Name | Yousign |
| Date | 2024-01-10 |
| Title | De 0 à une équipe RevOps en 18 mois |
| Subtitle | Startup SaaS spécialisée dans la signature électronique |
| Speaker | Jean Dupont |
| Role | Head of Revenue |
| Duration | 6 mois |
| Scopes | Acquisition, CRM |
| Tools | hubspot, gsheet |
| Featured tool | hubspot |
