import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApp } from './lib/capacitor-init';

// Initialize Capacitor platform-specific features
initializeApp();

// Do not set RTL direction here as it's already set in the HTML tag
const rootElement = document.getElementById("root");
if (!rootElement) throw new Error('Failed to find the root element');

createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
