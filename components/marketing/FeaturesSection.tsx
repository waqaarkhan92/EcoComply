'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import {
  FileText,
  Search,
  Calendar,
  FolderOpen,
  BarChart3,
  Users,
  Zap,
  CheckCircle2,
} from 'lucide-react';

const features = [
  {
    id: 'extraction',
    icon: Search,
    title: 'AI-Powered Extraction',
    headline: 'Every obligation. Every condition. Automatically.',
    description:
      'Our AI reads your permit PDFs and extracts all obligations in under 60 seconds. No more manual data entry or missing hidden requirements buried on page 47.',
    benefits: [
      'Extracts 50-200 obligations per permit',
      'Handles scanned documents with OCR',
      'Flags subjective requirements for review',
      'Supports all UK permit formats',
    ],
    visual: 'extraction',
  },
  {
    id: 'evidence',
    icon: FolderOpen,
    title: 'Evidence Management',
    headline: 'Link evidence to conditions. Track completeness.',
    description:
      'Upload certificates, test results, and inspection records. Link them directly to specific permit conditions for complete audit traceability.',
    benefits: [
      'Condition-level evidence linking',
      'Automatic completeness scoring',
      'Expiry tracking and renewal alerts',
      'Version history and audit trail',
    ],
    visual: 'evidence',
  },
  {
    id: 'deadlines',
    icon: Calendar,
    title: 'Deadline Automation',
    headline: 'Never miss a deadline. Ever.',
    description:
      'Dynamic scheduling based on your permit requirements. Automatic reminders, escalation workflows, and overdue detection keep you ahead of every deadline.',
    benefits: [
      'Event-based trigger rules',
      'Multi-level escalation workflows',
      'Email and SMS notifications',
      'Calendar integration (iCal)',
    ],
    visual: 'deadlines',
  },
  {
    id: 'packs',
    icon: FileText,
    title: 'Audit Pack Generation',
    headline: 'Regulator-ready packs in 2 minutes.',
    description:
      'Generate 5 types of compliance packs on demand: Regulator, Audit, Tender, Board, and Insurer packs. Complete with provenance signatures and secure sharing.',
    benefits: [
      '5 pack types for every stakeholder',
      'One-click generation',
      'Secure sharing links',
      'Access logging for compliance',
    ],
    visual: 'packs',
  },
  {
    id: 'dashboard',
    icon: BarChart3,
    title: 'Compliance Dashboard',
    headline: 'Real-time visibility across all sites.',
    description:
      'Traffic light compliance status, site-level scoring, and consolidated views give you instant visibility into your compliance posture.',
    benefits: [
      'Compliance score (0-100) per site',
      'Multi-site consolidated view',
      'Overdue and upcoming views',
      'Activity feed and audit log',
    ],
    visual: 'dashboard',
  },
  {
    id: 'multisite',
    icon: Users,
    title: 'Multi-Site & Multi-User',
    headline: 'Scale across your entire operation.',
    description:
      'Manage unlimited sites and users with role-based permissions. Perfect for operators with multiple facilities or consultants managing client portfolios.',
    benefits: [
      'Unlimited users per site',
      'Role-based access control',
      'Consultant multi-client view',
      'Site-level permissions',
    ],
    visual: 'multisite',
  },
];

export function FeaturesSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [activeFeature, setActiveFeature] = useState('extraction');

  const currentFeature = features.find((f) => f.id === activeFeature) || features[0];

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary font-medium mb-4">Features</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            Everything you need for environmental compliance
          </h2>
          <p className="text-lg text-text-secondary">
            Purpose-built for UK SMEs with environmental permits. No enterprise bloat, no unnecessary
            complexity—just the features you actually need.
          </p>
        </motion.div>

        {/* Feature Tabs - Desktop */}
        <div className="hidden lg:block">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Navigation */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 space-y-2">
                {features.map((feature, i) => (
                  <motion.button
                    key={feature.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={isInView ? { opacity: 1, x: 0 } : {}}
                    transition={{ duration: 0.6, delay: i * 0.1 }}
                    onClick={() => setActiveFeature(feature.id)}
                    aria-selected={activeFeature === feature.id}
                    aria-controls="feature-panel"
                    className={`w-full text-left p-4 rounded-xl transition-all ${
                      activeFeature === feature.id
                        ? 'bg-white shadow-md border-l-4 border-primary'
                        : 'hover:bg-white/50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          activeFeature === feature.id
                            ? 'bg-primary text-white'
                            : 'bg-gray-100 text-text-secondary'
                        }`}
                      >
                        <feature.icon className="w-5 h-5" aria-hidden="true" />
                      </div>
                      <div>
                        <div
                          className={`font-semibold ${
                            activeFeature === feature.id ? 'text-charcoal' : 'text-text-secondary'
                          }`}
                        >
                          {feature.title}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Right Content */}
            <div className="lg:col-span-8">
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100"
                id="feature-panel"
                role="tabpanel"
                aria-label={currentFeature.title}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                    <currentFeature.icon className="w-6 h-6 text-primary" aria-hidden="true" />
                  </div>
                  <Zap className="w-5 h-5 text-primary" aria-hidden="true" />
                </div>

                <h3 className="text-2xl font-bold text-charcoal mb-4">{currentFeature.headline}</h3>
                <p className="text-lg text-text-secondary mb-6">{currentFeature.description}</p>

                <ul className="grid sm:grid-cols-2 gap-3" aria-label="Feature benefits">
                  {currentFeature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-success flex-shrink-0" aria-hidden="true" />
                      <span className="text-charcoal">{benefit}</span>
                    </li>
                  ))}
                </ul>

                {/* Feature Visual Placeholder */}
                <div className="mt-8 bg-gray-50 rounded-xl p-8 border border-gray-100">
                  <div className="aspect-video bg-gradient-to-br from-primary-100 to-cta-primary/10 rounded-lg flex items-center justify-center">
                    <currentFeature.icon className="w-16 h-16 text-primary/30" />
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Feature Cards - Mobile */}
        <div className="lg:hidden grid sm:grid-cols-2 gap-6">
          {features.map((feature, i) => (
            <motion.div
              key={feature.id}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100"
            >
              <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-semibold text-charcoal mb-2">{feature.title}</h3>
              <p className="text-text-secondary text-sm">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
