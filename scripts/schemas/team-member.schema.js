import { z } from 'zod';

const bilingualString = z.object({ fr: z.string().min(1), en: z.string().min(1) });

// The six enjeu keys, as defined by the enjeu spec (ADR 0002). Kept inline so
// this type does not depend on the enjeu schema; whether the key names an
// existing enjeu file is a cross-reference check, not a schema rule.
export const ENJEU_KEYS = ['rp', 'se', 'sc', 'cx', 'sy', 'ai'];

export const teamMemberSchema = z.object({
  name: z.string().min(1),
  role: bilingualString,
  track: z.string().min(1),
  avatar: z.url(),
  bio: bilingualString,
  linkedin: z.url().optional(),
  // Required: the website's MemberFrontmatterSchema mandates it, and its
  // fetchMultiple fails fast — a single member missing displayOrder wipes the
  // entire team section (regressions in PRs #59, #73). Keep in sync with the
  // site schema; do not relax to .optional().
  displayOrder: z.number().int().positive(),
  active: z.boolean().optional(),
  featuredOnAboutUs: z.boolean().optional(),
  color: z.enum(['yellow', 'coral', 'sky']).optional(),
  // Expert fields: all optional, absent for people who are not enjeu experts.
  enjeu: z.enum(ENJEU_KEYS).optional(),
  // Caps apply to the raw text, as published, so no .trim(); \S rejects blanks.
  contribution: z.object({
    fr: z.string().regex(/\S/).max(100),
    en: z.string().regex(/\S/).max(100),
  }).optional(),
  tools: z.array(z.string().min(1)).min(1).max(8).refine(
    (slugs) => new Set(slugs).size === slugs.length,
    { message: 'tools must not contain duplicates' },
  ).optional(),
  previousCompanies: z.array(z.string().regex(/\S/).max(30)).min(1).max(3).optional(),
}).superRefine((member, ctx) => {
  if (member.enjeu === undefined) return;
  for (const field of ['contribution', 'tools']) {
    if (member[field] === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [field],
        message: `${field} is required when enjeu is set`,
      });
    }
  }
});

export const validateTeamMember = (data) => teamMemberSchema.safeParse(data);
