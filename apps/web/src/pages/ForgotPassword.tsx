import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import axios from 'axios';

export const ForgotPassword: React.FC = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide your email address');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      const response = await axios.post('/api/v1/auth/forgot', { email });
      setMessage(response.data.message || 'If that account exists, a reset link has been dispatched.');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to submit reset request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <Link to="/login" className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 flex items-center space-x-1.5 transition text-sm font-medium z-10">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Sign In</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10"
      >
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 text-transparent bg-clip-text">InvoiceFlow AI</span>
          <h2 className="text-xl font-bold mt-2 text-slate-100">Reset Password</h2>
          <p className="text-xs text-slate-400 mt-1">We will dispatch recovery instructions to your email</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-6">
            {error}
          </div>
        )}

        {message ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <p className="text-sm text-slate-300 mb-6">{message}</p>
            <Link
              to="/login"
              className="px-4 py-2 rounded-lg text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-slate-100 transition inline-block"
            >
              Return to Login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-slate-100 glass-input"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold text-slate-100 bg-brand-600 hover:bg-brand-500 transition shadow-lg hover:shadow-brand-500/20 flex items-center justify-center space-x-2 disabled:opacity-50"
            >
              {loading ? (
                <span>Requesting reset...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Send Reset Link</span>
                </>
              )}
            </button>
          </form>
        )}
      </motion.div>
    </div>
  );
};

export default ForgotPassword;
