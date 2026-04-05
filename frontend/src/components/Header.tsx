import { motion } from "framer-motion";
import { Moon, Sun, User } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import useUserSettings from "../hooks/useUserSettings";
import { useTheme } from "../context/ThemeContext";

interface HeaderProps {
  onLoginClick: () => void;
  isExtracting?: boolean;
}

export default function Header({ onLoginClick, isExtracting }: HeaderProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { headerProfile } = useUserSettings();

  return (
    <motion.header
      initial={{ y: -18, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="sticky top-0 z-30 h-16 border-b border-slate-200/70 bg-white/92 backdrop-blur-xl dark:border-white/5 dark:bg-[#020617]/92"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <div className="flex h-full w-full items-center justify-between gap-4 px-4 md:px-6 lg:px-8">
        <h1 className="truncate text-xl font-black tracking-tight text-slate-900 dark:text-white">
          Smart Invoice
        </h1>

        <div className="flex items-center gap-3">
          {user && (
            <div className="hidden items-center gap-2 rounded-2xl bg-slate-100 px-3 py-2 md:flex dark:bg-white/5">
              <div className="h-2 w-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-[0.22em] text-slate-500">
                {isExtracting ? "Processing" : "Enterprise"}
              </span>
            </div>
          )}

          <button
            onClick={toggleTheme}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition-all duration-200 hover:-translate-y-0.5 hover:bg-slate-200 hover:text-blue-600 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </button>

          <div className="flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-2 dark:bg-white/5">
            <div className="hidden text-right md:block">
              <div className="text-[12px] font-black text-slate-900 dark:text-white">
                {((headerProfile && headerProfile.displayName) || "User")
                  .toString()
                  .split(" ")[0] || "User"}
              </div>
              <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                {headerProfile?.isGuest ? "Guest" : "Enterprise"}
              </div>
            </div>
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white text-slate-500 dark:bg-[#0d1117] dark:text-slate-300">
              {headerProfile && headerProfile.avatarUrl ? (
                <img
                  src={headerProfile.avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>

            {!user && (
              <button
                onClick={onLoginClick}
                className="rounded-2xl bg-blue-600 px-3 py-2 text-[11px] font-black uppercase tracking-[0.22em] text-white shadow-[0_12px_20px_-12px_rgba(37,99,235,0.85)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-blue-700"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>
    </motion.header>
  );
}
