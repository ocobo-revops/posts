import { z } from 'zod';

// gray-matter parses YAML dates as JS Date objects; normalise to YYYY-MM-DD string
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.iso.date(),
);

export const storySchema = z
  .object({
    name: z.string().min(1),
    date: isoDate,
    title: z.string().min(1),
    subtitle: z.string().min(1),
    description: z.string().min(1),
    speaker: z.string().min(1),
    role: z.string().min(1),
    duration: z.string().min(1),
    scopes: z.array(z.string()),
    tools: z.array(z.string()),
    featuredTool: z.string().min(1),
    quotes: z.array(z.string()).optional(),
    deliverables: z.array(z.string()).optional(),
  })
  .refine((d) => d.tools.includes(d.featuredTool), {
    message: 'featuredTool must be one of the values in tools[]',
    path: ['featuredTool'],
  });

export const validateStory = (data) => storySchema.safeParse(data);
