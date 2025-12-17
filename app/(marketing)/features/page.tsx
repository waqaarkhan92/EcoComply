import { Metadata } from 'next';
import { FeaturesPageClient } from './FeaturesPageClient';

export const metadata: Metadata = {
  title: 'Features - AI-Powered Environmental Compliance Tools',
  description:
    'Discover EcoComply features: AI permit extraction, obligation tracking, deadline management, evidence linking, and automated audit pack generation.',
  openGraph: {
    title: 'EcoComply Features - Environmental Compliance Tools',
    description:
      'AI-powered permit extraction, obligation tracking, deadline management, and audit pack generation.',
  },
};

export default function FeaturesPage() {
  return <FeaturesPageClient />;
}
