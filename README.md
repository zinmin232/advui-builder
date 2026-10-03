# AdvUI Builder

Selection-driven visual builder for [AdvUI](https://github.com/zinmin232/advui). Click an element in the preview, edit it in the inspector, and copy the TSX.

Components render from `@advui/core`. The `advui` package is the published CLI.

## Component metadata

The inspector is driven by AdvUI's `*.meta.ts` files, which the published package leaves out. `src/registry/sourceMeta.ts` is generated from the AdvUI git tag that matches the installed `@advui/core` version:

```bash
pnpm sync-meta          # regenerate after upgrading @advui/core
pnpm sync-meta --check  # fail if the snapshot differs from upstream
```

Do not edit `sourceMeta.ts` by hand. Builder-specific choices (props upstream types as `ReactNode`, sidebar groups, fixed `aria-label`s) live in `src/registry/componentRegistry.ts`. The tests fail when the snapshot version does not match the installed package, or when a sync drops a prop a starter template uses.

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
