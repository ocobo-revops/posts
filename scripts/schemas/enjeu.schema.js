import { z } from 'zod';
import { STAGE_IDS } from './stage-ids.js';

// Caps are character counts measured on the French mockup text (spec #91):
// the longest value in the six mockups plus about 20 %. Fixed-height flip
// cards and windows break when a text runs over, so the error states the
// overage the author has to cut.
const text = (cap) =>
  z
    .string()
    .trim()
    .min(1)
    .max(cap, {
      error: (iss) => {
        const length = iss.input.length;
        return `${length} characters, cap ${cap} (${length - cap} over)`;
      },
    });

// Slugs carry no cap: they never render as text.
const slug = z.string().trim().min(1);

const ENJEU_KEYS = ['rp', 'se', 'sc', 'cx', 'sy', 'ai'];

const activeStages = z
  .array(z.enum(STAGE_IDS))
  .min(1)
  .max(STAGE_IDS.length)
  .refine((stages) => new Set(stages).size === stages.length, {
    message: 'Stage ids must be unique',
  });

const workstream = z.strictObject({
  category: text(26),
  step: z.number().int().min(1).max(6).optional(),
  title: text(64),
  description: text(210),
  deliverable: text(170),
  note: text(100).optional(),
});

export const enjeuSchema = z.strictObject({
  key: z.enum(ENJEU_KEYS),
  order: z.number().int().min(1).max(6),
  name: text(30),
  tagline: text(60),
  hero: z.strictObject({
    title: z.tuple([text(34), text(42)]),
    quote: text(80),
    lead: text(240),
    highlight: text(110),
    cta: text(48),
  }),
  bowtie: z.strictObject({
    activeStages,
    caption: text(140),
  }),
  symptoms: z.strictObject({
    title: z.tuple([text(64), text(44)]),
    items: z.array(text(130)).min(5).max(6),
  }),
  audience: z
    .array(
      z.strictObject({
        team: text(20),
        roles: text(30),
        benefit: text(100),
      }),
    )
    .length(4),
  workstreams: z.strictObject({
    title: text(50).optional(),
    intro: text(120),
    items: z.array(workstream).min(4).max(6),
  }),
  aiBridge: z.strictObject({
    title: text(92),
    bullets: z.array(text(125)).length(3),
  }),
  method: z.strictObject({
    title: text(30).optional(),
    subtitle: text(75),
    steps: z
      .array(
        z.strictObject({
          title: text(28).optional(),
          text: text(150),
        }),
      )
      .length(3),
    // Tool slugs. Their cross-reference check comes in a later ticket.
    // Spec #91 says 0 to 6. The Sales Experience mockup shows 9 tools, logos
    // included, so the cap is the mockup count, like every other count.
    tools: z.array(slug).max(9),
    note: text(170),
  }),
  case: z.strictObject({
    // Optional until Ocobo confirms a Story for the Revenue AI client case
    // (assumption A5 in spec #91).
    story: slug.optional(),
    // Spec #91 says 90. The Revenue AI headline is 98 characters, so the cap
    // follows the spec's own rule: longest mockup value plus about 20 %.
    headline: text(120),
    summary: text(220),
    metrics: z
      .array(
        z.strictObject({
          value: text(12),
          label: text(90),
        }),
      )
      .length(2),
  }),
  diagnostic: z.strictObject({
    question: text(88),
    subtitle: text(125),
  }),
});

export const validateEnjeu = (data) => enjeuSchema.safeParse(data);
