import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import {
  loadUserProfile,
  createDefaultProfileIfMissing,
  type UserProfile,
} from "../lib/profileManager";
import { clearGuestHistory } from "../lib/guestHistory";

type Profile = UserProfile & {
  id?: string;
  dark_mode?: boolean;
  role?: "admin" | "user";
  job_title?: string;
  organization?: string;
  currency?: string;
  date_format?: string;
  ai_mode?: boolean;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  token: string | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    try {
      // Load existing profile
      let profileData = await loadUserProfile(userId);

      // If no profile exists, auto-create default
      if (!profileData && user) {
        profileData = await createDefaultProfileIfMissing(user);
      }

      setProfile(profileData || null);
    } catch (err) {
      console.error("Error fetching profile:", err);
      setProfile(null);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setToken(session?.access_token || null);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        // 🧩 STEP 3 — CLEAR GUEST STATE ON APP LOAD / REFRESH
        clearGuestHistory();
        localStorage.removeItem("guest_history");
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setToken(session?.access_token || null);
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // 🧩 STEP 6 — CLEAR GUEST STATE ON SIGNOUT
    clearGuestHistory();
    localStorage.removeItem("guest_history");
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token,
        profile,
        loading,
        signOut,
        refreshProfile,
      }}
    >
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
