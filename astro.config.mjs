// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

export default defineConfig({
  site: 'https://easylive1989.github.io',
  base: '/learning-software-dev',
  trailingSlash: 'always',
  integrations: [react(), mdx()],
});
