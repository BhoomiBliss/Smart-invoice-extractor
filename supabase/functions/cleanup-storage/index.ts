import { createClient } from "https://esm.sh/@supabase/supabase-js@2.99.2";

// Initialize Supabase client with service role key
const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
);

const STORAGE_BUCKET = "invoice-files";
const BATCH_SIZE = 10;

/**
 * Edge Function: Clean up storage files from deletion queue
 * Scheduled to run periodically (e.g., hourly)
 */
Deno.serve(async (req) => {
  try {
    // Verify authorization (optional, but recommended)
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response("Unauthorized", { status: 401 });
    }

    console.log("🧹 Starting storage cleanup...");

    // Fetch unprocessed deletion queue entries
    const { data: queueItems, error: fetchError } = await supabase
      .from("storage_delete_queue")
      .select("id, file_path, user_id")
      .is("processed_at", null)
      .order("created_at", { ascending: true })
      .limit(BATCH_SIZE);

    if (fetchError) {
      console.error("Failed to fetch queue:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch queue", details: fetchError }),
        { status: 500 },
      );
    }

    if (!queueItems || queueItems.length === 0) {
      console.log("✓ No files to clean up");
      return new Response(JSON.stringify({ cleaned: 0, failed: 0 }), {
        status: 200,
      });
    }

    console.log(`Processing ${queueItems.length} files...`);

    let cleaned = 0;
    let failed = 0;

    // Process each file
    for (const item of queueItems) {
      try {
        // Delete file from storage
        const { error: deleteError } = await supabase.storage
          .from(STORAGE_BUCKET)
          .remove([item.file_path]);

        if (deleteError) {
          console.warn(
            `Failed to delete ${item.file_path}:`,
            deleteError.message,
          );
          failed++;
          continue;
        }

        // Mark as processed
        const { error: updateError } = await supabase
          .from("storage_delete_queue")
          .update({
            processed_at: new Date().toISOString(),
          })
          .eq("id", item.id);

        if (updateError) {
          console.warn(`Failed to mark ${item.id} as processed:`, updateError);
          failed++;
          continue;
        }

        console.log(`✓ Cleaned: ${item.file_path}`);
        cleaned++;
      } catch (error: any) {
        console.error(`Error processing ${item.id}:`, error);
        failed++;
      }
    }

    console.log(`✓ Cleanup complete: ${cleaned} cleaned, ${failed} failed`);

    return new Response(
      JSON.stringify({
        success: true,
        cleaned,
        failed,
        processed: queueItems.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("Storage cleanup error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error.message,
      }),
      { status: 500 },
    );
  }
});
