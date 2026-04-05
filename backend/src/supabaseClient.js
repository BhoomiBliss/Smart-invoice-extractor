"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server ENV missing");
}
exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
    },
});
