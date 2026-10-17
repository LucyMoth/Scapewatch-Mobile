import { build, context } from 'esbuild';
import { copyFile, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const release = process.argv.includes('--release');

await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await copyFile('src/index.html', 'dist/index.html');

const options = {
  entryPoints: ['src/index.js'],
  outfile: 'dist/mobile-ui.js',
  bundle: true,
  format: 'iife',
  target: 'es2022',
  loader: { '.html': 'text', '.webm': 'dataurl', '.png': 'dataurl' },
  plugins: [
    {
      name: 'embedded-styles',
      setup(bundler) {
        bundler.onLoad({ filter: /\.css$/ }, async ({ path }) => {
          const styles = await build({
            entryPoints: [path],
            bundle: true,
            write: false,
            metafile: true,
            minify: release,
          });
          return {
            contents: styles.outputFiles[0].text,
            loader: 'text',
            watchFiles: Object.keys(styles.metafile.inputs).map((filename) => resolve(filename)),
          };
        });
      },
    },
  ],
  minify: release,
  sourcemap: release ? false : 'inline',
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const watcher = await context(options);
  await watcher.watch();
} else {
  await build(options);
}
