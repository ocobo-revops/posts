# Job — Notion template

## Property mapping

| Notion property | Notion type | Frontmatter field | Required |
|----------------|-------------|-------------------|----------|
| Title | Title | `title` | ✅ |
| Contract type | Select | `contractType` | ✅ |
| Seniority | Text | `seniority` | ✅ |
| Location | Text | `location` | ✅ |
| Start date | Date | `startDate` | ✅ |
| Hiring contact | Select | `hiringContact` | ✅ |
| Tally form ID | Text | `tallyFormId` | ✅ |
| Status | Select | `status` | ✅ |
| Published at | Date | `publishedAt` | ✅ |
| Lang | Select | `lang` | recommended |
| Icon | Text | `icon` | optional (emoji) |
| Apply email | Email | `applyEmail` | optional |
| Intro | Text | `intro` | optional |

**Accepted aliases:**
- Title → `Titre`, `Name`
- Contract type → `Type de contrat`
- Seniority → `Séniorité`
- Location → `Lieu`
- Start date → `Date de début`
- Hiring contact → `Contact RH`
- Apply email → `Email candidature`
- Tally form ID → `TallyFormId`
- Status → `Statut`
- Published at → `Date de publication`
- Lang → `Language`, `Langue`
- Icon → `Icône`

**Status** — one of `published`, `draft`, `closed`.

**Hiring contact** — must match an active team member slug.

**Page body** — write the job description in three sections in the Notion page body:
```
### La Mission
...
### Responsabilités
...
### Profil recherché
...
```

## NotionAI scaffold prompt

> Create a database called "Jobs" with these properties:
> - Title (title)
> - Contract type (select) — options: CDI, CDD, Freelance, Stage
> - Seniority (text)
> - Location (text)
> - Start date (date)
> - Hiring contact (select) — add team member slugs as options
> - Tally form ID (text)
> - Status (select) — options: published, draft, closed
> - Published at (date)
> - Lang (select) — options: fr, en
> - Icon (text) — a single emoji
> - Apply email (email)
> - Intro (text)

## Sample page

| Property | Value |
|----------|-------|
| Title | RevOps Manager |
| Contract type | CDI |
| Seniority | 3-5 ans |
| Location | Paris (On site) |
| Start date | 2024-09-01 |
| Hiring contact | alice-dupont |
| Tally form ID | mK0Q4g |
| Status | published |
| Published at | 2024-08-01 |
| Lang | fr |
| Icon | 🚀 |
