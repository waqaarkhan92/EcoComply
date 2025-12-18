'use client';

import dynamic from 'next/dynamic';

// Lazy load the Onboarding Tour component with framer-motion
const OnboardingTour = dynamic(() => import('./onboarding-tour').then(mod => ({ default: mod.OnboardingTour })), {
  loading: () => null, // Don't show loading state for tour
  ssr: false, // Client-side only
});

export default OnboardingTour;
export { useOnboardingTour, DASHBOARD_TOUR_STEPS } from './onboarding-tour';
