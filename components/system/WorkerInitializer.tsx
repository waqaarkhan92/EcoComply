'use client';

/**
 * Worker Initializer Component
 * Automatically calls the init endpoint when the app loads
 * This ensures workers start automatically without manual intervention
 */

import { useEffect } from 'react';

export function WorkerInitializer() {
  useEffect(() => {
    // Call init endpoint to start workers
    fetch('/api/init')
      .then(res => res.json())
      .then(data => {
        console.log('🚀 Workers initialized:', data);
      })
      .catch(err => {
        console.warn('⚠️ Worker initialization check failed:', err.message);
      });
  }, []);

  return null; // This component renders nothing
}
