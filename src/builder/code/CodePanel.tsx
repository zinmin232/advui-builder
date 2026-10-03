import { useState } from 'react'
import { writeToClipboard } from '../clipboard'
import { generateCode } from './codeGenerator'
import { useBuilderActions, useBuilderState } from '../state/BuilderProvider'

export function CodePanel() {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const code = generateCode(state.document, state.platform)
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    await writeToClipboard(code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="code-panel" aria-label="Generated code">
      <header>
        <h2>Generated code</h2>
        <div className="code-actions">
          <button type="button" className="text-btn" onClick={() => actions.reset()}>
            Reset
          </button>
          <button type="button" className="text-btn primary" onClick={() => void copy()}>
            {copied ? 'Copied' : 'Copy code'}
          </button>
        </div>
      </header>
      <pre>
        <code>{code}</code>
      </pre>
    </section>
  )
}
