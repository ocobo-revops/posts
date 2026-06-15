import { z } from 'zod';

// gray-matter parses YAML dates as JS Date objects; normalise to YYYY-MM-DD string
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.iso.date(),
);

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
