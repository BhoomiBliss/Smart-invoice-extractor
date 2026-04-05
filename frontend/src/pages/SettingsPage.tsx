import { useRef, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { supabase } from "../lib/supabase";
import useUserSettings from "../hooks/useUserSettings";
import {
  User,
  Loader2,
  Pen,
  Shield,
  Moon,
  Sparkles,
  LogIn,
  Layout,
  Palette,
  Mail,
  Github,
  Database,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-hot-toast";

interface Profile {
  id: string;
  full_name: string;
  dark_mode?: boolean;
  theme?: string;
  default_view: "json" | "table";
  email?: string;
}

interface SettingsPageProps {
  onLoginClick?: () => void;
}

export default function SettingsPage({ onLoginClick }: SettingsPageProps = {}) {
  const {
    user,
    profile: authProfile,
    loading: authLoading,
    refreshProfile,
  } = useAuth();
  const { theme, setTheme } = useTheme();
  const {
    settings,
    setSettings,
    loading: settingsLoading,
    saving,
    canEdit,
    error: settingsError,
    successMessage,
    saveSettings,
    reloadSettings,
    discardChanges,
    headerProfile,
  } = useUserSettings();

  const isGuest = !user;
  const isInitialLoading = authLoading || settingsLoading;

  const fileInputRef = useRef<HTMLInputElement>(null);

  // synchronize local settings edits with hook state
  const fullName = settings?.full_name ?? "";
  const darkMode = (settings?.theme ?? "light") === "dark";
  const defaultView = (settings?.default_view as "table" | "json") ?? "table";
  const avatarStyle = settings?.avatar_style ?? "bottts";
  const avatarUrl = user
    ? `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${encodeURIComponent(
        user.email || "user",
      )}`
    : "";

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    document.documentElement.classList.toggle("light", !darkMode);

    if (theme !== (darkMode ? "dark" : "light")) {
      setTheme(darkMode ? "dark" : "light");
    }
  }, [darkMode, setTheme, theme]);

  useEffect(() => {
    const handleStorage = async (event: StorageEvent) => {
      if (event.key !== "settings_updated" || !user?.id) return;
      await reloadSettings();
      await refreshProfile();
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [reloadSettings, refreshProfile, user?.id]);

  // Avatar is generated via DiceBear; no upload or storage is used.

  const handleAvatarClick = () => {
    if (isGuest) return;
    try {
      const key = "avatar_notice_shown";
      if (!localStorage.getItem(key)) {
        toast("Profile photo is generated from your account identity.");
        localStorage.setItem(key, "1");
      }
    } catch (_) {
      toast("Profile photo is generated from your account identity.");
    }
  };

  const handleSave = async () => {
    if (!canEdit) {
      toast("Guest users cannot save settings");
      return;
    }

    const toastId = toast.loading("Saving preferences...");

    const payload = {
      full_name: fullName,
      theme: darkMode ? "dark" : "light",
      default_view: defaultView,
    } as const;

    const result = await saveSettings(payload);

    if ((result as any)?.error) {
      toast.error((result as any).error?.message || "Failed to save", {
        id: toastId,
      });
    } else {
      // update auth profile cache if available and update header immediately
      try {
        await refreshProfile();
      } catch (_) {}
      toast.success("Settings saved", { id: toastId });
    }
  };

  const handleDiscard = () => {
    discardChanges();
    toast("Changes discarded");
  };

  const Switch = ({
    checked,
    onChange,
    disabled,
  }: {
    checked: boolean;
    onChange: (c: boolean) => void;
    disabled?: boolean;
  }) => (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
        checked ? "bg-blue-600" : "bg-gray-200 dark:bg-gray-600"
      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );

  if (authLoading || isInitialLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-[#0b0f1a]">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="hidden-scrollbar flex min-h-screen flex-col overflow-y-auto bg-slate-50 px-6 pb-32 pt-8 dark:bg-[#0b0f1a]">
      <div className="mx-auto mb-8 w-full max-w-4xl">
        <h1 className="mb-2 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
          Settings
        </h1>
        <p className="text-sm font-medium text-slate-500">
          Manage your account, preferences, and support details.
        </p>
        {/* Inline status messages from settings hook */}
        {settingsError && (
          <div className="mt-3 text-sm text-red-600 dark:text-red-400">
            {settingsError}
          </div>
        )}
        {successMessage && (
          <div className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">
            {successMessage}
          </div>
        )}
      </div>

      <AnimatePresence>
        {isGuest && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mx-auto mb-8 flex w-full max-w-4xl items-center justify-between rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-blue-600" />
              <p className="text-sm font-bold text-blue-700 dark:text-blue-400">
                Sign in to save your settings and profile image.
              </p>
            </div>
            <button
              onClick={onLoginClick}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700"
            >
              <LogIn className="h-4 w-4" /> Sign In
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={`mx-auto w-full max-w-4xl space-y-8 ${
          isGuest ? "grayscale-[0.35] opacity-80" : ""
        }`}
      >
        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-white/5">
          <div className="mb-8 flex items-center gap-3">
            <User className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Account
            </h2>
          </div>

          <div className="mb-8 flex items-center gap-6">
            <div
              className={`relative group ${
                isGuest ? "cursor-not-allowed" : "cursor-pointer"
              }`}
              onClick={() => handleAvatarClick()}
            >
              <div className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-white/5">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="avatar"
                    className="w-16 h-16 rounded-full"
                  />
                ) : (
                  <User className="h-8 w-8 text-slate-400" />
                )}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Profile photo is generated from your account identity
              </p>

              <div className="mt-3 flex items-center gap-2">
                {["bottts", "identicon", "shapes"].map((style) => (
                  <button
                    key={style}
                    disabled={isGuest}
                    onClick={() =>
                      setSettings((prev) => ({ ...prev, avatar_style: style }))
                    }
                    className={`rounded px-2 py-1 text-xs font-medium ${
                      avatarStyle === style
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 dark:bg-white/5"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid flex-1 grid-cols-1 gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  disabled={!canEdit}
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      full_name: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 text-sm font-semibold outline-none focus:border-blue-500 dark:bg-white/5 dark:text-white disabled:opacity-50"
                />
              </div>
              <div className="space-y-1.5">
                <label className="pl-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Email Address
                </label>
                <input
                  type="email"
                  value={user?.email || "guest@example.com"}
                  disabled
                  className="w-full cursor-not-allowed rounded-xl border border-transparent bg-slate-50 px-4 py-2.5 text-sm font-medium italic text-slate-500 dark:bg-white/5"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-white/5">
          <div className="mb-8 flex items-center gap-3">
            <Palette className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Preferences
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Moon className="h-4 w-4" /> Dark Mode
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Optimize for low-light environments.
                </p>
              </div>
              <Switch
                checked={darkMode}
                onChange={(c) =>
                  setSettings((prev) => ({
                    ...prev,
                    theme: c ? "dark" : "light",
                  }))
                }
                disabled={!canEdit}
              />
            </div>

            <div className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                <Layout className="h-4 w-4" /> Default Result View
              </h3>
              <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-white/5">
                {["table", "json"].map((view) => (
                  <button
                    key={view}
                    disabled={!canEdit}
                    onClick={() =>
                      setSettings((prev) => ({
                        ...prev,
                        default_view: view as "table" | "json",
                      }))
                    }
                    className={`flex-1 rounded-lg py-1.5 text-[10px] font-black uppercase tracking-widest transition-all ${
                      defaultView === view
                        ? "bg-white text-blue-600 shadow-sm dark:bg-white/10"
                        : "text-slate-400 hover:text-slate-600"
                    }`}
                  >
                    {view}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm dark:border-white/5 dark:bg-white/5">
          <div className="mb-8 flex items-center gap-3">
            <Mail className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Support
            </h2>
          </div>

          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Need Help?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Found a bug or need assistance?
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <a
                href="mailto:bhoooomikasshetty20@gmail.com"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-blue-300 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <span>Contact Us</span>
                <Mail className="h-4 w-4" />
              </a>

              <a
                href="https://github.com/BhoomiBliss/Smart-invoice-extractor"
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700 transition-all hover:border-blue-300 hover:text-blue-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-300"
              >
                <span>View Source Code</span>
                <Github className="h-4 w-4" />
              </a>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <div className="h-2 w-2 rounded-full bg-emerald-500" />
                  Supabase Connected
                </div>
                <p className="text-xs text-slate-500">
                  Storage and database services are available.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-white/10 dark:bg-white/5">
                <div className="mb-1 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white">
                  <Database className="h-4 w-4 text-blue-600" />
                  Storage Usage
                </div>
                <p className="text-xs text-slate-500">
                  You are using Supabase storage.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>

      {!isGuest && (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white/80 px-6 py-4 backdrop-blur-xl transition-all dark:border-white/10 dark:bg-[#0b0f1a]/80 lg:ml-64">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-6">
            <div className="flex items-center justify-between mt-0 pt-0 border-t border-white/10 w-full">
              <button
                onClick={() => supabase.auth.signOut()}
                className="text-sm font-medium text-red-400 border border-red-400/20 px-4 py-2 rounded-lg hover:bg-red-500 hover:text-white transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 active:scale-95"
              >
                Logout
              </button>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={!canEdit || saving}
                  className="text-sm text-gray-400 hover:text-white transition-all duration-200 hover:scale-105"
                >
                  Discard
                </button>

                <button
                  onClick={handleSave}
                  disabled={!canEdit || saving}
                  className="px-6 py-2 text-sm font-semibold text-white rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 transition-all duration-200 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 active:scale-95"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  ) : (
                    <Sparkles className="h-4 w-4 inline-block mr-2" />
                  )}
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
