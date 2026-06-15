import { z } from 'zod';
import { isoDate } from './iso-date.js';

export const jobSchema = z.object({
  title: z.string().min(1),
  icon: z.string().optional(),
  contractType: z.string().min(1),
  seniority: z.string().min(1),
  location: z.string().min(1),
  startDate: isoDate,
  hiringContact: z.string().min(1),
  applyEmail: z.email().optional(),
  tallyFormId: z.string().min(1),
  status: z.enum(['published', 'draft', 'closed']),
  publishedAt: isoDate,
  intro: z.string().optional(),
});

export const validateJob = (data) => jobSchema.safeParse(data);
