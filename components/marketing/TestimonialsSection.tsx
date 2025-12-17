'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
// Icons removed - using emoji for simplicity

// Expected outcomes based on platform capabilities
const expectedOutcomes = [
  {
    title: 'Faster Audit Preparation',
    description:
      'Generate complete audit packs in minutes instead of days. All obligations, evidence, and compliance status in one document.',
    highlight: '95% faster',
    icon: '📋',
  },
  {
    title: 'Never Miss a Deadline',
    description:
      'Automated reminders and calendar integration ensure you stay ahead of every permit condition and reporting requirement.',
    highlight: 'Zero missed deadlines',
    icon: '⏰',
  },
  {
    title: 'Instant Permit Analysis',
    description:
      'AI extracts all obligations from your environmental permits in 60 seconds. No more manual review or hidden requirements.',
    highlight: '60-second extraction',
    icon: '🔍',
  },
];

const stats = [
  { value: '60s', label: 'Permit extraction' },
  { value: '15+', label: 'Hours saved weekly' },
  { value: '100%', label: 'Obligations captured' },
  { value: '0', label: 'Missed deadlines' },
];

export function TestimonialsSection() {
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
          <span className="inline-block text-primary font-medium mb-4">What You Can Achieve</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            Transform your compliance operations
          </h2>
          <p className="text-lg text-text-secondary">
            EcoComply helps waste facilities, manufacturers, and environmental consultants
            streamline their compliance workflows and stay ahead of regulations.
          </p>
        </motion.div>

        {/* Outcomes Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {expectedOutcomes.map((outcome, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-gray-50 rounded-2xl p-8 relative"
            >
              {/* Icon */}
              <div className="text-4xl mb-4" aria-hidden="true">
                {outcome.icon}
              </div>

              {/* Highlight Badge */}
              <div className="inline-flex items-center gap-1 bg-primary-100 text-primary-dark px-3 py-1 rounded-full text-sm font-medium mb-4">
                {outcome.highlight}
              </div>

              {/* Title */}
              <h3 className="text-xl font-semibold text-charcoal mb-3">
                {outcome.title}
              </h3>

              {/* Description */}
              <p className="text-text-secondary leading-relaxed">
                {outcome.description}
              </p>
            </motion.div>
          ))}
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-charcoal rounded-2xl p-8 lg:p-12"
        >
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-gray-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
