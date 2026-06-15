import { z } from 'zod';
import { isoDate } from './iso-date.js';

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
