'use client';

import dynamic from 'next/dynamic';
import { ComponentLoadingSpinner } from '@/components/ui/loading-skeletons';

// Lazy load the Consent State Machine component
const ConsentStateMachine = dynamic(() => import('./ConsentStateMachine').then(mod => ({ default: mod.ConsentStateMachine })), {
  loading: () => (
    <div className="bg-white rounded-lg shadow-md p-6">
      <ComponentLoadingSpinner />
    </div>
  ),
  ssr: false,
});

export default ConsentStateMachine;
