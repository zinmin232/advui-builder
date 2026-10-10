import { fireEvent, render, screen, within } from '@testing-library/react'
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
import { PageMenu } from './pages/PageMenu'
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

/** The page and two sidebar clicks, without the whole sidebar (role queries over it are slow in jsdom). */
function Canvas() {
  const actions = useBuilderActions()
  return (
    <>
      <button type="button" onClick={() => actions.openComponent('Card')}>
        Add Card
      </button>
      <button type="button" onClick={() => actions.openComponent('Badge')}>
        Add Badge
      </button>
      <ElementTree node={useBuilderState().document} renderNode={renderNode} />
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

  it('picks an icon by name from the library’s icon set', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'NavigationBar')}
        persist={false}
      >
        <Harness />
      </BuilderProvider>,
    )
    await user.click(within(screen.getByRole('tree', { name: 'Layers' })).getByRole('button', { name: 'Home' }))
    const icon = screen.getByRole('combobox', { name: 'Icon' })
    expect(icon).toHaveValue('home')
    // A required icon offers no "None".
    expect(within(icon).queryByRole('option', { name: 'None' })).not.toBeInTheDocument()
    await user.selectOptions(icon, 'star')
    expect(screen.getByTestId('node-nav-home')).toHaveTextContent('"icon":"star"')
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

  it('moves the selected layer with Alt+↑ and Alt+↓', async () => {
    const user = userEvent.setup()
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-footer' })}
        persist={false}
      >
        <ShortcutHarness />
      </BuilderProvider>,
    )
    const order = () => screen.getAllByTestId(/^node-card-(header|content|footer)$/).map((node) => node.dataset.testid)
    expect(order().at(-1)).toBe('node-card-footer')
    await user.keyboard('{Alt>}{ArrowUp}{/Alt}')
    expect(order().at(-2)).toBe('node-card-footer')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    expect(order().at(-1)).toBe('node-card-footer')
  })

  it('copies, cuts and pastes the selected layer, but leaves fields and selected text to the browser', async () => {
    const user = userEvent.setup()
    // jsdom has no ClipboardEvent; the handlers only read `clipboardData`.
    const clipboard = new Map<string, string>()
    const send = (type: 'copy' | 'cut' | 'paste', target: Element = document.body) => {
      const event = new Event(type, { bubbles: true, cancelable: true })
      Object.defineProperty(event, 'clipboardData', {
        value: {
          getData: (format: string) => clipboard.get(format) ?? '',
          setData: (format: string, value: string) => clipboard.set(format, value),
        },
      })
      fireEvent(target, event)
      return event
    }
    render(
      <BuilderProvider
        registry={advuiRegistry}
        initial={createBuilderState(advuiRegistry, 'Card', { selectedId: 'card-button' })}
        persist={false}
      >
        <ShortcutHarness />
      </BuilderProvider>,
    )

    expect(send('copy').defaultPrevented).toBe(true)
    expect(clipboard.get('text/plain')).toBe("import { Button } from '@advui/core'\n\n<Button>Continue</Button>\n")
    expect(clipboard.get('application/x-advui-builder-layer')).toContain('"component":"Button"')

    const layers = within(screen.getByRole('tree', { name: 'Layers' }))
    await user.click(layers.getByRole('button', { name: 'Content' }))
    send('paste')
    expect(within(screen.getByTestId('node-card-content')).getByTestId('node-button')).toBeInTheDocument()

    send('cut')
    expect(screen.queryByTestId('node-button')).not.toBeInTheDocument()
    await user.click(layers.getByRole('button', { name: 'Title' }))
    expect(send('paste', screen.getByLabelText('Content')).defaultPrevented).toBe(false)
    expect(screen.queryByTestId('node-button')).not.toBeInTheDocument()
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

  it('adds a block from the sidebar and finds blocks by search', async () => {
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
    expect(sidebar.getByRole('button', { name: 'Hero block' })).toHaveAccessibleDescription(/centered headline/)
    await user.click(sidebar.getByRole('button', { name: 'Hero block' }))
    const layers = within(screen.getByRole('tree', { name: 'Layers' }))
    expect(layers.getByRole('button', { name: 'Hero' })).toBeInTheDocument()
    expect(layers.getByRole('button', { name: 'Headline' })).toBeInTheDocument()

    await user.type(sidebar.getByRole('textbox', { name: 'Search components' }), 'sign in')
    expect(sidebar.getByRole('button', { name: 'Login block' })).toBeInTheDocument()
    expect(sidebar.queryByRole('button', { name: 'Hero block' })).not.toBeInTheDocument()
  })

  it('saves pages as you edit, switches between them, and reopens the last one after a reload', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    const app = (initial?: ReturnType<typeof createBuilderState>) => (
      <BuilderProvider registry={advuiRegistry} initial={initial}>
        <PageMenu />
        <Canvas />
      </BuilderProvider>
    )
    const first = render(app(createBuilderState(advuiRegistry, 'Button', { mode: 'page' })))
    await user.click(screen.getByRole('button', { name: 'Add Card' }))

    await user.click(screen.getByRole('button', { name: 'Pages: Untitled page' }))
    await user.clear(screen.getByRole('textbox', { name: 'Page name' }))
    await user.type(screen.getByRole('textbox', { name: 'Page name' }), 'Landing{Enter}')
    expect(screen.getByRole('button', { name: 'Pages: Landing' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New page' }))
    expect(screen.getByRole('button', { name: 'Pages: Untitled page' })).toBeInTheDocument()
    expect(screen.queryByTestId('node-card')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Add Badge' }))

    await user.click(screen.getByRole('button', { name: 'Pages: Untitled page' }))
    const saved = within(screen.getByRole('list', { name: 'Saved pages' }))
    expect(saved.getAllByRole('listitem')).toHaveLength(2)
    await user.click(saved.getByRole('button', { name: /^Landing/ }))
    expect(screen.getByTestId('node-card')).toBeInTheDocument()
    expect(screen.queryByTestId('node-badge')).not.toBeInTheDocument()

    first.unmount()
    render(app())
    expect(screen.getByRole('button', { name: 'Pages: Landing' })).toBeInTheDocument()
    expect(screen.getByTestId('node-card')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Pages: Landing' }))
    await user.click(screen.getByRole('button', { name: 'Delete Untitled page' }))
    expect(screen.getByText(/Delete “Untitled page”\?/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(within(screen.getByRole('list', { name: 'Saved pages' })).getAllByRole('listitem')).toHaveLength(1)
    expect(screen.getByTestId('node-card')).toBeInTheDocument()
  })

  it('writes the page as a component file from its settings, and moves pages through files', async () => {
    const user = userEvent.setup()
    localStorage.clear()
    // jsdom has no object URLs; the download link is caught before it navigates.
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:page')
    Object.assign(URL, { createObjectURL, revokeObjectURL: vi.fn() })
    const downloads: string[] = []
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      downloads.push(this.download)
    })
    const downloaded = (index: number) => createObjectURL.mock.calls[index][0].text()
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Button', { mode: 'page' })}>
        <PageMenu />
        <Canvas />
        <CodePanel />
      </BuilderProvider>,
    )
    const code = () => screen.getByRole('region', { name: 'Generated code' })
    await user.click(screen.getByRole('button', { name: 'Add Badge' }))
    expect(within(code()).getByText('UntitledPage.tsx')).toBeInTheDocument()
    expect(code()).toHaveTextContent('export function UntitledPage()')

    await user.click(screen.getByRole('button', { name: 'Pages: Untitled page' }))
    await user.click(screen.getByText('Page settings'))
    await user.type(screen.getByRole('textbox', { name: 'Component name' }), 'home screen{Enter}')
    expect(screen.getByRole('textbox', { name: 'Component name' })).toHaveValue('HomeScreen')
    await user.type(screen.getByRole('textbox', { name: 'Title' }), 'Welcome{Enter}')
    expect(code()).toHaveTextContent('export function HomeScreen()')
    expect(code()).toHaveTextContent('<title>Welcome</title>')

    await user.click(within(code()).getByRole('button', { name: 'Download' }))
    expect(downloads).toEqual(['HomeScreen.tsx'])
    expect(await downloaded(0)).toContain('export function HomeScreen() {')

    await user.click(screen.getByRole('button', { name: 'Pages: Untitled page' }))
    await user.click(screen.getByRole('button', { name: 'Export' }))
    expect(downloads[1]).toBe('untitled-page.page.json')
    const file = await downloaded(1)
    expect(JSON.parse(file)).toMatchObject({
      format: 'advui-builder.page',
      name: 'Untitled page',
      settings: { component: 'HomeScreen', title: 'Welcome' },
    })

    // Importing opens the file as a new page, settings included.
    await user.upload(screen.getByLabelText('Page file'), new File([file], 'untitled-page.page.json'))
    expect(await screen.findByRole('button', { name: 'Pages: Untitled page 2' })).toBeInTheDocument()
    expect(screen.getByTestId('node-badge')).toBeInTheDocument()
    expect(code()).toHaveTextContent('export function HomeScreen()')

    await user.click(screen.getByRole('button', { name: 'Pages: Untitled page 2' }))
    await user.upload(screen.getByLabelText('Page file'), new File(['{"notes": []}'], 'notes.json'))
    expect(await screen.findByRole('alert')).toHaveTextContent('This file isn’t an AdvUI Builder page.')
    expect(within(screen.getByRole('list', { name: 'Saved pages' })).getAllByRole('listitem')).toHaveLength(2)
    click.mockRestore()
  })
})

describe('large pages', () => {
  it('re-renders only the edited layer and its ancestors on the canvas', async () => {
    const user = userEvent.setup()
    const rendered: ConfigNode[] = []
    const countingRender = (node: ConfigNode, children: ReactNode) => {
      rendered.push(node)
      return renderNode(node, children)
    }
    function Edit() {
      const actions = useBuilderActions()
      return (
        <>
          <button type="button" onClick={() => actions.setText('card-title', 'Renamed')}>
            Rename title
          </button>
          <ElementTree node={useBuilderState().document} renderNode={countingRender} />
        </>
      )
    }
    render(
      <BuilderProvider registry={advuiRegistry} initial={createBuilderState(advuiRegistry, 'Card')} persist={false}>
        <Edit />
      </BuilderProvider>,
    )
    expect(rendered.map((node) => node.id)).toContain('card-button')

    rendered.length = 0
    await user.click(screen.getByRole('button', { name: 'Rename title' }))
    expect(rendered.find((node) => node.id === 'card-title')?.text).toBe('Renamed')
    expect(rendered.map((node) => node.id).sort()).toEqual(['card', 'card-header', 'card-title'])
  })
})
