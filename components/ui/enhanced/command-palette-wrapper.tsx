'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { CommandPaletteSkeleton } from '@/components/ui/loading-skeletons';

// Lazy load the heavy Command Palette component
const CommandPalette = dynamic(() => import('./command-palette').then(mod => ({ default: mod.CommandPalette })), {
  loading: () => null, // Don't show loading state for command palette since it's triggered by user
  ssr: false, // Client-side only
});

/**
 * Wrapper component for lazy-loaded Command Palette
 * Listens for the global event to open the palette
 */
export function CommandPaletteWrapper() {
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    // Listen for keyboard shortcut or button click
    const handleOpenPalette = () => {
      setShouldLoad(true);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setShouldLoad(true);
      }
    };

    // Listen for the custom event dispatched from Header
    window.addEventListener('open-command-palette', handleOpenPalette);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('open-command-palette', handleOpenPalette);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Only render the CommandPalette component once it's been triggered
  if (!shouldLoad) {
    return null;
  }

  return <CommandPalette />;
}
