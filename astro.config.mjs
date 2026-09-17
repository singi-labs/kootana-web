// @ts-check
import { defineConfig } from 'astro/config';

// Static output. Netlify serves the built `dist/` and runs the serverless
// functions in `netlify/functions/` separately — no adapter needed.
export default defineConfig({
  site: 'https://kootana.social',
});
