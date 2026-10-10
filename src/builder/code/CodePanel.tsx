import { useState } from 'react'
import { writeToClipboard } from '../clipboard'
import { downloadFile } from '../download'
import { exportName } from '../pages/pageFile'
import { generateCode, type ComponentFile } from './codeGenerator'
import { useBuilderActions, useBuilderState, usePages, useRegistry } from '../state/BuilderProvider'

export function CodePanel() {
  const state = useBuilderState()
  const actions = useBuilderActions()
  const registry = useRegistry()
  const { current } = usePages()
  // A page is a whole file (`HomePage.tsx`); a component is a snippet to paste.
  const file: ComponentFile | undefined =
    state.mode === 'page'
      ? { name: exportName(current), title: current?.settings?.title, description: current?.settings?.description }
      : undefined
  const code = generateCode(state.document, { registry, platform: state.platform, file })
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
        {file ? <span className="code-file">{file.name}.tsx</span> : null}
        <div className="code-actions">
          <button type="button" className="text-btn" onClick={() => actions.reset()}>
            Reset
          </button>
          {file ? (
            <button
              type="button"
              className="text-btn"
              title={`Download ${file.name}.tsx`}
              onClick={() => downloadFile(`${file.name}.tsx`, code, 'text/plain')}
            >
              Download
            </button>
          ) : null}
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
