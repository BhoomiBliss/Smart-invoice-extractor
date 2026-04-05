import { supabase } from "./supabase";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  user_id: string;
  email?: string;
  full_name: string;
  avatar_style?: string;
  avatar_seed?: string;
  default_view?: "table" | "json";
  theme?: "light" | "dark";
  updated_at?: string;
}

const DEFAULT_AVATAR_STYLE = "bottts";

/**
 * Load user profile from database
 * Returns null if profile doesn't exist
 */
export async function loadUserProfile(
  userId: string,
): Promise<UserProfile | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "user_id, email, full_name, avatar_style, avatar_seed, default_view, theme, updated_at",
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error: any) {
    console.error("Failed to load profile:", error);
    return null;
  }
}

/**
 * Save or update user profile
 * Auto-creates if doesn't exist (upsert behavior)
 */
export async function saveUserProfile(
  user: User,
  profileData: Partial<UserProfile>,
): Promise<UserProfile | null> {
  if (!user?.id) {
    throw new Error("User ID is required");
  }

  try {
    const payload = {
      user_id: user.id,
      email: user.email || "",
      full_name: profileData.full_name || "",
      avatar_style: profileData.avatar_style || DEFAULT_AVATAR_STYLE,
      avatar_seed: profileData.avatar_seed || user.email || user.id,
      default_view: profileData.default_view || "table",
      theme: profileData.theme || "light",
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("profiles")
      .upsert(payload, {
        onConflict: "user_id",
      })
      .select(
        "user_id, email, full_name, avatar_style, avatar_seed, default_view, theme, updated_at",
      )
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error: any) {
    console.error("Failed to save profile:", error);
    throw error;
  }
}

/**
 * Auto-create default profile for new user after login
 */
export async function createDefaultProfileIfMissing(
  user: User,
): Promise<UserProfile | null> {
  if (!user?.id) {
    return null;
  }

  try {
    // First check if profile exists
    const existing = await loadUserProfile(user.id);
    if (existing) {
      return existing;
    }

    // Create default profile
    return await saveUserProfile(user, {
      full_name: user.email?.split("@")[0] || "User",
      email: user.email,
      avatar_style: DEFAULT_AVATAR_STYLE,
      avatar_seed: user.email || user.id,
      default_view: "table",
      theme: "light",
    });
  } catch (error: any) {
    console.error("Failed to create default profile:", error);
    return null;
  }
}

/**
 * Generate avatar URL using DiceBear API
 * No file uploads - purely client-side generation
 */
export function generateAvatarUrl(
  userEmail: string | undefined,
  style: string = DEFAULT_AVATAR_STYLE,
): string {
  const seed = encodeURIComponent(userEmail || "user");
  return `https://api.dicebear.com/9.x/${style}/svg?seed=${seed}`;
}

/**
 * List all allowed avatar styles
 */
export const ALLOWED_AVATAR_STYLES = [
  "bottts",
  "identicon",
  "shapes",
  "initials",
] as const;

export type AvatarStyle = (typeof ALLOWED_AVATAR_STYLES)[number];

/**
 * Validate avatar style
 */
export function isValidAvatarStyle(style: string): style is AvatarStyle {
  return ALLOWED_AVATAR_STYLES.includes(style as AvatarStyle);
}

/**
 * Update avatar style for user
 */
export async function updateAvatarStyle(
  userId: string,
  newStyle: AvatarStyle,
): Promise<UserProfile | null> {
  if (!isValidAvatarStyle(newStyle)) {
    throw new Error(
      `Invalid avatar style. Must be one of: ${ALLOWED_AVATAR_STYLES.join(", ")}`,
    );
  }

  try {
    const { data, error } = await supabase
      .from("profiles")
      .update({
        avatar_style: newStyle,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .select(
        "user_id, email, full_name, avatar_style, avatar_seed, default_view, theme, updated_at",
      )
      .maybeSingle();

    if (error) throw error;
    return data || null;
  } catch (error: any) {
    console.error("Failed to update avatar style:", error);
    throw error;
  }
}
