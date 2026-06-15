import { z } from 'zod';

export const toolSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  iconUrl: z.url().optional(),
});

export const validateTool = (data) => toolSchema.safeParse(data);
