# AdvUI Builder

Selection-driven visual builder for [AdvUI](https://github.com/zinmin232/advui). Click an element in the preview, edit it in the inspector, and copy the TSX.

- **Component mode** customizes one component and its parts.
- **Page mode** builds a page. Drag components from the sidebar onto the canvas or the Layers tree, or click one to add it. To move an element, select it and drag its name tag, or drag its row in Layers. A line or box shows where it will land, and drops a component can't accept are refused.

The **Blocks** group in the sidebar adds ready-made sections (Navbar, Hero, Pricing, Login, Footer) made of real AdvUI components. Click one to add it below the selected section, or drag it into place. Each block adapts to phone and desktop widths.

Pages are saved in your browser (localStorage) as you edit and reopen after a reload. Click the page name in the top bar to rename it, switch pages, duplicate or delete one, or start a new page. "Copy link" carries the whole page; opening a page link adds it as a new saved page.

Components render from `@advui/core`. The `advui` package is the published CLI.

## Component metadata

The inspector is driven by the component metadata `@advui/core` publishes at `@advui/core/meta` (since 0.12.0), so upgrading the package updates it. Builder-specific choices (props upstream types as `ReactNode`, sidebar groups, fixed `aria-label`s, starter templates, repeatable items) live in `src/registry/componentRegistry.ts`. The tests fail when an upgrade drops a prop a starter template uses.

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
pnpm e2e    # browser tests; run `pnpm exec playwright install chromium` once first
```

Open `http://localhost:5173`. A nested Card (Header, Title, Image, Footer, Button) is the reference composition for click-to-select.
