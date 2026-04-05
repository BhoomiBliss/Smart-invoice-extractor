import { supabase } from "./supabase";

/**
 * Sign in with Google using Supabase OAuth
 * Handles redirect to appropriate URL (localhost or production)
 */
export const signInWithGoogle = async () => {
  await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
    },
  });
};



/**
 * Sign out the current user
 */
export async function signOutUser() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  } catch (error: any) {
    console.error("Sign-out failed:", error);
    throw new Error(error.message || "Failed to sign out");
  }
}

/**
 * Get current session and user
 */
export async function getCurrentSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    return data.session;
  } catch (error: any) {
    console.error("Session fetch failed:", error);
    return null;
  }
}

/**
 * Set up auth state listener for real-time sync
 */
export function listenToAuthStateChanges(
  callback: (event: string, session: any) => void,
) {
  try {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });

    return data.subscription;
  } catch (error: any) {
    console.error("Auth listener setup failed:", error);
    return null;
  }
}

/**
 * Refresh the current session
 */
export async function refreshSession() {
  try {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw error;
    return data.session;
  } catch (error: any) {
    console.error("Session refresh failed:", error);
    return null;
  }
}
