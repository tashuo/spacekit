import '@/assets/tailwind.css'
import { createRoot, type Root } from 'react-dom/client'
import { Overlay } from '@/components/Overlay'
import { respondToPresencePings } from '@/lib/ext-presence'

export default defineContentScript({
  matches: ['<all_urls>'],
  cssInjectionMode: 'ui',
  async main(ctx) {
    respondToPresencePings()
    const ui = await createShadowRootUi<Root>(ctx, {
      name: 'spacekit-overlay',
      position: 'overlay',
      anchor: 'body',
      onMount: (container) => {
        const app = document.createElement('div')
        container.append(app)
        const root = createRoot(app)
        root.render(<Overlay />)
        return root
      },
      onRemove: (root) => root?.unmount(),
    })
    ui.mount()
  },
})
