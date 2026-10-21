import { z } from 'zod';
import { STAGE_IDS } from './stage-ids.js';

// Caps are character counts measured on the French mockup text (spec #91):
// the longest value in the six mockups plus about 20%. Fixed-height flip
// cards and windows break when a text runs over, so the error states the
// overage the author has to cut.
const cappedText = (cap) =>
  z
    .string()
    .trim()
    .min(1, { error: 'must not be empty' })
    .max(cap, {
      error: (iss) => {
        const length = iss.input.length;
        return `${length} characters, cap ${cap} (${length - cap} over)`;
      },
    });

// Slugs carry no cap: they never render as text.
const slug = z.string().trim().min(1, { error: 'must not be empty' });

export const ENJEU_KEYS = ['rp', 'se', 'sc', 'cx', 'sy', 'ai'];

const activeStages = z
  .array(z.enum(STAGE_IDS))
  .min(1)
  .max(STAGE_IDS.length)
  .refine((stages) => new Set(stages).size === stages.length, {
    message: 'Stage ids must be unique',
  });

const workstream = z.strictObject({
  category: cappedText(26),
  step: z.number().int().min(1).max(6).optional(),
  title: cappedText(64),
  description: cappedText(210),
  deliverable: cappedText(170),
  note: cappedText(100).optional(),
});

export const enjeuSchema = z.strictObject({
  key: z.enum(ENJEU_KEYS),
  order: z.number().int().min(1).max(6),
  name: cappedText(30),
  tagline: cappedText(60),
  hero: z.strictObject({
    title: z.tuple([cappedText(34), cappedText(42)]),
    quote: cappedText(80),
    lead: cappedText(240),
    highlight: cappedText(110),
    cta: cappedText(48),
  }),
  bowtie: z.strictObject({
    activeStages,
    caption: cappedText(140),
  }),
  symptoms: z.strictObject({
    title: z.tuple([cappedText(64), cappedText(44)]),
    items: z.array(cappedText(130)).min(5).max(6),
  }),
  audience: z
    .array(
      z.strictObject({
        team: cappedText(20),
        roles: cappedText(30),
        benefit: cappedText(100),
      }),
    )
    .length(4),
  workstreams: z.strictObject({
    title: cappedText(50).optional(),
    intro: cappedText(120),
    items: z.array(workstream).min(4).max(6),
  }),
  aiBridge: z.strictObject({
    title: cappedText(92),
    bullets: z.array(cappedText(125)).length(3),
  }),
  method: z.strictObject({
    title: cappedText(30).optional(),
    subtitle: cappedText(75),
    steps: z
      .array(
        z.strictObject({
          title: cappedText(28).optional(),
          text: cappedText(150),
        }),
      )
      .length(3),
    // Tool slugs. Their cross-reference check comes in a later ticket.
    // Spec #91 says 0 to 6. Two mockups exceed it, logos included (Sales
    // Experience 9, Revenue Systems 7), so the cap is the largest mockup count.
    tools: z.array(slug).max(9),
    note: cappedText(170),
  }),
  case: z.strictObject({
    // Optional until Ocobo confirms a Story for the Revenue AI client case
    // (assumption A5 in spec #91).
    story: slug.optional(),
    // Spec #91 says 90. The Revenue AI headline is 98 characters, so the cap
    // follows the spec's own rule: longest mockup value plus about 20%.
    headline: cappedText(120),
    summary: cappedText(220),
    metrics: z
      .array(
        z.strictObject({
          value: cappedText(12),
          label: cappedText(90),
        }),
      )
      .length(2),
  }),
  diagnostic: z.strictObject({
    question: cappedText(88),
    subtitle: cappedText(125),
  }),
});

export const validateEnjeu = (data) => enjeuSchema.safeParse(data);
