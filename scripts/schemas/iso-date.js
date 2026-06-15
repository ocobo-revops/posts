import { z } from 'zod';

// gray-matter parses YAML dates as JS Date objects; normalise to YYYY-MM-DD string
export const isoDate = z.preprocess(
  (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v),
  z.iso.date(),
);
