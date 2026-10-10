# AdvUI Builder

Selection-driven visual builder for the AdvUI component library (`@advui/core`). The flow is: pick a component, click an element in the preview, edit it in the inspector, copy the TSX. It runs as a standalone app today and will later be embedded in the AdvUI docs site, so keep the builder core free of docs-site code.

There are two modes (a toggle in the top bar). **Component** mode customizes one component and its parts. **Page** mode builds a page: a blank root (`registry.page`) that you fill by dragging from the sidebar, or by clicking sidebar items, which adds them. Drag-and-drop (inspired by LayoutIt) works from the sidebar, on the canvas (the selected element's name tag is the drag handle), and in the Layers tree.

On the canvas, the selected layer gets a toolbar (drag handle, select parent, move up/down, edit text, duplicate, remove), and hovering shows a layer's name. Double-click (or Enter) edits a layer's text in place. Alt+↑/↓ moves the selected layer, and Ctrl+C / X / V copy, cut and paste it. The workspace tabs are **Edit** (select and change), **Preview** (the page runs as it is: clicks reach the components) and **Code**.

The sidebar's Blocks group adds ready-made page sections (Navbar, Hero, Pricing, FAQ, Contact, Login, Dashboard, Footer) built from real components. Pages are saved in the browser as you edit. The page name in the top bar opens the saved pages: rename, open, duplicate, delete, start a new one, edit the page settings, or export and import `.page.json` files. In Page mode the Code tab writes the page as a component file (`HomePage.tsx`) with a Download button.

The defining rule: **the inspector follows what the user selects.** Every panel reads one selection from one store.

The Builder core knows no component library. `src/app/App.tsx` is the only place that wires in AdvUI: it passes `advuiRegistry` (metadata) to `<BuilderProvider registry>` and a lazy loader for `advuiPreview` (real components) to `<Builder loadPreview>`. Another library, or the AdvUI docs site, plugs in the same way.

## Commands

```bash
pnpm install
pnpm dev                # http://localhost:5173
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest run (jsdom)
pnpm e2e                # Playwright browser tests in e2e/ (starts its own dev server on :5174; with CI set, serves dist/)
pnpm build              # typecheck + vite build
pnpm lint               # ESLint (typescript-eslint, react-hooks)
pnpm format             # Prettier, writes; pnpm format:check only checks
pnpm perf               # main-thread time per interaction on a ~800-layer page (run pnpm build && pnpm preview first)
```

Before committing, run `pnpm format && pnpm lint && pnpm typecheck && pnpm test && pnpm build`, plus `pnpm e2e` when you touch drag-and-drop, the canvas, or Layers.

CI (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`, with Node 22 and pnpm 12.8.1. One job runs typecheck, lint, the format check and unit tests; the other runs `pnpm build`, then `pnpm e2e` against that build. On CI, Playwright serves `dist/` with `vite preview`, because a cold dev server can take longer than the test timeout on the first page load. To reproduce that run locally, use `pnpm build && CI=1 pnpm e2e`. Traces from failed browser tests are uploaded as the `playwright-traces` artifact.

On a fresh machine, run `pnpm exec playwright install chromium` once before `pnpm e2e`. Cloud sessions already have Chromium at `/opt/pw-browsers`, which matches the pinned `@playwright/test@1.56.1`.

## Stack

- Node >= 20, pnpm 10, React 19.2, TypeScript 5.9 (`strict`, `noUnusedLocals`, `noUnusedParameters`), Vite 6.
- Real AdvUI components from `@advui/core@0.12.0` (Tamagui 2.7.7). Component metadata comes from the same package, `@advui/core/meta`. `@advui/theme` is a dev dependency only, so a test can check the registry's breakpoints against it. `@advui/icons` (the same version core uses) supplies the icon names for `icon` props; Vitest aliases it to its data-only `generated.js`, because the package entry loads Tamagui, and Vite puts that module in the `advui-meta` chunk so the main chunk never pulls in the lazy AdvUI one. `react-native` is aliased to `react-native-web` in `vite.config.ts`, and `.web.*` extensions resolve first.
- Tests: Vitest 3 with globals, jsdom, Testing Library, and user-event. Setup is in `src/test/setup.ts`.
- State is plain React (`useReducer` and context). Don't add a state library.
- Drag-and-drop: `@dnd-kit/core` handles pointer tracking, the drag chip (`DragOverlay`) and Escape-to-cancel. Drop targets are worked out by the builder itself (see below), not by dnd-kit droppables.
- Browser tests: `@playwright/test`, Chromium only.
- `pnpm-workspace.yaml` exempts the pinned `@advui/*` packages from `minimumReleaseAgeExclude`. Update that list when you bump AdvUI.

## Architecture

```
@advui/core/meta (AdvUI's published component metadata)
  → adaptMeta.ts (ComponentMeta → builder ComponentMetadata)
  → componentRegistry.ts (AdvUI definitions: extra props, templates, items → advuiRegistry)
  → registry.ts createRegistry() → BuilderRegistry          ← injected by App.tsx
  → builderState.ts createBuilderReducer(registry) (ConfigNode tree + selectedId + preview settings + undo)
  → BuilderProvider.tsx (contexts: registry, state, actions, preferences, hover)
  → Preview / Layers / Breadcrumb / Inspector / Code all read the same state
     Preview draws nodes through a PreviewKit (AdvuiPreview.tsx), loaded lazily
```

| Area | Files |
|---|---|
| Metadata types | `src/registry/metadata.ts` (`ComponentMetadata`, `PropMetadata`, `TemplateNode`, `ItemTemplate`, `ConfigNode`, `SelectionContext`) |
| Generic registry | `src/registry/registry.ts`: `createRegistry()` → `BuilderRegistry` (`get`, `sidebarEntries`, `search`, `match`, `createDocument`, `createPage`/`hasPage`, `createColumns`/`hasColumns`, `blocks`/`searchBlocks`/`createBlock`, `breakpoints`, `acceptsChildren`, `acceptsAny`, `canPlace`, `itemNoun`, `addItem`), `resolveProps`, `nextId`. No AdvUI imports. `src/registry/columns.ts` holds the 12-column span rules (`COLUMN_PRESETS`, `parseSpans`) |
| Responsive values | `src/registry/responsive.ts`: mobile-first maps (`{ base, md, … }`) keyed by the registry's `breakpoints`: `breakpointAt`, `valueAt`, `withValueAt`, `valueForScreen`, `inRange`. Pure, no AdvUI imports |
| Upstream metadata | `@advui/core/meta` (`components`, `categories`, the `ComponentMeta` types). Read in `componentRegistry.ts` with `advuiMeta('slug')`. Never copy it into the repo |
| Adapter | `src/registry/adaptMeta.ts`: prop typing (incl. `responsive`), drop rules from each part's `children` / `parents` / `within`, platform notes, `propsForPlatform`, `groupedProps` |
| AdvUI registry | `src/registry/componentRegistry.ts`: one `adaptAdvuiMeta(...)` definition per component or part (extra props, `template`, `item`, rule overrides), then `advuiRegistry = createRegistry({ importSource, breakpoints, components, page, columns, blocks })`. Sidebar order = order in `components`. `columns(spans)` builds a layout preset row: a 12-column `Grid` of `Grid.Item`s with `span={{ base: 12, md: n }}` |
| AdvUI blocks | `src/registry/advuiBlocks.ts`: `advuiBlocks`, the Blocks group (id, name, description, keywords, `template`). Templates leave ids out. `sidebar/BlockPalette.tsx` lists them |
| Shared style props | `src/registry/styleProps.ts` (background, radius, padding, gap, typography…) |
| State | `src/builder/state/builderState.ts` (`createBuilderReducer(registry)`, `createBuilderState(registry, …)`, `mode` + `parked`, `insertionTarget`, `blockPlacement`, `pastePlacement`, pure and unit-tested), `BuilderProvider.tsx` (`registry` prop, `useRegistry()`) |
| Tree utils | `src/builder/selection/selection.ts`: `findPath`, `parentOf`, `mapTree`, `canDrop`, `canPlaceTree` (a whole pasted tree), `insertAt`, insert/move/duplicate/place |
| Shortcuts and clipboard | `src/builder/useShortcuts.ts` (undo/redo, Delete, Ctrl+D, Alt+↑/↓, and the `copy` / `cut` / `paste` events), `src/builder/layerClipboard.ts` (a copied layer as JSON under `application/x-advui-builder-layer`; the plain text is its TSX) |
| Drag-and-drop | `src/builder/dnd/`: `BuilderDnd.tsx` (`DndContext` provider; `useDragSource`, `useDropSurface`, `useDragState`; hit-testing, auto-scroll, drop dispatch), `dropTarget.ts` (pure `dropPosition`, `resolveDrop`) |
| Preview | `src/builder/preview/`: `previewKit.ts` (`PreviewKit` = `Frame` + `renderNode`), `AdvuiPreview.tsx` (the AdvUI kit: name → component `views` map, special render cases), `PreviewWorkspace.tsx` (takes a `kit`), `ElementTree.tsx` + `Selectable.tsx` (click/hover wrappers, `data-builder-id`; empty containers get a preview-only "Drop here" slot, and `invisible` components such as Spacer a dashed outline that does not change their size), `SelectionOverlay.tsx` (outlines, the hovered layer's name, the selected layer's toolbar with its drag handle, and the drop indicator, measured from the DOM and drawn separately from the component), `TextEditor.tsx` (inline text editing over the layer), `canvasMode.ts` (`CanvasModeContext`: Edit or the interactive Preview, and `canEditText`), `measure.ts` (`nodeElement`, `layoutAxis`, `scrollParent`) |
| Inspector | `src/builder/inspector/`: generic. `PropertyEditor.tsx` chooses an editor by `prop.type` |
| Editors | `src/components/property-editors/editors.tsx` |
| Code | `src/builder/code/codeGenerator.ts` (pure `generateCode(root, { registry, platform, file })`, imports from `registry.importSource`; `file` wraps the tree in an exported function, with `<title>` / `<meta>` on web), `CodePanel.tsx` (shown in the Code tab; a file with Download in Page mode, a snippet in Component mode). `src/builder/download.ts` saves text as a file |
| Share links | `src/builder/shareConfig.ts`: `?component=button&variant=secondary`, plus a `doc=` JSON tree for nested edits. `readTree` reads any untrusted tree (links, saved pages) as typed props, responsive maps included; `compactTree` writes one |
| Persistence | `src/builder/persistence.ts`: localStorage key `advui-builder.preferences.v1`, `browserStorage()` |
| Saved pages | `src/builder/pages/pageStore.ts`: the page list in `advui-builder.pages.v1`, each tree in `advui-builder.page.v1.<id>` (pure, takes a storage). `BuilderProvider` boots from it, autosaves, and exposes `usePages()` / `usePageActions()`. `pages/PageMenu.tsx` is the top-bar menu. `pages/pageFile.ts`: the `.page.json` format (`pageFileText`, `readPageFile`) and the exported component's name (`componentName`, `exportName`) |

## Rules for changes

- **Metadata-driven.** Don't add `if (component === 'X')` branches in the inspector, sidebar, layers, state, or panels. Starter trees, containers, and repeatable items are metadata (`template`, `acceptsChildren`, `item`), and `createRegistry` handles them generically. Component-specific code is allowed only where the component really needs it (today: `AdvuiPreview.tsx` for Toast, Select, Grid, Show/Hide, and clone-child hosts such as Dialog.Trigger and Dialog.Close; `codeGenerator.ts` for Toast).
- **No library imports in the core.** Files under `src/builder/` (except the `AdvuiPreview.tsx` kit) must not import `componentRegistry.ts`, `@advui/core` or `@advui/core/meta`. Take the registry from `useRegistry()` or a `registry` parameter (registry-first for tree and state helpers; inside the options object for `generateCode`).
- **One source of truth.** The document tree and `selectedId` live in the reducer. Don't copy props or selection into local component state. Derive the path, breadcrumb, and inspector values from `findPath(state.document, state.selectedId)`.
- **Defaults are not stored.** `storesValue()` drops values equal to `prop.defaultValue` (required props keep explicit values). The code generator also skips defaults. Keep the two consistent.
- **The preview background is not a component prop.** `state.background` only paints the canvas.
- **Reset scope.** `reset` rebuilds the current component's starter document (an empty page in Page mode) only. It never touches preview settings, panel sizes, or preferences.
- **Modes.** `set-mode` parks the other mode's document in `state.parked`, so switching back restores it. `open` (a sidebar click) opens the component in Component mode and adds it at `insertionTarget` in Page mode. `select-component` always shows Component mode and parks a page in progress. Undo snapshots include `mode` and `parked`.
- **Layout presets are registry data too.** The sidebar's Columns group (`sidebar/ColumnPresets.tsx`) shows only when the registry defines `columns`, and adds rows with `insert-columns` / `insert-columns-at`. Those go through the same drop rules as a component, checked against the row's root. Spans are whole numbers that add up to 12; the reducer ignores anything else.
- **Blocks are registry data.** `RegistryDefinition.blocks` lists ready-made page sections; the Blocks group shows only when there are some, and search finds them by name, description and keywords. They are added with `insert-block` / `insert-block-at` and checked by the same drop rules as a component, against the block's root. A clicked block goes where `blockPlacement` says: in Page mode below the page section that holds the selection (or at the end of the page), so blocks clicked in a row stack instead of nesting; in Component mode inside the insertion target. Block templates must follow the drop rules and store no default values; tests check both. Only use registered components, and mind components that align themselves (AdvUI's Badge sets `alignSelf: 'flex-start'`, so the Hero wraps it in a Center).
- **Drop rules live in the registry, and AdvUI supplies them.** `adaptAdvuiMeta` reads each part's upstream `children` (`accepts`, `max`), `parents` and `within`. Override them in `componentRegistry.ts` only with a reason in a comment (today: `acceptsChildren: false` on parts the builder edits as text). Every insert, drop and move goes through `canDrop` / `registry.canPlace(component, path)`: container (`acceptsChildren`), `accepts`, `parents`, `within` (an ancestor anywhere on the path), `maxChildren`. A moved layer's own parts must keep their `within`. A container whose listed children are all unregistered holds nothing. Compound parts without `parents` or `within` may only go where the templates put them (`Card.Title` inside `Card.Header`). Moving a layer among its own siblings is always allowed. The reducer re-checks, so the UI can't create an invalid tree.
- **Inserts go into a container that takes anything.** Sidebar inserts and "add item" use the nearest layer where `acceptsAny` is true (a container without an `accepts` list), passing over hosts that hold only their parts (Select, Tabs.List, DropdownMenu.Content).
- **Responsive props.** A prop with `responsive: true` stores a plain value or a mobile-first map (`{ base: 12, md: 8 }`). The inspector shows a "Per size" toggle with one row per breakpoint. The preview passes `context.screen` to `resolveProps`, which turns maps into the value for the preview width, because AdvUI's media queries follow the browser window, not the preview frame. Components that hide or switch with media queries (Show/Hide) need the same treatment in the kit. The code generator writes maps as object literals.
- **Drag-and-drop wiring.** New drag sources use `useDragSource(id, item)` with an id that is unique on screen (sidebar ids include the group). Elements that accept drops register with `useDropSurface('canvas' | 'layers', element)`. `resolveDrop` walks up from the layer under the pointer to the nearest one that accepts the drag. Builder chrome drawn over the canvas must carry `data-drop-ignore`, so hit-testing looks through it. Canvas indicator CSS classes use a `canvas-` prefix (a bare `.drop-inside` once collided with the Layers row markers). While a drag runs, `.drag-shield` (fixed, `data-drop-ignore`) covers the page for the grabbing cursor, and forwards the wheel to whatever scrolls under it; don't go back to a class on `body` with a `*` rule, which restyles every element on each pick-up and drop. Options passed to dnd-kit (`useSensor` options, `accessibility`) must be module constants: it compares them by identity, and a new object each render re-renders every drag source.
- **The empty-container slot is preview-only.** It never reaches the tree or the code.
- **Edit and Preview.** The Preview tab renders the same canvas with `interactive`: `Selectable` passes clicks through, no overlay, no empty slots, no canvas drop surface, and `useShortcuts(false)` turns the layer shortcuts off (undo and redo stay). The selection survives the switch.
- **Inline text editing.** A layer is editable on the canvas when its component has a `textContent` prop and the layer has no child layers (`canEditText`). The editor is a textarea drawn over the layer in the layer's own font; the library's component is never edited in place. Enter or blur saves through `set-text` (one undo step), Shift+Enter adds a line, Escape cancels. Editing ends when the selection changes.
- **Copy and paste.** The clipboard events copy the selected layer (its TSX as plain text, its tree as JSON), unless a field has focus or text is selected. A paste goes inside the selected layer when it can hold the whole tree, otherwise right after it (`pastePlacement`), and is refused otherwise. Pasted trees are read strictly (`readLayerClipboard`) and every layer is checked against the drop rules (`canPlaceTree`), because clipboard data can come from anywhere.
- **Persistence scope.** Persist UI preferences (panels, widths, recent, favorites, preview settings, last component, mode) and Page mode's document. Don't persist the selection, undo history, or a Component mode document. Sharing goes through URLs; a page link carries `mode=page` and the whole tree in `doc`.
- **Saved pages.** `state.pageId` names the saved page that Page mode's document is (`pageDocument(state)`, showing or parked). `BuilderProvider` writes that tree whenever it changes; the reducer never touches storage. Opening another page is the `load-page` action, which clears undo history, because the history belongs to the page that was open. A page link opens as a new "Shared page" and leaves the address bar, so it never overwrites the page in progress. Stored trees are read leniently: a layer whose component is gone is dropped, and the rest opens. Every write can fail (storage full or blocked): the menu then says "Not saved", and nothing throws. Several tabs share the pages: every page-list change starts from the stored list (`latestIndex()` → `mergePageIndex`), never from the tab's own copy, so a tab doesn't drop pages another tab added; the page a tab has open stays listed until it closes. `storage` events refresh the menu, and another tab's save of the open page replaces it (`sync-page`, which clears undo history: undoing to the older version would overwrite the other tab). Nothing is written in response to an event, so tabs don't echo each other.
- **Page settings and files.** A page's settings (`component`, `title`, `description`) live on its entry in the page list, not in the tree, so links don't carry them. `sanitizePageSettings` keeps only a capitalized component name and tidied text; an empty value clears a setting. A `.page.json` file holds `format: 'advui-builder.page'`, `version`, `name`, `settings` and the compact tree; it is read as leniently as a saved page, refused when its `version` is newer, and always imported as a new page. The title and description are written only for web, where React 19 moves `<title>` and `<meta>` into the head.
- **Large pages.** An edit must re-render only the changed layer and its ancestors. The tree shares unchanged nodes (`mapTree`), `ElementTree` is memoized and recurses through the memoized component (its inner function has another name, because a named function expression shadows the outer const), and Layers rows are memoized and get the selection and the drop target as a `Trail` of ids only when they lie on it. Keep props passed down these trees stable, and don't read `useBuilderState()` or `useDragState()` inside a per-layer component. The "large pages" UI test counts canvas renders; `pnpm perf` measures the whole flow.
- **Undo.** Only document actions (listed in `documentActions`) enter history. Repeated edits to one field merge into one step through `historyKey`.
- **Platform filtering.** Use `prop.platforms` to filter props by platform, in the inspector (`propsForPlatform`), the preview (`resolveProps`), and the code generator.
- Upstream AdvUI types some props as `ReactNode` or unions the adapter can't edit. Add those as `extraProps` in the registry. A test fails if an AdvUI upgrade drops a prop that a template uses. ReactNode slots the builder can't fill (Form's `footer`, Breadcrumb's `separator`) are left out; put the content inside instead.
- **Icon props.** An icon prop has `type: 'icon'` and the library's names as `options` (`iconProp()` in `componentRegistry.ts`); it stores a name. `RegistryDefinition.icons` (`{ importName: 'Icon', nameProp: 'name' }`) tells the code generator to write `icon={<Icon name="home" />}` and import `Icon`; the AdvUI kit turns the name into the element.
- **Accessible names.** Controls take an editable `aria-label` (`ariaLabelProp`), set only in their own starter templates. Inside a Field it stays empty, because an `aria-label` would override the label the Field wires up.
- **Text children.** A layer with text and no child layers is rendered with the text as a plain string, as the generated code writes it, because AdvUI styles string children itself (Accordion.Trigger, Button).

## Adding a component

1. In `src/registry/componentRegistry.ts`, read its metadata (`const xMeta = advuiMeta('x')`), write one definition, and list it in `advuiRegistry.components`:
   ```ts
   const x = adaptAdvuiMeta(xMeta, {
     extraProps, staticProps, propPlatforms, propOverrides, category,
     omit,                                        // documented props to leave out of the inspector
     template: node('x', 'X', 'X', { size: 'lg' }, [/* child nodes */], 'Text'), // starter tree, unique ids
     item: { noun, part, valuePrefix, nodes },    // only if "Add item" grows it (see Select, Tabs)
   })
   ```
   - Compound parts are their own definitions with `part: 'X.Part'`, `sidebar: false`, and `importName: 'X'`. List them after their component.
   - Drop rules come from upstream. Override `acceptsChildren`, `accepts`, `parents`, `within` or `maxChildren` only when the builder needs to differ, and say why. Starter templates must follow upstream's rules (a ScrollArea holds one child).
   - Set `invisible: true` on a component that draws nothing on its own (Spacer), so the canvas outlines it.
   - Without a `template`, the bare component opens (`id` from the name, text from the playground `children`).
   - In item templates, `{n}`, `{value}`, and `{host}` are filled in. `into` puts a node inside a host child of that component (Tabs triggers go into `Tabs.List`).
   - `createRegistry` throws at startup if a template or item names an unregistered component.
2. In `src/builder/preview/AdvuiPreview.tsx`, add one line to `views`. Add a special render path only if the component clones or type-matches its children (see `directChildHosts`, `Select` and `renderGrid`), or decides layout from window media queries (Show/Hide).
3. Add assertions to `src/registry/adaptMeta.test.ts`. The template-prop check runs automatically for every sidebar entry and block.

To add a block, append one entry to `advuiBlocks` in `src/registry/advuiBlocks.ts`. The block tests in `adaptMeta.test.ts` check its props, its drop rules and that it saves and loads unchanged; check how it looks at phone and desktop widths in `pnpm dev`.

## Code style

- Prettier formats TS, TSX, JSON and YAML (`.prettierrc.json`: no semicolons, single quotes, trailing commas, 120 columns). CSS and Markdown are left out on purpose: short CSS rules stay on one line, and Markdown tables stay unpadded. `.gitattributes` keeps LF line endings, which Prettier expects, on Windows checkouts too.
- ESLint (`eslint.config.js`) runs `@eslint/js`, `typescript-eslint` and `react-hooks` recommended rules. Unused names are left to `tsc`. Disable a rule only on one line, with a comment that says why (today: measuring the DOM in a layout effect, and recording whether autosave's write succeeded).
- Named exports and function components. Props are typed inline or with a local interface.
- Comments are sparse and explain *why*. Keep JSDoc on exported helpers when it states a contract.
- Use accessible names (`aria-label`, roles). Tests query by role or label, so keep labels stable.
- CSS lives in `src/styles/builder.css`. Theme tokens are `--builder-*` on `:root` and `.app[data-theme="dark"]`. Keep the UI dense and flat: no extra cards or shadows.

## Testing

- Reducer and pure logic tests go next to the source (`*.test.ts`).
- UI tests (`src/builder/interaction.test.tsx`) render `<BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Card')} persist={false}>` with a fake `renderNode`. AdvUI and Tamagui are not rendered in jsdom. To check real rendering, run `pnpm dev`, or drive Chromium with Playwright (preinstalled in cloud sessions, `executablePath: '/opt/pw-browsers/chromium'`).
- Persistence tests pass a fake storage to `loadPreferences` and `savePreferences`, and `pageStore.test.ts` to the page store. A UI test that saves pages renders `BuilderProvider` with persistence on and calls `localStorage.clear()` first. Keep it off the sidebar: role queries over the whole sidebar are slow in jsdom.
- `pageStore.test.ts` saves and reads back every sidebar starter tree. A template prop the reader drops (a stored default, an untyped value) fails it.
- Downloads and file imports: jsdom has no `URL.createObjectURL`, so the UI test assigns one and stubs `HTMLAnchorElement.prototype.click`; `src/test/setup.ts` adds the `Blob.text()` jsdom lacks. `e2e/pages.spec.ts` checks the real download and upload in Chromium.
- jsdom has no `ClipboardEvent`: the copy/paste UI test dispatches a plain `Event` with a `clipboardData` object. The canvas toolbar and inline editor need real layout, so they are tested in `e2e/editing.spec.ts`.
- Drag-and-drop can't run in jsdom. Test the logic as pure functions (`dropTarget.test.ts`, reducer `insert-at` / `place`), and the gestures in `e2e/*.spec.ts` with real pointer events (`page.mouse` down, move with steps, up).
- Inserted copies get component-based ids (`image`, `button`, `card-header`), not the template ids (`card-image`). E2E tests that insert a Card must use those ids. A column preset inserts `grid`, `grid-item`, `grid-item-2`…
- `src/registry/breakpoints.test.ts` runs in the Node environment: `@advui/theme` loads Tamagui, which needs `window.matchMedia` when a window exists, and jsdom has none.
- Test files bind the AdvUI reducer once: `const builderReducer = createBuilderReducer(advuiRegistry)`.
- `src/test/acmeLibrary.ts` is a small non-AdvUI library. `registry.test.ts` and the "injected registry" UI test use it to prove the core runs from metadata alone. Keep them passing when you change the registry contract.

## Status against the original build brief

All 24 "Definition of Done" steps work, checked in Chromium on 2026-10-03: search, select, platform switch, width, background, click-to-select with outline, context inspector, breadcrumb, platform notes, reset, TSX, copy, collapse, resize, and reload persistence. There are 54 sidebar components (plus compound parts) and 8 blocks built on real AdvUI. Extras beyond the brief: undo/redo, insert/remove/duplicate/move, drag-and-drop layers, "add item" for Select/Tabs/List/RadioGroup/Menu, share links, keyboard shortcuts, and canvas rulers.

Phase 1 of the LayoutIt-style plan is done: Page mode, @dnd-kit drag-and-drop (sidebar → canvas or Layers, moving on the canvas and in Layers), drop lines and boxes, empty-container slots, drop rules, and Playwright tests.

Remaining phases of that plan:

- **Phase 2:** done. Box, HStack, VStack, Center, Spacer and Wrap are registered, with upstream's `direction` / `align` / `distribute` / `wrap` instead of raw flex props. Layout presets (`12`, `6 6`, `8 4`, `4 8`, `4 4 4`, `3 3 3 3`, or custom spans) add a 12-column Grid of Grid.Items that sit side by side from md up and stack on phones.
- **Phase 2.5 (AdvUI 0.12.0):** done. Metadata comes from `@advui/core/meta`, drop rules from upstream child rules (`children`, `parents`, `within`), responsive props are edited per breakpoint and previewed at the preview width, and AutoGrid, Section, Sticky, Show and Hide are registered.
- **Phase 3:** done except AppShell. Blocks (Navbar, Hero, Pricing, FAQ, Contact, Login, Dashboard, Footer); Breadcrumb, NavigationBar, Sidebar, Accordion, Dialog, Form and Field are registered, with icon props from AdvUI's icon set. NavigationBar is a bottom tab bar for phones, so the Navbar block stays a row of buttons; the Dashboard block pairs a Sidebar (from md) with a NavigationBar (on phones).
- **Phase 4:** done. Double-click (or Enter) edits text in place, Alt+↑/↓ moves layers, Ctrl+C / X / V copy, cut and paste them, and the Edit / Preview / Code tabs replace Preview / Code. The "hover toolbar" follows the selection, not the pointer: a toolbar that follows the pointer moves to whatever layer the pointer crosses on its way to the toolbar. Hovering shows the layer's name instead.
- **Phase 5:** done. Pages autosave in the browser (the Pages menu); the Code tab writes and downloads the page as a component file; page settings name the component and set the web title and description; `.page.json` files move pages between browsers.
- **Phase 6:** done. ESLint and Prettier run in CI. Large pages: at about 800 layers, a keystroke in the inspector went from about 160 ms of JavaScript to about 16 ms, undo from 200+ ms to about 20 ms, adding a block from 130–190 ms to about 35 ms, and a drag no longer stalls on pick-up (numbers from `pnpm perf`, which vary by machine).

Decisions that differ from the brief on purpose:

- **Generated code is a "Code" tab, not a bottom panel.** The owner asked for this. Don't turn it back into a bottom panel. `Preferences.codePanelHeight` and `clampCodeHeight` are left over from the panel version and nothing uses them.

Done since the first version: the registry is injected (`BuilderProvider registry`, `Builder loadPreview`), and starter templates, containers, and repeatable items are metadata.

Known gaps, highest value first:

1. **Pages live in one browser.** They are in localStorage: cleared site data loses them. Export a `.page.json` file or copy a link to move or back up a page. Two tabs on the same page follow each other's saves, but edits made in both at the same moment aren't merged: the last save wins.
2. **No keyboard drag-and-drop.** Keyboard users add with **+**, reorder with Alt+↑/↓ (or the ↑/↓ buttons), and move a layer elsewhere with cut and paste. Dropping into pop-up components (Dialog, Dropdown menu, Tooltip) on the canvas isn't supported; use Layers.
3. **TSX is the only code target.** There is no generator interface for React Native or JSON output. JSON config already exists in `shareConfig.toConfiguration`.
4. `SelectionContext` / `selectionFrom()` are only used in tests. The UI derives the selection from `selectedId`. Either use `selectionFrom` in the Inspector or drop the type.
5. The light/dark toggle is global (app chrome and preview together), not a preview-only control.
6. Width controls are duplicated in the `PlatformSelector` popover and in `ViewportControls`.
7. Inspector properties from the brief are missing: Shadow, Margin (`marginProp` is defined but unused), Font family, and Line height.
8. The splitters have no keyboard resizing. The layers section is labelled "Component Properties", and the collapse-inspector button sits in `LayersPanel`.
9. Untested in UI: selection overlay outlines (the toolbar and inline editing are covered in `e2e/editing.spec.ts`), zoom/Fit/100%, width slider and preset buttons (reducer only), sidebar collapse, splitter drag, and search.
10. Toast is still special-cased in the generic `codeGenerator.ts`. A per-component code hook in metadata would move it into the AdvUI registry.
11. Fit zoom uses a global `document.querySelector('.preview .canvas')`, and the URL is not kept in sync with state (links only come from "Copy link").
12. **AppShell is not registered.** It fills `100dvh` (a `height` prop overrides that) and turns its sidebar into a drawer from `useMedia()` and CSS media queries, which follow the browser window, so the canvas can't show it at the preview width. It needs an AdvUI option to render for a given width.
13. AdvUI's own responsive defaults (Container `gutter`, Section's inner Container) still follow the browser window in the preview; only values set in the builder follow the preview width.
14. `children.min` from upstream (Field, Tooltip, triggers) is not enforced: removing the last child is allowed.
15. The registry's `breakpoints` are written out in `componentRegistry.ts` (checked against `@advui/theme` by a test), because `@advui/core/meta` does not publish them.
16. `@advui/core/meta` uses extensionless relative imports, so plain Node can't import it (Vite and Vitest can). Fixing that upstream would let Node scripts read it.
17. **AdvUI NavigationBar hides the active icon on web.** The active pill is absolutely positioned and the icon is not, so the pill paints over it; native draws them in child order. The preview shows the same thing. An upstream fix (`position: relative` or `zIndex` on the icon) is needed.
18. Accordion's `defaultValue` is edited as one value. With `type="multiple"` AdvUI takes a list, so the generated code is only right for `single`.
19. **Drags walk the whole tree.** dnd-kit changes a context on every pointer move, and React looks through every layer for its readers: about 3 ms per move at 800 layers, growing with the page. Rendering the canvas tree outside `DndContext` (a portal into the stage) would end that.
20. The Layers tree is not virtualized: every row is in the DOM, which costs memory and layout on pages with thousands of layers.
