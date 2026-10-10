import type { PropMetadata } from './metadata'

export const backgroundProp: PropMetadata = {
  key: 'backgroundColor',
  type: 'color',
  label: 'Background',
  description: 'Tamagui style prop passed through to the component.',
  group: 'appearance',
}

export const borderColorProp: PropMetadata = {
  key: 'borderColor',
  type: 'color',
  label: 'Border',
  group: 'appearance',
}

export const radiusProp: PropMetadata = {
  key: 'borderRadius',
  type: 'radius',
  label: 'Radius',
  group: 'appearance',
}

export const colorProp: PropMetadata = {
  key: 'color',
  type: 'color',
  label: 'Color',
  description: 'Overrides the semantic tone when set.',
  group: 'appearance',
}

export const opacityProp: PropMetadata = {
  key: 'opacity',
  type: 'number',
  label: 'Opacity',
  group: 'appearance',
  min: 0,
  max: 1,
  step: 0.05,
}

export const paddingProp: PropMetadata = {
  key: 'padding',
  type: 'spacing',
  label: 'Padding',
  group: 'layout',
  min: 0,
  max: 64,
  step: 1,
}

export const marginProp: PropMetadata = {
  key: 'margin',
  type: 'spacing',
  label: 'Margin',
  group: 'layout',
  min: 0,
  max: 64,
  step: 1,
}

export const flexProp: PropMetadata = {
  key: 'flex',
  type: 'number',
  label: 'Flex',
  description: 'Share of the free space in the parent stack.',
  group: 'layout',
  min: 0,
  max: 12,
  step: 1,
}

export const gapProp: PropMetadata = {
  key: 'gap',
  type: 'spacing',
  label: 'Gap',
  group: 'layout',
  min: 0,
  max: 48,
  step: 1,
}

export const textAlignProp: PropMetadata = {
  key: 'textAlign',
  type: 'select',
  label: 'Alignment',
  group: 'typography',
  options: [
    { label: 'Left', value: 'left' },
    { label: 'Center', value: 'center' },
    { label: 'Right', value: 'right' },
  ],
}

export const widthProp: PropMetadata = {
  key: 'width',
  type: 'string',
  label: 'Width',
  description: 'CSS length or percentage. View style prop.',
  group: 'layout',
}

export const heightProp: PropMetadata = {
  key: 'height',
  type: 'string',
  label: 'Height',
  group: 'layout',
}

/** Text, Heading and Card.Title share these AdvUI typography props. */
export function typographyProps(defaults?: { size?: string; weight?: string; tone?: string }): PropMetadata[] {
  return [
    {
      key: 'typography',
      type: 'typography',
      label: 'Typography',
      group: 'typography',
      fields: ['size', 'weight', 'tone'],
      description: 'Maps to AdvUI Text `size`, `weight` and `tone`.',
    },
    {
      key: 'size',
      type: 'select',
      label: 'Font size',
      group: 'typography',
      defaultValue: defaults?.size ?? 'base',
      options: ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      key: 'weight',
      type: 'select',
      label: 'Font weight',
      group: 'typography',
      defaultValue: defaults?.weight,
      options: ['normal', 'medium', 'semibold', 'bold'].map((value) => ({
        label: value,
        value,
      })),
    },
    {
      key: 'tone',
      type: 'select',
      label: 'Tone',
      group: 'typography',
      defaultValue: defaults?.tone,
      options: ['default', 'muted', 'primary', 'success', 'warning', 'error', 'info', 'inherit'].map((value) => ({
        label: value,
        value,
      })),
    },
    textAlignProp,
    colorProp,
  ]
}

/**
 * A control's accessible name, for a control on its own. Inside a Field it stays empty: the field names the control
 * from its label, and an `aria-label` would override that.
 */
export const ariaLabelProp: PropMetadata = {
  key: 'aria-label',
  type: 'string',
  label: 'Aria Label',
  description: 'Names the control for screen readers. Leave it empty inside a Field, which names it from its label.',
  group: 'advanced',
}
