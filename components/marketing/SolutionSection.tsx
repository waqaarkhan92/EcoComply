'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Upload, Scan, FileCheck, Bell, Package, Shield } from 'lucide-react';

const steps = [
  {
    icon: Upload,
    number: '01',
    title: 'Upload your permit',
    description: 'Drag and drop your PDF permit. We support all UK environmental permit formats including EA, SEPA, and NRW.',
  },
  {
    icon: Scan,
    number: '02',
    title: 'AI extracts obligations',
    description: 'Our AI reads every page and extracts all 50-200 obligations in under 60 seconds. No manual data entry.',
  },
  {
    icon: FileCheck,
    number: '03',
    title: 'Link your evidence',
    description: 'Upload certificates, test results, and inspection records. Link them to specific conditions for complete traceability.',
  },
  {
    icon: Bell,
    number: '04',
    title: 'Get smart alerts',
    description: 'Automated reminders for upcoming deadlines. Escalation workflows ensure nothing falls through the cracks.',
  },
  {
    icon: Package,
    number: '05',
    title: 'Generate audit packs',
    description: 'One-click generation of regulator-ready, audit, tender, board, and insurer packs. Ready in under 2 minutes.',
  },
  {
    icon: Shield,
    number: '06',
    title: 'Stay compliant',
    description: 'Real-time compliance scoring, evidence gap detection, and proactive risk identification keep you audit-ready 24/7.',
  },
];

export function SolutionSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-primary font-medium mb-4">The Solution</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            From permit chaos to compliance clarity in 6 steps
          </h2>
          <p className="text-lg text-text-secondary">
            EcoComply transforms your PDF permits into a living compliance system.
            No more spreadsheets, no more missed deadlines, no more stressful audits.
          </p>
        </motion.div>

        {/* Steps Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="relative group"
            >
              <div className="bg-white rounded-2xl p-8 border border-gray-100 hover:border-primary/30 hover:shadow-lg transition-all h-full">
                {/* Step Number */}
                <div className="absolute -top-3 -left-3 w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center text-sm font-bold">
                  {step.number}
                </div>

                {/* Icon */}
                <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-white transition-colors">
                  <step.icon className="w-7 h-7 text-primary group-hover:text-white transition-colors" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-charcoal mb-3">{step.title}</h3>
                <p className="text-text-secondary">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.7 }}
          className="mt-16 text-center"
        >
          <a
            href="/demo"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-primary-glow"
          >
            See it in action
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </a>
        </motion.div>
      </div>
    </section>
  );
}
