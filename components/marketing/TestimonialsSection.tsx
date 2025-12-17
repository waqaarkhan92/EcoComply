'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      "We went from 40-hour audit prep to 2 hours. The AI extraction found obligations we'd been missing for years. We passed our EA inspection with flying colours.",
    author: 'Sarah Thompson',
    role: 'Operations Director',
    company: 'Midlands Waste Solutions',
    image: null,
    rating: 5,
    highlight: '40 hours → 2 hours',
  },
  {
    quote:
      "As a consultant managing 15 client sites, EcoComply has transformed my practice. I can now offer proactive compliance monitoring instead of reactive firefighting.",
    author: 'James Mitchell',
    role: 'Environmental Consultant',
    company: 'GreenPath Consulting',
    image: null,
    rating: 5,
    highlight: '15 sites managed',
  },
  {
    quote:
      "The audit pack generation alone saves us £5,000 per year in consultant fees. The system paid for itself in the first month.",
    author: 'David Chen',
    role: 'Facility Manager',
    company: 'EcoProcess Manufacturing',
    image: null,
    rating: 5,
    highlight: '£5,000 saved yearly',
  },
];

const stats = [
  { value: '500%', label: 'Average ROI' },
  { value: '15+', label: 'Hours saved weekly' },
  { value: '98%', label: 'Customer satisfaction' },
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
          <span className="inline-block text-primary font-medium mb-4">Customer Stories</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold text-charcoal mb-6">
            Trusted by UK environmental operators
          </h2>
          <p className="text-lg text-text-secondary">
            See how waste facilities, manufacturers, and environmental consultants are transforming
            their compliance operations with EcoComply.
          </p>
        </motion.div>

        {/* Testimonials Grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-gray-50 rounded-2xl p-8 relative"
            >
              {/* Quote Icon */}
              <div className="absolute top-6 right-6">
                <Quote className="w-8 h-8 text-primary-100" />
              </div>

              {/* Highlight Badge */}
              <div className="inline-flex items-center gap-1 bg-primary-100 text-primary-dark px-3 py-1 rounded-full text-sm font-medium mb-4">
                {testimonial.highlight}
              </div>

              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {Array.from({ length: testimonial.rating }).map((_, j) => (
                  <Star key={j} className="w-5 h-5 text-warning fill-warning" />
                ))}
              </div>

              {/* Quote */}
              <blockquote className="text-charcoal mb-6 leading-relaxed">
                "{testimonial.quote}"
              </blockquote>

              {/* Author */}
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary-200 rounded-full flex items-center justify-center text-primary font-semibold">
                  {testimonial.author
                    .split(' ')
                    .map((n) => n[0])
                    .join('')}
                </div>
                <div>
                  <div className="font-semibold text-charcoal">{testimonial.author}</div>
                  <div className="text-sm text-text-secondary">
                    {testimonial.role}, {testimonial.company}
                  </div>
                </div>
              </div>
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
