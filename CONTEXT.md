# Ocobo Content Repository

This repo holds the markdown content consumed by the Ocobo website. It replaces a traditional CMS — Ocobo teams edit content here via Claude Code and ship it through GitHub PRs.

## Language

**Content**:
The umbrella term for everything published by the website that lives in this repo: blog posts, stories, team members, tools, jobs.
_Avoid_: posts (overloaded — see "Flagged ambiguities").

**Blog post**:
A long-form article in `blog/<lang>/`, typically authored by a team member, often tied to the Revenue Echoes podcast.
_Avoid_: article, post (alone).

**Story**:
A customer case study in `stories/<lang>/`, describing a mission Ocobo delivered for a named client.
_Avoid_: case study, success story (acceptable colloquially, but `story` is the canonical filename and frontmatter convention).

**Team member**:
A person on the Ocobo team, represented by a single file in `team/`. Slug = identity; referenced by blog posts (`author`) and jobs (`hiringContact`).
_Avoid_: member (alone), author (that's a role, not the entity).

**Tool**:
A third-party software product Ocobo deploys or recommends to clients (e.g. HubSpot, Salesforce). Represented by a single file in `tools/`. Slug = identity; referenced by stories (`tools`, `featuredTool`).
_Avoid_: software, vendor, product.

**Job**:
An open position in `jobs/<lang>/`. References a `hiringContact` (team member slug).
_Avoid_: role (overloaded — see "Flagged ambiguities"), offer, posting.

**Slug**:
The kebab-case filename (without `.md`) that uniquely identifies a piece of content within its type. Cross-references between content types use slugs.

**Frontmatter**:
The YAML block at the top of each markdown file, between `---` fences. Defines structured fields; the markdown body below is the long-form content.

## Relationships

- A **Blog post** has exactly one author, which is a **Team member** slug.
- A **Story** references zero-or-more **Tools** by slug, and designates one as `featuredTool` (which must be in the `tools` list).
- A **Job** has exactly one `hiringContact`, which is a **Team member** slug.
- A **Team member** can be referenced by many **Blog posts** and **Jobs**.
- A **Tool** can be referenced by many **Stories**.

## Flagged ambiguities

- **"post"** was used both as the repo name (`ocobo-posts` = all content) and as a synonym for "blog post" (e.g. `assets/posts/`). Resolved: use **Content** as the umbrella term and **Blog post** for articles. The repo name and `assets/posts/` directory are kept as-is for backward compatibility.
- **"role"** appears as both a Team member field (job title, e.g. "Partner") and a Story field (the speaker's role at the client). Resolved: both usages are job titles, just for different people — no rename needed, context disambiguates.
