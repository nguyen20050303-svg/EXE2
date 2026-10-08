import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PayOS from "npm:@payos/node";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

serve(async (req) => {
  if (req.method === "OPTIONS" || req.method === "GET") {
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const PayOSClass = typeof PayOS === 'function' ? PayOS : (PayOS as any).PayOS;
    const payos = new PayOSClass(
      Deno.env.get("PAYOS_CLIENT_ID")!,
      Deno.env.get("PAYOS_API_KEY")!,
      Deno.env.get("PAYOS_CHECKSUM_KEY")!
    );

    // Verify webhook data (verifies signature inside)
    let webhookData;
    try {
      webhookData = await payos.webhooks.verify(body);
    } catch (e) {
      console.log("Webhook verification failed (likely a test request):", e.message);
      // Khi cài đặt Webhook trên PayOS, hệ thống sẽ gửi 1 request mẫu có thể không hợp lệ
      // Chúng ta trả về 200 OK để PayOS cho phép cấu hình URL.
      return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }
    
    if (webhookData.description === "Ma test webhook") {
       return new Response(JSON.stringify({ success: true }), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const orderCode = webhookData.orderCode.toString();
    
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminSupabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Get pending payment request
    const { data: request } = await adminSupabase
      .from('payment_requests')
      .select('*')
      .eq('transfer_memo', orderCode)
      .single();
      
    if (request && request.status === 'PENDING') {
      // 1. Upgrade user subscription
      const now = new Date();
      const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
      
      const { data: rpcData, error: rpcError } = await adminSupabase.rpc("server_update_subscription", {
        p_user_id: request.user_id,
        p_status: "ACTIVE",
        p_plan: request.plan_id,
        p_provider: "INTERNAL",
        p_provider_subscription_id: orderCode,
        p_current_period_start: now.toISOString(),
        p_current_period_end: periodEnd.toISOString(),
        p_cancel_at_period_end: false,
        p_storage_limit: null
      });

      if (rpcError) {
        console.error("RPC Error:", rpcError);
        throw new Error("Failed to update subscription: " + rpcError.message);
      }

      // 2. Update request status
      const { error: updateErr } = await adminSupabase.from('payment_requests').update({ status: 'PAID' }).eq('id', request.id);
      
      if (updateErr) {
        console.error("Failed to update payment_requests status:", updateErr);
      }
    }

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error("Webhook Error:", error.message);
    // Luôn trả về 200 OK để PayOS không huỷ Webhook, kể cả khi có lỗi xảy ra bên trong.
    return new Response(JSON.stringify({ success: true, error: error.message }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
