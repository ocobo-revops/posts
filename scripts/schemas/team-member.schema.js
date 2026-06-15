import { z } from 'zod';

const bilingualString = z.object({ fr: z.string().min(1), en: z.string().min(1) });

export const teamMemberSchema = z.object({
  name: z.string().min(1),
  role: bilingualString,
  track: z.string().min(1),
  avatar: z.url(),
  bio: bilingualString,
  linkedin: z.url().optional(),
  displayOrder: z.number().int().positive().optional(),
  active: z.boolean().optional(),
  featuredOnAboutUs: z.boolean().optional(),
  color: z.enum(['yellow', 'coral', 'sky']).optional(),
});

export const validateTeamMember = (data) => teamMemberSchema.safeParse(data);
