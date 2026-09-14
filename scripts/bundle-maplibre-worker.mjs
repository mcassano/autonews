// MapLibre GL JS loads its tile-processing worker as a separate ES module
// script (`new Worker(new URL('./maplibre-gl-worker.mjs', ...), {type: 'module'})`).
// Next.js/Turbopack doesn't rewrite that URL for a pre-built dependency, so
// the browser ends up requesting a worker script that doesn't exist and gets
// Next's HTML fallback instead (a "Failed to load module script: ... non-
// JavaScript MIME type" error) — the map then never fetches any tiles.
//
// The fix is to self-host the worker under `public/` and point MapLibre at it
// via `maplibregl.setWorkerUrl()` (see src/components/Map.tsx). We bundle it
// (rather than copying `maplibre-gl-worker.mjs` + its `maplibre-gl-shared.mjs`
// dependency as two separate files) so it's a single, minified, self-
// contained request with no relative-import resolution to worry about. This
// script keeps that bundle in sync with whatever maplibre-gl version is
// actually installed.
//
// Note: after the worker script loads, the browser has to parse and compile
// it before it starts responding to tile requests — for this ~700KB
// (minified) bundle that's a few real seconds, not instant. The map looks
// "stuck" on the background color during that window; that's normal, not a
// sign the fix isn't working.
import { mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const entry = join(rootDir, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs');
const destDir = join(rootDir, 'public', 'maplibre');
const outfile = join(destDir, 'maplibre-gl-worker.mjs');

mkdirSync(destDir, { recursive: true });

await esbuild.build({
  entryPoints: [entry],
  bundle: true,
  minify: true,
  format: 'esm',
  platform: 'browser',
  outfile,
});

console.log('Bundled maplibre-gl worker to public/maplibre/maplibre-gl-worker.mjs');
