// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://paul-learning.dev',
  base: '/learning-software-dev',
  trailingSlash: 'always',
  integrations: [react(), mdx()],
});
