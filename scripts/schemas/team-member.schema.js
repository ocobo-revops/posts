import { z } from 'zod';

const bilingualString = z.object({ fr: z.string().min(1), en: z.string().min(1) });

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
});

export const validateTeamMember = (data) => teamMemberSchema.safeParse(data);
