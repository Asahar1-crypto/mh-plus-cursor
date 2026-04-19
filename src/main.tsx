import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initializeApp } from './lib/capacitor-init';
import { initSentry } from './lib/sentry';

// Initialize Sentry error monitoring BEFORE anything else, so early crashes
// (including capacitor-init failures) are captured. Fire-and-forget — init is
// async but we don't need to block app startup on it.
void initSentry();

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
