import {
  Accordion,
  Alert,
  AlertDialog,
  AspectRatio,
  AutoGrid,
  Avatar,
  Badge,
  Box,
  Breadcrumb,
  Button,
  Card,
  Center,
  Checkbox,
  Chip,
  Container,
  Dialog,
  DropdownMenu,
  EmptyState,
  Field,
  Form,
  Grid,
  Hide,
  HStack,
  Icon,
  Image,
  Input,
  Label,
  List,
  NavigationBar,
  NumberInput,
  Pagination,
  PasswordInput,
  Progress,
  RadioGroup,
  ScrollArea,
  Search,
  Section,
  Select,
  Separator,
  Show,
  Sidebar,
  Skeleton,
  Slider,
  Spacer,
  Spinner,
  Stack,
  Sticky,
  Switch,
  Tabs,
  Text,
  Textarea,
  Toaster,
  Tooltip,
  UniversalProvider,
  VStack,
  Wrap,
  createUniversalConfig,
  toast,
} from '@advui/core'
import { Children, useEffect, useRef, type ReactNode } from 'react'
import type { ConfigNode } from '../../registry/metadata'
import { resolveProps } from '../../registry/registry'
import { inRange } from '../../registry/responsive'
import type { PreviewContext, PreviewKit } from './previewKit'

const config = createUniversalConfig({ preset: 'indigo', radius: 'md' })

type ViewComponent = (props: { children?: ReactNode } & Record<string, unknown>) => ReactNode

function asView(component: unknown): ViewComponent {
  return component as ViewComponent
}

const views: Record<string, ViewComponent> = {
  Button: asView(Button),
  Badge: asView(Badge),
  Input: asView(Input),
  Text: asView(Text),
  Image: asView(Image),
  Card: asView(Card),
  'Card.Header': asView(Card.Header),
  'Card.Title': asView(Card.Title),
  'Card.Description': asView(Card.Description),
  'Card.Content': asView(Card.Content),
  'Card.Footer': asView(Card.Footer),
  AspectRatio: asView(AspectRatio),
  Container: asView(Container),
  Grid: asView(Grid),
  'Grid.Item': asView(Grid.Item),
  AutoGrid: asView(AutoGrid),
  Section: asView(Section),
  Sticky: asView(Sticky),
  Show: asView(Show),
  Hide: asView(Hide),
  ScrollArea: asView(ScrollArea),
  Stack: asView(Stack),
  HStack: asView(HStack),
  VStack: asView(VStack),
  Box: asView(Box),
  Center: asView(Center),
  Spacer: asView(Spacer),
  Wrap: asView(Wrap),
  Label: asView(Label),
  Textarea: asView(Textarea),
  Checkbox: asView(Checkbox),
  Switch: asView(Switch),
  Separator: asView(Separator),
  Select: asView(Select),
  'Select.Item': asView(Select.Item),
  Tabs: asView(Tabs),
  'Tabs.List': asView(Tabs.List),
  'Tabs.Trigger': asView(Tabs.Trigger),
  'Tabs.Content': asView(Tabs.Content),
  Avatar: asView(Avatar),
  Slider: asView(Slider),
  RadioGroup: asView(RadioGroup),
  'RadioGroup.Item': asView(RadioGroup.Item),
  PasswordInput: asView(PasswordInput),
  NumberInput: asView(NumberInput),
  Progress: asView(Progress),
  Spinner: asView(Spinner),
  Skeleton: asView(Skeleton),
  Alert: asView(Alert),
  'Alert.Title': asView(Alert.Title),
  'Alert.Description': asView(Alert.Description),
  EmptyState: asView(EmptyState),
  Search: asView(Search),
  Chip: asView(Chip),
  List: asView(List),
  'List.Item': asView(List.Item),
  Pagination: asView(Pagination),
  AlertDialog: asView(AlertDialog),
  'AlertDialog.Trigger': asView(AlertDialog.Trigger),
  'AlertDialog.Content': asView(AlertDialog.Content),
  'AlertDialog.Header': asView(AlertDialog.Header),
  'AlertDialog.Title': asView(AlertDialog.Title),
  'AlertDialog.Footer': asView(AlertDialog.Footer),
  'AlertDialog.Description': asView(AlertDialog.Description),
  'AlertDialog.Cancel': asView(AlertDialog.Cancel),
  'AlertDialog.Action': asView(AlertDialog.Action),
  Tooltip: asView(Tooltip),
  DropdownMenu: asView(DropdownMenu),
  'DropdownMenu.Trigger': asView(DropdownMenu.Trigger),
  'DropdownMenu.Content': asView(DropdownMenu.Content),
  'DropdownMenu.Label': asView(DropdownMenu.Label),
  'DropdownMenu.Item': asView(DropdownMenu.Item),
  'DropdownMenu.Separator': asView(DropdownMenu.Separator),
  Breadcrumb: asView(Breadcrumb),
  'Breadcrumb.Item': asView(Breadcrumb.Item),
  Accordion: asView(Accordion),
  'Accordion.Item': asView(Accordion.Item),
  'Accordion.Trigger': asView(Accordion.Trigger),
  'Accordion.Content': asView(Accordion.Content),
  Dialog: asView(Dialog),
  'Dialog.Trigger': asView(Dialog.Trigger),
  'Dialog.Content': asView(Dialog.Content),
  'Dialog.Header': asView(Dialog.Header),
  'Dialog.Footer': asView(Dialog.Footer),
  'Dialog.Title': asView(Dialog.Title),
  'Dialog.Description': asView(Dialog.Description),
  'Dialog.Close': asView(Dialog.Close),
  Form: asView(Form),
  'Form.Submit': asView(Form.Submit),
  Field: asView(Field),
  NavigationBar: asView(NavigationBar),
  'NavigationBar.Item': asView(NavigationBar.Item),
  Sidebar: asView(Sidebar),
  'Sidebar.Header': asView(Sidebar.Header),
  'Sidebar.Content': asView(Sidebar.Content),
  'Sidebar.Footer': asView(Sidebar.Footer),
  'Sidebar.Group': asView(Sidebar.Group),
  'Sidebar.Item': asView(Sidebar.Item),
  'Sidebar.Toggle': asView(Sidebar.Toggle),
}

const directChildHosts = new Set([
  'Tooltip',
  'DropdownMenu.Trigger',
  'AlertDialog.Cancel',
  'AlertDialog.Action',
  'Dialog.Trigger',
  'Dialog.Close',
])
let lastPreviewToast = 0

function fireToast(type: string, title: string, description: string, duration: number) {
  const options: { description?: string; duration?: number } = {}
  if (description) options.description = description
  if (duration !== 4000) options.duration = duration
  const data = description || duration !== 4000 ? options : undefined
  if (type === 'success') toast.success(title, data)
  else if (type === 'error') toast.error(title, data)
  else if (type === 'warning') toast.warning(title, data)
  else if (type === 'info') toast.info(title, data)
  else if (type === 'loading') toast.loading(title, data)
  else toast(title, data)
}

function ToastPreview({ node, context }: { node: ConfigNode; context: PreviewContext }) {
  const props = resolveProps(context.registry.get('Toast'), node.props, context.platform, context.screen)
  const title = typeof props.title === 'string' ? props.title : 'Changes saved'
  const description = typeof props.description === 'string' ? props.description : ''
  const type = typeof props.type === 'string' ? props.type : 'success'
  const duration = typeof props.duration === 'number' ? props.duration : 4000
  const label = node.text || 'Show toast'
  const shown = useRef(false)
  useEffect(() => {
    if (shown.current) return
    const now = Date.now()
    if (now - lastPreviewToast < 250) {
      shown.current = true
      return
    }
    shown.current = true
    lastPreviewToast = now
    fireToast(type, title, description, duration)
  }, [description, duration, title, type])
  return (
    <>
      <Toaster />
      <Button onPress={() => fireToast(type, title, description, duration)}>{label}</Button>
    </>
  )
}

export function AdvuiFrame({ theme, children }: { theme: 'light' | 'dark'; children: ReactNode }) {
  return (
    <UniversalProvider config={config} colorMode={theme} toaster={false}>
      {children}
    </UniversalProvider>
  )
}

function renderSelectItem(child: ConfigNode, context: PreviewContext): ReactNode {
  if (child.component !== 'Select.Item') return null
  const props = resolveProps(context.registry.get('Select.Item'), child.props, context.platform, context.screen)
  const value = typeof props.value === 'string' ? props.value : ''
  return (
    <Select.Item key={child.id} value={value} disabled={props.disabled === true}>
      {child.text}
    </Select.Item>
  )
}

/**
 * Grid sizes its Grid.Item children by type, so a cell cannot sit inside a selection wrapper. The Grid draws
 * each cell around the item's layer, and the layer draws a body that fills the cell. The cell lays the body out
 * in a row, so drops between items follow the grid's rows.
 */
function renderGrid(node: ConfigNode, children: ReactNode, props: Record<string, unknown>, context: PreviewContext) {
  const layers = Children.toArray(children)
  if (node.children.length === 0) return <Grid {...props}>{children}</Grid>
  const itemMeta = context.registry.get('Grid.Item')
  return (
    <Grid {...props}>
      {node.children.map((child, index) =>
        child.component === 'Grid.Item' ? (
          <Grid.Item
            key={child.id}
            {...resolveProps(itemMeta, child.props, context.platform, context.screen)}
            flexDirection="row"
          >
            {layers[index]}
          </Grid.Item>
        ) : (
          layers[index]
        ),
      )}
    </Grid>
  )
}

export function renderAdvuiNode(node: ConfigNode, children: ReactNode, context: PreviewContext): ReactNode {
  if (node.component === 'Toast') return <ToastPreview node={node} context={context} />
  const View = views[node.component]
  if (!View) return null
  const meta = context.registry.get(node.component)
  const props: Record<string, unknown> = {
    ...(meta.staticProps ?? {}),
    ...resolveProps(meta, node.props, context.platform, context.screen),
  }
  // Icon props store a name; AdvUI takes the icon element.
  for (const prop of meta.props) {
    const name = props[prop.key]
    if (prop.type === 'icon' && typeof name === 'string' && name) props[prop.key] = <Icon name={name} />
  }
  if (node.component === 'Grid') return renderGrid(node, children, props, context)
  // Show and Hide use media queries, which follow the browser window. The preview decides from its own width.
  if (node.component === 'Show' || node.component === 'Hide') {
    const shown = inRange(context.screen.breakpoint, context.screen.keys, props) === (node.component === 'Show')
    return <Box display={shown ? 'contents' : 'none'}>{children}</Box>
  }
  if (node.component === 'Grid.Item') {
    return (
      <Box flex={1} minWidth={0}>
        {children}
      </Box>
    )
  }
  // Select matches option elements by type, so items cannot sit inside the selection wrapper.
  if (node.component === 'Select') {
    return <View {...props}>{node.children.map((child) => renderSelectItem(child, context))}</View>
  }
  // Tooltip and the menu trigger clone one element. The selection wrapper cannot sit between them.
  if (directChildHosts.has(node.component)) {
    const child = node.children[0]
    const only = child ? renderAdvuiNode(child, [], context) : null
    if (!only) return <View {...props} />
    return <View {...props}>{only}</View>
  }
  // `children` can hold the builder's empty-container slot even when the node has no children.
  const hasLayers = Children.count(children) > 0
  if (!node.text && !hasLayers) return <View {...props} />
  // A lone text goes in as a plain string, as in the generated code: components style string children themselves.
  if (!hasLayers) return <View {...props}>{node.text}</View>
  return (
    <View {...props}>
      {node.text}
      {children}
    </View>
  )
}

/** Renders the AdvUI registry with `@advui/core`. Pairs with `advuiRegistry`. */
export const advuiPreview: PreviewKit = { Frame: AdvuiFrame, renderNode: renderAdvuiNode }
