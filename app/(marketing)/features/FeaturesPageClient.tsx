'use client';

import { motion } from 'framer-motion';
import { FeaturesSection } from '@/components/marketing/FeaturesSection';
import { CTASection } from '@/components/marketing/CTASection';

export function FeaturesPageClient() {
  return (
    <>
      {/* Features Hero */}
      <section className="relative pt-32 pb-16 bg-gradient-to-br from-white via-primary-50/30 to-white overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-40">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary-100 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cta-primary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 bg-primary-100 text-primary-dark px-4 py-2 rounded-full text-sm font-medium mb-6">
              Platform Features
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-text-primary mb-6">
              Everything you need for{' '}
              <span className="text-primary">environmental compliance</span>
            </h1>
            <p className="text-lg md:text-xl text-text-secondary max-w-3xl mx-auto">
              From AI-powered permit extraction to automated deadline tracking,
              EcoComply gives your team the tools to stay compliant effortlessly.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features Detail */}
      <FeaturesSection />

      {/* CTA */}
      <CTASection />
    </>
  );
}
