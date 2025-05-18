
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Do not set RTL direction here as it's already set in the HTML tag
createRoot(document.getElementById("root")!).render(<App />);
