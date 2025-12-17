'use client';

import { motion } from 'framer-motion';
import { useInView } from 'framer-motion';
import { useRef } from 'react';
import { AlertTriangle, Clock, FileSpreadsheet, PoundSterling } from 'lucide-react';

const problems = [
  {
    icon: FileSpreadsheet,
    stat: '93%',
    title: 'Still using Excel',
    description: 'of UK SMEs manage environmental permits in spreadsheets with no automation or alerts.',
  },
  {
    icon: Clock,
    stat: '15+ hrs',
    title: 'Wasted weekly',
    description: 'spent on manual compliance administration that could be automated.',
  },
  {
    icon: AlertTriangle,
    stat: '37%',
    title: 'Fail first inspection',
    description: 'of businesses fail their first EA inspection due to missing evidence or documentation.',
  },
  {
    icon: PoundSterling,
    stat: '£50k',
    title: 'Average fine risk',
    description: 'for non-compliance. A single missed obligation can trigger enforcement action.',
  },
];

export function ProblemSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  return (
    <section ref={ref} className="py-20 lg:py-32 bg-charcoal text-white relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <span className="inline-block text-danger font-medium mb-4">The Problem</span>
          <h2 className="text-3xl sm:text-4xl lg:text-heading-xl font-bold mb-6">
            Environmental compliance is broken for SMEs
          </h2>
          <p className="text-lg text-gray-400">
            UK businesses hold 47,000+ active environmental permits, each containing 50-200 specific obligations.
            Missing just one can trigger £5k-£50k fines and enforcement action.
          </p>
        </motion.div>

        {/* Problem Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {problems.map((problem, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/20 transition-colors"
            >
              <div className="w-12 h-12 bg-danger/20 rounded-xl flex items-center justify-center mb-4">
                <problem.icon className="w-6 h-6 text-danger" />
              </div>
              <div className="text-4xl font-bold text-white mb-2">{problem.stat}</div>
              <h3 className="text-lg font-semibold text-white mb-2">{problem.title}</h3>
              <p className="text-gray-400 text-sm">{problem.description}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom - Industry Reality */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <p className="text-xl lg:text-2xl text-gray-300 max-w-3xl mx-auto">
            Environmental permits can contain 50+ obligations spread across hundreds of pages.
            Missing just one requirement can result in enforcement action.
          </p>
          <div className="mt-4 text-gray-500">
            EcoComply extracts every obligation automatically in under 60 seconds.
          </div>
        </motion.div>
      </div>
    </section>
  );
}
