import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";

type DefaultView = "table" | "json";

export type UserSettings = {
  user_id?: string;
  full_name: string;
  theme: "light" | "dark";
  default_view: DefaultView;
  avatar_style?: string;
  updated_at?: string | null;
};

export type HeaderProfile = {
  displayName: string;
  avatarUrl: string | null;
  isGuest: boolean;
};

const DEFAULT_SETTINGS: UserSettings = {
  full_name: "",
  theme: "light",
  default_view: "table",
  avatar_style: "bottts",
};

export function useUserSettings() {
  const { user, profile: authProfile } = useAuth();

  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastSavedSettings, setLastSavedSettings] =
    useState<UserSettings | null>(null);

  const canEdit = Boolean(user);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    if (!user) {
      setSettings(DEFAULT_SETTINGS);
      setLastSavedSettings(DEFAULT_SETTINGS);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "user_id, full_name, theme, default_view, avatar_style, updated_at",
        )
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // create default row using upsert
        const toCreate: Partial<UserSettings> = {
          user_id: user.id,
          full_name: "",
          theme: DEFAULT_SETTINGS.theme,
          default_view: DEFAULT_SETTINGS.default_view,
          avatar_style: DEFAULT_SETTINGS.avatar_style,
          updated_at: new Date().toISOString(),
        };

        const { data: upserted, error: upsertErr } = await supabase
          .from("profiles")
          .upsert(toCreate, { onConflict: "user_id" })
          .select(
            "user_id, full_name, theme, default_view, avatar_style, updated_at",
          )
          .maybeSingle();

        if (upsertErr) throw upsertErr;

        setSettings({
          user_id: upserted?.user_id,
          full_name: upserted?.full_name ?? "",
          theme: (upserted?.theme as "light" | "dark") ?? "light",
          default_view: (upserted?.default_view as DefaultView) ?? "table",
          avatar_style: upserted?.avatar_style ?? DEFAULT_SETTINGS.avatar_style,
          updated_at: upserted?.updated_at ?? null,
        });
        setLastSavedSettings({
          user_id: upserted?.user_id,
          full_name: upserted?.full_name ?? "",
          theme: (upserted?.theme as "light" | "dark") ?? "light",
          default_view: (upserted?.default_view as DefaultView) ?? "table",
          avatar_style: upserted?.avatar_style ?? DEFAULT_SETTINGS.avatar_style,
          updated_at: upserted?.updated_at ?? null,
        });
      } else {
        setSettings({
          user_id: data.user_id,
          full_name: data.full_name ?? "",
          theme: (data.theme as "light" | "dark") ?? "light",
          default_view: (data.default_view as DefaultView) ?? "table",
          avatar_style: data.avatar_style ?? DEFAULT_SETTINGS.avatar_style,
          updated_at: data.updated_at ?? null,
        });
        setLastSavedSettings({
          user_id: data.user_id,
          full_name: data.full_name ?? "",
          theme: (data.theme as "light" | "dark") ?? "light",
          default_view: (data.default_view as DefaultView) ?? "table",
          avatar_style: data.avatar_style ?? DEFAULT_SETTINGS.avatar_style,
          updated_at: data.updated_at ?? null,
        });
      }
    } catch (err: any) {
      console.error("useUserSettings load error:", err);
      setError(err?.message ?? "Failed to load settings");
      // fallback to defaults
      setSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const saveSettings = useCallback(
    async (payload: Partial<UserSettings>) => {
      setSaving(true);
      setError(null);
      setSuccessMessage(null);

      if (!user) {
        setError("Guest users cannot save settings");
        setSaving(false);
        return {
          error: "guest",
        } as const;
      }

      try {
        const upsertPayload = {
          user_id: user.id,
          full_name: payload.full_name ?? settings.full_name,
          theme: payload.theme ?? settings.theme,
          default_view: payload.default_view ?? settings.default_view,
          avatar_style:
            (payload as any).avatar_style ??
            settings.avatar_style ??
            DEFAULT_SETTINGS.avatar_style,
        } as UserSettings;

        const { data, error } = await supabase
          .from("profiles")
          .upsert(
            {
              ...upsertPayload,
              avatar_seed: user.email,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" },
          )
          .select(
            "user_id, full_name, theme, default_view, avatar_style, avatar_seed, updated_at",
          )
          .maybeSingle();

        if (error) throw error;

        setSettings({
          user_id: data?.user_id,
          full_name: data?.full_name ?? upsertPayload.full_name,
          theme: (data?.theme as "light" | "dark") ?? upsertPayload.theme,
          default_view:
            (data?.default_view as DefaultView) ?? upsertPayload.default_view,
          avatar_style: data?.avatar_style ?? upsertPayload.avatar_style,
          updated_at: data?.updated_at ?? null,
        });
        setLastSavedSettings({
          user_id: data?.user_id,
          full_name: data?.full_name ?? upsertPayload.full_name,
          theme: (data?.theme as "light" | "dark") ?? upsertPayload.theme,
          default_view:
            (data?.default_view as DefaultView) ?? upsertPayload.default_view,
          avatar_style: data?.avatar_style ?? upsertPayload.avatar_style,
          updated_at: data?.updated_at ?? null,
        });

        setSuccessMessage("Settings saved");
        // cross-tab sync key
        try {
          localStorage.setItem("settings_updated", Date.now().toString());
        } catch (_) {}

        return { data };
      } catch (err: any) {
        console.error("saveSettings error:", err);
        setError(err?.message ?? "Failed to save settings");
        return { error: err };
      } finally {
        setSaving(false);
      }
    },
    [settings, user],
  );

  const reloadSettings = useCallback(async () => {
    await load();
  }, [load]);

  const discardChanges = useCallback(() => {
    if (user) {
      if (lastSavedSettings) {
        setSettings(lastSavedSettings);
      } else {
        // reload from server as fallback
        void load();
      }
    } else {
      setSettings(DEFAULT_SETTINGS);
    }
    setError(null);
    setSuccessMessage(null);
  }, [user, lastSavedSettings, load]);

  const headerProfile = useMemo<HeaderProfile>(() => {
    const isGuest = !user;
    const displayName =
      settings.full_name && settings.full_name.length > 0
        ? settings.full_name
        : user?.email?.split("@")[0] || "User";

    const avatarStyle = settings.avatar_style ?? DEFAULT_SETTINGS.avatar_style;
    const avatarUrl = isGuest
      ? null
      : `https://api.dicebear.com/9.x/${avatarStyle}/svg?seed=${encodeURIComponent(
          user?.email || "user",
        )}`;

    return {
      displayName: isGuest ? "Guest User" : displayName,
      avatarUrl,
      isGuest,
    };
  }, [settings.full_name, user]);

  return {
    settings,
    setSettings,
    loading,
    saving,
    canEdit,
    error,
    successMessage,
    saveSettings,
    reloadSettings,
    discardChanges,
    headerProfile,
  } as const;
}

export default useUserSettings;
