/// <reference path="../types/express.d.ts" />
import { createClient, User } from "@supabase/supabase-js";
import type { NextFunction, Request, Response } from "express";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

function testBypassUser(): User {
  const id = process.env.TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";
  return {
    id,
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    email: "test@example.com",
  } as User;
}

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    if (
      process.env.NODE_ENV === "test" &&
      process.env.TEST_BYPASS_AUTH === "1"
    ) {
      req.user = testBypassUser();
      next();
      return;
    }

    if (!supabase) {
      console.error("❌ Auth Failed: Supabase auth client not configured");
      res.status(503).json({ error: "Authentication unavailable" });
      return;
    }

    const token = req.headers.authorization?.replace("Bearer ", "");
    let userId: string | null = null;

    if (token) {
      try {
        const { data, error } = await supabase.auth.getUser(token);
        if (!error && data?.user) {
          req.user = data.user;
          userId = data.user.id;
        }
      } catch (err) {
        console.error("Auth error:", err);
      }
    }

    req.userId = userId;
    next();
  } catch (err: unknown) {
    console.error("❌ Auth failed:", err);
    res.status(500).json({ error: "Auth failed" });
  }
};
