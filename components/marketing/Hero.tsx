'use client';

import Link from 'next/link';
import { motion, Variants } from 'framer-motion';
import { ArrowRight, Play, CheckCircle2, Shield, Clock, FileText, Leaf, Recycle, Factory, Truck } from 'lucide-react';

const stats = [
  { value: '60s', label: 'Obligation extraction' },
  { value: '93%', label: 'SMEs still use Excel' },
  { value: '£50k', label: 'Average fine risk' },
];

const trustedBy = [
  { name: 'EnviroWaste UK', icon: Recycle },
  { name: 'GreenProcess Ltd', icon: Leaf },
  { name: 'CleanFactory Co', icon: Factory },
  { name: 'EcoTransport', icon: Truck },
];

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-white via-primary-50/30 to-white">
      {/* Animated Background Blobs */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.5, 0.3],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-20 left-10 w-72 h-72 bg-primary-100 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
          className="absolute bottom-20 right-10 w-96 h-96 bg-cta-primary/10 rounded-full blur-3xl"
        />
      </div>

      {/* Grid Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23104B3A' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-16 lg:pt-32 lg:pb-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            {/* Badge */}
            <motion.div
              variants={itemVariants}
              className="inline-flex items-center gap-2 bg-primary-100 text-primary-dark px-4 py-2 rounded-full text-sm font-medium mb-6"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
              </span>
              Now with AI-powered extraction
            </motion.div>

            {/* Headline */}
            <motion.h1
              variants={itemVariants}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-charcoal leading-tight mb-6"
            >
              Your permit has{' '}
              <span className="text-primary relative">
                73 hidden obligations.
                <motion.svg
                  className="absolute -bottom-2 left-0 w-full"
                  viewBox="0 0 300 12"
                  fill="none"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 1 }}
                  transition={{ delay: 0.8, duration: 0.8 }}
                >
                  <motion.path
                    d="M2 10C50 4 100 4 150 7C200 10 250 6 298 3"
                    stroke="#104B3A"
                    strokeWidth="3"
                    strokeLinecap="round"
                    fill="none"
                  />
                </motion.svg>
              </span>{' '}
              We find them all in 60 seconds.
            </motion.h1>

            {/* Subheadline */}
            <motion.p
              variants={itemVariants}
              className="text-lg sm:text-xl text-text-secondary mb-8 max-w-xl"
            >
              Stop managing environmental permits in Excel. EcoComply extracts every obligation,
              tracks your evidence, and generates audit-ready packs on demand.
            </motion.p>

            {/* CTAs */}
            <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-10">
              <Link
                href="/demo"
                className="group inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-white px-8 py-4 rounded-xl font-semibold text-lg transition-all hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.02] active:scale-[0.98]"
              >
                Book a Demo
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button className="group inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-charcoal px-8 py-4 rounded-xl font-semibold text-lg border border-gray-200 transition-all hover:border-gray-300 hover:shadow-md">
                <Play className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                Watch Demo
              </button>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              variants={itemVariants}
              className="flex flex-wrap items-center gap-6 text-sm text-text-secondary"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <span>UK data residency</span>
              </div>
            </motion.div>
          </motion.div>

          {/* Right - Product Preview */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
            className="relative"
          >
            {/* Main Dashboard Preview */}
            <motion.div
              className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
              whileHover={{ y: -5 }}
              transition={{ duration: 0.3 }}
            >
              {/* Browser Chrome */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-white rounded-md px-3 py-1.5 text-xs text-text-secondary border border-gray-200">
                    app.ecocomply.co.uk/dashboard
                  </div>
                </div>
              </div>

              {/* Dashboard Content */}
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="font-semibold text-charcoal">Compliance Dashboard</h3>
                    <p className="text-sm text-text-secondary">Waste Processing Facility</p>
                  </div>
                  <motion.div
                    className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-primary flex items-center justify-center text-white font-bold text-lg shadow-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.8, type: 'spring', stiffness: 200 }}
                  >
                    87%
                  </motion.div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { value: 47, label: 'Compliant', color: 'success' },
                    { value: 12, label: 'Due Soon', color: 'warning' },
                    { value: 3, label: 'Overdue', color: 'danger' },
                  ].map((stat, i) => (
                    <motion.div
                      key={i}
                      className={`bg-${stat.color}/10 rounded-lg p-3`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.9 + i * 0.1 }}
                    >
                      <div className={`text-2xl font-bold text-${stat.color}`}>{stat.value}</div>
                      <div className="text-xs text-text-secondary">{stat.label}</div>
                    </motion.div>
                  ))}
                </div>

                {/* Obligation List Preview */}
                <div className="space-y-2">
                  {[
                    { name: 'Monthly emissions monitoring', color: 'bg-success' },
                    { name: 'Quarterly waste audit', color: 'bg-warning' },
                    { name: 'Annual stack test certificate', color: 'bg-danger' },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 1.2 + i * 0.1 }}
                    >
                      <div className={`w-2 h-2 rounded-full ${item.color}`} />
                      <span className="text-sm text-charcoal flex-1">{item.name}</span>
                      <FileText className="w-4 h-4 text-text-tertiary" />
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Floating Cards */}
            <motion.div
              initial={{ opacity: 0, y: 30, x: -20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 1.0, type: 'spring', stiffness: 100 }}
              className="absolute -left-8 top-1/4 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-[200px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div className="text-sm font-medium text-charcoal">Audit Pack Ready</div>
              </div>
              <p className="text-xs text-text-secondary">Generated in 47 seconds</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30, x: 20 }}
              animate={{ opacity: 1, y: 0, x: 0 }}
              transition={{ delay: 1.2, type: 'spring', stiffness: 100 }}
              className="absolute -right-4 bottom-1/4 bg-white rounded-xl shadow-xl border border-gray-100 p-4 max-w-[180px]"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center">
                  <Clock className="w-5 h-5 text-success" />
                </div>
                <div className="text-sm font-medium text-charcoal">15 hrs saved</div>
              </div>
              <p className="text-xs text-text-secondary">This week on compliance</p>
            </motion.div>
          </motion.div>
        </div>

        {/* Stats Bar */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-16 lg:mt-24"
        >
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto">
            {stats.map((stat, i) => (
              <motion.div
                key={i}
                className="text-center"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 + i * 0.1 }}
              >
                <div className="text-3xl sm:text-4xl font-bold text-primary mb-1">{stat.value}</div>
                <div className="text-sm text-text-secondary">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Trusted By - with logos */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="mt-16 text-center"
        >
          <p className="text-sm text-text-tertiary mb-8 uppercase tracking-wider">Trusted by leading UK environmental operators</p>
          <div className="flex flex-wrap justify-center items-center gap-10 lg:gap-16">
            {trustedBy.map((company, i) => {
              const Icon = company.icon;
              return (
                <motion.div
                  key={i}
                  className="flex items-center gap-2 text-text-secondary/60 hover:text-text-secondary transition-colors"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.0 + i * 0.1 }}
                  whileHover={{ scale: 1.05 }}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-lg font-semibold">{company.name}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
