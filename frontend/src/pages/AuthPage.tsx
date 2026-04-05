import { useState } from "react";
import { signInWithGoogle } from "../lib/authHandler";
import { motion } from "framer-motion";
import { FileText, ShieldCheck, ArrowRight, Loader2 } from "lucide-react";

export default function AuthPage({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      // signInWithGoogle redirects the browser, so this only
      // runs if something fails before the redirect.
    } catch (error) {
      console.error("Sign-in error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop — click to dismiss as guest */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-[#020617]/95 backdrop-blur-md"
      />

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: "spring", damping: 28, stiffness: 260 }}
        className="relative z-10 w-full max-w-[380px] mx-4 bg-[#070b14] rounded-[28px] border border-white/[0.07] shadow-[0_32px_80px_rgba(0,0,0,0.7)] overflow-hidden"
      >
        {/* ── Logo ── */}
        <div className="pt-14 pb-8 flex flex-col items-center text-center px-10">
          <div className="w-[68px] h-[68px] bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[20px] flex items-center justify-center mb-7 shadow-2xl shadow-blue-500/25 ring-1 ring-white/10">
            <FileText className="w-8 h-8 text-white" />
          </div>

          <h1 className="text-[22px] font-black text-white tracking-tighter uppercase mb-1">
            Smart Invoice
          </h1>
          <p className="text-[10px] font-black text-blue-500/70 uppercase tracking-[0.35em]">
            Neural Intelligence
          </p>
        </div>

        {/* ── Buttons ── */}
        <div className="px-8 pb-6 flex flex-col gap-3">
          {/* Google */}
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-[14px] bg-white text-[#111] rounded-2xl text-[14px] font-bold hover:bg-gray-100 active:scale-[0.98] transition-all shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin text-gray-500" />
            ) : (
              <>
                <img
                  src="https://www.svgrepo.com/show/475656/google-color.svg"
                  alt="Google"
                  className="w-5 h-5 shrink-0"
                />
                Continue with Google
              </>
            )}
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-white/[0.05]" />
            <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest">
              or
            </span>
            <div className="h-px flex-1 bg-white/[0.05]" />
          </div>

          {/* Guest */}
          <button
            onClick={onClose}
            className="w-full flex items-center justify-between px-5 py-[13px] bg-white/[0.03] border border-white/[0.07] hover:bg-white/[0.07] hover:border-white/[0.12] rounded-2xl transition-all group"
          >
            <div className="flex items-center gap-3">
              <ShieldCheck
                size={17}
                className="text-slate-500 group-hover:text-blue-400 transition-colors shrink-0"
              />
              <span className="text-[13px] font-bold text-slate-400 group-hover:text-white transition-colors">
                Proceed as Guest
              </span>
            </div>
            <ArrowRight
              size={15}
              className="text-slate-600 group-hover:text-white group-hover:translate-x-0.5 transition-all"
            />
          </button>
        </div>

        {/* ── Footer note ── */}
        <div className="px-8 pb-10 text-center">
          <p className="text-[10px] font-semibold text-slate-700 leading-[1.7]">
            Guest mode stores data in your browser only.
            <br />
            Sign in with Google to sync your history.
          </p>
        </div>
      </motion.div>
    </div>
  );
}
