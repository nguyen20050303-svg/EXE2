import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import PayOS from "npm:@payos/node";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization");
    
    if (!authHeader) throw new Error("Missing auth header");

    const clientSupabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userErr } = await clientSupabase.auth.getUser();
    if (userErr || !user) throw new Error("Unauthorized");

    const { planId, amount } = await req.json();

    const PayOSClass = typeof PayOS === 'function' ? PayOS : (PayOS as any).PayOS;
    const payos = new PayOSClass(
      Deno.env.get("PAYOS_CLIENT_ID")!,
      Deno.env.get("PAYOS_API_KEY")!,
      Deno.env.get("PAYOS_CHECKSUM_KEY")!
    );

    // Generate unique order code (max 53 bit integer)
    const orderCode = Number(String(Date.now()).slice(-6) + Math.floor(Math.random() * 1000));

    // Save to payment_requests table
    const { error: insertErr } = await clientSupabase
      .from('payment_requests')
      .insert({
        user_id: user.id,
        plan_id: planId,
        amount: amount,
        transfer_memo: orderCode.toString(),
        provider: 'PAYOS'
      });
      
    if (insertErr) throw insertErr;

    const body = {
      orderCode: orderCode,
      amount: amount,
      description: `HD${orderCode}`,
      cancelUrl: "hidder://payment/cancel",
      returnUrl: "hidder://payment/success"
    };

    const paymentLink = await payos.paymentRequests.create(body);

    return new Response(JSON.stringify({ checkoutUrl: paymentLink.checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400, headers: corsHeaders });
  }
});
