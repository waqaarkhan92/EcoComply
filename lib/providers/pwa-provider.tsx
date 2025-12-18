/**
 * PWA Provider
 * Registers service worker and handles PWA lifecycle
 * Reference: docs/specs/61_Frontend_Routes_Components.md Section 19-20
 */

'use client';

import { useEffect, useState } from 'react';
import { registerServiceWorker, skipWaiting } from '@/lib/pwa/register-service-worker';
import { toast } from 'sonner';

export function PWAProvider({ children }: { children: React.ReactNode }) {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    // Register service worker with callbacks
    registerServiceWorker({
      onSuccess: (registration) => {
        console.log('PWA ready for offline use');
      },
      onUpdate: (registration) => {
        setUpdateAvailable(true);
        // Show update notification
        toast.info('Update available', {
          description: 'A new version of EcoComply is available',
          action: {
            label: 'Update',
            onClick: () => {
              skipWaiting();
              window.location.reload();
            },
          },
          duration: Infinity,
        });
      },
      onError: (error) => {
        console.error('Service worker registration failed:', error);
      },
    });

    // Listen for service worker updates
    const handleUpdate = () => {
      setUpdateAvailable(true);
    };

    window.addEventListener('sw-update-available', handleUpdate);

    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  return <>{children}</>;
}

