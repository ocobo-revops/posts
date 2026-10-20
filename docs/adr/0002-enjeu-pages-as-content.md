# Enjeu pages as a content type, owned by their lead expert

The website redesign adds six enjeu pages (Revenue Performance, Sales Experience, Sales Compensation, Customer Experience, Revenue Systems, Revenue AI). We store them in this repo as a new content type, `enjeu`, in `enjeux/<lang>/<slug>.md`. We rejected the alternative of six fixed pages in the website's `locales/*.json`, which is where single marketing pages (home, method, offer) live today. The six pages share one eight-section template in the mockup, and each lead expert edits their own page after launch. With fixed pages, every wording change would be a code PR on the website.

## Decisions

**Structured frontmatter, no body.** The page is lists and short blocks, not prose, so every section is a frontmatter field: hero, audience, workstreams, AI bridge line, client case (a Story slug plus a one-line summary), diagnostic question. Two pages carry sections of their own: the stack diagram on Revenue Systems, and the thesis and "Une journée de commercial" on Revenue AI. These are website components, inserted when the enjeu key is `sy` or `ai`; the enjeu file does not mention them. The stack diagram shows Ocobo's technical doctrine, which the technology page and the home repeat, so its data lives in the website too. We rejected a list of named blocks placed by the file (`extraSections`): after the partner block became a field, it would have served a single block.

**Revenue AI is a sixth enjeu file.** Its page departs from the template on 7 of 13 sections, yet the home, the method page and "Les autres enjeux" read the same fields from all six enjeux. We rejected a page coded by hand, which would duplicate those fields outside the content. Its Sprint fills `method` with an overridden title. Its "Notre point de vue" fills `aiBridge` without a demo. The AI thesis and "Une journée de commercial" are website components, inserted when the enjeu key is `ai`. They are editorial pieces with heavy interaction, and no other enjeu will reuse them.

**Agent window demos are content.** The AI bridge is a full section: a title, three bullets and an optional agent window demo. The five demos share one frame (channel, agent, time, question, footer) and a body built from five element types: a KPI trio, a highlighted figure, a progress bar, a status row (ok or alert), buttons. `aiBridge.demo` holds the frame and an ordered list of typed elements; one website component renders them. The scenario is the expert's sales argument, like the workstreams, so the expert edits it without a website PR. We rejected one component per enjeu, which would copy the same frame five times, and data in the website's `locales/`, which would block the expert. The window has a fixed height, so the schema caps the number of elements and the length of each text.

**A partner block is an optional field open to every enjeu.** Sales Compensation shows Qobra under its workstreams: a logo, a positioning sentence, two before and after metrics, and their source. `partner` holds a Tool slug, the sentence, exactly two metrics and a required source, since the figures belong to a third party. The logo comes from the Tool file. We rejected a block named after Qobra: nothing in its structure is specific to Qobra, and a second partnership would need code.

**The "how we work" section is content on every page.** Only its heading and the three step titles are shared, and they stay in website code. The subtitle, step texts, tools and note vary per enjeu and live in `method`.

**Bow tie: stages in code, perimeter in content.** The seven stages, their milestones, their KPIs and the enjeu colours are defined once in the website. The enjeu file holds only `activeStages`, validated against the stage identifiers. The perimeter is a commercial claim the expert owns; KPI definitions must not exist in six copies. The method page reads all enjeu files to drive its hover filter.

**Experts are declared on the Team member, not on the enjeu.** A Team member gains `enjeu` (one per person), `contribution`, `tools` (Tool slugs) and `previousCompanies`, each translatable field in `fr`/`en`. No mockup page shows an expert quote, so the planned `quote` field is dropped. An enjeu page lists the Team members whose `enjeu` matches. Membership lives in one place, and each expert owns their own file. We rejected an `experts` list in the enjeu file, which would let two files disagree.

**Contribution and bio are two texts.** The existing `bio` stays the text of the about-us page, unchanged. `contribution` is a new, shorter text written to sell the enjeu; the enjeu and team pages show it with `previousCompanies`. Production bios already name past employers, so the about-us card does not show `previousCompanies`. We rejected moving employers out of the bios, which would rewrite production content, and a single text, which would cut the founders' longer presentation.

**One ordered tool list per expert.** `tools` is ordered by the expert. The enjeu card shows the first four; the team page shows them all. In the mockup the enjeu cards show a shorter selection of the team page list, so one list covers both. We rejected a second list for the enjeu card, which could contradict the first, and a list per expert in the enjeu file, which would undo the single declaration above.

**Ownership and review.** Each enjeu file has one lead expert as code owner. The content lead (Edmond de Maistre) is a required reviewer for message and tone. The website maintainer reviews schema and rendering. The per-PR preview deploy already exists and is the expert's check before merge.

**Publication.** A merge to `main` triggers a website redeploy through a Vercel deploy hook, so a correction is live within minutes on every page. Without it, the `static` cache strategy would delay enjeu, method and team pages by up to 24 hours. We rejected a one-hour cache strategy for enjeu pages only: the method page would contradict the enjeu page until its own cache expired.

## Relation to ADR 0001

Enjeu pages are created once and then edited, so experts work in this repo through Claude Code. Notion import remains available for the first draft but is not the expected route for edits.

## Consequences

- New Zod schema for `enjeu` and an extended Team member schema in `scripts/schemas/`, with length limits per field. Flip cards and the agent window have a fixed height, so an overlong text breaks the layout.
- The `enjeu` schema caps the demo elements per window, requires exactly two partner metrics and a partner source, and has no `extraSections` field.
- New cross-references for validation: `partner.tool` and Team member `tools` point to Tool slugs, the client case to a Story slug, Team member `enjeu` to an enjeu key, and `activeStages` to the stage identifiers.
- Team member gains `enjeu`, `contribution`, `tools` and `previousCompanies`; there is no `quote` field. Existing files stay valid: the new fields are optional for people who are not experts.
- `new-content` gains the `enjeu` type and an edit mode for one section; `translate-content` supports `enjeu`.
- `CONTEXT.md` gains the terms Enjeu, Stage and Milestone, and their relationships to Team member and Story.
- A `CODEOWNERS` file maps each enjeu file to its lead expert. Six experts need a GitHub account in the organisation and a run of `setup`.
- A tone and length guide for enjeu pages, written by Ocobo.
- A workflow on push to `main` calls the deploy hook. The hook URL is stored as a repository secret.

## Revisit if

- An expert must appear on several enjeux with a different contribution on each: move experts back into the enjeu file as `{slug, contribution}`.
- A third enjeu needs a section of its own, or a section coded for one key needs editing by its expert: the pages have diverged and fixed pages become cheaper.
- The Vercel plan limits deployments, or merges exceed about twenty a day.
