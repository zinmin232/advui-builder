# AdvUI Builder

Selection-driven visual builder for the AdvUI component library (`@advui/core`). The flow is: pick a component, click an element in the preview, edit it in the inspector, copy the TSX. It runs as a standalone app today and will later be embedded in the AdvUI docs site, so keep the builder core free of docs-site code.

There are two modes (a toggle in the top bar). **Component** mode customizes one component and its parts. **Page** mode builds a page: a blank root (`registry.page`) that you fill by dragging from the sidebar, or by clicking sidebar items, which adds them. Drag-and-drop (inspired by LayoutIt) works from the sidebar, on the canvas (the selected element's name tag is the drag handle), and in the Layers tree.

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
pnpm sync-meta          # regenerate src/registry/sourceMeta.ts from AdvUI upstream (needs GitHub access)
pnpm sync-meta --check  # fail if the snapshot differs from upstream
```

Before committing, run `pnpm typecheck && pnpm test && pnpm build`, plus `pnpm e2e` when you touch drag-and-drop, the canvas, or Layers. There is no ESLint or Prettier config. Match the existing style by hand.

CI (`.github/workflows/ci.yml`) runs on every pull request and on pushes to `main`, with Node 22 and pnpm 12.8.1. One job runs typecheck, unit tests and `sync-meta --check`; the other runs `pnpm build`, then `pnpm e2e` against that build. On CI, Playwright serves `dist/` with `vite preview`, because a cold dev server can take longer than the test timeout on the first page load. To reproduce that run locally, use `pnpm build && CI=1 pnpm e2e`. Traces from failed browser tests are uploaded as the `playwright-traces` artifact.

On a fresh machine, run `pnpm exec playwright install chromium` once before `pnpm e2e`. Cloud sessions already have Chromium at `/opt/pw-browsers`, which matches the pinned `@playwright/test@1.56.1`.

## Stack

- Node >= 20, pnpm 10, React 19.2, TypeScript 5.9 (`strict`, `noUnusedLocals`, `noUnusedParameters`), Vite 6.
- Real AdvUI components from `@advui/core@0.10.0` (Tamagui 2.7.7). `react-native` is aliased to `react-native-web` in `vite.config.ts`, and `.web.*` extensions resolve first.
- Tests: Vitest 3 with globals, jsdom, Testing Library, and user-event. Setup is in `src/test/setup.ts`.
- State is plain React (`useReducer` and context). Don't add a state library.
- Drag-and-drop: `@dnd-kit/core` handles pointer tracking, the drag chip (`DragOverlay`) and Escape-to-cancel. Drop targets are worked out by the builder itself (see below), not by dnd-kit droppables.
- Browser tests: `@playwright/test`, Chromium only.
- `pnpm-workspace.yaml` exempts the pinned `@advui/*` packages from `minimumReleaseAgeExclude`. Update that list when you bump AdvUI.

## Architecture

```
sourceMeta.ts (generated AdvUI *.meta.ts snapshot)
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
| Generic registry | `src/registry/registry.ts`: `createRegistry()` → `BuilderRegistry` (`get`, `sidebarEntries`, `search`, `match`, `createDocument`, `createPage`/`hasPage`, `createColumns`/`hasColumns`, `acceptsChildren`, `canPlace`, `itemNoun`, `addItem`), `resolveProps`, `nextId`. No AdvUI imports. `src/registry/columns.ts` holds the 12-column span rules (`COLUMN_PRESETS`, `parseSpans`) |
| Upstream schema | `src/registry/advuiMetaTypes.ts` (subset of AdvUI `ComponentMeta`) |
| Generated snapshot | `src/registry/sourceMeta.ts`. **Never edit by hand.** Written by `scripts/sync-meta.mjs` |
| Adapter | `src/registry/adaptMeta.ts`: prop typing, platform notes, `propsForPlatform`, `groupedProps` |
| AdvUI registry | `src/registry/componentRegistry.ts`: one `adaptAdvuiMeta(...)` definition per component or part (extra props, `template`, `acceptsChildren`, `item`), then `advuiRegistry = createRegistry({ importSource, components, page, columns })`. Sidebar order = order in `components`. `columns(spans)` builds a layout preset row: an HStack of Boxes with `flex` = span |
| Shared style props | `src/registry/styleProps.ts` (background, radius, padding, gap, typography…) |
| State | `src/builder/state/builderState.ts` (`createBuilderReducer(registry)`, `createBuilderState(registry, …)`, `mode` + `parked`, `insertionTarget`, pure and unit-tested), `BuilderProvider.tsx` (`registry` prop, `useRegistry()`) |
| Tree utils | `src/builder/selection/selection.ts`: `findPath`, `parentOf`, `mapTree`, `canDrop`, `insertAt`, insert/move/duplicate/place |
| Drag-and-drop | `src/builder/dnd/`: `BuilderDnd.tsx` (`DndContext` provider; `useDragSource`, `useDropSurface`, `useDragState`; hit-testing, auto-scroll, drop dispatch), `dropTarget.ts` (pure `dropPosition`, `resolveDrop`) |
| Preview | `src/builder/preview/`: `previewKit.ts` (`PreviewKit` = `Frame` + `renderNode`), `AdvuiPreview.tsx` (the AdvUI kit: name → component `views` map, special render cases), `PreviewWorkspace.tsx` (takes a `kit`), `ElementTree.tsx` + `Selectable.tsx` (click/hover wrappers, `data-builder-id`; empty containers get a preview-only "Drop here" slot, and `invisible` components such as Spacer a dashed outline that does not change their size), `SelectionOverlay.tsx` (outlines, the drag handle and the drop indicator, measured from the DOM and drawn separately from the component), `measure.ts` (`nodeElement`, `layoutAxis`, `scrollParent`) |
| Inspector | `src/builder/inspector/`: generic. `PropertyEditor.tsx` chooses an editor by `prop.type` |
| Editors | `src/components/property-editors/editors.tsx` |
| Code | `src/builder/code/codeGenerator.ts` (pure `generateCode(root, { registry, platform })`, imports from `registry.importSource`), `CodePanel.tsx` (shown in the Code tab) |
| Share links | `src/builder/shareConfig.ts`: `?component=button&variant=secondary`, plus a `doc=` JSON tree for nested edits |
| Persistence | `src/builder/persistence.ts`: localStorage key `advui-builder.preferences.v1` |

## Rules for changes

- **Metadata-driven.** Don't add `if (component === 'X')` branches in the inspector, sidebar, layers, state, or panels. Starter trees, containers, and repeatable items are metadata (`template`, `acceptsChildren`, `item`), and `createRegistry` handles them generically. Component-specific code is allowed only where the component really needs it (today: `AdvuiPreview.tsx` for Toast, Select, and clone-child hosts; `codeGenerator.ts` for Toast).
- **No library imports in the core.** Files under `src/builder/` (except the `AdvuiPreview.tsx` kit) must not import `componentRegistry.ts`, `sourceMeta.ts`, or `@advui/core`. Take the registry from `useRegistry()` or a `registry` parameter (registry-first for tree and state helpers; inside the options object for `generateCode`).
- **One source of truth.** The document tree and `selectedId` live in the reducer. Don't copy props or selection into local component state. Derive the path, breadcrumb, and inspector values from `findPath(state.document, state.selectedId)`.
- **Defaults are not stored.** `storesValue()` drops values equal to `prop.defaultValue` (required props keep explicit values). The code generator also skips defaults. Keep the two consistent.
- **The preview background is not a component prop.** `state.background` only paints the canvas.
- **Reset scope.** `reset` rebuilds the current component's starter document (an empty page in Page mode) only. It never touches preview settings, panel sizes, or preferences.
- **Modes.** `set-mode` parks the other mode's document in `state.parked`, so switching back restores it. `open` (a sidebar click) opens the component in Component mode and adds it at `insertionTarget` in Page mode. `select-component` always shows Component mode and parks a page in progress. Undo snapshots include `mode` and `parked`.
- **Layout presets are registry data too.** The sidebar's Columns group (`sidebar/ColumnPresets.tsx`) shows only when the registry defines `columns`, and adds rows with `insert-columns` / `insert-columns-at`. Those go through the same drop rules as a component, checked against the row's root. Spans are whole numbers that add up to 12; the reducer ignores anything else.
- **Drop rules live in the registry.** Every insert, drop and move goes through `canDrop` / `registry.canPlace`: container (`acceptsChildren`), `accepts`, `parents`, `maxChildren`. Compound parts without `parents` may only go where the templates put them (`Card.Title` inside `Card.Header`). Moving a layer among its own siblings is always allowed. The reducer re-checks, so the UI can't create an invalid tree.
- **Drag-and-drop wiring.** New drag sources use `useDragSource(id, item)` with an id that is unique on screen (sidebar ids include the group). Elements that accept drops register with `useDropSurface('canvas' | 'layers', element)`. `resolveDrop` walks up from the layer under the pointer to the nearest one that accepts the drag. Builder chrome drawn over the canvas must carry `data-drop-ignore`, so hit-testing looks through it. Canvas indicator CSS classes use a `canvas-` prefix (a bare `.drop-inside` once collided with the Layers row markers).
- **The empty-container slot is preview-only.** It never reaches the tree or the code.
- **Persistence scope.** Persist UI preferences (panels, widths, recent, favorites, preview settings, last component, mode). Don't persist the selection or the document; a page is lost on reload until save/load (Phase 5). Sharing goes through URLs; a page link carries `mode=page` and the whole tree in `doc`.
- **Undo.** Only document actions (listed in `documentActions`) enter history. Repeated edits to one field merge into one step through `historyKey`.
- **Platform filtering.** Use `prop.platforms` to filter props by platform, in the inspector (`propsForPlatform`), the preview (`resolveProps`), and the code generator.
- Upstream AdvUI types some props as `ReactNode` or unions the adapter can't edit. Add those as `extraProps` in the registry, never by editing `sourceMeta.ts`. A test fails if a sync drops a prop that a template uses.

## Adding a component

1. Add its slug to `SLUGS` in `scripts/sync-meta.mjs`, then run `pnpm sync-meta`.
2. In `src/registry/componentRegistry.ts`, write one definition and list it in `advuiRegistry.components`:
   ```ts
   const x = adaptAdvuiMeta(xMeta, {
     extraProps, staticProps, propPlatforms, propOverrides, category,
     omit,                                        // documented props to leave out of the inspector
     template: node('x', 'X', 'X', { size: 'lg' }, [/* child nodes */], 'Text'), // starter tree, unique ids
     acceptsChildren: true,                       // other layers can go inside
     item: { noun, part, valuePrefix, nodes },    // only if "Add item" grows it (see Select, Tabs)
   })
   ```
   - Compound parts are their own definitions with `part: 'X.Part'`, `sidebar: false`, and `importName: 'X'`. List them after their component.
   - Drop rules are optional: `accepts` (allowed children), `parents` (allowed parents), `maxChildren`. Parts already default to the parents their templates use.
   - Set `invisible: true` on a component that draws nothing on its own (Spacer), so the canvas outlines it.
   - Without a `template`, the bare component opens (`id` from the name, text from the playground `children`).
   - In item templates, `{n}`, `{value}`, and `{host}` are filled in. `into` puts a node inside a host child of that component (Tabs triggers go into `Tabs.List`).
   - `createRegistry` throws at startup if a template or item names an unregistered component.
3. In `src/builder/preview/AdvuiPreview.tsx`, add one line to `views`. Add a special render path only if the component clones or type-matches its children (see `directChildHosts` and `Select`).
4. Add assertions to `src/registry/adaptMeta.test.ts`. The template-prop check runs automatically for every sidebar entry.

## Code style

- No semicolons, single quotes, 2-space indent, trailing commas, lines up to about 120 characters.
- Named exports and function components. Props are typed inline or with a local interface.
- Comments are sparse and explain *why*. Keep JSDoc on exported helpers when it states a contract.
- Use accessible names (`aria-label`, roles). Tests query by role or label, so keep labels stable.
- CSS lives in `src/styles/builder.css`. Theme tokens are `--builder-*` on `:root` and `.app[data-theme="dark"]`. Keep the UI dense and flat: no extra cards or shadows.

## Testing

- Reducer and pure logic tests go next to the source (`*.test.ts`).
- UI tests (`src/builder/interaction.test.tsx`) render `<BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Card')} persist={false}>` with a fake `renderNode`. AdvUI and Tamagui are not rendered in jsdom. To check real rendering, run `pnpm dev`, or drive Chromium with Playwright (preinstalled in cloud sessions, `executablePath: '/opt/pw-browsers/chromium'`).
- Persistence tests pass a fake storage to `loadPreferences` and `savePreferences`.
- Drag-and-drop can't run in jsdom. Test the logic as pure functions (`dropTarget.test.ts`, reducer `insert-at` / `place`), and the gestures in `e2e/*.spec.ts` with real pointer events (`page.mouse` down, move with steps, up).
- Inserted copies get component-based ids (`image`, `button`, `card-header`), not the template ids (`card-image`). E2E tests that insert a Card must use those ids.
- Test files bind the AdvUI reducer once: `const builderReducer = createBuilderReducer(advuiRegistry)`.
- `src/test/acmeLibrary.ts` is a small non-AdvUI library. `registry.test.ts` and the "injected registry" UI test use it to prove the core runs from metadata alone. Keep them passing when you change the registry contract.

## Status against the original build brief

All 24 "Definition of Done" steps work, checked in Chromium on 2026-10-03: search, select, platform switch, width, background, click-to-select with outline, context inspector, breadcrumb, platform notes, reset, TSX, copy, collapse, resize, and reload persistence. There are 42 sidebar components (plus compound parts) built on real AdvUI. Extras beyond the brief: undo/redo, insert/remove/duplicate/move, drag-and-drop layers, "add item" for Select/Tabs/List/RadioGroup/Menu, share links, keyboard shortcuts, and canvas rulers.

Phase 1 of the LayoutIt-style plan is done: Page mode, @dnd-kit drag-and-drop (sidebar → canvas or Layers, moving on the canvas and in Layers), drop lines and boxes, empty-container slots, drop rules, and Playwright tests.

Remaining phases of that plan:

- **Phase 2:** done. Box, HStack, VStack, Center, Spacer and Wrap are registered, with upstream's `direction` / `align` / `distribute` / `wrap` instead of raw flex props. Layout presets (`12`, `6 6`, `8 4`, `4 8`, `4 4 4`, `3 3 3 3`, or custom spans) add an HStack of Boxes sized by `flex`. Switch `columns` to real column spans once AdvUI adds `Grid.Item span`.
- **Phase 3:** a "Blocks" sidebar group (Navbar, Hero, Pricing, Login, Footer) and more AdvUI components (NavigationBar, Breadcrumb, Accordion, Dialog, Form, Sidebar).
- **Phase 4:** double-click to edit text, a hover toolbar, Alt+↑/↓ and copy/paste, and an Edit / Preview toggle.
- **Phase 5:** export the page as `Page.tsx`, save and load pages, page settings.
- **Phase 6:** lint/format, performance on large pages. CI is done.

Decisions that differ from the brief on purpose:

- **Generated code is a "Code" tab, not a bottom panel.** The owner asked for this. Don't turn it back into a bottom panel. `Preferences.codePanelHeight` and `clampCodeHeight` are left over from the panel version and nothing uses them.

Done since the first version: the registry is injected (`BuilderProvider registry`, `Builder loadPreview`), and starter templates, containers, and repeatable items are metadata.

Known gaps, highest value first:

1. **Pages are not saved.** A reload opens an empty page; only the mode is remembered.
2. **No keyboard drag-and-drop.** Keyboard users add with **+** and reorder with the Layers ↑/↓ buttons. Dropping into pop-up components (Dialog, Dropdown menu, Tooltip) on the canvas isn't supported; use Layers.
3. **TSX is the only code target.** There is no generator interface for React Native or JSON output. JSON config already exists in `shareConfig.toConfiguration`.
4. `SelectionContext` / `selectionFrom()` are only used in tests. The UI derives the selection from `selectedId`. Either use `selectionFrom` in the Inspector or drop the type.
5. The light/dark toggle is global (app chrome and preview together), not a preview-only control.
6. Width controls are duplicated in the `PlatformSelector` popover and in `ViewportControls`.
7. Inspector properties from the brief are missing: Shadow, Margin (`marginProp` is defined but unused), Font family, and Line height.
8. The splitters have no keyboard resizing. The layers section is labelled "Component Properties", and the collapse-inspector button sits in `LayersPanel`.
9. Untested in UI: selection overlay outlines, zoom/Fit/100%, width slider and preset buttons (reducer only), sidebar collapse, splitter drag, and search.
10. There is no ESLint or Prettier config.
11. Toast is still special-cased in the generic `codeGenerator.ts`. A per-component code hook in metadata would move it into the AdvUI registry.
12. Fit zoom uses a global `document.querySelector('.preview .canvas')`, and the URL is not kept in sync with state (links only come from "Copy link").
