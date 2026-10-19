# Enjeu pages as a content type, owned by their lead expert

The website redesign adds six enjeu pages (Revenue Performance, Sales Experience, Sales Compensation, Customer Experience, Revenue Systems, Revenue AI). We store them in this repo as a new content type, `enjeu`, in `enjeux/<lang>/<slug>.md`. We rejected the alternative of six fixed pages in the website's `locales/*.json`, which is where single marketing pages (home, method, offer) live today. The six pages share one eight-section template in the mockup, and each lead expert edits their own page after launch. With fixed pages, every wording change would be a code PR on the website.

## Decisions

**Structured frontmatter, no body.** The page is lists and short blocks, not prose, so every section is a frontmatter field: hero, audience, workstreams, AI bridge line, client case (a Story slug plus a one-line summary), diagnostic question. Two pages carry a section of their own: the stack diagram on Revenue Systems, and the thesis on Revenue AI. These are named optional blocks (`extraSections`), implemented as components in the website. The file only places them.

**The "how we work" section stays in website code.** Its text is identical on five pages. An optional `method` field lets Revenue AI replace it with its Sprint steps.

**Bow tie: milestones in code, perimeter in content.** The seven milestones, their KPIs and the enjeu colours are defined once in the website. The enjeu file holds only `activeStages`, validated against the milestone identifiers. The perimeter is a commercial claim the expert owns; KPI definitions must not exist in six copies. The method page reads all enjeu files to drive its hover filter.

**Experts are declared on the Team member, not on the enjeu.** A Team member gains `enjeu` (one per person), `contribution`, `tools` (Tool slugs), `previousCompany` and `quote`, each translatable field in `fr`/`en`. An enjeu page lists the Team members whose `enjeu` matches. Membership lives in one place, and each expert owns their own file. We rejected an `experts` list in the enjeu file, which would let two files disagree.

**Ownership and review.** Each enjeu file has one lead expert as code owner. The content lead (Edmond de Maistre) is a required reviewer for message and tone. The website maintainer reviews schema and rendering. The per-PR preview deploy already exists and is the expert's check before merge.

**Publication.** A merge to `main` triggers a website redeploy through a Vercel deploy hook, so a correction is live within minutes on every page. Without it, the `static` cache strategy would delay enjeu, method and team pages by up to 24 hours. We rejected a one-hour cache strategy for enjeu pages only: the method page would contradict the enjeu page until its own cache expired.

## Relation to ADR 0001

Enjeu pages are created once and then edited, so experts work in this repo through Claude Code. Notion import remains available for the first draft but is not the expected route for edits.

## Consequences

- New Zod schema for `enjeu` and an extended Team member schema in `scripts/schemas/`, with length limits per field. Flip cards have a fixed height, so an overlong text breaks the layout.
- `new-content` gains the `enjeu` type and an edit mode for one section; `translate-content` supports `enjeu`.
- `CONTEXT.md` gains the terms Enjeu and Milestone, and their relationships to Team member and Story.
- A `CODEOWNERS` file maps each enjeu file to its lead expert. Six experts need a GitHub account in the organisation and a run of `setup`.
- A tone and length guide for enjeu pages, written by Ocobo.
- A workflow on push to `main` calls the deploy hook. The hook URL is stored as a repository secret.

## Revisit if

- An expert must appear on several enjeux with a different contribution on each: move experts back into the enjeu file as `{slug, contribution}`.
- `extraSections` grows past three blocks: the pages have diverged and fixed pages become cheaper.
- The Vercel plan limits deployments, or merges exceed about twenty a day.
