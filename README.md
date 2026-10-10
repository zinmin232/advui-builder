# AdvUI Builder

Selection-driven visual builder for [AdvUI](https://github.com/zinmin232/advui). Click an element in the preview, edit it in the inspector, and copy the TSX.

- **Component mode** customizes one component and its parts.
- **Page mode** builds a page. Drag components from the sidebar onto the canvas or the Layers tree, or click one to add it. To move an element, select it and drag its name tag, or drag its row in Layers. A line or box shows where it will land, and drops a component can't accept are refused.

The selected element has a toolbar: select its parent, move it up or down, edit its text, duplicate or remove it. Double-click text (or press Enter) to edit it in place.

| Shortcut | Does |
|---|---|
| Enter or double-click | Edit the selected element's text (Enter saves, Shift+Enter adds a line, Esc cancels) |
| Alt+↑ / Alt+↓ | Move the selected element among its siblings |
| Ctrl+C / Ctrl+X / Ctrl+V | Copy, cut, paste (inside the selected element when it can hold it, otherwise after it) |
| Ctrl+D | Duplicate |
| Delete | Remove |
| Ctrl+Z / Ctrl+Shift+Z | Undo / redo |

The **Edit**, **Preview** and **Code** tabs switch the workspace: Preview runs the page as it is (buttons, menus and fields respond, and nothing is drawn over them).

The **Blocks** group in the sidebar adds ready-made sections (Navbar, Hero, Pricing, FAQ, Contact, Login, Dashboard, Footer) made of real AdvUI components. Click one to add it below the selected section, or drag it into place. Each block adapts to phone and desktop widths.

Pages are saved in your browser (localStorage) as you edit and reopen after a reload. Click the page name in the top bar to rename it, switch pages, duplicate or delete one, or start a new page. "Copy link" carries the whole page; opening a page link adds it as a new saved page. **Export** downloads the page as a `.page.json` file and **Import** opens one as a new page, so a page can move to another browser.

In Page mode the **Code** tab writes the page as a component file, such as `HomePage.tsx`, and **Download** saves it. **Page settings** (in the same menu) set the component's name and, for web, a title and description, written as React 19's `<title>` and `<meta>`.

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
pnpm lint
pnpm format # Prettier; pnpm format:check only checks
pnpm build
pnpm e2e    # browser tests; run `pnpm exec playwright install chromium` once first
pnpm perf   # interaction timings on a large page; run `pnpm build && pnpm preview` first
```

Open `http://localhost:5173`. A nested Card (Header, Title, Image, Footer, Button) is the reference composition for click-to-select.
