import { Builder } from '../builder/Builder'
import type { PreviewKit } from '../builder/preview/previewKit'
import { BuilderProvider } from '../builder/state/BuilderProvider'
import { advuiRegistry } from '../registry/componentRegistry'

// AdvUI, Tamagui and React Native Web arrive with the preview, after the panels have rendered.
function loadAdvuiPreview(): Promise<PreviewKit> {
  return import('../builder/preview/AdvuiPreview').then((module) => module.advuiPreview)
}

export function App() {
  return (
    <BuilderProvider registry={advuiRegistry}>
      <Builder loadPreview={loadAdvuiPreview} />
    </BuilderProvider>
  )
}
