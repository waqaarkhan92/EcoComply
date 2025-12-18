'use client';

import dynamic from 'next/dynamic';
import { ModalSkeleton } from '@/components/ui/loading-skeletons';

// Lazy load the Manual Override Modal
const ManualOverrideModal = dynamic(() => import('./ManualOverrideModal'), {
  loading: () => <ModalSkeleton />,
  ssr: false,
});

export default ManualOverrideModal;
