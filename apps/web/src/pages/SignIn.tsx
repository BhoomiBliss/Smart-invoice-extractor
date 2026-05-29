import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, LogIn, ArrowLeft, ShieldAlert, Sparkles } from 'lucide-react';
import AuthContext from '../context/AuthContext';

export const SignIn: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [roleMode, setRoleMode] = useState<'user' | 'admin'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials fields');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      
      // Perform backend authentication
      await auth?.login(email, password);
      
      // Extract logged-in user profile from session storage
      const user = JSON.parse(localStorage.getItem('invoice_session_user') || '{}');
      
      if (!user || !user.role) {
        setError('Authentication succeeded, but no user role was returned.');
        return;
      }

      // Enforce clean deterministic role-based redirect pathways
      switch (user.role) {
        case 'admin':
        case 'manager':
          navigate('/admin/system-health');
          break;
        case 'support':
          navigate('/support/tickets');
          break;
        case 'ops':
          navigate('/ops/telemetry');
          break;
        default:
          navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      
      {/* Back Button */}
      <Link 
        to="/" 
        className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 flex items-center space-x-1.5 transition text-sm font-medium z-10"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Landing</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className={`w-full max-w-md p-8 rounded-2xl glass-panel relative z-10 border transition-all duration-500 shadow-2xl ${
          roleMode === 'admin' 
            ? 'border-amber-500/30 shadow-amber-500/5' 
            : 'border-indigo-500/20 shadow-indigo-500/5'
        }`}
      >
        {/* Role Glow Accent Bar */}
        <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r transition-all duration-500 rounded-t-2xl ${
          roleMode === 'admin' 
            ? 'from-amber-500 via-orange-500 to-red-500' 
            : 'from-indigo-500 via-brand-500 to-emerald-500'
        }`} />

        {/* Header Block */}
        <div className="text-center mb-6">
          <span className={`text-2xl font-black bg-gradient-to-r tracking-wider uppercase bg-clip-text text-transparent transition-all duration-500 ${
            roleMode === 'admin' ? 'from-amber-400 to-orange-400' : 'from-indigo-400 to-emerald-400'
          }`}>
            InvoiceFlow AI
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-slate-400 mt-0.5 uppercase">
            Document Intelligence System
          </h2>
        </div>

        {/* Interactive Role Switcher Toggle */}
        <div className="flex p-1 mb-6 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <button
            type="button"
            onClick={() => setRoleMode('user')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-300 ${
              roleMode === 'user'
                ? 'bg-indigo-600/90 text-white shadow-lg shadow-indigo-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Business</span>
          </button>
          <button
            type="button"
            onClick={() => setRoleMode('admin')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2.5 rounded-lg text-xs font-bold uppercase transition-all duration-300 ${
              roleMode === 'admin'
                ? 'bg-amber-600/90 text-white shadow-lg shadow-amber-600/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>System Admin</span>
          </button>
        </div>

        <AnimatePresence mode="wait">
          {roleMode === 'admin' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[10px] leading-relaxed text-amber-400 font-medium mb-6 text-center"
            >
              🔒 Elevated Gateway Access Mode. All activities on system interfaces are logged and audited.
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-6 text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4.5">
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-slate-100 glass-input focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                Password
              </label>
              <Link to="/forgot-password" className={`text-xs font-semibold hover:underline transition-colors ${
                roleMode === 'admin' ? 'text-amber-400 hover:text-amber-300' : 'text-brand-400 hover:text-brand-300'
              }`}>
                Forgot?
              </Link>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-slate-100 glass-input focus:outline-none transition-colors duration-300"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-lg text-xs font-bold uppercase tracking-wider text-slate-100 transition shadow-lg flex items-center justify-center space-x-2 disabled:opacity-50 mt-2 ${
              roleMode === 'admin'
                ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-600/10'
                : 'bg-brand-600 hover:bg-brand-500 shadow-brand-600/10'
            }`}
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                <span>🔐 Sign In</span>
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          New here?{' '}
          <Link to="/register" className={`font-semibold underline ${
            roleMode === 'admin' ? 'text-amber-400 hover:text-amber-300' : 'text-brand-400 hover:text-brand-300'
          }`}>
            Create account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignIn;
