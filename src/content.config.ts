import { defineCollection, z } from 'astro:content';

const poems = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    year: z.string().optional(),
    theme: z.string().optional(),
    excerpt: z.string().optional(),
    order: z.number().default(99),
  }),
});

export const collections = { poems };
