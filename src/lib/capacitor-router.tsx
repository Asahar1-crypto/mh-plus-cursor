/**
 * Smart Router for Capacitor + Web
 * Uses BrowserRouter on web, MemoryRouter on native platforms
 * to avoid issues with file:// protocol and custom schemes
 */
import React from 'react';
import { BrowserRouter, MemoryRouter } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

interface AppRouterProps {
  children: React.ReactNode;
}

export const AppRouter: React.FC<AppRouterProps> = ({ children }) => {
  // On native platforms, use MemoryRouter to avoid URL scheme issues
  if (Capacitor.isNativePlatform()) {
    return (
      <MemoryRouter initialEntries={['/']}>
        {children}
      </MemoryRouter>
    );
  }

  // On web, use standard BrowserRouter
  return (
    <BrowserRouter>
      {children}
    </BrowserRouter>
  );
};
