import { createClient } from "npm:@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return Response.json({ error: "Missing auth" }, { status: 401 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const body = await req.json();
  if (!body?.contract_id) return Response.json({ error: "contract_id is required" }, { status: 422 });

  const { data, error } = await supabase.rpc("mark_contract_complete", { p_contract_id: body.contract_id });

  if (error) return Response.json({ error: error.message, code: error.code }, { status: 400 });

  return Response.json({ success: data });
});
