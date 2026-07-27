import type { Plugin } from 'esbuild';
import { defineConfig } from 'tsup';

/**
 * Maps specific import specifiers to a runtime global variable,
 * instead of bundling them. Confirmed against Dash's own real,
 * shipped bundle (dash/html/dash_html_components.min.js, installed
 * with the `dash` package itself) that this is the correct, real
 * convention Dash's own components use: `var t=window.React,
 * i=window.PropTypes`. Dash's own documentation confirms React and
 * ReactDOM are provided by dash-renderer and "don't need to be
 * bundled with your components" — this plugin is what makes that
 * true for an esbuild/tsup build specifically, since esbuild has no
 * built-in equivalent to webpack's `externals: { react: { root:
 * 'React' } } }`config. Written inline, not as an installed
 * dependency, since it's a small, self-contained pattern and this
 * project avoids adding a runtime/build dependency for something
 * this size.
 */
function globalExternals(mapping: Record<string, string>): Plugin {
  return {
    name: 'global-externals',
    setup(build) {
      for (const [moduleName, globalVariableName] of Object.entries(mapping)) {
        const namespace = `global-externals-ns:${moduleName}`;
        const filter = new RegExp(`^${moduleName}$`);

        build.onResolve({ filter }, () => ({
          path: moduleName,
          namespace,
        }));

        build.onLoad({ filter, namespace }, () => ({
          contents: `module.exports = ${globalVariableName};`,
          loader: 'js',
        }));
      }
    },
  };
}

export default defineConfig({
  entry: { dash_fluida: 'src/frontend/index.ts' },
  format: ['iife'],
  globalName: 'dash_fluida',
  platform: 'browser',
  target: 'es2020',
  clean: true,
  sourcemap: true,
  dts: false,
  minify: true,
  outDir: 'dist',
  esbuildOptions(options) {
    // Classic JSX transform (React.createElement), not the automatic
    // one — the automatic transform imports from 'react/jsx-runtime',
    // a second module path the externals plugin above doesn't cover,
    // and this keeps everything resolving through the single
    // window.React global instead.
    options.jsx = 'transform';
    options.jsxFactory = 'React.createElement';
    options.jsxFragment = 'React.Fragment';
  },
  esbuildPlugins: [
    globalExternals({
      react: 'window.React',
      'prop-types': 'window.PropTypes',
    }),
  ],
});
