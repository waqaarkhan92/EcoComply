'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { Check, X, HelpCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

const plans = [
  {
    name: 'Core',
    description: 'For single-site operators getting started with compliance automation',
    price: 149,
    period: 'per site/month',
    popular: false,
    cta: 'Start Free Trial',
    features: [
      { name: 'AI permit extraction', included: true },
      { name: '1 permit included', included: true },
      { name: 'Unlimited users', included: true },
      { name: 'Unlimited evidence uploads', included: true },
      { name: 'Deadline automation', included: true },
      { name: 'Compliance dashboard', included: true },
      { name: 'Regulator Pack', included: true },
      { name: 'Audit Pack', included: true },
      { name: 'Tender Pack', included: false },
      { name: 'Board Pack', included: false },
      { name: 'Insurer Pack', included: false },
      { name: 'Secure sharing links', included: false },
    ],
  },
  {
    name: 'Growth',
    description: 'For growing operations needing advanced pack types and sharing',
    price: 249,
    period: 'per site/month',
    popular: true,
    cta: 'Start Free Trial',
    features: [
      { name: 'AI permit extraction', included: true },
      { name: '1 permit included', included: true },
      { name: 'Unlimited users', included: true },
      { name: 'Unlimited evidence uploads', included: true },
      { name: 'Deadline automation', included: true },
      { name: 'Compliance dashboard', included: true },
      { name: 'Regulator Pack', included: true },
      { name: 'Audit Pack', included: true },
      { name: 'Tender Pack', included: true },
      { name: 'Board Pack', included: true },
      { name: 'Insurer Pack', included: true },
      { name: 'Secure sharing links', included: true },
    ],
  },
  {
    name: 'Consultant',
    description: 'For environmental consultants managing multiple client sites',
    price: 299,
    period: 'per month',
    popular: false,
    cta: 'Contact Sales',
    features: [
      { name: 'Everything in Growth', included: true },
      { name: 'Multi-client dashboard', included: true },
      { name: 'White-label reports', included: true },
      { name: 'Client billing integration', included: true },
      { name: 'Priority support', included: true },
      { name: 'Dedicated success manager', included: true },
      { name: 'Custom onboarding', included: true },
      { name: 'API access', included: true },
    ],
  },
];

const addons = [
  { name: 'Additional permit', price: 49, unit: '/month' },
  { name: 'Additional site', price: 99, unit: '/month' },
  { name: 'Module 2: Trade Effluent', price: 59, unit: '/site/month' },
  { name: 'Module 3: MCPD/Generators', price: 79, unit: '/company/month' },
  { name: 'Module 4: Hazardous Waste', price: 87.5, unit: '/site/month' },
];

export function PricingSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [showAnnual, setShowAnnual] = useState(false);

  return (
    <section ref={ref} id="pricing" className="py-20 lg:py-32 bg-gray-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-12"
        >
          <span className="inline-block text-primary font-medium mb-4">Pricing</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            Simple, transparent pricing
          </h2>
          <p className="text-lg text-text-secondary mb-8">
            94% cheaper than enterprise solutions. No hidden fees, no long-term contracts.
            Start with a 14-day free trial.
          </p>

          {/* Billing Toggle */}
          <div className="inline-flex items-center gap-4 bg-white rounded-full p-1.5 shadow-sm border border-gray-100">
            <button
              onClick={() => setShowAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                !showAnnual ? 'bg-primary text-white' : 'text-text-secondary hover:text-charcoal'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setShowAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                showAnnual ? 'bg-primary text-white' : 'text-text-secondary hover:text-charcoal'
              }`}
            >
              Annual
              <span className="ml-1 text-xs text-success">Save 20%</span>
            </button>
          </div>
        </motion.div>

        {/* Pricing Cards */}
        <div className="grid lg:grid-cols-3 gap-8 mb-16">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className={`relative bg-white rounded-2xl p-8 ${
                plan.popular
                  ? 'ring-2 ring-primary shadow-xl scale-105'
                  : 'border border-gray-100 shadow-sm'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-primary text-white text-sm font-medium px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <h3 className="text-xl font-bold text-charcoal mb-2">{plan.name}</h3>
                <p className="text-text-secondary text-sm">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-charcoal">
                    £{showAnnual ? Math.round(plan.price * 0.8) : plan.price}
                  </span>
                  <span className="text-text-secondary">/{plan.period}</span>
                </div>
                {showAnnual && (
                  <div className="text-sm text-success mt-1">
                    Save £{Math.round(plan.price * 12 * 0.2)}/year
                  </div>
                )}
              </div>

              {/* CTA */}
              <Link
                href={plan.cta === 'Contact Sales' ? '/contact' : '/signup'}
                className={`block w-full text-center py-3 rounded-lg font-medium transition-all mb-8 ${
                  plan.popular
                    ? 'bg-primary hover:bg-primary-dark text-white hover:shadow-primary-glow'
                    : 'bg-gray-100 hover:bg-gray-200 text-charcoal'
                }`}
              >
                {plan.cta}
              </Link>

              {/* Features */}
              <ul className="space-y-3">
                {plan.features.map((feature, j) => (
                  <li key={j} className="flex items-center gap-3">
                    {feature.included ? (
                      <Check className="w-5 h-5 text-success flex-shrink-0" />
                    ) : (
                      <X className="w-5 h-5 text-gray-300 flex-shrink-0" />
                    )}
                    <span
                      className={feature.included ? 'text-charcoal' : 'text-text-tertiary'}
                    >
                      {feature.name}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Add-ons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white rounded-2xl p-8 border border-gray-100"
        >
          <h3 className="text-xl font-bold text-charcoal mb-6 flex items-center gap-2">
            Add-ons & Modules
            <HelpCircle className="w-5 h-5 text-text-tertiary" />
          </h3>
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {addons.map((addon, i) => (
              <div key={i} className="bg-gray-50 rounded-xl p-4">
                <div className="font-medium text-charcoal mb-1">{addon.name}</div>
                <div className="text-primary font-semibold">
                  +£{addon.price}
                  <span className="text-text-secondary font-normal text-sm">{addon.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Enterprise CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-12 text-center"
        >
          <p className="text-text-secondary mb-4">
            Need a custom solution for your enterprise or multi-site operation?
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 text-primary hover:text-primary-dark font-medium"
          >
            Contact our sales team
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
