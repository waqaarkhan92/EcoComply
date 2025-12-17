'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef, useState } from 'react';
import { ChevronDown, MessageCircle } from 'lucide-react';
import Link from 'next/link';

const faqs = [
  {
    question: 'How does the AI extraction work?',
    answer:
      "When you upload a permit PDF, our AI reads every page and identifies all obligations, conditions, and requirements. It extracts monitoring frequencies, reporting deadlines, and specific conditions in under 60 seconds. For scanned documents, we use OCR first. The system flags any subjective requirements for your manual review to ensure nothing is missed.",
  },
  {
    question: 'What types of permits does EcoComply support?',
    answer:
      'We support all UK environmental permits including Environment Agency (EA) permits, SEPA permits, Natural Resources Wales (NRW) permits, local authority permits, trade effluent consents, MCPD registrations, and hazardous waste registrations. If you have a permit type we don\'t yet support, contact us and we\'ll add it.',
  },
  {
    question: 'Can I try EcoComply before committing?',
    answer:
      'Yes! We offer a 14-day free trial with full access to all features. No credit card required to start. You can upload your actual permits and see the AI extraction in action. Most customers see the value within the first hour of use.',
  },
  {
    question: 'Is my data secure?',
    answer:
      'Absolutely. All data is stored in UK data centres with enterprise-grade encryption at rest and in transit. We\'re fully GDPR compliant with regular security audits. Your permit data is never shared with third parties or used to train AI models. We can sign a DPA if required.',
  },
  {
    question: 'How long does implementation take?',
    answer:
      'Most customers are up and running within an hour. Simply sign up, upload your first permit, review the extracted obligations, and you\'re done. No IT involvement required, no complex integrations, no lengthy onboarding. For consultants managing multiple clients, we offer a guided onboarding session.',
  },
  {
    question: 'What if the AI makes a mistake?',
    answer:
      'Our AI is highly accurate, but we always recommend a human review of extracted obligations. The system flags subjective or ambiguous requirements for your attention. You can easily edit, add, or remove obligations after extraction. All changes are logged in the audit trail.',
  },
  {
    question: 'Can I manage multiple sites?',
    answer:
      'Yes! All plans support multi-site management. You can switch between sites from the dashboard, see consolidated compliance views across all sites, and generate board packs that summarise multi-site performance. Additional sites are £99/month each.',
  },
  {
    question: 'Do you offer support?',
    answer:
      'Yes. All plans include email support with responses within 24 hours on business days. Growth plan customers get priority support with 4-hour response times. Consultant plan customers get a dedicated success manager and phone support.',
  },
  {
    question: 'What\'s the difference between the pack types?',
    answer:
      'Regulator Pack is formatted for EA inspectors with evidence organised by condition. Audit Pack is for internal compliance audits. Tender Pack demonstrates compliance to prospective clients. Board Pack summarises multi-site risk for directors. Insurer Pack provides risk narrative for insurance renewals.',
  },
  {
    question: 'Can I cancel anytime?',
    answer:
      'Yes. There are no long-term contracts. You can cancel your subscription at any time from your account settings. If you cancel, you\'ll retain access until the end of your current billing period. We also offer a 30-day money-back guarantee if you\'re not satisfied.',
  },
];

export function FAQSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-white relative overflow-hidden">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <span className="inline-block text-primary font-medium mb-4">FAQ</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            Frequently asked questions
          </h2>
          <p className="text-lg text-text-secondary">
            Everything you need to know about EcoComply. Can't find what you're looking for?{' '}
            <Link href="/contact" className="text-primary hover:underline">
              Get in touch
            </Link>
            .
          </p>
        </motion.div>

        {/* FAQ List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="space-y-4"
        >
          {faqs.map((faq, i) => (
            <div
              key={i}
              className="bg-gray-50 rounded-xl overflow-hidden border border-gray-100"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
              >
                <span className="font-medium text-charcoal">{faq.question}</span>
                <ChevronDown
                  className={`w-5 h-5 text-text-secondary transition-transform flex-shrink-0 ${
                    openIndex === i ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {openIndex === i && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-6 pb-5"
                >
                  <p className="text-text-secondary leading-relaxed">{faq.answer}</p>
                </motion.div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Contact CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mt-12 bg-primary-100 rounded-2xl p-8 text-center"
        >
          <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
            <MessageCircle className="w-6 h-6 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-charcoal mb-2">Still have questions?</h3>
          <p className="text-text-secondary mb-4">
            Can't find the answer you're looking for? Our team is here to help.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg font-medium transition-all"
          >
            Contact Support
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
