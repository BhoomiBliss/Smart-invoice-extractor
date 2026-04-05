"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.listInvoicesForUser = listInvoicesForUser;
exports.saveInvoiceToCloud = saveInvoiceToCloud;
const supabaseClient_1 = require("../supabaseClient");
async function listInvoicesForUser(userId) {
    const { data, error } = await supabaseClient_1.supabase
        .from("invoices")
        .select("*")
        .eq("user_id", userId);
    if (error) {
        console.error("❌ ERROR:", error.message);
        throw error;
    }
    return data;
}
async function saveInvoiceToCloud(data, fileBuffer, mimeType, userId, meta) {
    try {
        const extension = mimeType === "application/pdf" ? "pdf" : "png";
        const fileName = `${userId}/invoices/${Date.now()}.${extension}`;
        const { error: uploadError } = await supabaseClient_1.supabase.storage
            .from("invoice-files")
            .upload(fileName, fileBuffer, {
            contentType: mimeType,
            upsert: true,
        });
        if (uploadError)
            throw uploadError;
        const fileUrl = supabaseClient_1.supabase.storage
            .from("invoice-files")
            .getPublicUrl(fileName).data.publicUrl;
        const { error } = await supabaseClient_1.supabase.from("invoices").insert([
            {
                user_id: userId,
                vendor_name: data.vendor_name || "Unknown Vendor",
                invoice_number: data.invoice_number,
                invoice_date: data.invoice_date,
                due_date: data.due_date,
                total: data.total,
                subtotal: data.subtotal,
                tax: data.tax,
                shipping: data.shipping,
                currency: data.currency,
                items: data.items,
                raw_data: data,
                file_url: fileUrl,
                is_fallback: meta?.is_fallback || false,
                model_used: meta?.model || "unknown",
            },
        ]);
        if (error) {
            console.error("❌ DB SAVE ERROR:", error.message);
            throw error;
        }
        console.log("Cloud sync success");
        return true;
    }
    catch (err) {
        console.error("❌ DB SAVE ERROR:", err.message);
        return null;
    }
}
