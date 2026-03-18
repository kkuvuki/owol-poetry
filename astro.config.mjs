import { defineConfig } from 'astro/config';
import remarkBreaks from 'remark-breaks';

export default defineConfig({
  site: 'https://itsowol.com',
  build: {
    inlineStylesheets: 'auto',
  },
  markdown: {
    remarkPlugins: [remarkBreaks],
  },
});
