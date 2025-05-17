
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Set RTL direction for the app
document.documentElement.dir = 'rtl';

createRoot(document.getElementById("root")!).render(<App />);
