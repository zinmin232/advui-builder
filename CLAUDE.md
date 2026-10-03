# AdvUI Builder

Selection-driven visual builder for the AdvUI component library (`@advui/core`). The flow is: pick a component, click an element in the preview, edit it in the inspector, copy the TSX. It runs as a standalone app today and will later be embedded in the AdvUI docs site, so keep the builder core free of docs-site code.

The defining rule: **the inspector follows what the user selects.** Every panel reads one selection from one store.

The Builder core knows no component library. `src/app/App.tsx` is the only place that wires in AdvUI: it passes `advuiRegistry` (metadata) to `<BuilderProvider registry>` and a lazy loader for `advuiPreview` (real components) to `<Builder loadPreview>`. Another library, or the AdvUI docs site, plugs in the same way.

## Commands

```bash
pnpm install
pnpm dev                # http://localhost:5173
pnpm typecheck          # tsc --noEmit
pnpm test               # vitest run (jsdom)
pnpm build              # typecheck + vite build
pnpm sync-meta          # regenerate src/registry/sourceMeta.ts from AdvUI upstream (needs GitHub access)
pnpm sync-meta --check  # fail if the snapshot differs from upstream
```

Before committing, run `pnpm typecheck && pnpm test && pnpm build`. There is no ESLint or Prettier config. Match the existing style by hand.

## Stack

- Node >= 20, pnpm 10, React 19.2, TypeScript 5.9 (`strict`, `noUnusedLocals`, `noUnusedParameters`), Vite 6.
- Real AdvUI components from `@advui/core@0.6.0` (Tamagui 2.7.7). `react-native` is aliased to `react-native-web` in `vite.config.ts`, and `.web.*` extensions resolve first.
- Tests: Vitest 3 with globals, jsdom, Testing Library, and user-event. Setup is in `src/test/setup.ts`.
- State is plain React (`useReducer` and context). Don't add a state library.
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
| Generic registry | `src/registry/registry.ts`: `createRegistry()` → `BuilderRegistry` (`get`, `sidebarEntries`, `search`, `match`, `createDocument`, `acceptsChildren`, `itemNoun`, `addItem`), `resolveProps`, `nextId`. No AdvUI imports |
| Upstream schema | `src/registry/advuiMetaTypes.ts` (subset of AdvUI `ComponentMeta`) |
| Generated snapshot | `src/registry/sourceMeta.ts`. **Never edit by hand.** Written by `scripts/sync-meta.mjs` |
| Adapter | `src/registry/adaptMeta.ts`: prop typing, platform notes, `propsForPlatform`, `groupedProps` |
| AdvUI registry | `src/registry/componentRegistry.ts`: one `adaptAdvuiMeta(...)` definition per component or part (extra props, `template`, `acceptsChildren`, `item`), then `advuiRegistry = createRegistry({ importSource, components })`. Sidebar order = order in `components` |
| Shared style props | `src/registry/styleProps.ts` (background, radius, padding, gap, typography…) |
| State | `src/builder/state/builderState.ts` (`createBuilderReducer(registry)`, `createBuilderState(registry, …)`, pure and unit-tested), `BuilderProvider.tsx` (`registry` prop, `useRegistry()`) |
| Tree utils | `src/builder/selection/selection.ts`: `findPath`, `mapTree`, insert/move/duplicate/place |
| Preview | `src/builder/preview/`: `previewKit.ts` (`PreviewKit` = `Frame` + `renderNode`), `AdvuiPreview.tsx` (the AdvUI kit: name → component `views` map, special render cases), `PreviewWorkspace.tsx` (takes a `kit`), `ElementTree.tsx` + `Selectable.tsx` (click/hover wrappers, `data-builder-id`), `SelectionOverlay.tsx` (outlines measured from the DOM, drawn separately from the component) |
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
- **Reset scope.** `reset` rebuilds the current component's starter document only. It never touches preview settings, panel sizes, or preferences.
- **Persistence scope.** Persist UI preferences (panels, widths, recent, favorites, preview settings, last component). Don't persist the selection or the document. Sharing goes through URLs.
- **Undo.** Only document actions (listed in `documentActions`) enter history. Repeated edits to one field merge into one step through `historyKey`.
- **Platform filtering.** Use `prop.platforms` to filter props by platform, in the inspector (`propsForPlatform`), the preview (`resolveProps`), and the code generator.
- Upstream AdvUI types some props as `ReactNode` or unions the adapter can't edit. Add those as `extraProps` in the registry, never by editing `sourceMeta.ts`. A test fails if a sync drops a prop that a template uses.

## Adding a component

1. Add its slug to `SLUGS` in `scripts/sync-meta.mjs`, then run `pnpm sync-meta`.
2. In `src/registry/componentRegistry.ts`, write one definition and list it in `advuiRegistry.components`:
   ```ts
   const x = adaptAdvuiMeta(xMeta, {
     extraProps, staticProps, propPlatforms, propOverrides, category,
     template: node('x', 'X', 'X', { size: 'lg' }, [/* child nodes */], 'Text'), // starter tree, unique ids
     acceptsChildren: true,                       // other layers can go inside
     item: { noun, part, valuePrefix, nodes },    // only if "Add item" grows it (see Select, Tabs)
   })
   ```
   - Compound parts are their own definitions with `part: 'X.Part'`, `sidebar: false`, and `importName: 'X'`. List them after their component.
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
- Test files bind the AdvUI reducer once: `const builderReducer = createBuilderReducer(advuiRegistry)`.
- `src/test/acmeLibrary.ts` is a small non-AdvUI library. `registry.test.ts` and the "injected registry" UI test use it to prove the core runs from metadata alone. Keep them passing when you change the registry contract.

## Status against the original build brief

All 24 "Definition of Done" steps work, checked in Chromium on 2026-10-03: search, select, platform switch, width, background, click-to-select with outline, context inspector, breadcrumb, platform notes, reset, TSX, copy, collapse, resize, and reload persistence. There are 36 sidebar components (plus compound parts) built on real AdvUI. Extras beyond the brief: undo/redo, insert/remove/duplicate/move, drag-and-drop layers, "add item" for Select/Tabs/List/RadioGroup/Menu, share links, keyboard shortcuts, and canvas rulers.

Decisions that differ from the brief on purpose:

- **Generated code is a "Code" tab, not a bottom panel.** The owner asked for this. Don't turn it back into a bottom panel. `Preferences.codePanelHeight` and `clampCodeHeight` are left over from the panel version and nothing uses them.

Done since the first version: the registry is injected (`BuilderProvider registry`, `Builder loadPreview`), and starter templates, containers, and repeatable items are metadata.

Known gaps, highest value first:

1. **TSX is the only code target.** There is no generator interface for React Native or JSON output. JSON config already exists in `shareConfig.toConfiguration`.
2. `SelectionContext` / `selectionFrom()` are only used in tests. The UI derives the selection from `selectedId`. Either use `selectionFrom` in the Inspector or drop the type.
3. The light/dark toggle is global (app chrome and preview together), not a preview-only control.
4. Width controls are duplicated in the `PlatformSelector` popover and in `ViewportControls`.
5. Inspector properties from the brief are missing: Shadow, Margin (`marginProp` is defined but unused), Font family, and Line height.
6. The splitters have no keyboard resizing. The layers section is labelled "Component Properties", and the collapse-inspector button sits in `LayersPanel`.
7. Untested in UI: selection overlay outlines, zoom/Fit/100%, width slider and preset buttons (reducer only), sidebar collapse, splitter drag, and search.
8. There is no ESLint, Prettier, or CI workflow.
9. Toast is still special-cased in the generic `codeGenerator.ts`. A per-component code hook in metadata would move it into the AdvUI registry.
10. Fit zoom uses a global `document.querySelector('.preview .canvas')`, and the URL is not kept in sync with state (links only come from "Copy link").
