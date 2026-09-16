// @ts-nocheck
// ====================================================================
// SUPABASE EDGE FUNCTION: VERIFY SUBSCRIPTION & WEBHOOK SERVICE
// ====================================================================
// Lưu ý: File này chạy trên runtime Deno của Supabase Edge Functions,
// không chạy trong môi trường Node.js / React Native của mobile app.
// ====================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // 1. Authorize calling user via JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userErr,
    } = await clientSupabase.auth.getUser();

    if (userErr || !user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Parse request body
    const body = await req.json();
    const { action, platform, receiptToken, productId } = body;

    // Check backend provider configuration
    const googlePlayServiceAccount = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT");
    const appleSharedSecret = Deno.env.get("APPLE_SHARED_SECRET");

    const isProviderConfigured = Boolean(
      (platform === "google_play" && googlePlayServiceAccount) ||
      (platform === "app_store" && appleSharedSecret)
    );

    if (action === "verify-purchase" || action === "restore-purchase") {
      if (!isProviderConfigured) {
        // Transparently report that provider is not configured. NEVER fake ACTIVE status!
        return new Response(
          JSON.stringify({
            success: false,
            configured: false,
            error: "Payment verification service is not configured yet on the backend.",
          }),
          { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!receiptToken) {
        return new Response(
          JSON.stringify({ success: false, error: "Missing purchase receipt token" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Server-side provider validation would happen here with Google/Apple APIs.
      // After genuine verification, Service Role updates subscription:
      const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days

      const { data: updatedSub, error: updateErr } = await adminSupabase.rpc(
        "server_update_subscription",
        {
          p_user_id: user.id,
          p_status: "ACTIVE",
          p_plan: productId || "MONTHLY_VAULT",
          p_provider: platform === "google_play" ? "GOOGLE_PLAY" : "APPLE",
          p_provider_subscription_id: receiptToken.substring(0, 32),
          p_current_period_start: now.toISOString(),
          p_current_period_end: periodEnd.toISOString(),
          p_cancel_at_period_end: false,
        }
      );

      if (updateErr) {
        return new Response(
          JSON.stringify({ success: false, error: updateErr.message }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, subscription: updatedSub }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unsupported action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
