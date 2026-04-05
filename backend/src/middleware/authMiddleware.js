"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
/// <reference path="../types/express.d.ts" />
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = supabaseUrl && supabaseAnonKey
    ? (0, supabase_js_1.createClient)(supabaseUrl, supabaseAnonKey)
    : null;
function testBypassUser() {
    const id = process.env.TEST_USER_ID ?? "00000000-0000-0000-0000-000000000001";
    return {
        id,
        app_metadata: {},
        user_metadata: {},
        aud: "authenticated",
        created_at: new Date().toISOString(),
        email: "test@example.com",
    };
}
const authenticate = async (req, res, next) => {
    try {
        if (process.env.NODE_ENV === "test" &&
            process.env.TEST_BYPASS_AUTH === "1") {
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
        let userId = null;
        if (token) {
            try {
                const { data, error } = await supabase.auth.getUser(token);
                if (!error && data?.user) {
                    req.user = data.user;
                    userId = data.user.id;
                }
            }
            catch (err) {
                console.error("Auth error:", err);
            }
        }
        req.userId = userId;
        next();
    }
    catch (err) {
        console.error("❌ Auth failed:", err);
        res.status(500).json({ error: "Auth failed" });
    }
};
exports.authenticate = authenticate;
