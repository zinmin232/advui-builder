import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { advuiRegistry } from '../registry/componentRegistry'
import type { ConfigNode } from '../registry/metadata'
import { createRegistry } from '../registry/registry'
import { acmeLibrary } from '../test/acmeLibrary'
import { CodePanel } from './code/CodePanel'
import { Inspector } from './inspector/Inspector'
import { LayersPanel } from './layers/LayersPanel'
import { ElementTree } from './preview/ElementTree'
import { PlatformSelector } from './preview/PlatformSelector'
import { ComponentSidebar } from './sidebar/ComponentSidebar'
import { createBuilderState } from './state/builderState'
import { BuilderProvider, useBuilderActions, useBuilderState } from './state/BuilderProvider'
import { loadPreferences } from './persistence'
import { useShortcuts } from './useShortcuts'

function renderNode(node: ConfigNode, children: ReactNode) {
  return (
    <div data-testid={`node-${node.id}`}>
      {node.label}:{JSON.stringify(node.props)}
      {children}
    </div>
  )
}

function Harness() {
  const state = useBuilderState()
  const actions = useBuilderActions()
  return (
    <>
      <ElementTree node={state.document} renderNode={renderNode} />
      <LayersPanel root={state.document} selectedId={state.selectedId} onSelect={actions.select} />
      <Inspector />
      <PlatformSelector
        platform={state.platform}
        width={state.viewportWidth}
        onChange={actions.setPlatform}
        onWidth={actions.setWidth}
      />
      <button type="button" onClick={() => actions.reset()}>
        Reset
      </button>
      <button type="button" onClick={() => actions.setBackground('#010101')}>
        Paint canvas
      </button>
      <output data-testid="background">{state.background}</output>
    </>
  )
}

function ShortcutHarness() {
  useShortcuts()
  return <Harness />
}

function renderCard() {
  return render(
    <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Card')} persist={false}>
      <Harness />
    </BuilderProvider>,
  )
}

describe('selection-driven inspector', () => {
  it('selects a nested preview element and updates the breadcrumb', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByTestId('node-card-button'))
    const crumbs = screen.getByRole('navigation', { name: 'Selection' })
    expect(crumbs).toHaveTextContent('Card')
    expect(crumbs).toHaveTextContent('Footer')
    expect(within(crumbs).getByRole('button', { name: 'Button' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByLabelText('Variant')).toBeInTheDocument()
    expect(screen.queryByLabelText('Fit')).not.toBeInTheDocument()
  })

  it('selects the same element from the layers panel and walks the breadcrumb', async () => {
    const user = userEvent.setup()
    renderCard()
    const layers = screen.getByRole('tree', { name: 'Layers' })
    await user.click(within(layers).getByRole('button', { name: 'Image' }))
    const crumbs = screen.getByRole('navigation', { name: 'Selection' })
    expect(within(crumbs).getByRole('button', { name: 'Image' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByLabelText('Fit')).toBeInTheDocument()
    expect(screen.getByLabelText('Source')).toBeInTheDocument()
    await user.click(within(crumbs).getByRole('button', { name: 'Card' }))
    expect(within(crumbs).getByRole('button', { name: 'Card' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByLabelText('Variant')).toHaveValue('outline')
  })

  it('writes inspector edits into preview state and reset restores defaults', async () => {
    const user = userEvent.setup()
    renderCard()
    await user.click(screen.getByTestId('node-card-button'))
    await user.selectOptions(screen.getByLabelText('Variant'), 'secondary')
    await user.selectOptions(screen.getByLabelText('Size'), 'lg')
    expect(screen.getByTestId('node-card-button')).toHaveTextContent('"variant":"secondary"')
    expect(screen.getByTestId('node-card-button')).toHaveTextContent('"size":"lg"')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(screen.getByTestId('node-card-button')).toHaveTextContent('{}')
  })

  it('clears text and number fields back to unset props', async () => {
    const user = userEvent.setup()
    renderCard()
    const layers = screen.getByRole('tree', { name: 'Layers' })
    await user.click(within(layers).getByRole('button', { name: 'Image' }))
    await user.clear(screen.getByLabelText('Width'))
    await user.clear(screen.getByLabelText('Ratio'))
    const image = screen.getByTestId('node-card-image')
    expect(image).not.toHaveTextContent('"width"')
    expect(image).not.toHaveTextContent('"ratio"')
    expect(screen.getByLabelText('Width')).toHaveValue('')
    expect(screen.getByLabelText('Ratio')).toHaveValue(null)
  })

  it('sets a responsive prop per breakpoint, and folds it back to the value the preview shows', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'HStack')} persist={false}>
        <Harness />
      </BuilderProvider>,
    )
    const toggle = screen.getByRole('button', { name: 'Direction per breakpoint' })
    expect(toggle).toHaveAttribute('aria-pressed', 'false')
    await user.click(toggle)
    const rows = screen.getByRole('group', { name: 'Direction by breakpoint' })
    // The preview is 1024 pixels wide, so the lg row is the one it shows.
    expect(within(rows).getByLabelText('Direction at lg').closest('[aria-current]')).toBeInTheDocument()
    await user.selectOptions(within(rows).getByLabelText('Direction at md'), 'column')
    expect(screen.getByTestId('node-hstack')).toHaveTextContent('"direction":{"md":"column"}')
    expect(within(rows).getByLabelText('Direction at lg')).toHaveDisplayValue('Inherit (Column)')

    await user.click(toggle)
    expect(screen.getByTestId('node-hstack')).toHaveTextContent('"direction":"column"')
    expect(screen.queryByRole('group', { name: 'Direction by breakpoint' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('Direction')).toHaveValue('column')
  })

  it('filters platform properties and changes notes without touching the canvas color', async () => {
    const user = userEvent.setup()
    renderCard()
    const layers = screen.getByRole('tree', { name: 'Layers' })
    await user.click(within(layers).getByRole('button', { name: 'Image' }))
    expect(screen.getByLabelText('Loading')).toBeInTheDocument()
    expect(screen.getByText(/before hydration/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Android' }))
    expect(screen.queryByLabelText('Loading')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Fit')).toBeInTheDocument()
    expect(screen.getByText(/HTTPS/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Paint canvas' }))
    expect(screen.getByTestId('background')).toHaveTextContent('#010101')
    expect(screen.getByTestId('node-card-image').textContent).not.toContain('#010101')
  })
})

describe('keyboard shortcuts', () => {
  it('deletes the selected layer with Delete, but not while typing in a field', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })}
        persist={false}
      >
        <ShortcutHarness />
      </BuilderProvider>,
    )
    await user.click(screen.getByLabelText('Content'))
    await user.keyboard('{Backspace}{Delete}')
    expect(screen.getByTestId('node-card-button')).toBeInTheDocument()

    const layers = screen.getByRole('tree', { name: 'Layers' })
    await user.click(within(layers).getByRole('button', { name: 'Button' }))
    await user.keyboard('{Delete}')
    expect(screen.queryByTestId('node-card-button')).not.toBeInTheDocument()
  })
})

describe('copy and favorites', () => {
  it('copies the generated snippet', async () => {
    const user = userEvent.setup()
    const writeText = vi.fn().mockResolvedValue(undefined)
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } })
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Button', {
          document: {
            ...createBuilderState(advuiRegistry, 'Button').document,
            props: { variant: 'secondary' },
          },
        })}
        persist={false}
      >
        <CodePanel />
      </BuilderProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Copy code' }))
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('variant="secondary"'))
    expect(screen.getByRole('button', { name: 'Copied' })).toBeInTheDocument()
  })

  it('persists a favorite across a reload of the sidebar', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    const first = render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Button')}>
        <ComponentSidebar />
      </BuilderProvider>,
    )
    await user.click(screen.getAllByRole('button', { name: 'Add Button favorite' })[0])
    expect(loadPreferences().favorites).toContain('Button')
    first.unmount()
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Button')}>
        <ComponentSidebar />
      </BuilderProvider>,
    )
    expect(screen.getAllByRole('button', { name: 'Remove Button favorite' }).length).toBeGreaterThan(0)
  })

  it('adds a Spacer inside the selected stack and outlines it on the canvas', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'VStack')} persist={false}>
        <ComponentSidebar />
        <Harness />
      </BuilderProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'Add Spacer inside VStack' }))
    const layers = screen.getByRole('tree', { name: 'Layers' })
    expect(within(layers).getByRole('button', { name: 'Spacer' })).toBeInTheDocument()
    const spacer = screen.getByText(/^Spacer:/).closest('[data-builder-id]')
    expect(spacer).toHaveAttribute('data-builder-invisible', 'true')
    expect(screen.getByText(/^VStack:/).closest('[data-builder-id]')).not.toHaveAttribute('data-builder-invisible')
  })

  it('collapses and expands a component group', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Button')} persist={false}>
        <ComponentSidebar />
      </BuilderProvider>,
    )
    const group = screen.getByRole('button', { name: 'Buttons & Actions', expanded: true })
    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument()
    await user.click(group)
    expect(group).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('button', { name: 'Button' })).not.toBeInTheDocument()
    await user.click(group)
    expect(screen.getByRole('button', { name: 'Button' })).toBeInTheDocument()
  })
})

describe('injected registry', () => {
  it('builds the sidebar, layers, and item actions from the registry it is given', async () => {
    const user = userEvent.setup()
    const acme = createRegistry(acmeLibrary)
    render(
      <BuilderProvider registry={acme} initial={createBuilderState(acme, 'Menu')} persist={false}>
        <ComponentSidebar />
        <Harness />
      </BuilderProvider>,
    )
    const sidebar = screen.getByRole('complementary', { name: 'Components' })
    expect(within(sidebar).getByRole('button', { name: 'Basics', expanded: true })).toBeInTheDocument()
    expect(within(sidebar).getAllByRole('button', { name: /^(Panel|Tag|Menu)$/ })).toHaveLength(3)
    expect(within(sidebar).queryByRole('button', { name: 'Button' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add entry to Menu' }))
    expect(screen.getByTestId('node-menu')).toHaveTextContent('Entry 1')
    const crumbs = screen.getByRole('navigation', { name: 'Selection' })
    expect(crumbs).toHaveTextContent('Menu')
    expect(within(crumbs).getByRole('button', { name: 'Entry 1' })).toHaveAttribute('aria-current', 'true')
    expect(screen.getByLabelText('Value')).toHaveValue('entry-1')
  })
})

describe('page mode', () => {
  it('adds clicked sidebar components to the page, or inside the selected container', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Button', { mode: 'page' })}
        persist={false}
      >
        <ComponentSidebar />
        <Harness />
      </BuilderProvider>,
    )
    const sidebar = screen.getByRole('complementary', { name: 'Components' })
    expect(within(sidebar).getByText('Add inside Page')).toBeInTheDocument()
    await user.click(within(sidebar).getAllByRole('button', { name: 'Card' })[0])
    await user.click(within(sidebar).getAllByRole('button', { name: 'Badge' })[0])
    const layers = within(screen.getByRole('tree', { name: 'Layers' }))
    expect(layers.getByRole('button', { name: 'Card' })).toBeInTheDocument()
    // The Card was selected after it was added, so the Badge went inside it.
    expect(screen.getByTestId('node-card')).toHaveTextContent('Badge')

    await user.click(layers.getByRole('button', { name: 'Title' }))
    expect(within(sidebar).getByText('Add inside Header')).toBeInTheDocument()
    expect(within(sidebar).getAllByRole('button', { name: 'Add Text inside Header' })[0]).toBeEnabled()
  })

  it('adds a column preset, and explains custom spans that do not add up to 12', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Button', { mode: 'page' })}
        persist={false}
      >
        <ComponentSidebar />
        <Harness />
      </BuilderProvider>,
    )
    const sidebar = within(screen.getByRole('complementary', { name: 'Components' }))
    const layers = within(screen.getByRole('tree', { name: 'Layers' }))
    const custom = () => sidebar.getByRole('textbox', { name: 'Custom columns' })
    await user.click(sidebar.getByRole('button', { name: 'Columns 8 4' }))
    expect(layers.getByRole('button', { name: 'Columns 8 4' })).toBeInTheDocument()
    expect(layers.getAllByRole('button', { name: /^Column \d$/ })).toHaveLength(2)

    // The new row is selected, so the custom row goes inside it, after its columns.
    await user.type(custom(), '5 5{Enter}')
    expect(sidebar.getByText(/add up to 12/)).toBeInTheDocument()
    expect(custom()).toHaveAttribute('aria-invalid', 'true')
    await user.clear(custom())
    await user.type(custom(), '3 9{Enter}')
    expect(layers.getByRole('button', { name: 'Columns 3 9' })).toBeInTheDocument()
    expect(sidebar.queryByText(/add up to 12/)).not.toBeInTheDocument()
  })
})

