import { Metadata } from 'next';
import { DemoPageClient } from './DemoPageClient';

export const metadata: Metadata = {
  title: 'Book a Demo - See EcoComply in Action',
  description:
    'Schedule a personalized demo of EcoComply. See how AI-powered permit extraction and compliance tracking can save your team 15+ hours per week.',
  openGraph: {
    title: 'Book a Demo - EcoComply',
    description:
      'Get a personalized walkthrough of EcoComply environmental compliance software.',
  },
};

export default function DemoPage() {
  return <DemoPageClient />;
}
