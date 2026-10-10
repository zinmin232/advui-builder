import { useId, useState } from 'react'
import type { BlockEntry } from '../../registry/registry'
import { useDragSource } from '../dnd/BuilderDnd'
import { canDrop } from '../selection/selection'
import { blockPlacement } from '../state/builderState'
import { useBuilderActions, useBuilderState, useRegistry } from '../state/BuilderProvider'

/**
 * Ready-made page parts from the registry (a navbar, a hero). Click one to add it below the selected section, or
 * drag it onto the canvas or the Layers tree. Shown only when the registry defines blocks that match the search.
 */
export function BlockPalette({ blocks }: { blocks: readonly BlockEntry[] }) {
  const registry = useRegistry()
  const state = useBuilderState()
  const actions = useBuilderActions()
  const [open, setOpen] = useState(true)
  if (blocks.length === 0) return null
  const placement = blockPlacement(registry, state)
  const where =
    placement == null
      ? null
      : placement.position === 'inside'
        ? `inside ${placement.label}`
        : `below ${placement.label}`

  return (
    <section className="component-group">
      <h2>
        <button type="button" className="group-toggle" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
          <span aria-hidden="true">{open ? '▾' : '▸'}</span>
          Blocks
        </button>
      </h2>
      {open ? (
        <ul className="block-list">
          {blocks.map((block) => {
            const canInsert =
              placement != null &&
              canDrop(registry, state.document, block.component, placement.targetId, placement.position)
            const hint =
              where == null
                ? 'Select a layer that can hold components, or drag onto the canvas'
                : canInsert
                  ? `Add ${where}`
                  : `A ${block.name} cannot go ${where}`
            return (
              <li key={block.id}>
                <BlockItem
                  block={block}
                  disabled={!canInsert}
                  hint={hint}
                  onInsert={() => actions.insertBlock(block.id)}
                />
              </li>
            )
          })}
        </ul>
      ) : null}
    </section>
  )
}

function BlockItem({
  block,
  disabled,
  hint,
  onInsert,
}: {
  block: BlockEntry
  disabled: boolean
  hint: string
  onInsert: () => void
}) {
  const descriptionId = useId()
  const { setNodeRef, listeners, attributes } = useDragSource(`block:${block.id}`, {
    kind: 'block',
    block: block.id,
    component: block.component,
    label: block.name,
  })
  // Not `disabled`: a disabled button gets no pointer events, and the block can still be dragged.
  return (
    <button
      ref={setNodeRef}
      type="button"
      className="block-item"
      {...attributes}
      {...listeners}
      aria-label={`${block.name} block`}
      aria-describedby={descriptionId}
      aria-disabled={disabled || undefined}
      title={hint}
      onClick={() => {
        if (!disabled) onInsert()
      }}
    >
      <span className="block-name">{block.name}</span>
      <span className="block-description" id={descriptionId}>
        {block.description}
      </span>
    </button>
  )
}
