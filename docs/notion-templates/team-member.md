# Team member — Notion template

## Property mapping

| Notion property | Notion type | Frontmatter field | Required |
|----------------|-------------|-------------------|----------|
| Name | Title | `name` | ✅ |
| Role FR | Text | `role.fr` | ✅ |
| Role EN | Text | `role.en` | ✅ |
| Track | Select | `track` | ✅ |
| Avatar | Files & media | `avatar` | ✅ |
| Bio FR | Text | `bio.fr` | ✅ |
| Bio EN | Text | `bio.en` | ✅ |
| LinkedIn | URL | `linkedin` | optional |
| Display order | Number | `displayOrder` | optional |
| Active | Checkbox | `active` | optional (default true) |
| Featured on about us | Checkbox | `featuredOnAboutUs` | optional |
| Color | Select | `color` | optional |

**Accepted aliases:**
- Name → `Nom`
- Role FR → `Rôle FR`, `Role (FR)`
- Role EN → `Role (EN)`
- Avatar → `Photo`
- Bio FR → `Bio (FR)`
- Bio EN → `Bio (EN)`
- LinkedIn → `Linkedin`
- Display order → `Order`, `Ordre`
- Featured on about us → `Featured`
- Color → `Couleur`

**Track** — existing values: `architect`, `builder`, `expert-engineer`. Warn on new values during interview.

**Avatar** — upload the team member's photo as a Notion file attachment. The adapter downloads it to `assets/team/<slug>.<ext>` during import.

**Color** — one of `yellow`, `coral`, `sky`. Controls the accent colour on the team page.

No page body for team members.

## NotionAI scaffold prompt

> Create a database called "Team" with these properties:
> - Name (title)
> - Role FR (text)
> - Role EN (text)
> - Track (select) — options: architect, builder, expert-engineer
> - Avatar (files & media)
> - Bio FR (text)
> - Bio EN (text)
> - LinkedIn (URL)
> - Display order (number)
> - Active (checkbox)
> - Featured on about us (checkbox)
> - Color (select) — options: yellow, coral, sky

## Sample page

| Property | Value |
|----------|-------|
| Name | Alice Dupont |
| Role FR | Associée |
| Role EN | Partner |
| Track | architect |
| Avatar | [alice.jpg] |
| Bio FR | Alice accompagne les équipes RevOps depuis 10 ans. |
| Bio EN | Alice has been supporting RevOps teams for 10 years. |
| LinkedIn | https://linkedin.com/in/alice-dupont |
| Active | ✓ |
| Color | coral |
