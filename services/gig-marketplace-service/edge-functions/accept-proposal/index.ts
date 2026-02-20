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
  if (!body?.proposal_id) return Response.json({ error: "proposal_id is required" }, { status: 422 });

  const { data, error } = await supabase.rpc("accept_proposal", { p_proposal_id: body.proposal_id });

  if (error) {
    return Response.json({ error: error.message, code: error.code }, { status: error.code === "23505" ? 409 : 400 });
  }

  return Response.json({ contract_id: data });
});
