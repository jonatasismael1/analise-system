import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPER_ADMIN_EMAIL = "contato.ismao@gmail.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

interface Payload {
  targetUserId: string;
  newEmail?: string;
  newPassword?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") ?? "";
  const supabaseUser = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
  });
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });

  const { data: authData, error: authError } = await supabaseUser.auth.getUser();
  if (authError || !authData.user) return json({ error: "Usuário não autenticado." }, 401);

  const payload = await req.json() as Payload;
  const { targetUserId, newEmail, newPassword } = payload;

  if (!targetUserId) return json({ error: "targetUserId é obrigatório." }, 400);
  if (!newEmail?.trim() && !newPassword?.trim()) return json({ error: "Informe e-mail ou senha para alterar." }, 400);
  if (newPassword && newPassword.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);

  const isSuperAdmin = authData.user.email === SUPER_ADMIN_EMAIL;

  if (!isSuperAdmin) {
    // Verifica se o alvo existe e não é admin
    const { data: targetProfile } = await supabaseAdmin
      .from("usuarios")
      .select("role, clinica_id")
      .eq("user_id", targetUserId)
      .eq("ativo", true)
      .maybeSingle();

    if (!targetProfile) return json({ error: "Usuário alvo não encontrado." }, 404);
    if (targetProfile.role === "admin") {
      return json({ error: "Apenas o gestor geral pode alterar credenciais de administradores." }, 403);
    }

    // Verifica se o chamador é admin da mesma clínica
    const { data: callerProfile } = await supabaseAdmin
      .from("usuarios")
      .select("role")
      .eq("user_id", authData.user.id)
      .eq("clinica_id", targetProfile.clinica_id)
      .eq("ativo", true)
      .maybeSingle();

    if (callerProfile?.role !== "admin") {
      return json({ error: "Apenas administradores podem alterar credenciais." }, 403);
    }
  }

  const updatePayload: { email?: string; password?: string } = {};
  if (newEmail?.trim()) updatePayload.email = newEmail.trim().toLowerCase();
  if (newPassword?.trim()) updatePayload.password = newPassword.trim();

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUserId,
    updatePayload
  );
  if (updateError) return json({ error: updateError.message }, 400);

  // Atualiza o email na tabela usuarios se mudou
  if (updatePayload.email) {
    await supabaseAdmin
      .from("usuarios")
      .update({ email: updatePayload.email })
      .eq("user_id", targetUserId);
  }

  return json({ message: "Credenciais atualizadas com sucesso." });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}
