import { Metadata } from 'next';
import { PricingPageClient } from './PricingPageClient';

export const metadata: Metadata = {
  title: 'Pricing - Simple Plans That Scale With Your Business',
  description:
    'EcoComply pricing: Start free, upgrade as you grow. Plans from free to enterprise. No credit card required for trial.',
  openGraph: {
    title: 'EcoComply Pricing - Environmental Compliance Plans',
    description:
      'Simple pricing that scales with your business. Start with a free trial, no credit card required.',
  },
};

export default function PricingPage() {
  return <PricingPageClient />;
}
