# AdvUI Builder

Selection-driven visual builder for [AdvUI](https://github.com/zinmin232/advui). Click an element in the preview, edit it in the inspector, and copy the TSX.

Components render from `@advui/core`. The `advui` package is the published CLI.

## Component metadata

The inspector is driven by AdvUI's `*.meta.ts` files, which the published package leaves out. `src/registry/sourceMeta.ts` is generated from the AdvUI git tag that matches the installed `@advui/core` version:

```bash
pnpm sync-meta          # regenerate after upgrading @advui/core
pnpm sync-meta --check  # fail if the snapshot differs from upstream
```

Do not edit `sourceMeta.ts` by hand. Builder-specific choices (props upstream types as `ReactNode`, sidebar groups, fixed `aria-label`s, starter templates, repeatable items) live in `src/registry/componentRegistry.ts`. The tests fail when the snapshot version does not match the installed package, or when a sync drops a prop a starter template uses.

## Component registry

The Builder core does not import AdvUI. `src/app/App.tsx` supplies it:

```tsx
function loadAdvuiPreview() {
  return import('../builder/preview/AdvuiPreview').then((module) => module.advuiPreview)
}

<BuilderProvider registry={advuiRegistry}>
  <Builder loadPreview={loadAdvuiPreview} />
</BuilderProvider>
```

`registry` comes from `createRegistry({ importSource, components })` in `src/registry/registry.ts`. `loadPreview` returns a `PreviewKit` (`src/builder/preview/previewKit.ts`) that draws the nodes with real components. Both must be stable values: define them at module level, not inline. To embed the Builder somewhere else, such as the AdvUI docs site, pass a different registry and kit.

```bash
pnpm install
pnpm dev
```

```bash
pnpm test
pnpm typecheck
pnpm build
```

Open `http://localhost:5173`. A nested Card (Header, Title, Image, Footer, Button) is the reference composition for click-to-select.
