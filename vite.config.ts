import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

const vendorChunks: [RegExp, string][] = [
  [/^(react|react-dom|scheduler)$/, 'react'],
  [/^react-native-web$/, 'react-native-web'],
  [/^(tamagui|@tamagui\/.+|@floating-ui\/.+)$/, 'tamagui'],
  [/^@advui\//, 'advui'],
]

// The registry reads AdvUI's metadata and icon names on startup; the components arrive later with the preview.
const advuiMetaModule = /\/node_modules\/@advui\/(core\/dist\/(meta\/|.+\.meta\.js$)|icons\/dist\/generated\.js$)/

/** Package that owns a module, from its innermost node_modules folder (pnpm nests them). */
function packageName(id: string): string | null {
  return id.replace(/\\/g, '/').match(/.*\/node_modules\/((?:@[^/]+\/)?[^/]+)/)?.[1] ?? null
}

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'react-native': 'react-native-web',
    },
    extensions: ['.web.tsx', '.web.ts', '.web.jsx', '.web.js', '.tsx', '.ts', '.jsx', '.js'],
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV ?? 'development'),
    global: 'globalThis',
  },
  optimizeDeps: {
    include: ['@advui/core', 'tamagui', 'react-native-web'],
    esbuildOptions: {
      resolveExtensions: ['.web.js', '.web.ts', '.web.tsx', '.js', '.ts', '.tsx'],
      loader: { '.js': 'jsx' },
    },
  },
  build: {
    rollupOptions: {
      output: {
        // Library chunks change less often than the app, so browsers can keep them cached across releases.
        manualChunks(id) {
          if (advuiMetaModule.test(id.replace(/\\/g, '/'))) return 'advui-meta'
          const name = packageName(id)
          return name ? vendorChunks.find(([pattern]) => pattern.test(name))?.[1] : undefined
        },
      },
    },
  },
  server: {
    port: 5173,
  },
  test: {
    // The registry reads only the icon names. The package entry also loads Tamagui, which needs a real browser.
    alias: [
      {
        find: /^@advui\/icons$/,
        replacement: fileURLToPath(new URL('./node_modules/@advui/icons/dist/generated.js', import.meta.url)),
      },
    ],
    environment: 'jsdom',
    // UI tests render the whole sidebar, and role queries over it are slow in jsdom, more so on a busy machine.
    testTimeout: 15_000,
    globals: true,
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    setupFiles: ['src/test/setup.ts'],
  },
})
