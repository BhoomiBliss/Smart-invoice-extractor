import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, UserPlus, ArrowLeft } from 'lucide-react';
import AuthContext from '../context/AuthContext';

export const SignUp: React.FC = () => {
  const navigate = useNavigate();
  const auth = useContext(AuthContext);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all inputs fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    try {
      setError(null);
      setLoading(true);
      await auth?.signup(name, email, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-mesh min-h-screen flex flex-col justify-center items-center px-6 relative overflow-hidden">
      <Link to="/" className="absolute top-6 left-6 text-slate-400 hover:text-slate-100 flex items-center space-x-1.5 transition text-sm font-medium z-10">
        <ArrowLeft className="w-4 h-4" />
        <span>Back to Landing</span>
      </Link>

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md p-8 rounded-2xl glass-panel relative z-10"
      >
        <div className="text-center mb-8">
          <span className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-emerald-400 text-transparent bg-clip-text">InvoiceFlow AI</span>
          <h2 className="text-xl font-bold mt-2 text-slate-100">Create Business Account</h2>
          <p className="text-xs text-slate-400 mt-1">Get started with invoice document intelligence</p>
        </div>

        {error && (
          <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/10 text-red-400 text-xs font-semibold mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Full Name</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Bhoomi"
                className="w-full pl-10 pr-4 py-3 rounded-lg text-sm text-slate-100 glass-input"
              />
            </div>
          </div>

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

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="•••••••• (Min 6 chars)"
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
              <span>Creating profile...</span>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Register</span>
              </>
            )}
          </button>
        </form>

        <p className="text-xs text-slate-400 text-center mt-6">
          Already registered?{' '}
          <Link to="/login" className="text-brand-400 hover:text-brand-300 font-semibold underline">Sign In</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default SignUp;
