import { Alert, AlertDialog, AspectRatio, Avatar, Badge, Button, Card, Checkbox, Chip, Container, DropdownMenu, EmptyState, Grid, Image, Input, Label, List, NumberInput, Pagination, PasswordInput, Progress, RadioGroup, ScrollArea, Search, Select, Separator, Skeleton, Slider, Spinner, Stack, Switch, Tabs, Text, Textarea, Toaster, Tooltip, UniversalProvider, createUniversalConfig, toast } from '@advui/core'
import { useEffect, useRef, type ReactNode } from 'react'
import { resolveProps } from '../../registry/componentRegistry'
import type { ConfigNode, PlatformId } from '../../registry/metadata'
import { getMeta } from '../../registry/componentRegistry'

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
  ScrollArea: asView(ScrollArea),
  Stack: asView(Stack),
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
}

const directChildHosts = new Set([
  'Tooltip',
  'DropdownMenu.Trigger',
  'AlertDialog.Cancel',
  'AlertDialog.Action',
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

function ToastPreview({ node, platform }: { node: ConfigNode; platform: PlatformId }) {
  const meta = getMeta('Toast')
  const props = resolveProps(meta, node.props, platform)
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

function renderSelectItem(child: ConfigNode, platform: PlatformId): ReactNode {
  if (child.component !== 'Select.Item') return null
  const props = resolveProps(getMeta('Select.Item'), child.props, platform)
  const value = typeof props.value === 'string' ? props.value : ''
  return (
    <Select.Item key={child.id} value={value} disabled={props.disabled === true}>
      {child.text}
    </Select.Item>
  )
}

export function renderAdvuiNode(node: ConfigNode, children: ReactNode, platform: PlatformId) {
  if (node.component === 'Toast') return <ToastPreview node={node} platform={platform} />
  const View = views[node.component]
  if (!View) return null
  const meta = getMeta(node.component)
  const props = {
    ...(meta.staticProps ?? {}),
    ...resolveProps(meta, node.props, platform),
  }
  // Select matches option elements by type, so items cannot sit inside the selection wrapper.
  if (node.component === 'Select') {
    return <View {...props}>{node.children.map((child) => renderSelectItem(child, platform))}</View>
  }
  // Tooltip and the menu trigger clone one element. The selection wrapper cannot sit between them.
  if (directChildHosts.has(node.component)) {
    const child = node.children[0]
    const only = child ? renderAdvuiNode(child, [], platform) : null
    if (!only) return <View {...props} />
    return <View {...props}>{only}</View>
  }
  const hasBody = Boolean(node.text) || node.children.length > 0
  if (!hasBody) return <View {...props} />
  return (
    <View {...props}>
      {node.text}
      {children}
    </View>
  )
}
