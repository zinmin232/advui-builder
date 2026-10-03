import { Builder } from '../builder/Builder'
import { BuilderProvider } from '../builder/state/BuilderProvider'

export function App() {
  return (
    <BuilderProvider>
      <Builder />
    </BuilderProvider>
  )
}
