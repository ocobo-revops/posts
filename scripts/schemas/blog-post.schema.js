import { z } from 'zod';

// gray-matter parses YAML dates as JS Date objects; normalise to YYYY-MM-DD string
const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.iso.date(),
);

export const blogPostSchema = z.object({
  title: z.string().min(1),
  author: z.string().min(1),
  description: z.string().min(1),
  date: isoDate,
  image: z.url(),
  // typo perpetuated from existing content — see issue #50 for cleanup
  exerpt: z.string().optional(),
  read: z.string().optional(),
  podcastId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export const validateBlogPost = (data) => blogPostSchema.safeParse(data);
