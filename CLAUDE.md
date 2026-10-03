# AdvUI Builder

Selection-driven visual builder for the AdvUI component library (`@advui/core`). The flow is: pick a component, click an element in the preview, edit it in the inspector, copy the TSX. It runs as a standalone app today and will later be embedded in the AdvUI docs site, so keep the builder core free of docs-site code.

The defining rule: **the inspector follows what the user selects.** Every panel reads one selection from one store.

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
  → componentRegistry.ts (registry, extra props, starter templates)
  → builderState.ts (reducer: ConfigNode tree + selectedId + preview settings + undo history)
  → BuilderProvider.tsx (contexts: state, actions, preferences, hover)
  → Preview / Layers / Breadcrumb / Inspector / Code all read the same state
```

| Area | Files |
|---|---|
| Metadata types | `src/registry/metadata.ts` (`ComponentMetadata`, `PropMetadata`, `ConfigNode`, `SelectionContext`) |
| Upstream schema | `src/registry/advuiMetaTypes.ts` (subset of AdvUI `ComponentMeta`) |
| Generated snapshot | `src/registry/sourceMeta.ts`. **Never edit by hand.** Written by `scripts/sync-meta.mjs` |
| Adapter | `src/registry/adaptMeta.ts`: prop typing, platform notes, `propsForPlatform`, `groupedProps` |
| Registry | `src/registry/componentRegistry.ts`: entries, `sidebarOrder`, `createDocument` templates, `childContainers`, `itemHosts`/`addItem`, `resolveProps` |
| Shared style props | `src/registry/styleProps.ts` (background, radius, padding, gap, typography…) |
| State | `src/builder/state/builderState.ts` (pure reducer, unit-tested), `BuilderProvider.tsx` |
| Tree utils | `src/builder/selection/selection.ts`: `findPath`, `mapTree`, insert/move/duplicate/place |
| Preview | `src/builder/preview/`: `AdvuiPreview.tsx` (name → AdvUI component `views` map, special render cases), `ElementTree.tsx` + `Selectable.tsx` (click/hover wrappers, `data-builder-id`), `SelectionOverlay.tsx` (outlines measured from the DOM, drawn separately from the component) |
| Inspector | `src/builder/inspector/`: generic. `PropertyEditor.tsx` chooses an editor by `prop.type` |
| Editors | `src/components/property-editors/editors.tsx` |
| Code | `src/builder/code/codeGenerator.ts` (pure `generateCode(root, platform)`), `CodePanel.tsx` |
| Share links | `src/builder/shareConfig.ts`: `?component=button&variant=secondary`, plus a `doc=` JSON tree for nested edits |
| Persistence | `src/builder/persistence.ts`: localStorage key `advui-builder.preferences.v1` |

## Rules for changes

- **Metadata-driven.** Don't add `if (component === 'X')` branches in the inspector, sidebar, layers, or panels. Put the behaviour in metadata (`PropMetadata` fields, registry options) and keep the UI generic. Component-specific code is allowed only where the component really needs it (today: `AdvuiPreview.tsx` for Toast, Select, and clone-child hosts; `codeGenerator.ts` for Toast).
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
2. In `src/registry/componentRegistry.ts`:
   - `const x = adaptAdvuiMeta(xMeta, { extraProps, staticProps, propPlatforms, propOverrides, category })`
   - Compound parts are separate entries keyed `'Name.Part'`, with `part`, `sidebar: false`, and `importName`.
   - Add the entry to `componentRegistry` and `sidebarOrder`.
   - Add a `createDocument` case for the starter tree. Node ids must be unique in the tree.
   - If it holds children, add it to `childContainers`. If it grows by repeated parts, add it to `itemHosts` and add an `addItem` case.
3. In `src/builder/preview/AdvuiPreview.tsx`, add it to `views`. Add a special render path only if the component clones or type-matches its children (see `directChildHosts` and `Select`).
4. Add assertions to `src/registry/adaptMeta.test.ts`. The template-prop check runs automatically for every sidebar entry.

## Code style

- No semicolons, single quotes, 2-space indent, trailing commas, lines up to about 120 characters.
- Named exports and function components. Props are typed inline or with a local interface.
- Comments are sparse and explain *why*. Keep JSDoc on exported helpers when it states a contract.
- Use accessible names (`aria-label`, roles). Tests query by role or label, so keep labels stable.
- CSS lives in `src/styles/builder.css`. Theme tokens are `--builder-*` on `:root` and `.app[data-theme="dark"]`. Keep the UI dense and flat: no extra cards or shadows.

## Testing

- Reducer and pure logic tests go next to the source (`*.test.ts`).
- UI tests (`src/builder/interaction.test.tsx`) render `<BuilderProvider initial={createBuilderState('Card')} persist={false}>` with a fake `renderNode`. AdvUI and Tamagui are not rendered in jsdom. To check real rendering, run `pnpm dev`, or drive Chromium with Playwright (preinstalled in cloud sessions, `executablePath: '/opt/pw-browsers/chromium'`).
- Persistence tests pass a fake storage to `loadPreferences` and `savePreferences`.

## Status against the original build brief

All 24 "Definition of Done" steps work, checked in Chromium on 2026-10-03: search, select, platform switch, width, background, click-to-select with outline, context inspector, breadcrumb, platform notes, reset, TSX, copy, collapse, resize, and reload persistence. There are 36 sidebar components (plus compound parts) built on real AdvUI. Extras beyond the brief: undo/redo, insert/remove/duplicate/move, drag-and-drop layers, "add item" for Select/Tabs/List/RadioGroup/Menu, share links, keyboard shortcuts, and canvas rulers.

Known gaps, highest value first:

1. **Code panel is a tab, not a bottom panel.** "Preview | Code" swap places, so code and preview are never visible together. `Preferences.codePanelHeight` and `clampCodeHeight` already exist but nothing uses them.
2. **The registry can't be injected (phase 7).** `componentRegistry`, `getMeta`, and the `views` map are module singletons imported directly. To consume an external AdvUI registry, pass a registry (metadata plus component map) through `BuilderProvider`.
3. **Component-specific switches in the registry.** `createDocument`, `childContainers`, `itemHosts`, and `addItem` should become metadata fields (for example `template`, `acceptsChildren`, `item`), so that adding a component means adding one entry and one `views` line.
4. **TSX is the only code target.** There is no generator interface for React Native or JSON output. JSON config already exists in `shareConfig.toConfiguration`.
5. `SelectionContext` / `selectionFrom()` are only used in tests. The UI derives the selection from `selectedId`. Either use `selectionFrom` in the Inspector or drop the type.
6. The light/dark toggle is global (app chrome and preview together), not a preview-only control.
7. Width controls are duplicated in the `PlatformSelector` popover and in `ViewportControls`.
8. Inspector properties from the brief are missing: Shadow, Margin (`marginProp` is defined but unused), Font family, and Line height.
9. The splitters have no keyboard resizing. The layers section is labelled "Component Properties", and the collapse-inspector button sits in `LayersPanel`.
10. Untested in UI: selection overlay outlines, zoom/Fit/100%, width slider and preset buttons (reducer only), sidebar collapse, splitter drag, and search.
11. There is no ESLint, Prettier, or CI workflow.
12. Fit zoom uses a global `document.querySelector('.preview .canvas')`, and the URL is not kept in sync with state (links only come from "Copy link").
