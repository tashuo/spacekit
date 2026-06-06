import { createRoot } from 'react-dom/client'
import '@/assets/tailwind.css'
import { App } from '@/entrypoints/app/App'

createRoot(document.getElementById('root')!).render(<App />)
