import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Cpu, Zap, Shield, Globe, BarChart, Server, ArrowRight, User } from 'lucide-react';
import AuthContext from '../context/AuthContext';

export const Home: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const features = [
    {
      icon: <Cpu className="w-6 h-6 text-indigo-400" />,
      title: 'Multi-Agent Vision AI',
      desc: 'Adaptive routing across Gemini, Qwen, and Llama Vision models to resolve optimal data structures.'
    },
    {
      icon: <Zap className="w-6 h-6 text-emerald-400" />,
      title: 'Real-Time Ingestion Queue',
      desc: 'BullMQ-backed asynchronous processing pipelines streaming state updates directly via SSE channels.'
    },
    {
      icon: <Shield className="w-6 h-6 text-indigo-400" />,
      title: 'Human-in-the-Loop Corrections',
      desc: 'Auditor override workspace dynamically synchronizing table cells, JSON inputs, and NLP briefings.'
    },
    {
      icon: <Globe className="w-6 h-6 text-emerald-400" />,
      title: 'AI Output Validation & Audits',
      desc: 'Automatic mathematical check validations mapping totals against line item sums to prevent errors.'
    },
    {
      icon: <BarChart className="w-6 h-6 text-indigo-400" />,
      title: 'Enterprise AI Observability',
      desc: 'Langfuse prompt trace mappings recording latency charts, token fees, and manual corrections logs.'
    },
    {
      icon: <Server className="w-6 h-6 text-emerald-400" />,
      title: 'Tenant-Scoped Datasets',
      desc: 'Secure authentication guards enforcing data isolation parameters across administrative scopes.'
    }
  ];

  return (
    <div className="bg-mesh min-h-screen relative overflow-hidden flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex justify-between items-center relative z-10">
        <div className="flex items-center space-x-2">
          <span className="text-xl font-bold tracking-wider text-slate-100 flex items-center space-x-1">
            <span className="bg-gradient-to-r from-indigo-500 to-emerald-400 text-transparent bg-clip-text font-black">InvoiceFlow AI</span>
          </span>
        </div>
        
        <div className="flex items-center space-x-4">
          {auth?.user ? (
            <button
              onClick={() => navigate(auth?.user?.role === 'admin' ? '/admin' : '/dashboard')}
              className="px-4 py-2 rounded-lg text-sm font-semibold glass-panel text-slate-100 hover:bg-surface-800 transition duration-150 flex items-center space-x-1"
            >
              <User className="w-4 h-4" />
              <span>Workspace</span>
            </button>
          ) : (
            <>
              <button
                onClick={() => navigate('/login')}
                className="text-sm font-semibold text-slate-300 hover:text-slate-100 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => navigate('/register')}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-slate-100 transition shadow-lg hover:shadow-brand-500/20"
              >
                Get Started
              </button>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <main className="w-full max-w-7xl mx-auto px-6 py-12 flex-grow flex flex-col justify-center items-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center max-w-3xl"
        >
          <span className="px-3 py-1 rounded-full text-xs font-semibold glass-panel border border-brand-500/20 text-brand-400 inline-block mb-4">
            7-Layer Document Intelligence Platform
          </span>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6">
            Turn Any Invoice Into{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-emerald-400 to-indigo-500 text-transparent bg-clip-text">
              Structured Financial Data
            </span>
          </h1>
          <p className="text-base md:text-lg text-slate-400 mb-8 max-w-2xl mx-auto">
            A distributed multi-agent platform utilizing adaptive routing, BullMQ job queues, human-in-the-loop validation, and enterprise-grade AI observability pipelines.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 mb-16">
            <button
              onClick={() => {
                if (auth?.user) {
                  navigate('/dashboard');
                } else {
                  // Direct bypass as Guest
                  navigate('/dashboard?session=guest');
                }
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-base font-semibold bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-slate-100 shadow-xl hover:shadow-brand-500/20 transition flex items-center justify-center space-x-2"
            >
              <span>Try Ingestion as Guest</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            
            <button
              onClick={() => navigate('/register')}
              className="w-full sm:w-auto px-6 py-3 rounded-lg text-base font-semibold glass-panel text-slate-100 hover:bg-surface-800 transition flex items-center justify-center"
            >
              Create Account
            </button>
          </div>
        </motion.div>

        {/* Stats Strip */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full max-w-4xl py-6 px-8 rounded-2xl glass-panel flex flex-wrap justify-around items-center text-center gap-6 mb-16"
        >
          <div>
            <h4 className="text-2xl font-bold text-slate-100">10M+</h4>
            <p className="text-xs text-slate-400 font-medium">Invoices Processed</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h4 className="text-2xl font-bold text-emerald-400">94.7%</h4>
            <p className="text-xs text-slate-400 font-medium">Consensus Accuracy</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h4 className="text-2xl font-bold text-slate-100">&lt; 2.5s</h4>
            <p className="text-xs text-slate-400 font-medium">Extraction Latency</p>
          </div>
          <div className="h-8 w-px bg-slate-800 hidden sm:block" />
          <div>
            <h4 className="text-2xl font-bold text-brand-400">Langfuse</h4>
            <p className="text-xs text-slate-400 font-medium">Observability Bound</p>
          </div>
        </motion.div>

        {/* Feature Grid */}
        <div className="w-full py-6">
          <h3 className="text-center text-lg font-bold text-slate-400 mb-8 uppercase tracking-widest">
            Platform Capabilities
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.08, duration: 0.5 }}
                whileHover={{ y: -4, borderColor: 'rgba(99, 102, 241, 0.2)' }}
                className="p-6 rounded-xl glass-panel border border-slate-800 flex flex-col justify-between hover:shadow-lg hover:shadow-brand-500/5 transition duration-200"
              >
                <div>
                  <div className="p-3 w-12 h-12 rounded-lg bg-surface-900 flex items-center justify-center mb-4 border border-slate-800">
                    {feat.icon}
                  </div>
                  <h4 className="text-lg font-bold text-slate-100 mb-2">{feat.title}</h4>
                  <p className="text-sm text-slate-400 leading-relaxed">{feat.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 border-t border-slate-900 bg-surface-950 relative z-10 text-center text-sm text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p>© 2026 Smart Invoice Extractor. All rights reserved.</p>
          <a
            href="https://github.com/BhoomiBliss/Smart-invoice-extractor"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-slate-200 transition underline font-medium"
          >
            GitHub Repository
          </a>
        </div>
      </footer>
    </div>
  );
};

export default Home;
